import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
DB_PATH = os.path.join(INSTANCE_DIR, "clearance.db")


def get_conn():
    """Open a SQLite connection with row factory and foreign keys enabled."""
    os.makedirs(INSTANCE_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('importer','exporter','consignee','agent','carrier')),
    address TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    tax_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
    importer_id INTEGER,
    exporter_id INTEGER,
    consignee_id INTEGER,
    carrier_id INTEGER,
    bl_number TEXT,
    vessel_flight TEXT,
    port_of_loading TEXT,
    port_of_discharge TEXT,
    eta TEXT,
    actual_arrival TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    hs_code TEXT,
    description TEXT,
    quantity REAL,
    unit TEXT,
    unit_price REAL,
    currency TEXT DEFAULT 'USD',
    freight REAL DEFAULT 0,
    insurance REAL DEFAULT 0,
    cif_value REAL DEFAULT 0,
    duty_rate REAL DEFAULT 0,
    cess_rate REAL DEFAULT 0,
    igst_rate REAL DEFAULT 0,
    duty_amount REAL DEFAULT 0,
    cess_amount REAL DEFAULT 0,
    igst_amount REAL DEFAULT 0,
    total_payable REAL DEFAULT 0,
    duty_paid_at TEXT,
    free_days INTEGER DEFAULT 7,
    demurrage_per_day REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (importer_id) REFERENCES parties(id),
    FOREIGN KEY (exporter_id) REFERENCES parties(id),
    FOREIGN KEY (consignee_id) REFERENCES parties(id),
    FOREIGN KEY (carrier_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL,
    doc_type TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT,
    generated INTEGER DEFAULT 0,
    uploaded_at TEXT NOT NULL,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by INTEGER,
    changed_at TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_reference ON shipments(reference);
CREATE INDEX IF NOT EXISTS idx_documents_shipment ON documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_status_history_shipment ON status_history(shipment_id);
"""


def init_db():
    """Initialise the database schema. Safe to call repeatedly."""
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def query(sql, params=(), one=False):
    conn = get_conn()
    cur = conn.execute(sql, params)
    rows = cur.fetchall()
    conn.commit()
    conn.close()
    return rows[0] if one and rows else rows


def execute(sql, params=()):
    conn = get_conn()
    cur = conn.execute(sql, params)
    conn.commit()
    last_id = cur.lastrowid
    conn.close()
    return last_id
