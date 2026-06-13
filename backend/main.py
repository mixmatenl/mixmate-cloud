"""
MIXMATE Cloud Server
- WebSocket bridge tussen machines en klantportaal
- REST API voor portaal
- Shopify klantaccount authenticatie
"""

import asyncio
import json
import os
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Field, Session, SQLModel, create_engine, select, Relationship
import httpx
import jwt

# ── Database ──────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mixmate_cloud.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    shopify_customer_id: str = Field(index=True, unique=True)
    email: str
    name: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    machines: list["Machine"] = Relationship(back_populates="customer")

class Machine(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    machine_id: str = Field(index=True, unique=True)   # unieke ID van de Pi
    pair_code: str = Field(index=True)                 # 6-cijferige koppelcode
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

# ── Auth ──────────────────────────────────────────────────────────────────────

JWT_SECRET  = os.getenv("JWT_SECRET", secrets.token_hex(32))
SHOPIFY_DOMAIN = os.getenv("SHOPIFY_DOMAIN", "")          # bijv. jouwshop.myshopify.com
SHOPIFY_STOREFRONT_TOKEN = os.getenv("SHOPIFY_STOREFRONT_TOKEN", "")

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

# ── WebSocket machine verbindingen ────────────────────────────────────────────

class MachineConnection:
    def __init__(self, machine_id: str, ws: WebSocket):
        self.machine_id = machine_id
        self.ws = ws
        self.pending: dict[str, asyncio.Future] = {}

    async def send(self, msg: dict):
        await self.ws.send_json(msg)

    async def request(self, msg: dict, timeout: float = 10.0) -> dict:
        req_id = secrets.token_hex(8)
        msg["req_id"] = req_id
        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self.pending[req_id] = fut
        await self.ws.send_json(msg)
        try:
            return await asyncio.wait_for(fut, timeout=timeout)
        except asyncio.TimeoutError:
            self.pending.pop(req_id, None)
            raise HTTPException(status_code=504, detail="Machine reageert niet")

    def resolve(self, req_id: str, data: dict):
        if req_id in self.pending:
            self.pending[req_id].set_result(data)
            del self.pending[req_id]

# machine_id → MachineConnection
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

# ── Machine WebSocket ─────────────────────────────────────────────────────────

@app.websocket("/ws/machine/{machine_id}")
async def machine_ws(machine_id: str, websocket: WebSocket, db: Session = Depends(get_session)):
    await websocket.accept()
    conn = MachineConnection(machine_id, websocket)
    connected_machines[machine_id] = conn

    # Zorg dat machine in DB bestaat
    machine = db.exec(select(Machine).where(Machine.machine_id == machine_id)).first()
    if not machine:
        pair_code = str(secrets.randbelow(900000) + 100000)  # 6 cijfers
        machine = Machine(
            machine_id=machine_id,
            pair_code=pair_code,
            pair_code_expires=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(machine)
        db.commit()
        db.refresh(machine)

    # Stuur koppelcode naar machine zodat hij hem kan tonen
    await websocket.send_json({
        "type": "pair_code",
        "code": machine.pair_code,
        "paired": machine.paired,
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "heartbeat":
                machine.last_seen = datetime.utcnow()
                if "version" in data:
                    machine.version = data["version"]
                if "model" in data:
                    machine.model = data["model"]
                db.add(machine)
                db.commit()
                await websocket.send_json({"type": "heartbeat_ack"})

            elif "req_id" in data:
                conn.resolve(data["req_id"], data)

    except WebSocketDisconnect:
        pass
    finally:
        connected_machines.pop(machine_id, None)

# ── Shopify auth ──────────────────────────────────────────────────────────────

@app.post("/api/auth/shopify")
async def shopify_login(body: dict, db: Session = Depends(get_session)):
    """
    Wissel een Shopify customer access token in voor een MIXMATE JWT.
    De frontend logt in via Shopify Storefront API en stuurt het token hierheen.
    """
    access_token = body.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="access_token ontbreekt")

    if not SHOPIFY_DOMAIN or not SHOPIFY_STOREFRONT_TOKEN:
        raise HTTPException(status_code=503, detail="Shopify niet geconfigureerd op server")

    # Haal klantgegevens op via Shopify Storefront API
    query = """
    query {
      customer(customerAccessToken: "%s") {
        id
        email
        firstName
        lastName
      }
    }
    """ % access_token

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://{SHOPIFY_DOMAIN}/api/2024-01/graphql.json",
            json={"query": query},
            headers={"X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Shopify verificatie mislukt")

    data = resp.json()
    shopify_customer = data.get("data", {}).get("customer")
    if not shopify_customer:
        raise HTTPException(status_code=401, detail="Ongeldig Shopify token")

    shopify_id = shopify_customer["id"]
    email      = shopify_customer.get("email", "")
    name       = f"{shopify_customer.get('firstName', '')} {shopify_customer.get('lastName', '')}".strip()

    customer = db.exec(select(Customer).where(Customer.shopify_customer_id == shopify_id)).first()
    if not customer:
        customer = Customer(shopify_customer_id=shopify_id, email=email, name=name)
        db.add(customer)
    else:
        customer.email = email
        customer.name  = name
        db.add(customer)
    db.commit()
    db.refresh(customer)

    return {"token": create_token(customer.id), "name": name, "email": email}

# ── Machines API ──────────────────────────────────────────────────────────────

@app.get("/api/machines")
def list_machines(customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    machines = db.exec(select(Machine).where(Machine.customer_id == customer_id)).all()
    return [_machine_dict(m) for m in machines]

@app.post("/api/machines/pair")
def pair_machine(body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    code = str(body.get("code", "")).strip()
    machine = db.exec(select(Machine).where(Machine.pair_code == code)).first()

    if not machine:
        raise HTTPException(status_code=404, detail="Koppelcode niet gevonden")
    if machine.paired and machine.customer_id != customer_id:
        raise HTTPException(status_code=409, detail="Deze machine is al gekoppeld aan een ander account")
    if datetime.utcnow() > machine.pair_code_expires:
        raise HTTPException(status_code=410, detail="Koppelcode verlopen — herstart de machine")

    machine.paired = True
    machine.customer_id = customer_id
    # Vernieuw koppelcode zodat hij niet hergebruikt kan worden
    machine.pair_code = str(secrets.randbelow(900000) + 100000)
    machine.pair_code_expires = datetime.utcnow() + timedelta(hours=24)
    db.add(machine)
    db.commit()
    db.refresh(machine)

    # Vertel de machine dat hij gekoppeld is
    conn = connected_machines.get(machine.machine_id)
    if conn:
        asyncio.create_task(conn.send({"type": "paired", "customer_id": customer_id}))

    return _machine_dict(machine)

@app.delete("/api/machines/{machine_id}")
def unpair_machine(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    machine = db.exec(select(Machine).where(
        Machine.machine_id == machine_id,
        Machine.customer_id == customer_id,
    )).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    machine.paired = False
    machine.customer_id = None
    db.add(machine)
    db.commit()
    return {"ok": True}

# ── Machine doorstuur-API (portaal → machine) ─────────────────────────────────

def _get_machine_conn(machine_id: str, customer_id: int, db: Session) -> MachineConnection:
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
        raise HTTPException(status_code=404, detail="Machine niet gevonden")
    online = machine_id in connected_machines
    return {**_machine_dict(machine), "online": online}

@app.get("/api/machines/{machine_id}/recipes")
async def get_recipes(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_machine_conn(machine_id, customer_id, db)
    return await conn.request({"type": "get_recipes"})

@app.get("/api/machines/{machine_id}/pumps")
async def get_pumps(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_machine_conn(machine_id, customer_id, db)
    return await conn.request({"type": "get_pumps"})

@app.get("/api/machines/{machine_id}/settings")
async def get_settings(machine_id: str, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_machine_conn(machine_id, customer_id, db)
    return await conn.request({"type": "get_settings"})

@app.post("/api/machines/{machine_id}/settings")
async def update_settings(machine_id: str, body: dict, customer_id: int = Depends(verify_token), db: Session = Depends(get_session)):
    conn = _get_machine_conn(machine_id, customer_id, db)
    return await conn.request({"type": "update_settings", "data": body})

# ── Helpers ───────────────────────────────────────────────────────────────────

def _machine_dict(m: Machine) -> dict:
    return {
        "machine_id": m.machine_id,
        "name": m.name,
        "model": m.model,
        "version": m.version,
        "paired": m.paired,
        "last_seen": m.last_seen.isoformat() if m.last_seen else None,
    }

# ── Statische frontend serveren ───────────────────────────────────────────────

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        file = FRONTEND_DIST / full_path
        if file.exists() and file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
