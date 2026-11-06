"""Domain calculations for customs clearance.

Pure functions with no framework dependencies so they can be unit-tested in
isolation. Every figure is rounded to 2 decimal places, matching the currency
convention used throughout the product.
"""

from datetime import date, datetime, timedelta

# Fixed clearance lifecycle. Statuses may only ever move forward through this
# sequence; skipping is allowed (e.g. draft -> filed) but regressing is not.
STATUSES = [
    "draft",
    "docs_received",
    "filed",
    "examined",
    "assessed",
    "duty_paid",
    "out_for_delivery",
    "delivered",
    "closed",
]

STATUS_LABELS = {
    "draft": "Draft",
    "docs_received": "Docs Received",
    "filed": "Filed with Customs",
    "examined": "Under Examination",
    "assessed": "Assessed",
    "duty_paid": "Duty Paid",
    "out_for_delivery": "Out for Delivery",
    "delivered": "Delivered",
    "closed": "Closed",
}

STATUS_ORDER = {s: i for i, s in enumerate(STATUSES)}


def allowed_transition(from_status, to_status):
    """Return True if moving from_status -> to_status is a valid forward step."""
    if from_status == to_status:
        return False
    return STATUS_ORDER.get(to_status, -1) > STATUS_ORDER.get(from_status, -1)


def parse_date(value):
    """Parse a YYYY-MM-DD string into a date, or return None."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def compute_duty(cif_value, duty_rate, cess_rate, igst_rate):
    """Compute customs duty, cess, IGST/VAT and total payable.

    - Customs duty   = CIF * duty_rate%
    - Cess           = (CIF + duty) * cess_rate%
    - IGST/VAT       = (CIF + duty + cess) * igst_rate%
    - Total payable  = duty + cess + IGST
    """
    cif = round(float(cif_value or 0), 2)
    duty_rate = float(duty_rate or 0)
    cess_rate = float(cess_rate or 0)
    igst_rate = float(igst_rate or 0)

    duty = round(cif * duty_rate / 100.0, 2)
    cess = round((cif + duty) * cess_rate / 100.0, 2)
    igst = round((cif + duty + cess) * igst_rate / 100.0, 2)
    total = round(duty + cess + igst, 2)

    return {
        "cif_value": cif,
        "duty_amount": duty,
        "cess_amount": cess,
        "igst_amount": igst,
        "total_payable": total,
    }


def compute_demurrage(actual_arrival, free_days, demurrage_per_day, as_of=None):
    """Compute demurrage days and charge since actual arrival.

    Free days are granted from arrival; every day beyond free_days is billable.
    Returns a dict with days_elapsed, billable_days and charge.
    """
    if not actual_arrival:
        return {"days_elapsed": 0, "billable_days": 0, "charge": 0.0}
    arrival = parse_date(actual_arrival)
    if arrival is None:
        return {"days_elapsed": 0, "billable_days": 0, "charge": 0.0}
    today = as_of or date.today()
    days_elapsed = (today - arrival).days
    if days_elapsed < 0:
        days_elapsed = 0
    free = int(free_days or 0)
    per_day = float(demurrage_per_day or 0)
    billable = max(0, days_elapsed - free)
    charge = round(billable * per_day, 2)
    return {"days_elapsed": days_elapsed, "billable_days": billable, "charge": charge}


def assessable_value(unit_price, quantity, freight, insurance):
    """CIF assessable value = unit price * quantity + freight + insurance."""
    return round(
        float(unit_price or 0) * float(quantity or 0)
        + float(freight or 0)
        + float(insurance or 0),
        2,
    )
