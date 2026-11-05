"""SQLite persistence, auth helpers and seed data. No external services."""
from __future__ import annotations
import hashlib, hmac, secrets, sqlite3
from datetime import date, timedelta
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, pw TEXT NOT NULL, role TEXT DEFAULT 'agent', created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clients(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, contact TEXT DEFAULT '', email TEXT DEFAULT '', vat_no TEXT DEFAULT '', address TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS hs_codes(code TEXT PRIMARY KEY, description TEXT NOT NULL, duty_rate REAL NOT NULL, vat_rate REAL DEFAULT 15, levy REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS shipments(id INTEGER PRIMARY KEY, reference TEXT UNIQUE NOT NULL, client_id INTEGER NOT NULL REFERENCES clients(id), direction TEXT, mode TEXT, origin TEXT DEFAULT '', destination TEXT DEFAULT '', port TEXT DEFAULT '', hs_code TEXT DEFAULT '', description TEXT DEFAULT '', gross_weight_kg REAL DEFAULT 0, value REAL DEFAULT 0, freight REAL DEFAULT 0, insurance REAL DEFAULT 0, duty_rate REAL DEFAULT 0, currency TEXT DEFAULT 'USD', fx_rate REAL DEFAULT 1, clearing_fee REAL DEFAULT 0, disbursement REAL DEFAULT 0, port_charge REAL DEFAULT 0, arrival_date TEXT DEFAULT '', status TEXT DEFAULT 'PRE_ARRIVAL', priority TEXT DEFAULT 'Normal', doc_bl INTEGER DEFAULT 0, doc_invoice INTEGER DEFAULT 0, doc_packing INTEGER DEFAULT 0, doc_origin INTEGER DEFAULT 0, doc_import_permit INTEGER DEFAULT 0, doc_freight_invoice INTEGER DEFAULT 0, notes TEXT DEFAULT '', created TEXT DEFAULT CURRENT_TIMESTAMP, updated TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, user_id INTEGER, shipment_id INTEGER, action TEXT NOT NULL, detail TEXT DEFAULT '', at TEXT DEFAULT CURRENT_TIMESTAMP);
"""

def hash_pw(pw: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
    return f"pbkdf2${salt.hex()}${dk.hex()}"

def verify_pw(pw: str, stored: str) -> bool:
    try:
        _, salt_hex, dk_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt_hex), 200_000)
        return hmac.compare_digest(dk.hex(), dk_hex)
    except Exception:
        return False

def connect(path: str | Path) -> sqlite3.Connection:
    p = Path(path); p.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(p, check_same_thread=False); c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL"); c.execute("PRAGMA foreign_keys=ON"); c.executescript(SCHEMA)
    return c

def seed(conn):
    if conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]:
        return
    conn.executemany("INSERT INTO users(email,name,pw,role) VALUES(?,?,?,?)", [
        ("demo@clearline.local", "Demo Agent", hash_pw("Demo1234!"), "admin"),
        ("agent@clearline.local", "Agent User", hash_pw("Agent1234!"), "agent"),
    ])
    conn.executemany("INSERT INTO clients(name,contact,email,vat_no,address) VALUES(?,?,?,?,?)", [
        ("Cape Fresh Foods (Pty) Ltd", "Naledi M.", "naledi@capefresh.example", "VATZA001", "12 Dock Rd, Cape Town"),
        ("Karoo Wool Processors", "Piet van Wyk", "piet@karoo.example", "VATZA002", "44 Church St, Beaufort West"),
        ("Durban Auto Parts", "Zanele D.", "zanele@durbanparts.example", "VATZA003", "9 Bluff Rd, Durban"),
        ("Highveld Mining Supplies", "Thandi K.", "thandi@highveld.example", "VATZA004", "1 Industrial Ave, Witbank"),
    ])
    conn.executemany("INSERT INTO hs_codes VALUES(?,?,?,?,?)", [
        ("0901.21", "Coffee, roasted, not decaffeinated", 0, 15, 0),
        ("5208.52", "Woven fabrics of cotton", 10, 15, 0),
        ("8708.99", "Parts of motor vehicles", 25, 15, 0),
        ("1005.90", "Maize (corn), other", 0, 15, 0),
        ("2701.19", "Coal, other", 0, 15, 0),
        ("3004.90", "Medicaments, other", 0, 15, 0),
        ("4901.99", "Printed books and brochures", 0, 15, 0),
        ("8517.12", "Telephones for cellular networks", 0, 15, 0),
    ])
    today = date.today()
    def d(offset): return (today - timedelta(days=offset)).isoformat()
    rows = [
        ("CL-2026-001", 1, "Import", "Sea", "Santos, Brazil", "Cape Town", "Cape Town", "0901.21", "Roasted coffee beans, 12t", 12000, 42000, 3800, 210, 0, "USD", 18.2, 4500, 1200, 650, d(2), "ASSESSED", "High", 1,1,1,1,0,1, "Awaiting payment confirmation."),
        ("CL-2026-002", 2, "Export", "Sea", "Beaufort West", "Rotterdam", "Cape Town", "5208.52", "Greasy wool bales", 18000, 68000, 5200, 340, 10, "USD", 18.2, 7800, 900, 720, d(12), "RELEASED", "Normal", 1,1,1,1,0,1, ""),
        ("CL-2026-003", 3, "Import", "Sea", "Guangzhou, China", "Durban", "Durban", "8708.99", "Motor vehicle spare parts", 9500, 95000, 7900, 475, 25, "USD", 18.2, 8200, 2400, 1100, d(9), "QUERY", "High", 1,1,0,0,1,1, "Customs query: HS classification disputed."),
        ("CL-2026-004", 4, "Import", "Air", "JHB OR Tambo", "Johannesburg", "OR Tambo Intl", "8517.12", "Mobile phones, 400 units", 320, 28000, 2600, 140, 0, "USD", 18.2, 3100, 250, 180, d(1), "ARRIVED", "Normal", 1,0,0,0,0,0, "Invoice missing from forwarder."),
        ("CL-2026-005", 1, "Import", "Sea", "Mombasa, Kenya", "Durban", "Durban", "1005.90", "White maize, bulk", 24000, 31000, 2900, 155, 0, "USD", 18.2, 3900, 800, 540, d(20), "DELIVERED", "Normal", 1,1,1,1,0,1, ""),
        ("CL-2026-006", 4, "Export", "Road", "Witbank", "Maputo", "Lebombo Border", "2701.19", "Thermal coal to power plant", 20000, 54000, 1800, 0, 0, "ZAR", 1, 2600, 400, 0, d(5), "LODGED", "Normal", 1,1,1,0,0,1, ""),
        ("CL-2026-007", 3, "Transit", "Rail", "Durban", "Harare", "Durban", "3004.90", "Medicaments in transit", 1500, 19000, 2200, 95, 0, "USD", 18.2, 2800, 600, 410, d(0), "PRE_ARRIVAL", "Low", 0,0,0,0,0,0, "ETA tomorrow."),
        ("CL-2026-008", 2, "Import", "Sea", "Valparaiso, Chile", "Cape Town", "Cape Town", "4901.99", "Printed books, cartons", 4200, 15000, 2100, 80, 0, "USD", 18.2, 3900, 500, 380, d(15), "LODGED", "Normal", 1,1,1,1,0,1, ""),
    ]
    cols = "reference,client_id,direction,mode,origin,destination,port,hs_code,description,gross_weight_kg,value,freight,insurance,duty_rate,currency,fx_rate,clearing_fee,disbursement,port_charge,arrival_date,status,priority,doc_bl,doc_invoice,doc_packing,doc_origin,doc_import_permit,doc_freight_invoice,notes"
    conn.executemany(f"INSERT INTO shipments({cols}) VALUES({','.join('?'*len(rows[0]))})", rows)
    conn.execute("INSERT INTO audit(user_id,shipment_id,action,detail) VALUES(1,NULL,'seed','Demo data loaded')")
    conn.commit()

def create_user(conn, email, name, pw):
    conn.execute("INSERT INTO users(email,name,pw) VALUES(?,?,?)", (email.strip().lower(), name.strip(), hash_pw(pw))); conn.commit()

def authenticate(conn, email, pw):
    r = conn.execute("SELECT * FROM users WHERE email=?", (email.strip().lower(),)).fetchone()
    return dict(r) if r and verify_pw(pw, r["pw"]) else None

def new_session(conn, user_id) -> str:
    tok = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions VALUES(?,?,?)", (hashlib.sha256(tok.encode()).hexdigest(), user_id, (date.today()+timedelta(days=7)).isoformat())); conn.commit(); return tok

def user_for_token(conn, tok):
    if not tok: return None
    r = conn.execute("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>=date('now')", (hashlib.sha256(tok.encode()).hexdigest(),)).fetchone()
    return dict(r) if r else None

def audit(conn, user_id, shipment_id, action, detail=""):
    conn.execute("INSERT INTO audit(user_id,shipment_id,action,detail) VALUES(?,?,?,?)", (user_id, shipment_id, action, detail)); conn.commit()
