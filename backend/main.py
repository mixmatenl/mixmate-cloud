"""
MIXMATE Cloud Server
- WebSocket bridge tussen machines en klantportaal
- REST API voor portaal
- Eigen e-mail + wachtwoord authenticatie
"""

import asyncio
import json
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Field, Session, SQLModel, create_engine, select, Relationship
from sqlalchemy import text
import httpx
import jwt

# ── Database ──────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mixmate_cloud.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str = ""
    password_hash: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    machines: list["Machine"] = Relationship(back_populates="customer")

class Machine(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    machine_id: str = Field(index=True, unique=True)
    pair_code: str = Field(index=True)
    pair_code_expires: datetime
    paired: bool = False
    name: str = "Mijn Machine"
    model: str = ""
    version: str = ""
    serial_number: str = ""
    serial_number_confirmed: bool = False  # True zodra machine zelf het serienummer heeft gestuurd
    last_seen: Optional[datetime] = None
    customer_id: Optional[int] = Field(default=None, foreign_key="customer.id")
    customer: Optional[Customer] = Relationship(back_populates="machines")

class MachineMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    machine_id: str = Field(index=True)
    customer_id: int = Field(foreign_key="customer.id")
    role: str = "staff"   # "manager" | "staff"
    added_at: datetime = Field(default_factory=datetime.utcnow)

class FlushLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    machine_id: str = Field(index=True)
    flushed_at: datetime = Field(default_factory=datetime.utcnow)
    pump_slots: str = "[]"        # JSON: [1, 2, 4]
    durations_json: str = "{}"    # JSON: {"1": 14, "2": 8}
    flushed_by: Optional[int] = Field(default=None, foreign_key="customer.id")

class RecipeLock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    machine_id: str = Field(index=True)
    recipe_id: int

class FlushSchedule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    machine_id: str = Field(index=True, unique=True)
    enabled: bool = True
    day_of_week: int = 0   # 0=maandag … 6=zondag

class TicketResponse(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="supportticket.id", index=True)
    author_name: str = ""
    message: str = ""
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SupportTicket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    ticket_type: str = "service"        # service | offerte
    machine_name: str = ""
    machine_serial: str = ""
    category: str = ""
    urgency: str = ""
    description: str = ""
    preferred_date: str = ""
    preferred_time: str = ""
    status: str = "open"               # open | ingepland | in_behandeling | opgelost
    appointment_at: Optional[datetime] = None
    appointment_note: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

def create_tables():
    SQLModel.metadata.create_all(engine)
    # Voeg nieuwe kolommen toe aan bestaande tabellen als ze nog niet bestaan
    migrations = [
        "ALTER TABLE machine ADD COLUMN serial_number VARCHAR NOT NULL DEFAULT ''",
        "ALTER TABLE machine ADD COLUMN serial_number_confirmed BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE supportticket ADD COLUMN appointment_note VARCHAR NOT NULL DEFAULT ''",
        "ALTER TABLE supportticket ADD COLUMN ticket_type VARCHAR NOT NULL DEFAULT 'service'",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass  # Kolom bestaat al

def get_session():
    with Session(engine) as session:
        yield session

# ── Wachtwoord hashing ────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{h}"

def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, h = password_hash.split(":", 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == h
    except Exception:
        return False

# ── JWT Auth ──────────────────────────────────────────────────────────────────

JWT_SECRET   = os.getenv("JWT_SECRET", secrets.token_hex(32))
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")   # geheim wachtwoord voor admin endpoints
ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "r.muller@mixmate.nl,info@mixmate.nl,h.louwrink@mixmate.nl").split(",") if e.strip()}

security = HTTPBearer(auto_error=False)

def create_token(customer_id: int) -> str:
    payload = {"sub": str(customer_id), "exp": datetime.utcnow() + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail="Niet ingelogd")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Sessie verlopen — log opnieuw in")

def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Admin niet geconfigureerd")
    if credentials.credentials != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Ongeldig admin wachtwoord")

def verify_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_session)) -> int:
    """Admin-check op basis van klantsessie: alleen e-mailadressen in ADMIN_EMAILS."""
    customer_id = verify_token(credentials)
    customer = db.get(Customer, customer_id)
    if not customer or customer.email.lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Geen beheerderstoegang")
    return customer_id

# ── WebSocket machine verbindingen ────────────────────────────────────────────

class MachineConnection:
    def __init__(self, machine_id: str, ws: WebSocket):
        self.machine_id = machine_id
        self.ws = ws
        self.pending: dict[str, asyncio.Future] = {}

    async def send(self, msg: dict):
        await self.ws.send_json(msg)

    async def request(self, msg: dict, timeout: float = 30.0) -> dict:
        req_id = secrets.token_hex(8)
        msg["req_id"] = req_id
        fut: asyncio.Future = asyncio.get_running_loop().create_future()
        self.pending[req_id] = fut
        try:
            await self.ws.send_json(msg)
            return await asyncio.wait_for(asyncio.shield(fut), timeout=timeout)
        except asyncio.TimeoutError:
            self.pending.pop(req_id, None)
            raise HTTPException(status_code=504, detail="Machine reageert niet — probeer opnieuw")
        except Exception:
            self.pending.pop(req_id, None)
            raise HTTPException(status_code=503, detail="Verbinding met machine verbroken")

    def resolve(self, req_id: str, data: dict):
        if req_id in self.pending:
            self.pending[req_id].set_result(data)
            del self.pending[req_id]

connected_machines: dict[str, MachineConnection] = {}

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="MIXMATE Cloud")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    create_tables()
    _create_admin_if_needed()

def _create_admin_if_needed():
    """Maak een standaard admin-account aan als er nog geen klanten zijn."""
    with Session(engine) as db:
        if db.exec(select(Customer)).first():
            return
        admin_email = os.getenv("ADMIN_EMAIL", "")
        admin_pass  = os.getenv("ADMIN_PASSWORD", "")
        if admin_email and admin_pass:
            customer = Customer(
                email=admin_email,
                name="Admin",
                password_hash=hash_password(admin_pass),
            )
            db.add(customer)
            db.commit()

# ── Machine WebSocket ─────────────────────────────────────────────────────────

@app.websocket("/ws/machine/{machine_id}")
async def machine_ws(machine_id: str, websocket: WebSocket, db: Session = Depends(get_session)):
    await websocket.accept()
    conn = MachineConnection(machine_id, websocket)
    connected_machines[machine_id] = conn

    machine = db.exec(select(Machine).where(Machine.machine_id == machine_id)).first()
    if not machine:
        pair_code = str(secrets.randbelow(900000) + 100000)
        machine = Machine(
            machine_id=machine_id,
            pair_code=pair_code,
            pair_code_expires=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(machine)
        db.commit()
        db.refresh(machine)

    # Stuur koppelstatus — inclusief accountinfo als al gekoppeld
    pair_msg: dict = {"type": "pair_code", "code": machine.pair_code, "paired": machine.paired}
    if machine.paired and machine.customer_id:
        customer = db.get(Customer, machine.customer_id)
        if customer:
            pair_msg["account_name"]  = customer.name
            pair_msg["account_email"] = customer.email
    await websocket.send_json(pair_msg)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "heartbeat":
                machine.last_seen = datetime.utcnow()
                if data.get("version"): machine.version = data["version"]
                if data.get("model"):   machine.model   = data["model"]
                if data.get("serial_number") and not machine.serial_number_confirmed:
                    machine.serial_number           = data["serial_number"]
                    machine.serial_number_confirmed = True
                db.add(machine)
                db.commit()
                await websocket.send_json({"type": "heartbeat_ack"})

            elif "req_id" in data:
                conn.resolve(data["req_id"], data)

    except WebSocketDisconnect:
        pass
    finally:
        connected_machines.pop(machine_id, None)

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(body: dict, db: Session = Depends(get_session)):
    email    = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    customer = db.exec(select(Customer).where(Customer.email == email)).first()
    if not customer or not verify_password(password, customer.password_hash):
        raise HTTPException(status_code=401, detail="Onjuist e-mailadres of wachtwoord")

    return {"token": create_token(customer.id), "name": customer.name, "email": customer.email}

@app.post("/api/auth/register")
def register(body: dict, db: Session = Depends(get_session)):
    email    = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name     = (body.get("name") or "").strip()
    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Naam, e-mail en wachtwoord zijn verplicht")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 8 tekens zijn")
    if db.exec(select(Customer).where(Customer.email == email)).first():
        raise HTTPException(status_code=409, detail="Dit e-mailadres is al in gebruik")
    customer = Customer(email=email, name=name, password_hash=hash_password(password))
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return {"token": create_token(customer.id), "name": customer.name, "email": customer.email}

@app.post("/api/auth/change-password")
def change_password(body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    current  = body.get("current_password") or ""
    new_pass = body.get("new_password") or ""
    if len(new_pass) < 8:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 8 tekens zijn")
    customer = db.get(Customer, customer_id)
    if not verify_password(current, customer.password_hash):
        raise HTTPException(status_code=401, detail="Huidig wachtwoord klopt niet")
    customer.password_hash = hash_password(new_pass)
    db.add(customer)
    db.commit()
    return {"ok": True}

# ── Wachtwoord vergeten via machine ──────────────────────────────────────────

# { customer_id: {"code": "123456", "expires": datetime} }
_password_reset_codes: dict[int, dict] = {}

RESEND_API_KEY  = os.getenv("RESEND_API_KEY", "")
PORTAL_URL      = os.getenv("PORTAL_URL", "https://mixmate-cloud-production.up.railway.app")
FROM_EMAIL      = "noreply@mixmate.nl"

def _email_html(body: str) -> str:
    """Gedeelde e-mail wrapper met MIXMATE branding, mobiel-vriendelijk."""
    return (
        "<!DOCTYPE html><html lang='nl'><head>"
        "<meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<meta name='color-scheme' content='light'>"
        "</head>"
        "<body style='margin:0;padding:0;background:#f5f5f7;"
        "font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;"
        "-webkit-font-smoothing:antialiased;'>"
        "<table width='100%' cellpadding='0' cellspacing='0' role='presentation'"
        " style='background:#f5f5f7;padding:32px 16px;'>"
        "<tr><td align='center'>"
        "<table width='100%' cellpadding='0' cellspacing='0' role='presentation'"
        " style='max-width:540px;'>"
        # Logo
        "<tr><td style='padding:0 0 20px 2px;'>"
        "<table cellpadding='0' cellspacing='0' role='presentation'><tr>"
        "<td style='background:#1d1d1f;border-radius:10px;width:36px;height:36px;"
        "text-align:center;vertical-align:middle;'>"
        "<span style='color:#fff;font-size:16px;font-weight:800;line-height:36px;"
        "display:block;letter-spacing:-0.5px;'>M</span></td>"
        "<td style='padding-left:10px;vertical-align:middle;'>"
        "<span style='font-size:17px;font-weight:700;color:#1d1d1f;"
        "letter-spacing:-0.4px;'>MIXMATE</span></td>"
        "</tr></table>"
        "</td></tr>"
        # Card
        "<tr><td style='background:#ffffff;border-radius:20px;padding:32px 28px;"
        "box-shadow:0 2px 8px rgba(0,0,0,0.07);'>"
        + body +
        "</td></tr>"
        # Footer
        "<tr><td style='padding:20px 4px 0;text-align:center;'>"
        "<p style='margin:0;font-size:12px;color:#aeaeb2;line-height:1.6;'>"
        "MIXMATE &nbsp;&middot;&nbsp; "
        "<a href='https://portaal.mixmate.nl' style='color:#aeaeb2;text-decoration:none;'>"
        "portaal.mixmate.nl</a></p>"
        "</td></tr>"
        "</table>"
        "</td></tr></table>"
        "</body></html>"
    )

def _email_button(url: str, label: str) -> str:
    return (
        "<table width='100%' cellpadding='0' cellspacing='0' role='presentation'"
        " style='margin:20px 0;'><tr><td>"
        f"<a href='{url}' style='display:inline-block;background:#1d1d1f;color:#ffffff;"
        "text-decoration:none;border-radius:12px;padding:14px 26px;"
        "font-size:15px;font-weight:600;letter-spacing:-0.2px;'>"
        f"{label}</a>"
        "</td></tr></table>"
    )

def _email_info_row(label: str, value: str, last: bool = False) -> str:
    border = "" if last else "border-bottom:1px solid #f2f2f7;"
    return (
        f"<tr>"
        f"<td style='padding:10px 0;{border}font-size:13px;color:#6e6e73;"
        f"width:130px;vertical-align:top;'>{label}</td>"
        f"<td style='padding:10px 0;{border}font-size:13px;color:#1d1d1f;"
        f"font-weight:600;vertical-align:top;'>{value}</td>"
        f"</tr>"
    )

async def _resend(to: str, subject: str, html: str, reply_to: str = "") -> None:
    if not RESEND_API_KEY:
        return
    payload: dict = {"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html}
    if reply_to:
        payload["reply_to"] = reply_to
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json=payload,
                timeout=10,
            )
    except Exception:
        pass

async def _send_reset_email(to_email: str, to_name: str, code: str):
    reset_url = f"{PORTAL_URL}/login?mode=reset&email={to_email}&code={code}"
    body = (
        "<h2 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#1d1d1f;"
        "letter-spacing:-0.5px;'>Wachtwoord herstellen</h2>"
        f"<p style='margin:0 0 24px;font-size:14px;color:#6e6e73;line-height:1.6;'>"
        f"Hallo {to_name}, gebruik de onderstaande code om je wachtwoord in te stellen.</p>"
        # Code box
        "<table width='100%' cellpadding='0' cellspacing='0' role='presentation'"
        " style='background:#f5f5f7;border-radius:16px;margin-bottom:24px;'><tr>"
        "<td style='padding:24px;text-align:center;'>"
        "<p style='margin:0 0 10px;font-size:11px;font-weight:700;color:#6e6e73;"
        "text-transform:uppercase;letter-spacing:1.5px;'>Verificatiecode</p>"
        f"<p style='margin:0 0 10px;font-size:40px;font-weight:800;letter-spacing:14px;"
        f"color:#1d1d1f;font-family:Courier New,Courier,monospace;'>{code}</p>"
        "<p style='margin:0;font-size:12px;color:#aeaeb2;'>Geldig voor 10 minuten</p>"
        "</td></tr></table>"
        + _email_button(reset_url, "Wachtwoord instellen →") +
        "<p style='margin:16px 0 0;font-size:13px;color:#aeaeb2;line-height:1.6;'>"
        "Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.</p>"
    )
    await _resend(to_email, "Wachtwoord herstellen — MIXMATE", _email_html(body))

@app.post("/api/auth/forgot-password")
async def forgot_password(body: dict, db: Session = Depends(get_session)):
    email = (body.get("email") or "").strip().lower()
    customer = db.exec(select(Customer).where(Customer.email == email)).first()
    # Altijd 200 teruggeven zodat je niet kunt raden welke e-mails bestaan
    if not customer:
        return {"ok": True}

    code = str(secrets.randbelow(900000) + 100000)
    _password_reset_codes[customer.id] = {
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=10),
    }

    # Stuur code naar machine als die online is
    machine = db.exec(select(Machine).where(Machine.customer_id == customer.id, Machine.paired == True)).first()
    if machine:
        conn = connected_machines.get(machine.machine_id)
        if conn:
            await conn.send({"type": "reset_code", "code": code, "email": email})

    # Stuur altijd een e-mail
    await _send_reset_email(email, customer.name or email, code)
    return {"ok": True}


@app.post("/api/auth/reset-password")
def reset_password(body: dict, db: Session = Depends(get_session)):
    email    = (body.get("email") or "").strip().lower()
    code     = (body.get("code") or "").strip()
    new_pass = body.get("password") or ""

    customer = db.exec(select(Customer).where(Customer.email == email)).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Onbekend e-mailadres")

    entry = _password_reset_codes.get(customer.id)
    if not entry or entry["code"] != code or datetime.utcnow() > entry["expires"]:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen code")

    if len(new_pass) < 8:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minimaal 8 tekens zijn")

    customer.password_hash = hash_password(new_pass)
    db.add(customer)
    db.commit()
    _password_reset_codes.pop(customer.id, None)
    return {"token": create_token(customer.id), "name": customer.name, "email": customer.email}


def _ticket_dict(t: SupportTicket) -> dict:
    return {
        "id":               t.id,
        "ticket_type":      t.ticket_type,
        "machine_name":     t.machine_name,
        "machine_serial":   t.machine_serial,
        "category":         t.category,
        "urgency":          t.urgency,
        "description":      t.description,
        "preferred_date":   t.preferred_date,
        "preferred_time":   t.preferred_time,
        "status":           t.status,
        "appointment_at":   t.appointment_at.isoformat() if t.appointment_at else None,
        "appointment_note": t.appointment_note,
        "created_at":       t.created_at.isoformat(),
    }

@app.post("/api/support")
async def submit_support(body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    ticket_type = body.get("ticket_type", "service")
    ticket = SupportTicket(
        customer_id    = customer_id,
        ticket_type    = ticket_type,
        machine_name   = body.get("machine_name",   ""),
        machine_serial = body.get("machine_id",     ""),
        category       = body.get("category",       ""),
        urgency        = body.get("urgency",         ""),
        description    = body.get("description",     ""),
        preferred_date = body.get("preferred_date",  ""),
        preferred_time = body.get("preferred_time",  ""),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    customer_name  = body.get("customer_name",  "")
    customer_email = body.get("customer_email", "")

    if ticket_type == "offerte":
        subject = f"[Offerte #{ticket.id}] {body.get('category', 'Aanvraag')} — {customer_name}"
        email_body = (
            f"<h2 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#1d1d1f;"
            f"letter-spacing:-0.5px;'>Nieuwe offerte-aanvraag #{ticket.id}</h2>"
            f"<p style='margin:0 0 24px;font-size:14px;color:#6e6e73;'>Via portaal.mixmate.nl</p>"
            "<table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;margin-bottom:20px;'>"
            + _email_info_row("Klant", f"{customer_name} &lt;{customer_email}&gt;")
            + _email_info_row("Interesse", body.get("category", ""))
            + _email_info_row("Beschrijving", body.get("description", "").replace("\n", "<br>"), last=True)
            + "</table>"
            + _email_button(f"https://portaal.mixmate.nl/admin", "Bekijk in portaal →")
        )
    else:
        subject = f"[Melding #{ticket.id}] {body.get('category', '')} — {body.get('machine_name', '')}"
        voorkeur = f"{body.get('preferred_date', '')} – {body.get('preferred_time', '')}"
        email_body = (
            f"<h2 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#1d1d1f;"
            f"letter-spacing:-0.5px;'>Nieuwe machinemelding #{ticket.id}</h2>"
            f"<p style='margin:0 0 24px;font-size:14px;color:#6e6e73;'>Via portaal.mixmate.nl</p>"
            "<table width='100%' cellpadding='0' cellspacing='0' style='border-collapse:collapse;margin-bottom:20px;'>"
            + _email_info_row("Klant",    f"{customer_name} &lt;{customer_email}&gt;")
            + _email_info_row("Machine",  f"{body.get('machine_name', '')} &mdash; {body.get('machine_id', '')}")
            + _email_info_row("Categorie", body.get("category", ""))
            + _email_info_row("Urgentie",  body.get("urgency", ""))
            + _email_info_row("Voorkeur",  voorkeur, last=True)
            + "</table>"
            + f"<div style='background:#f5f5f7;border-radius:14px;padding:18px;margin-bottom:20px;'>"
            + f"<p style='margin:0 0 8px;font-size:11px;font-weight:700;color:#6e6e73;"
            + f"text-transform:uppercase;letter-spacing:1px;'>Beschrijving</p>"
            + f"<p style='margin:0;font-size:14px;color:#1d1d1f;line-height:1.6;"
            + f"white-space:pre-wrap;'>{body.get('description', '')}</p>"
            + "</div>"
            + _email_button("https://portaal.mixmate.nl/admin", "Bekijk in portaal →")
        )

    await _resend("info@mixmate.nl", subject, _email_html(email_body), reply_to=customer_email)
    return {"ok": True, "ticket_id": ticket.id}

@app.get("/api/support/tickets")
def list_tickets(customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    tickets = db.exec(select(SupportTicket).where(SupportTicket.customer_id == customer_id).order_by(SupportTicket.created_at.desc())).all()
    return [_ticket_dict(t) for t in tickets]

@app.get("/api/support/tickets/{ticket_id}/responses")
def get_responses(ticket_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket or ticket.customer_id != customer_id:
        raise HTTPException(status_code=404, detail="Ticket niet gevonden")
    responses = db.exec(select(TicketResponse).where(TicketResponse.ticket_id == ticket_id).order_by(TicketResponse.created_at)).all()
    return [{"id": r.id, "author_name": r.author_name, "message": r.message, "is_admin": r.is_admin, "created_at": r.created_at.isoformat()} for r in responses]

# ── Admin endpoints (vereist ingelogd admin-account) ─────────────────────────

@app.get("/api/admin/me")
def admin_me(customer_id: int = Depends(verify_admin_user), db: Session = Depends(get_session)):
    """Check of de ingelogde gebruiker admin is."""
    customer = db.get(Customer, customer_id)
    return {"is_admin": True, "name": customer.name, "email": customer.email}

@app.get("/api/admin/customers")
def admin_search_customers(q: str = "", customer_id: int = Depends(verify_admin_user), db: Session = Depends(get_session)):
    query = select(Customer)
    if q:
        like = f"%{q}%"
        query = query.where((Customer.name.ilike(like)) | (Customer.email.ilike(like)))
    customers = db.exec(query.order_by(Customer.name).limit(50)).all()
    result = []
    for c in customers:
        machines = db.exec(select(Machine).where(Machine.customer_id == c.id)).all()
        result.append({
            "id": c.id, "name": c.name, "email": c.email,
            "machine_count": len(machines),
            "machines": [{**_machine_dict(m), "online": m.machine_id in connected_machines} for m in machines],
        })
    return result

@app.post("/api/admin/machines/{machine_id}/restart")
async def admin_restart_machine(machine_id: str, _: int = Depends(verify_admin_user), db: Session = Depends(get_session)):
    conn = connected_machines.get(machine_id)
    if not conn:
        raise HTTPException(status_code=503, detail="Machine is offline")
    await conn.request({"type": "trigger_update"}, timeout=10)
    return {"ok": True}

@app.get("/api/admin/tickets")
def admin_list_tickets(customer_id: int = Depends(verify_admin_user), db: Session = Depends(get_session)):
    tickets = db.exec(select(SupportTicket).order_by(SupportTicket.created_at.desc())).all()
    customers = {c.id: c for c in db.exec(select(Customer)).all()}
    result = []
    for t in tickets:
        d = _ticket_dict(t)
        c = customers.get(t.customer_id)
        d["customer_name"]  = c.name  if c else ""
        d["customer_email"] = c.email if c else ""
        responses = db.exec(select(TicketResponse).where(TicketResponse.ticket_id == t.id)).all()
        d["response_count"] = len(responses)
        result.append(d)
    return result

@app.patch("/api/admin/tickets/{ticket_id}")
async def admin_update_ticket(ticket_id: int, body: dict, customer_id: int = Depends(verify_admin_user), db: Session = Depends(get_session)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket niet gevonden")
    if "status"           in body: ticket.status           = body["status"]
    if "appointment_note" in body: ticket.appointment_note = body["appointment_note"]
    if "appointment_at"   in body:
        ticket.appointment_at = datetime.fromisoformat(body["appointment_at"]) if body["appointment_at"] else None
    db.add(ticket)
    db.commit()

    # Stuur e-mail naar klant als afspraak wordt ingepland
    if "appointment_at" in body and body["appointment_at"]:
        klant = db.get(Customer, ticket.customer_id)
        if klant:
            afspraak_dt  = datetime.fromisoformat(body["appointment_at"])
            afspraak_str = afspraak_dt.strftime("%A %d %B om %H:%M").capitalize()
            note_html    = (
                f"<p style='margin:12px 0 0;font-size:14px;color:#374151;line-height:1.6;'>"
                f"{body.get('appointment_note','')}</p>"
                if body.get("appointment_note") else ""
            )
            email_body = (
                f"<h2 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#1d1d1f;"
                f"letter-spacing:-0.5px;'>Afspraak bevestigd</h2>"
                f"<p style='margin:0 0 24px;font-size:14px;color:#6e6e73;line-height:1.6;'>"
                f"Hallo {klant.name}, er is een afspraak ingepland voor uw melding "
                f"<strong style='color:#1d1d1f;'>#{ticket.id} &mdash; {ticket.category}</strong>.</p>"
                "<table width='100%' cellpadding='0' cellspacing='0' role='presentation'"
                " style='background:#f0f6ff;border-radius:16px;margin:0 0 20px;'><tr>"
                "<td style='padding:24px;text-align:center;'>"
                "<p style='margin:0 0 8px;font-size:11px;font-weight:700;color:#007aff;"
                "text-transform:uppercase;letter-spacing:1.5px;'>Afspraakmomment</p>"
                f"<p style='margin:0;font-size:24px;font-weight:700;color:#1d1d1f;"
                f"letter-spacing:-0.5px;'>{afspraak_str}</p>"
                + note_html +
                "</td></tr></table>"
                + _email_button("https://portaal.mixmate.nl/meldingen", "Voortgang bekijken →")
            )
            await _resend(klant.email, f"Afspraak bevestigd — melding #{ticket.id}", _email_html(email_body))

    return _ticket_dict(ticket)

@app.post("/api/admin/tickets/{ticket_id}/responses")
async def admin_add_response(ticket_id: int, body: dict, customer_id: int = Depends(verify_admin_user), db: Session = Depends(get_session)):
    ticket = db.get(SupportTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket niet gevonden")
    admin = db.get(Customer, customer_id)
    response = TicketResponse(
        ticket_id   = ticket_id,
        author_name = admin.name if admin else "MIXMATE",
        message     = body.get("message", "").strip(),
        is_admin    = True,
    )
    if not response.message:
        raise HTTPException(status_code=400, detail="Bericht mag niet leeg zijn")
    db.add(response)
    db.commit()
    db.refresh(response)

    # E-mail naar klant
    klant = db.get(Customer, ticket.customer_id)
    if klant:
        portal_link = "https://portaal.mixmate.nl/meldingen"
        label = "Bekijk in portaal →"
        email_body = (
            f"<h2 style='margin:0 0 6px;font-size:22px;font-weight:700;color:#1d1d1f;"
            f"letter-spacing:-0.5px;'>Reactie van MIXMATE</h2>"
            f"<p style='margin:0 0 24px;font-size:14px;color:#6e6e73;line-height:1.6;'>"
            f"Hallo {klant.name}, er is een bericht geplaatst op uw aanvraag "
            f"<strong style='color:#1d1d1f;'>#{ticket.id} &mdash; {ticket.category}</strong>.</p>"
            "<div style='background:#f5f5f7;border-radius:14px;padding:20px;margin-bottom:20px;"
            "border-left:3px solid #1d1d1f;'>"
            f"<p style='margin:0;font-size:15px;color:#1d1d1f;line-height:1.7;"
            f"white-space:pre-wrap;'>{response.message}</p>"
            "</div>"
            + _email_button(portal_link, label)
        )
        await _resend(klant.email, f"Reactie op uw aanvraag #{ticket.id}", _email_html(email_body))

    return {"id": response.id, "author_name": response.author_name, "message": response.message, "is_admin": True, "created_at": response.created_at.isoformat()}


@app.post("/api/machines/{machine_id}/trigger-update")
async def trigger_update(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    machine = db.exec(select(Machine).where(Machine.machine_id == machine_id, Machine.customer_id == customer_id)).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    conn = connected_machines.get(machine_id)
    if not conn:
        raise HTTPException(status_code=503, detail="Machine is offline")
    await conn.send({"type": "trigger_update"})
    return {"ok": True}


# ── Spoelroutine ──────────────────────────────────────────────────────────────

@app.post("/api/machines/{machine_id}/flush")
async def flush_machine(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    pumps = body.get("pumps", [])   # [{"slot": 1, "duration": 14}, ...]
    if not pumps:
        raise HTTPException(status_code=400, detail="Geen leidingen geselecteerd")
    total_timeout = sum(p.get("duration", 10) for p in pumps) + len(pumps) * 2 + 30
    await conn.request({"type": "flush_pumps", "pumps": pumps}, timeout=total_timeout)
    slots = [p["slot"] for p in pumps]
    durations = {str(p["slot"]): p["duration"] for p in pumps}
    db.add(FlushLog(
        machine_id=machine_id,
        pump_slots=json.dumps(slots),
        durations_json=json.dumps(durations),
        flushed_by=customer_id,
    ))
    db.commit()
    return {"ok": True}

@app.get("/api/machines/{machine_id}/flush-status")
async def get_flush_status(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db)
    conn = connected_machines.get(machine_id)
    if not conn:
        return {"active": False, "offline": True}
    try:
        return await conn.request({"type": "get_flush_status"}, timeout=5)
    except Exception:
        return {"active": False}

@app.get("/api/machines/{machine_id}/block-status")
async def get_block_status(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db)
    conn = connected_machines.get(machine_id)
    if not conn:
        return {"blocked": False, "offline": True}
    try:
        return await conn.request({"type": "get_block_status"}, timeout=5)
    except Exception:
        return {"blocked": False}

@app.post("/api/machines/{machine_id}/block")
async def block_machine(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    return await conn.request({"type": "block_machine"}, timeout=5)

@app.post("/api/machines/{machine_id}/unblock")
async def unblock_machine(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    return await conn.request({"type": "unblock_machine"}, timeout=5)

@app.get("/api/machines/{machine_id}/demo-status")
async def get_demo_status(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    return await conn.request({"type": "get_demo_status"}, timeout=5)

@app.post("/api/machines/{machine_id}/demo/exit-slideshow")
async def exit_demo_slideshow(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    return await conn.request({"type": "exit_demo_slideshow"}, timeout=5)

@app.post("/api/machines/{machine_id}/demo/activate")
async def activate_demo(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    return await conn.request({"type": "activate_demo"}, timeout=30)

@app.post("/api/machines/{machine_id}/demo/deactivate")
async def deactivate_demo(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    return await conn.request({"type": "deactivate_demo"}, timeout=15)

@app.get("/api/machines/{machine_id}/flush-log")
def get_flush_log(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db)
    logs = db.exec(
        select(FlushLog).where(FlushLog.machine_id == machine_id)
        .order_by(FlushLog.flushed_at.desc()).limit(25)
    ).all()
    return [{"id": l.id, "flushed_at": l.flushed_at.isoformat(),
             "pump_slots": json.loads(l.pump_slots or "[]"),
             "durations": json.loads(l.durations_json or "{}")} for l in logs]

@app.get("/api/machines/{machine_id}/pours")
async def get_machine_pours(machine_id: str, date: str = None, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    msg = {"type": "get_pours"}
    if date:
        msg["date"] = date
    result = await conn.request(msg, timeout=8)
    return result.get("pours", [])

@app.get("/api/machines/{machine_id}/pour-stats")
async def get_machine_pour_stats(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_conn(machine_id, customer_id, db)
    result = await conn.request({"type": "get_pour_stats"}, timeout=8)
    return result

@app.get("/api/machines/{machine_id}/flush-schedule")
def get_flush_schedule(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db)
    schedule = db.exec(select(FlushSchedule).where(FlushSchedule.machine_id == machine_id)).first()
    info = _flush_info(machine_id, db)
    if not schedule:
        return {"enabled": False, "day_of_week": 0, **info}
    return {"enabled": schedule.enabled, "day_of_week": schedule.day_of_week, **info}

@app.patch("/api/machines/{machine_id}/flush-schedule")
def update_flush_schedule(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db)
    schedule = db.exec(select(FlushSchedule).where(FlushSchedule.machine_id == machine_id)).first()
    if not schedule:
        schedule = FlushSchedule(machine_id=machine_id)
        db.add(schedule)
    if "enabled" in body:
        schedule.enabled = bool(body["enabled"])
    if "day_of_week" in body:
        schedule.day_of_week = int(body["day_of_week"])
    db.commit()
    return {"enabled": schedule.enabled, "day_of_week": schedule.day_of_week}

# ── Team beheer ───────────────────────────────────────────────────────────────

@app.get("/api/machines/{machine_id}/members")
def get_members(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db, owner_only=True)
    members = db.exec(select(MachineMember).where(MachineMember.machine_id == machine_id)).all()
    result = []
    for m in members:
        c = db.get(Customer, m.customer_id)
        result.append({"id": m.id, "name": c.name if c else "?", "email": c.email if c else "?",
                       "role": m.role, "added_at": m.added_at.isoformat()})
    return result

@app.post("/api/machines/{machine_id}/members")
def add_member(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db, owner_only=True)
    email = (body.get("email") or "").strip().lower()
    role  = body.get("role", "staff")
    new_customer = db.exec(select(Customer).where(Customer.email == email)).first()
    if not new_customer:
        raise HTTPException(status_code=404, detail="Geen account gevonden met dit e-mailadres")
    if new_customer.id == customer_id:
        raise HTTPException(status_code=400, detail="Je kunt jezelf niet toevoegen")
    if db.exec(select(MachineMember).where(MachineMember.machine_id == machine_id, MachineMember.customer_id == new_customer.id)).first():
        raise HTTPException(status_code=409, detail="Deze persoon heeft al toegang")
    member = MachineMember(machine_id=machine_id, customer_id=new_customer.id, role=role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return {"id": member.id, "name": new_customer.name, "email": new_customer.email,
            "role": member.role, "added_at": member.added_at.isoformat()}

@app.patch("/api/machines/{machine_id}/members/{member_id}")
def update_member_role(machine_id: str, member_id: int, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db, owner_only=True)
    member = db.exec(select(MachineMember).where(MachineMember.id == member_id, MachineMember.machine_id == machine_id)).first()
    if not member:
        raise HTTPException(status_code=404)
    member.role = body.get("role", member.role)
    db.add(member)
    db.commit()
    return {"ok": True}

@app.delete("/api/machines/{machine_id}/members/{member_id}")
def remove_member(machine_id: str, member_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db, owner_only=True)
    member = db.exec(select(MachineMember).where(MachineMember.id == member_id, MachineMember.machine_id == machine_id)).first()
    if not member:
        raise HTTPException(status_code=404)
    db.delete(member)
    db.commit()
    return {"ok": True}

# ── Receptvergrendeling ───────────────────────────────────────────────────────

@app.get("/api/machines/{machine_id}/locks")
def get_locks(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db)
    locks = db.exec(select(RecipeLock).where(RecipeLock.machine_id == machine_id)).all()
    return [l.recipe_id for l in locks]

@app.post("/api/machines/{machine_id}/recipes/{recipe_id}/lock")
def lock_recipe(machine_id: str, recipe_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db, owner_only=True)
    if not db.exec(select(RecipeLock).where(RecipeLock.machine_id == machine_id, RecipeLock.recipe_id == recipe_id)).first():
        db.add(RecipeLock(machine_id=machine_id, recipe_id=recipe_id))
        db.commit()
    return {"locked": True}

@app.delete("/api/machines/{machine_id}/recipes/{recipe_id}/lock")
def unlock_recipe(machine_id: str, recipe_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    _check_machine_access(machine_id, customer_id, db, owner_only=True)
    lock = db.exec(select(RecipeLock).where(RecipeLock.machine_id == machine_id, RecipeLock.recipe_id == recipe_id)).first()
    if lock:
        db.delete(lock)
        db.commit()
    return {"locked": False}

# ── Admin (alleen voor jou, wachtwoord-gebaseerd) ────────────────────────────

@app.get("/api/internal/customers")
def admin_list_customers(_=Depends(verify_admin), db: Session = Depends(get_session)):
    customers = db.exec(select(Customer)).all()
    return [{"id": c.id, "email": c.email, "name": c.name, "created_at": c.created_at} for c in customers]

@app.post("/api/internal/customers")
def admin_create_customer(body: dict, _=Depends(verify_admin), db: Session = Depends(get_session)):
    email    = (body.get("email") or "").strip().lower()
    name     = body.get("name") or ""
    password = body.get("password") or secrets.token_urlsafe(12)

    if db.exec(select(Customer).where(Customer.email == email)).first():
        raise HTTPException(status_code=409, detail="E-mailadres al in gebruik")

    customer = Customer(email=email, name=name, password_hash=hash_password(password))
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return {"id": customer.id, "email": customer.email, "name": customer.name, "password": password}

@app.delete("/api/internal/customers/{customer_id}")
def admin_delete_customer(customer_id: int, _=Depends(verify_admin), db: Session = Depends(get_session)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Niet gevonden")
    db.delete(customer)
    db.commit()
    return {"ok": True}

# ── Machines API ──────────────────────────────────────────────────────────────

@app.get("/api/machines")
def list_machines(customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    owned = db.exec(select(Machine).where(Machine.customer_id == customer_id)).all()
    memberships = db.exec(select(MachineMember).where(MachineMember.customer_id == customer_id)).all()
    member_ids = [m.machine_id for m in memberships]
    shared = db.exec(select(Machine).where(Machine.machine_id.in_(member_ids))).all() if member_ids else []
    all_machines = {m.machine_id: m for m in owned + shared}
    return [{**_machine_dict(m), "online": m.machine_id in connected_machines, **_flush_info(m.machine_id, db)} for m in all_machines.values()]

@app.post("/api/machines/pair")
async def pair_machine(body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    code    = str(body.get("code", "")).strip()
    machine = db.exec(select(Machine).where(Machine.pair_code == code)).first()

    if not machine:
        raise HTTPException(status_code=404, detail="Koppelcode niet gevonden")
    if machine.paired and machine.customer_id != customer_id:
        raise HTTPException(status_code=409, detail="Machine al gekoppeld aan een ander account")
    if datetime.utcnow() > machine.pair_code_expires:
        raise HTTPException(status_code=410, detail="Koppelcode verlopen — herstart de machine")

    machine.paired      = True
    machine.customer_id = customer_id
    machine.pair_code   = str(secrets.randbelow(900000) + 100000)
    machine.pair_code_expires = datetime.utcnow() + timedelta(hours=24)
    db.add(machine)
    db.commit()
    db.refresh(machine)

    conn = connected_machines.get(machine.machine_id)
    if conn:
        customer = db.get(Customer, customer_id)
        asyncio.create_task(conn.send({
            "type":          "paired",
            "customer_id":   customer_id,
            "account_name":  customer.name  if customer else "",
            "account_email": customer.email if customer else "",
        }))

    return _machine_dict(machine)

@app.patch("/api/machines/{machine_id}")
def rename_machine(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    machine = db.exec(select(Machine).where(Machine.machine_id == machine_id, Machine.customer_id == customer_id)).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Niet gevonden")
    if "name" in body:
        machine.name = body["name"]
    if "serial_number" in body:
        if machine.serial_number_confirmed:
            raise HTTPException(status_code=409, detail="Serienummer is bevestigd door de machine en kan niet meer worden gewijzigd")
        machine.serial_number = body["serial_number"]
    db.add(machine)
    db.commit()
    return _machine_dict(machine)

@app.delete("/api/machines/{machine_id}")
def delete_machine(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    machine = db.exec(select(Machine).where(Machine.machine_id == machine_id, Machine.customer_id == customer_id)).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Niet gevonden")
    # Verbreek actieve WebSocket-verbinding als de machine online is
    conn = connected_machines.pop(machine_id, None)
    if conn:
        try:
            asyncio.create_task(conn.ws.close())
        except Exception:
            pass
    db.delete(machine)
    db.commit()
    return {"ok": True}

@app.post("/api/machines/{machine_id}/unpair")
def machine_self_unpair(machine_id: str, db: Session = Depends(get_session)):
    """Machine kan zichzelf ontkoppelen zonder klant-token."""
    machine = db.exec(select(Machine).where(Machine.machine_id == machine_id)).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Niet gevonden")
    machine.paired      = False
    machine.customer_id = None
    db.add(machine)
    db.commit()
    return {"ok": True}

# ── Doorstuur-API (portaal → machine) ────────────────────────────────────────

def _check_machine_access(machine_id: str, customer_id: int, db: Session, owner_only: bool = False) -> Machine:
    machine = db.exec(select(Machine).where(Machine.machine_id == machine_id)).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    is_owner = machine.customer_id == customer_id
    if owner_only and not is_owner:
        raise HTTPException(status_code=403, detail="Alleen de eigenaar kan dit uitvoeren")
    if not is_owner:
        member = db.exec(select(MachineMember).where(
            MachineMember.machine_id == machine_id,
            MachineMember.customer_id == customer_id,
        )).first()
        if not member:
            raise HTTPException(status_code=404, detail="Machine niet gevonden")
    return machine

def _get_conn(machine_id: str, customer_id: int, db: Session) -> MachineConnection:
    _check_machine_access(machine_id, customer_id, db)
    conn = connected_machines.get(machine_id)
    if not conn:
        raise HTTPException(status_code=503, detail="Machine is offline")
    return conn

@app.get("/api/machines/{machine_id}/status")
def machine_status(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    machine = db.exec(select(Machine).where(
        Machine.machine_id == machine_id,
        Machine.customer_id == customer_id,
    )).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Niet gevonden")
    return {**_machine_dict(machine), "online": machine_id in connected_machines}

@app.get("/api/machines/{machine_id}/recipes")
async def get_recipes(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "get_recipes"})

@app.get("/api/machines/{machine_id}/pumps")
async def get_pumps(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "get_pumps"})

@app.get("/api/machines/{machine_id}/settings")
async def get_settings(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "get_settings"})

@app.post("/api/machines/{machine_id}/settings")
async def update_settings(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "update_settings", "data": body})

@app.get("/api/machines/{machine_id}/info")
async def get_machine_info(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "get_info"})

# ── Recepten relay ────────────────────────────────────────────────────────────

@app.post("/api/machines/{machine_id}/recipes")
async def create_recipe(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "create_recipe", "data": body})

@app.patch("/api/machines/{machine_id}/recipes/{recipe_id}")
async def update_recipe(machine_id: str, recipe_id: int, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    if db.exec(select(RecipeLock).where(RecipeLock.machine_id == machine_id, RecipeLock.recipe_id == recipe_id)).first():
        raise HTTPException(status_code=423, detail="Dit recept is vergrendeld door de eigenaar")
    return await _get_conn(machine_id, customer_id, db).request({"type": "update_recipe", "id": recipe_id, "data": body})

@app.delete("/api/machines/{machine_id}/recipes/{recipe_id}")
async def delete_recipe(machine_id: str, recipe_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    if db.exec(select(RecipeLock).where(RecipeLock.machine_id == machine_id, RecipeLock.recipe_id == recipe_id)).first():
        raise HTTPException(status_code=423, detail="Dit recept is vergrendeld door de eigenaar")
    return await _get_conn(machine_id, customer_id, db).request({"type": "delete_recipe", "id": recipe_id})

# ── Ingrediënten relay ────────────────────────────────────────────────────────

@app.get("/api/machines/{machine_id}/ingredients")
async def get_ingredients(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "get_ingredients"})

@app.post("/api/machines/{machine_id}/ingredients")
async def create_ingredient(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "create_ingredient", "data": body})

@app.delete("/api/machines/{machine_id}/ingredients/{ingredient_id}")
async def delete_ingredient(machine_id: str, ingredient_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "delete_ingredient", "id": ingredient_id})

# ── Glazen relay ──────────────────────────────────────────────────────────────

@app.get("/api/machines/{machine_id}/glasses")
async def get_glasses(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "get_glasses"})

@app.post("/api/machines/{machine_id}/glasses")
async def create_glass(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "create_glass", "data": body})

@app.patch("/api/machines/{machine_id}/glasses/{glass_id}")
async def update_glass(machine_id: str, glass_id: int, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "update_glass", "id": glass_id, "data": body})

@app.delete("/api/machines/{machine_id}/glasses/{glass_id}")
async def delete_glass(machine_id: str, glass_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "delete_glass", "id": glass_id})

# ── Categorieën relay ─────────────────────────────────────────────────────────

@app.get("/api/machines/{machine_id}/categories")
async def get_categories(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "get_categories"})

@app.post("/api/machines/{machine_id}/categories")
async def create_category(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "create_category", "data": body})

@app.patch("/api/machines/{machine_id}/categories/{cat_id}")
async def update_category(machine_id: str, cat_id: int, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "update_category", "id": cat_id, "data": body})

@app.delete("/api/machines/{machine_id}/categories/{cat_id}")
async def delete_category(machine_id: str, cat_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "delete_category", "id": cat_id})

# ── Pompen relay ──────────────────────────────────────────────────────────────

@app.patch("/api/machines/{machine_id}/pumps/{pump_id}")
async def update_pump(machine_id: str, pump_id: int, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    return await _get_conn(machine_id, customer_id, db).request({"type": "update_pump", "id": pump_id, "data": body})

# ── Helpers ───────────────────────────────────────────────────────────────────

def _flush_info(machine_id: str, db: Session) -> dict:
    last = db.exec(select(FlushLog).where(FlushLog.machine_id == machine_id).order_by(FlushLog.flushed_at.desc()).limit(1)).first()
    schedule = db.exec(select(FlushSchedule).where(FlushSchedule.machine_id == machine_id)).first()
    days_since = (datetime.utcnow() - last.flushed_at).days if last else None
    overdue = (schedule.enabled and (days_since is None or days_since >= 7)) if schedule else False
    return {"days_since_flush": days_since, "flush_overdue": overdue}

def _machine_dict(m: Machine) -> dict:
    return {
        "machine_id":               m.machine_id,
        "name":                     m.name,
        "model":                    m.model,
        "version":                  m.version,
        "serial_number":            m.serial_number,
        "serial_number_confirmed":  m.serial_number_confirmed,
        "paired":                   m.paired,
        "last_seen":                m.last_seen.isoformat() if m.last_seen else None,
    }

# ── Statische frontend serveren ───────────────────────────────────────────────

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404)
        file = FRONTEND_DIST / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
