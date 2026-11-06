"""Seed realistic demo data so the product is usable on first launch."""

from werkzeug.security import generate_password_hash

from db import get_conn, execute, query, init_db
from calc import compute_duty


def _party(conn, name, ptype, address, contact, email, phone, tax_id):
    now = "2026-01-10T09:00:00"
    return execute(
        "INSERT INTO parties (name,type,address,contact_person,email,phone,tax_id,created_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (name, ptype, address, contact, email, phone, tax_id, now),
    )


def _shipment(conn, ref, importer, exporter, consignee, carrier, bl, vessel, pol, pod,
              eta, arrival, status, hs, desc, qty, unit, price, curr, freight, insurance,
              duty_rate, cess_rate, igst_rate, free_days, demurrage, created, updated):
    cif = compute_duty(round(price * qty + freight + insurance, 2), duty_rate, cess_rate, igst_rate)
    return execute(
        "INSERT INTO shipments (reference,importer_id,exporter_id,consignee_id,carrier_id,"
        "bl_number,vessel_flight,port_of_loading,port_of_discharge,eta,actual_arrival,status,"
        "hs_code,description,quantity,unit,unit_price,currency,freight,insurance,cif_value,"
        "duty_rate,cess_rate,igst_rate,duty_amount,cess_amount,igst_amount,total_payable,"
        "duty_paid_at,free_days,demurrage_per_day,created_at,updated_at) VALUES (?,?,?,?,?,?,"
        "?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (ref, importer, exporter, consignee, carrier, bl, vessel, pol, pod, eta, arrival, status,
         hs, desc, qty, unit, price, curr, freight, insurance, cif["cif_value"],
         duty_rate, cess_rate, igst_rate, cif["duty_amount"], cif["cess_amount"],
         cif["igst_amount"], cif["total_payable"], None, free_days, demurrage, created, updated),
    )


def run():
    init_db()
    conn = get_conn()
    conn.executescript("""
    DELETE FROM status_history;
    DELETE FROM documents;
    DELETE FROM shipments;
    DELETE FROM parties;
    DELETE FROM users;
    """)
    conn.commit()
    conn.close()

    p_importer = _party(get_conn(), "Bluewater Imports Pvt Ltd", "importer",
                        "Unit 4B, JNPT Logistics Park, Nhava Sheva, Maharashtra 400707",
                        "Ravi Desai", "ravi@bluewater.in", "+91 22 2724 1100", "GST27AAABC1234Q1ZS")
    p_exporter = _party(get_conn(), "Hamburg Trade GmbH", "exporter",
                        "Alter Elbhafen 12, 20457 Hamburg, Germany",
                        "Klaus Meyer", "exports@hamburgtrade.de", "+49 40 3340 5500", "DE123456789")
    p_consignee = _party(get_conn(), "Bluewater Imports Pvt Ltd", "consignee",
                         "Unit 4B, JNPT Logistics Park, Nhava Sheva, Maharashtra 400707",
                         "Ravi Desai", "ravi@bluewater.in", "+91 22 2724 1100", "GST27AAABC1234Q1ZS")
    p_carrier = _party(get_conn(), "Maersk Line India", "carrier",
                       "5th Floor, Maker Tower, Cuffe Parade, Mumbai 400005",
                       "Anita Nair", "bookings.maersk@maersk.com", "+91 22 6656 1000", "GST27AABCM9999R1ZS")

    # shipment 1: delivered, duty paid
    sid1 = _shipment(get_conn(), "IMP-2026-0041", p_importer, p_exporter, p_consignee, p_carrier,
              "MSKU1234567", "MV Northern Star / 216E", "Hamburg, Germany", "Nhava Sheva, India",
              "2026-04-20", "2026-04-22", "delivered",
              "8708.99", "Automobile brake components", 12, "cartons", 185.00, "USD",
              1200.00, 450.00, 5.0, 2.0, 18.0, 7, 150.00, "2026-03-20T08:00:00", "2026-05-10T14:30:00")
    # shipment 2: duty_paid, out for delivery soon
    _shipment(get_conn(), "IMP-2026-0042", p_importer, p_exporter, p_consignee, p_carrier,
              "MSKU1234568", "MV Baltic Trader / 217E", "Bremerhaven, Germany", "Nhava Sheva, India",
              "2026-05-02", "2026-05-04", "duty_paid",
              "4202.92", "Leather travel bags", 45, "pieces", 62.00, "USD",
              900.00, 320.00, 10.0, 3.0, 18.0, 7, 125.00, "2026-04-01T09:00:00", "2026-05-12T11:00:00")
    # shipment 3: assessed, awaiting duty payment
    _shipment(get_conn(), "IMP-2026-0043", p_importer, p_exporter, p_consignee, p_carrier,
              "MSKU1234569", "MV Atlantic Link / 218E", "Rotterdam, Netherlands", "Nhava Sheva, India",
              "2026-05-10", "2026-05-12", "assessed",
              "8471.30", "Portable data terminals", 8, "units", 420.00, "USD",
              750.00, 280.00, 0.0, 2.0, 18.0, 7, 200.00, "2026-04-15T10:00:00", "2026-05-14T16:45:00")
    # shipment 4: under examination
    _shipment(get_conn(), "IMP-2026-0044", p_importer, p_exporter, p_consignee, p_carrier,
              "MSKU1234570", "MV Suez Express / 219E", "Singapore", "Nhava Sheva, India",
              "2026-05-14", "2026-05-16", "examined",
              "6304.91", "Cotton bedlinen sets", 120, "packs", 24.50, "USD",
              600.00, 210.00, 10.0, 3.0, 12.0, 7, 100.00, "2026-04-25T08:30:00", "2026-05-15T09:00:00")
    # shipment 5: filed with customs
    _shipment(get_conn(), "IMP-2026-0045", p_importer, p_exporter, p_consignee, p_carrier,
              "MSKU1234571", "MV Cape Star / 220E", "Shanghai, China", "Nhava Sheva, India",
              "2026-05-18", None, "filed",
              "8517.12", "Wireless access points", 30, "boxes", 98.00, "USD",
              1100.00, 400.00, 0.0, 2.0, 18.0, 7, 175.00, "2026-05-01T09:00:00", "2026-05-15T10:15:00")
    # shipment 6: draft, docs not yet received
    _shipment(get_conn(), "IMP-2026-0046", p_importer, p_exporter, p_consignee, p_carrier,
              None, None, "Felixstowe, UK", "Nhava Sheva, India",
              "2026-05-25", None, "draft",
              "6203.42", "Men's cotton trousers", 200, "pieces", 15.00, "USD",
              0.0, 0.0, 10.0, 2.0, 18.0, 7, 90.00, "2026-05-15T08:00:00", "2026-05-15T08:00:00")

    # Seed one agent user so the audit trail references a real actor.
    uid = execute(
        "INSERT INTO users (username, password_hash, role, created_at) VALUES (?,?,?,?)",
        ("agent", generate_password_hash("agent123"), "user", "2026-01-10T09:00:00"),
    )

    # status history entries
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)", (sid1, "draft", "docs_received", uid, "2026-04-22T08:00:00", "Documents received from carrier"))
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)", (sid1, "docs_received", "filed", uid, "2026-04-23T10:00:00", "Bill of Entry filed"))
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)", (sid1, "filed", "examined", uid, "2026-04-24T09:00:00", "Customs examination completed"))
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)", (sid1, "examined", "assessed", uid, "2026-04-25T11:00:00", "Assessment order received"))
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)", (sid1, "assessed", "duty_paid", uid, "2026-05-05T14:00:00", "Duty paid via e-payment"))
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)", (sid1, "duty_paid", "out_for_delivery", uid, "2026-05-08T09:00:00", "Released for delivery"))
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)", (sid1, "delivered", "closed", uid, "2026-05-12T10:00:00", "File closed after POD received"))

    print("Seed data loaded.")


if __name__ == "__main__":
    run()
