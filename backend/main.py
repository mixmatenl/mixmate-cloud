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
    last_seen: Optional[datetime] = None
    customer_id: Optional[int] = Field(default=None, foreign_key="customer.id")
    customer: Optional[Customer] = Relationship(back_populates="machines")

def create_tables():
    SQLModel.metadata.create_all(engine)

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
                if "version" in data: machine.version = data["version"]
                if "model"   in data: machine.model   = data["model"]
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
FROM_EMAIL      = "noreply@send.mixmate.nl"

async def _send_reset_email(to_email: str, to_name: str, code: str):
    if not RESEND_API_KEY:
        return
    reset_url = f"{PORTAL_URL}/login?mode=reset&email={to_email}&code={code}"
    html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="font-size:20px;font-weight:700;letter-spacing:-.5px;color:#111;margin-bottom:4px;">MIXMATE</div>
      <div style="font-size:13px;color:#9ca3af;margin-bottom:32px;">Wachtwoord herstellen</div>

      <p style="font-size:14px;color:#374151;margin:0 0 8px;">Hallo {to_name},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        We hebben een verzoek ontvangen om je wachtwoord te herstellen.
        Gebruik de onderstaande code of klik op de knop.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Verificatiecode</div>
        <div style="font-size:36px;font-weight:800;letter-spacing:10px;font-family:monospace;color:#111;">{code}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:8px;">Geldig voor 10 minuten</div>
      </div>

      <a href="{reset_url}" style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;border-radius:10px;padding:13px;font-size:14px;font-weight:600;margin-bottom:24px;">
        Wachtwoord instellen →
      </a>

      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Als je dit niet hebt aangevraagd kun je deze e-mail negeren.
      </p>
    </div>
    """
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": FROM_EMAIL, "to": [to_email], "subject": "Wachtwoord herstellen — MIXMATE", "html": html},
            timeout=10,
        )

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


# ── Admin (alleen voor jou) ───────────────────────────────────────────────────

@app.get("/api/admin/customers")
def admin_list_customers(_=Depends(verify_admin), db: Session = Depends(get_session)):
    customers = db.exec(select(Customer)).all()
    return [{"id": c.id, "email": c.email, "name": c.name, "created_at": c.created_at} for c in customers]

@app.post("/api/admin/customers")
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

@app.delete("/api/admin/customers/{customer_id}")
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
    machines = db.exec(select(Machine).where(Machine.customer_id == customer_id)).all()
    return [_machine_dict(m) for m in machines]

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

def _get_conn(machine_id: str, customer_id: int, db: Session) -> MachineConnection:
    machine = db.exec(select(Machine).where(
        Machine.machine_id == machine_id,
        Machine.customer_id == customer_id,
    )).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
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
    return await _get_conn(machine_id, customer_id, db).request({"type": "update_recipe", "id": recipe_id, "data": body})

@app.delete("/api/machines/{machine_id}/recipes/{recipe_id}")
async def delete_recipe(machine_id: str, recipe_id: int, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
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

def _machine_dict(m: Machine) -> dict:
    return {
        "machine_id": m.machine_id,
        "name":       m.name,
        "model":      m.model,
        "version":    m.version,
        "paired":     m.paired,
        "last_seen":  m.last_seen.isoformat() if m.last_seen else None,
    }

# ── Statische frontend serveren ───────────────────────────────────────────────

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file = FRONTEND_DIST / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
