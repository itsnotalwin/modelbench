"""ClearOps — customs clearance workflow SaaS for clearing agents.

A single-file Flask application (plus db/calc/documents modules) that runs
entirely locally with SQLite persistence. One install command, one start command.
"""

import os
import re
from datetime import datetime
from functools import wraps

from flask import (
    Flask, render_template, request, redirect, url_for, flash, session,
    send_file, abort,
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from db import init_db, get_conn, query, execute
from calc import (
    STATUSES, STATUS_LABELS, STATUS_ORDER, allowed_transition,
    compute_duty, compute_demurrage, assessable_value, parse_date,
)
from documents import (
    generate_invoice_pdf, generate_packing_list_pdf, generate_bill_of_entry_pdf,
)

APP_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(APP_DIR, "uploads")
GENERATED_DIR = os.path.join(APP_DIR, "generated_pdfs")
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "doc", "docx"}

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me-in-production")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["GENERATED_DIR"] = GENERATED_DIR
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024  # 12 MB uploads

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)

# --------------------------------------------------------------------------- #
# Auth helpers
# --------------------------------------------------------------------------- #

def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def current_user():
    if "user_id" not in session:
        return None
    return query("SELECT id, username, role FROM users WHERE id = ?", (session["user_id"],), one=True)


# --------------------------------------------------------------------------- #
# Validation
# --------------------------------------------------------------------------- #

REF_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\-]{0,39}$")


def validate_shipment(form, existing_reference=None):
    """Validate a shipment form submission. Returns (errors_dict, data_dict)."""
    errors = {}

    def field(name, default=""):
        return (form.get(name) or default).strip()

    reference = field("reference")
    if not reference:
        errors["reference"] = "Reference is required."
    elif not REF_RE.match(reference):
        errors["reference"] = "Reference must be alphanumeric with hyphens only, max 40 chars."
    elif existing_reference != reference:
        row = query("SELECT id FROM shipments WHERE reference = ?", (reference,), one=True)
        if row:
            errors["reference"] = "Reference already exists."

    bl_number = field("bl_number")
    vessel_flight = field("vessel_flight")
    port_of_loading = field("port_of_loading")
    port_of_discharge = field("port_of_discharge")
    hs_code = field("hs_code")
    description = field("description")

    if not bl_number:
        errors["bl_number"] = "Bill of Lading / AWB number is required."
    if not vessel_flight:
        errors["vessel_flight"] = "Vessel / flight is required."
    if not port_of_loading:
        errors["port_of_loading"] = "Port of loading is required."
    if not port_of_discharge:
        errors["port_of_discharge"] = "Port of discharge is required."
    if not hs_code:
        errors["hs_code"] = "HS code is required."
    elif not re.match(r"^\d{4}(\.\d{2}){1,3}$", hs_code):
        errors["hs_code"] = "HS code must look like 8708.99 or 8708.99.00."
    if not description:
        errors["description"] = "Description of goods is required."

    def money(name):
        try:
            return float(form.get(name) or 0)
        except (TypeError, ValueError):
            return None

    def pos_int(name, default):
        try:
            v = int(form.get(name) or default)
            return v
        except (TypeError, ValueError):
            return None

    quantity = pos_int("quantity", 0)
    unit_price = money("unit_price")
    freight = money("freight")
    insurance = money("insurance")
    duty_rate = money("duty_rate")
    cess_rate = money("cess_rate")
    igst_rate = money("igst_rate")
    free_days = pos_int("free_days", 7)
    demurrage_per_day = money("demurrage_per_day")

    for name, val, label in (
        ("quantity", quantity, "Quantity"),
        ("unit_price", unit_price, "Unit price"),
        ("freight", freight, "Freight"),
        ("insurance", insurance, "Insurance"),
        ("duty_rate", duty_rate, "Duty rate"),
        ("cess_rate", cess_rate, "Cess rate"),
        ("igst_rate", igst_rate, "IGST rate"),
        ("free_days", free_days, "Free days"),
        ("demurrage_per_day", demurrage_per_day, "Demurrage per day"),
    ):
        if val is None:
            errors[name] = "%s must be a valid number." % label
        elif val < 0:
            errors[name] = "%s cannot be negative." % label

    eta = field("eta")
    actual_arrival = field("actual_arrival")
    eta_date = parse_date(eta) if eta else None
    arrival_date = parse_date(actual_arrival) if actual_arrival else None

    if eta and not eta_date:
        errors["eta"] = "ETA must be a valid date (YYYY-MM-DD)."
    if actual_arrival and not arrival_date:
        errors["actual_arrival"] = "Actual arrival must be a valid date (YYYY-MM-DD)."
    if eta_date and arrival_date and arrival_date < eta_date:
        errors["actual_arrival"] = "Actual arrival cannot be earlier than ETA."

    currency = (form.get("currency") or "USD").strip().upper()
    if len(currency) != 3 or not currency.isalpha():
        currency = "USD"

    status = (form.get("status") or "draft").strip()
    if status not in STATUSES:
        status = "draft"

    unit = field("unit") or "pcs"

    data = {
        "reference": reference,
        "importer_id": form.get("importer_id") or None,
        "exporter_id": form.get("exporter_id") or None,
        "consignee_id": form.get("consignee_id") or None,
        "carrier_id": form.get("carrier_id") or None,
        "bl_number": bl_number,
        "vessel_flight": vessel_flight,
        "port_of_loading": port_of_loading,
        "port_of_discharge": port_of_discharge,
        "eta": eta or None,
        "actual_arrival": actual_arrival or None,
        "status": status,
        "hs_code": hs_code,
        "description": description,
        "quantity": quantity if quantity is not None else 0,
        "unit": unit,
        "unit_price": unit_price if unit_price is not None else 0,
        "currency": currency,
        "freight": freight if freight is not None else 0,
        "insurance": insurance if insurance is not None else 0,
        "duty_rate": duty_rate if duty_rate is not None else 0,
        "cess_rate": cess_rate if cess_rate is not None else 0,
        "igst_rate": igst_rate if igst_rate is not None else 0,
        "free_days": free_days if free_days is not None else 7,
        "demurrage_per_day": demurrage_per_day if demurrage_per_day is not None else 0,
    }
    return errors, data


# --------------------------------------------------------------------------- #
# Setup
# --------------------------------------------------------------------------- #

init_db()


# --------------------------------------------------------------------------- #
# Routes — auth
# --------------------------------------------------------------------------- #

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        user = query("SELECT * FROM users WHERE username = ?", (username,), one=True)
        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid username or password.", "error")
            return render_template("login.html")
        session["user_id"] = user["id"]
        session["username"] = user["username"]
        flash("Welcome back, %s." % user["username"], "success")
        return redirect(request.args.get("next") or url_for("dashboard"))
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        confirm = request.form.get("confirm") or ""
        if not username:
            flash("Username is required.", "error")
        elif not re.match(r"^[A-Za-z0-9_\-]{3,30}$", username):
            flash("Username must be 3–30 alphanumeric characters, underscores or hyphens.", "error")
        elif len(password) < 6:
            flash("Password must be at least 6 characters.", "error")
        elif password != confirm:
            flash("Passwords do not match.", "error")
        elif query("SELECT id FROM users WHERE username = ?", (username,), one=True):
            flash("Username already taken.", "error")
        else:
            execute(
                "INSERT INTO users (username, password_hash, role, created_at) VALUES (?,?,?,?)",
                (username, generate_password_hash(password), "user", datetime.utcnow().isoformat()),
            )
            flash("Account created. Please sign in.", "success")
            return redirect(url_for("login"))
    return render_template("register.html")


@app.route("/logout")
@login_required
def logout():
    session.clear()
    flash("You have been signed out.", "success")
    return redirect(url_for("login"))


# --------------------------------------------------------------------------- #
# Routes — dashboard
# --------------------------------------------------------------------------- #

@app.route("/")
@login_required
def dashboard():
    shipments = query("SELECT * FROM shipments ORDER BY updated_at DESC LIMIT 8")
    # Status summary counts
    counts = {}
    for s in STATUSES:
        row = query("SELECT COUNT(*) AS c FROM shipments WHERE status = ?", (s,), one=True)
        counts[s] = row["c"] if row else 0
    total = sum(counts.values())

    # Demurrage alerts: shipments arrived with billable demurrage
    alerts = []
    rows = query("SELECT * FROM shipments WHERE actual_arrival IS NOT NULL AND status NOT IN ('delivered','closed') ORDER BY actual_arrival")
    for r in rows:
        dem = compute_demurrage(r["actual_arrival"], r["free_days"], r["demurrage_per_day"])
        if dem["billable_days"] > 0:
            alerts.append({"shipment": r, "demurrage": dem})

    return render_template("index.html", shipments=shipments, counts=counts,
                           total=total, alerts=alerts, STATUS_LABELS=STATUS_LABELS)


# --------------------------------------------------------------------------- #
# Routes — shipments
# --------------------------------------------------------------------------- #

@app.route("/shipments")
@login_required
def shipments_list():
    q = (request.args.get("q") or "").strip()
    status = request.args.get("status") or ""
    party_type = request.args.get("party") or ""
    sort = request.args.get("sort") or "updated_at_desc"

    sql = "SELECT s.*, p.name AS importer_name FROM shipments s LEFT JOIN parties p ON s.importer_id = p.id"
    params = []
    conditions = []
    if q:
        conditions.append("(s.reference LIKE ? OR s.bl_number LIKE ? OR s.description LIKE ? OR p.name LIKE ?)")
        like = "%" + q + "%"
        params.extend([like, like, like, like])
    if status:
        conditions.append("s.status = ?")
        params.append(status)
    if party_type:
        conditions.append("s.importer_id IN (SELECT id FROM parties WHERE type = ?)")
        params.append(party_type)

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    if sort == "reference_asc":
        sql += " ORDER BY s.reference ASC"
    elif sort == "eta_asc":
        sql += " ORDER BY s.eta ASC"
    elif sort == "created_desc":
        sql += " ORDER BY s.created_at DESC"
    else:
        sql += " ORDER BY s.updated_at DESC"

    rows = query(sql, tuple(params))

    parties = query("SELECT id, name, type FROM parties ORDER BY name")
    return render_template("shipments.html", shipments=rows, parties=parties,
                           q=q, status=status, party_type=party_type, sort=sort,
                           STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS)


@app.route("/shipments/new", methods=["GET", "POST"])
@login_required
def shipment_new():
    parties = query("SELECT id, name, type FROM parties ORDER BY name")
    if request.method == "POST":
        errors, data = validate_shipment(request.form)
        if errors:
            return render_template("shipment_form.html", shipment=data, parties=parties,
                                   errors=errors, STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS,
                                   mode="create")
        # Compute financials
        cif = assessable_value(data["unit_price"], data["quantity"], data["freight"], data["insurance"])
        duty = compute_duty(cif, data["duty_rate"], data["cess_rate"], data["igst_rate"])
        now = datetime.utcnow().isoformat()
        sid = execute(
            "INSERT INTO shipments (reference,importer_id,exporter_id,consignee_id,carrier_id,"
            "bl_number,vessel_flight,port_of_loading,port_of_discharge,eta,actual_arrival,status,"
            "hs_code,description,quantity,unit,unit_price,currency,freight,insurance,cif_value,"
            "duty_rate,cess_rate,igst_rate,duty_amount,cess_amount,igst_amount,total_payable,"
            "duty_paid_at,free_days,demurrage_per_day,created_at,updated_at) VALUES (?,?,?,?,?,?,"
            "?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (data["reference"], data["importer_id"], data["exporter_id"], data["consignee_id"],
             data["carrier_id"], data["bl_number"], data["vessel_flight"],
             data["port_of_loading"], data["port_of_discharge"], data["eta"],
             data["actual_arrival"], data["status"], data["hs_code"], data["description"],
             data["quantity"], data["unit"], data["unit_price"], data["currency"],
             data["freight"], data["insurance"], cif, data["duty_rate"], data["cess_rate"],
             data["igst_rate"], duty["duty_amount"], duty["cess_amount"],
             duty["igst_amount"], duty["total_payable"], None, data["free_days"],
             data["demurrage_per_day"], now, now),
        )
        execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
                "VALUES (?,?,?,?,?,?)",
                (sid, None, data["status"], session.get("user_id"), now, "Shipment created"))
        flash("Shipment %s created." % data["reference"], "success")
        return redirect(url_for("shipment_detail", shipment_id=sid))
    return render_template("shipment_form.html", shipment=None, parties=parties, errors={},
                           STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS, mode="create")


@app.route("/shipments/<int:shipment_id>")
@login_required
def shipment_detail(shipment_id):
    s = query("SELECT * FROM shipments WHERE id = ?", (shipment_id,), one=True)
    if not s:
        abort(404)
    importer = query("SELECT * FROM parties WHERE id = ?", (s["importer_id"],), one=True) if s["importer_id"] else None
    exporter = query("SELECT * FROM parties WHERE id = ?", (s["exporter_id"],), one=True) if s["exporter_id"] else None
    consignee = query("SELECT * FROM parties WHERE id = ?", (s["consignee_id"],), one=True) if s["consignee_id"] else None
    carrier = query("SELECT * FROM parties WHERE id = ?", (s["carrier_id"],), one=True) if s["carrier_id"] else None
    docs = query("SELECT * FROM documents WHERE shipment_id = ? ORDER BY uploaded_at DESC", (shipment_id,))
    history = query("""SELECT h.*, u.username FROM status_history h
                       LEFT JOIN users u ON h.changed_by = u.id
                       WHERE h.shipment_id = ? ORDER BY h.changed_at DESC""", (shipment_id,))
    demurrage = compute_demurrage(s["actual_arrival"], s["free_days"], s["demurrage_per_day"])
    cif = assessable_value(s["unit_price"], s["quantity"], s["freight"], s["insurance"])
    duty = compute_duty(cif, s["duty_rate"], s["cess_rate"], s["igst_rate"])
    return render_template("shipment.html", s=s, importer=importer, exporter=exporter,
                           consignee=consignee, carrier=carrier, docs=docs, history=history,
                           demurrage=demurrage, cif=cif, duty=duty,
                           STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS)


@app.route("/shipments/<int:shipment_id>/edit", methods=["GET", "POST"])
@login_required
def shipment_edit(shipment_id):
    s = query("SELECT * FROM shipments WHERE id = ?", (shipment_id,), one=True)
    if not s:
        abort(404)
    parties = query("SELECT id, name, type FROM parties ORDER BY name")
    if request.method == "POST":
        errors, data = validate_shipment(request.form, existing_reference=s["reference"])
        if errors:
            merged = dict(s)
            merged.update(data)
            return render_template("shipment_form.html", shipment=merged, parties=parties,
                                   errors=errors, STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS,
                                   mode="edit", shipment_id=shipment_id)
        # Validate forward-only status transition
        old_status = s["status"]
        new_status = data["status"]
        if not allowed_transition(old_status, new_status) and old_status != new_status:
            flash("Cannot regress shipment status from %s to %s." % (STATUS_LABELS.get(old_status, old_status),
                                                                     STATUS_LABELS.get(new_status, new_status)), "error")
            merged = dict(s)
            merged.update(data)
            return render_template("shipment_form.html", shipment=merged, parties=parties,
                                   errors={}, STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS,
                                   mode="edit", shipment_id=shipment_id)

        cif = assessable_value(data["unit_price"], data["quantity"], data["freight"], data["insurance"])
        duty = compute_duty(cif, data["duty_rate"], data["cess_rate"], data["igst_rate"])
        now = datetime.utcnow().isoformat()
        execute(
            "UPDATE shipments SET reference=?,importer_id=?,exporter_id=?,consignee_id=?,carrier_id=?,"
            "bl_number=?,vessel_flight=?,port_of_loading=?,port_of_discharge=?,eta=?,actual_arrival=?,"
            "status=?,hs_code=?,description=?,quantity=?,unit=?,unit_price=?,currency=?,freight=?,"
            "insurance=?,cif_value=?,duty_rate=?,cess_rate=?,igst_rate=?,duty_amount=?,cess_amount=?,"
            "igst_amount=?,total_payable=?,free_days=?,demurrage_per_day=?,updated_at=? WHERE id=?",
            (data["reference"], data["importer_id"], data["exporter_id"], data["consignee_id"],
             data["carrier_id"], data["bl_number"], data["vessel_flight"],
             data["port_of_loading"], data["port_of_discharge"], data["eta"],
             data["actual_arrival"], data["status"], data["hs_code"], data["description"],
             data["quantity"], data["unit"], data["unit_price"], data["currency"],
             data["freight"], data["insurance"], cif, data["duty_rate"], data["cess_rate"],
             data["igst_rate"], duty["duty_amount"], duty["cess_amount"],
             duty["igst_amount"], duty["total_payable"], data["free_days"],
             data["demurrage_per_day"], now, shipment_id),
        )
        if old_status != new_status:
            execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
                    "VALUES (?,?,?,?,?,?)",
                    (shipment_id, old_status, new_status, session.get("user_id"), now,
                     "Status changed %s -> %s" % (old_status, new_status)))
        flash("Shipment %s updated." % data["reference"], "success")
        return redirect(url_for("shipment_detail", shipment_id=shipment_id))
    return render_template("shipment_form.html", shipment=s, parties=parties, errors={},
                           STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS, mode="edit",
                           shipment_id=shipment_id)


@app.route("/shipments/<int:shipment_id>/delete", methods=["POST"])
@login_required
def shipment_delete(shipment_id):
    s = query("SELECT * FROM shipments WHERE id = ?", (shipment_id,), one=True)
    if not s:
        abort(404)
    execute("DELETE FROM shipments WHERE id = ?", (shipment_id,))
    flash("Shipment %s deleted." % s["reference"], "success")
    return redirect(url_for("shipments_list"))


@app.route("/shipments/<int:shipment_id>/status", methods=["POST"])
@login_required
def shipment_status(shipment_id):
    s = query("SELECT * FROM shipments WHERE id = ?", (shipment_id,), one=True)
    if not s:
        abort(404)
    new_status = (request.form.get("status") or "").strip()
    note = (request.form.get("note") or "").strip()
    if new_status not in STATUSES:
        flash("Invalid status.", "error")
        return redirect(url_for("shipment_detail", shipment_id=shipment_id))
    if not allowed_transition(s["status"], new_status) and s["status"] != new_status:
        flash("Cannot move %s to %s (statuses only move forward)." % (STATUS_LABELS[s["status"]], STATUS_LABELS[new_status]), "error")
        return redirect(url_for("shipment_detail", shipment_id=shipment_id))
    now = datetime.utcnow().isoformat()
    execute("UPDATE shipments SET status=?, updated_at=? WHERE id=?", (new_status, now, shipment_id))
    execute("INSERT INTO status_history (shipment_id,from_status,to_status,changed_by,changed_at,note) "
            "VALUES (?,?,?,?,?,?)",
            (shipment_id, s["status"], new_status, session.get("user_id"), now, note))
    flash("Status updated to %s." % STATUS_LABELS[new_status], "success")
    return redirect(url_for("shipment_detail", shipment_id=shipment_id))


# --------------------------------------------------------------------------- #
# Routes — documents
# --------------------------------------------------------------------------- #

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/shipments/<int:shipment_id>/documents", methods=["POST"])
@login_required
def document_upload(shipment_id):
    s = query("SELECT * FROM shipments WHERE id = ?", (shipment_id,), one=True)
    if not s:
        abort(404)
    if "file" not in request.files:
        flash("No file selected.", "error")
        return redirect(url_for("shipment_detail", shipment_id=shipment_id))
    file = request.files["file"]
    doc_type = (request.form.get("doc_type") or "other").strip()
    if file.filename == "":
        flash("No file selected.", "error")
        return redirect(url_for("shipment_detail", shipment_id=shipment_id))
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        safe_ref = "".join(c for c in s["reference"] if c.isalnum() or c in "-_")
        filename = "%s_%s" % (safe_ref, filename)
        path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(path)
        execute("INSERT INTO documents (shipment_id,doc_type,file_name,file_path,generated,uploaded_at) "
                "VALUES (?,?,?,?,?,?)",
                (shipment_id, doc_type, file.filename, path, 0, datetime.utcnow().isoformat()))
        flash("Document %s uploaded." % file.filename, "success")
    else:
        flash("File type not allowed.", "error")
    return redirect(url_for("shipment_detail", shipment_id=shipment_id))


@app.route("/documents/<int:doc_id>/download")
@login_required
def document_download(doc_id):
    d = query("SELECT * FROM documents WHERE id = ?", (doc_id,), one=True)
    if not d:
        abort(404)
    if not os.path.exists(d["file_path"]):
        abort(404)
    return send_file(d["file_path"], as_attachment=True, download_name=d["file_name"])


@app.route("/shipments/<int:shipment_id>/documents/<doc_type>/pdf")
@login_required
def shipment_document_pdf(shipment_id, doc_type):
    s = query("SELECT * FROM shipments WHERE id = ?", (shipment_id,), one=True)
    if not s:
        abort(404)
    s = dict(s)
    parties = query("SELECT * FROM parties")
    party_list = [dict(p) for p in parties]
    generators = {
        "invoice": generate_invoice_pdf,
        "packing_list": generate_packing_list_pdf,
        "bill_of_entry": generate_bill_of_entry_pdf,
    }
    if doc_type not in generators:
        abort(404)
    path = generators[doc_type](s, party_list)
    # Record the generated document
    existing = query("SELECT id FROM documents WHERE shipment_id=? AND doc_type=? AND generated=1",
                     (shipment_id, doc_type), one=True)
    if not existing:
        execute("INSERT INTO documents (shipment_id,doc_type,file_name,file_path,generated,uploaded_at) "
                "VALUES (?,?,?,?,?,?)",
                (shipment_id, doc_type, os.path.basename(path), path, 1, datetime.utcnow().isoformat()))
    return send_file(path, as_attachment=True,
                     download_name="%s_%s.pdf" % (s["reference"], doc_type))


# --------------------------------------------------------------------------- #
# Routes — parties
# --------------------------------------------------------------------------- #

@app.route("/parties")
@login_required
def parties_list():
    parties = query("SELECT * FROM parties ORDER BY type, name")
    return render_template("parties.html", parties=parties)


@app.route("/parties/new", methods=["GET", "POST"])
@login_required
def party_new():
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        ptype = (request.form.get("type") or "").strip()
        address = (request.form.get("address") or "").strip()
        contact = (request.form.get("contact_person") or "").strip()
        email = (request.form.get("email") or "").strip()
        phone = (request.form.get("phone") or "").strip()
        tax_id = (request.form.get("tax_id") or "").strip()
        errors = []
        if not name:
            errors.append("Name is required.")
        if ptype not in ("importer", "exporter", "consignee", "agent", "carrier"):
            errors.append("Valid party type is required.")
        if email and "@" not in email:
            errors.append("Email must be valid.")
        if errors:
            for e in errors:
                flash(e, "error")
            return render_template("party_form.html", party=request.form, mode="create")
        now = datetime.utcnow().isoformat()
        execute("INSERT INTO parties (name,type,address,contact_person,email,phone,tax_id,created_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                (name, ptype, address, contact, email, phone, tax_id, now))
        flash("Party %s created." % name, "success")
        return redirect(url_for("parties_list"))
    return render_template("party_form.html", party=None, mode="create")


@app.route("/parties/<int:party_id>/edit", methods=["GET", "POST"])
@login_required
def party_edit(party_id):
    p = query("SELECT * FROM parties WHERE id = ?", (party_id,), one=True)
    if not p:
        abort(404)
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        ptype = (request.form.get("type") or "").strip()
        address = (request.form.get("address") or "").strip()
        contact = (request.form.get("contact_person") or "").strip()
        email = (request.form.get("email") or "").strip()
        phone = (request.form.get("phone") or "").strip()
        tax_id = (request.form.get("tax_id") or "").strip()
        errors = []
        if not name:
            errors.append("Name is required.")
        if ptype not in ("importer", "exporter", "consignee", "agent", "carrier"):
            errors.append("Valid party type is required.")
        if email and "@" not in email:
            errors.append("Email must be valid.")
        if errors:
            for e in errors:
                flash(e, "error")
            merged = dict(p)
            merged.update(name=name, type=ptype, address=address, contact_person=contact,
                          email=email, phone=phone, tax_id=tax_id)
            return render_template("party_form.html", party=merged, mode="edit", party_id=party_id)
        execute("UPDATE parties SET name=?,type=?,address=?,contact_person=?,email=?,phone=?,tax_id=? WHERE id=?",
                (name, ptype, address, contact, email, phone, tax_id, party_id))
        flash("Party %s updated." % name, "success")
        return redirect(url_for("parties_list"))
    return render_template("party_form.html", party=p, mode="edit", party_id=party_id)


@app.route("/parties/<int:party_id>/delete", methods=["POST"])
@login_required
def party_delete(party_id):
    p = query("SELECT * FROM parties WHERE id = ?", (party_id,), one=True)
    if not p:
        abort(404)
    in_use = query("SELECT id FROM shipments WHERE importer_id=? OR exporter_id=? OR consignee_id=? OR carrier_id=?",
                   (party_id, party_id, party_id, party_id), one=True)
    if in_use:
        flash("Cannot delete a party referenced by a shipment.", "error")
        return redirect(url_for("parties_list"))
    execute("DELETE FROM parties WHERE id = ?", (party_id,))
    flash("Party %s deleted." % p["name"], "success")
    return redirect(url_for("parties_list"))


# --------------------------------------------------------------------------- #
# Error handlers
# --------------------------------------------------------------------------- #

@app.errorhandler(404)
def not_found(e):
    return render_template("error.html", code=404, title="Not found",
                           message="The page you requested does not exist."), 404


@app.errorhandler(500)
def server_error(e):
    return render_template("error.html", code=500, title="Server error",
                           message="Something went wrong. Please try again."), 500


@app.context_processor
def inject_globals():
    return dict(current_user=current_user(), STATUSES=STATUSES, STATUS_LABELS=STATUS_LABELS,
                allowed_transition=allowed_transition)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
