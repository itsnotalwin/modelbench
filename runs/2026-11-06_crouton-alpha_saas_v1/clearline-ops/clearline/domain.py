"""Domain logic for Clearline Ops: duty, VAT, costs, status workflow, validation."""
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

STATUSES = ["PRE_ARRIVAL", "ARRIVED", "LODGED", "ASSESSED", "QUERY", "RELEASED", "DELIVERED", "CANCELLED"]
STATUS_LABELS = {
    "PRE_ARRIVAL": "Pre-arrival", "ARRIVED": "Arrived", "LODGED": "Lodged",
    "ASSESSED": "Assessed", "QUERY": "Query / Hold", "RELEASED": "Released",
    "DELIVERED": "Delivered", "CANCELLED": "Cancelled",
}
# Delivered/Cancelled are terminal except Cancelled can be reopened to Pre-arrival by an admin action in UI.
TRANSITIONS = {
    "PRE_ARRIVAL": ["ARRIVED", "CANCELLED"],
    "ARRIVED": ["LODGED", "QUERY", "CANCELLED"],
    "LODGED": ["ASSESSED", "QUERY", "CANCELLED"],
    "ASSESSED": ["RELEASED", "QUERY", "CANCELLED"],
    "QUERY": ["LODGED", "ASSESSED", "CANCELLED"],
    "RELEASED": ["DELIVERED", "CANCELLED"],
    "DELIVERED": [],
    "CANCELLED": ["PRE_ARRIVAL"],
}
MODES = ["Sea", "Air", "Road", "Rail"]
DIRECTIONS = ["Import", "Export", "Transit"]
DOC_FIELDS = [
    ("doc_bl", "Bill of Lading / AWB"), ("doc_invoice", "Commercial Invoice"),
    ("doc_packing", "Packing List"), ("doc_origin", "Certificate of Origin"),
    ("doc_import_permit", "Import Permit / Rebate"), ("doc_freight_invoice", "Freight Invoice"),
]

def D(v, default="0"):
    try:
        if v is None or str(v).strip() == "":
            return Decimal(default)
        return Decimal(str(v).replace(",", "").strip())
    except (InvalidOperation, ValueError):
        return None

def money(v) -> str:
    return f"{Decimal(v):,.2f}"

def can_transition(a, b) -> bool:
    return b in TRANSITIONS.get(a, [])

def calculate_costs(*, value, freight="0", insurance="0", duty_rate="0", vat_rate="15", clearing_fee="0", disbursement="0", port_charge="0", fx_rate="1", storage_days="0", storage_rate="0") -> dict:
    """All inputs in shipment currency unless fx_rate converts to local.
    CIF = value+freight+insurance; Duty=CIF*duty%; VAT=(CIF+Duty+port)*vat%; Storage=days*rate.
    Returns Decimals as strings rounded to 2dp for display, plus raw Decimal values."""
    vals = {k: D(v) for k, v in dict(value=value, freight=freight, insurance=insurance, duty_rate=duty_rate, vat_rate=vat_rate, clearing_fee=clearing_fee, disbursement=disbursement, port_charge=port_charge, fx_rate=fx_rate, storage_days=storage_days, storage_rate=storage_rate).items()}
    if any(v is None for v in vals.values()):
        raise ValueError("All cost inputs must be numeric")
    if vals["fx_rate"] <= 0:
        raise ValueError("FX rate must be greater than zero")
    if any(vals[k] < 0 for k in ("value", "freight", "insurance", "clearing_fee", "disbursement", "port_charge", "storage_days", "storage_rate")):
        raise ValueError("Costs cannot be negative")
    if not (Decimal(0) <= vals["duty_rate"] <= Decimal(100) and Decimal(0) <= vals["vat_rate"] <= Decimal(100)):
        raise ValueError("Duty and VAT rates must be between 0 and 100 (%)")
    cif = vals["value"] + vals["freight"] + vals["insurance"]
    duty = cif * vals["duty_rate"] / Decimal(100)
    vat = (cif + duty + vals["port_charge"]) * vals["vat_rate"] / Decimal(100)
    storage = vals["storage_days"] * vals["storage_rate"]
    total_payable = cif + duty + vat + vals["port_charge"] + storage  # to customs/port (excl. agent fees)
    agent_fees = vals["clearing_fee"] + vals["disbursement"]
    total_to_client = total_payable + agent_fees
    q = lambda x: x.quantize(Decimal("0.01"))
    out = {"cif": q(cif), "duty": q(duty), "vat": q(vat), "storage": q(storage), "total_payable": q(total_payable), "agent_fees": q(agent_fees), "total_to_client": q(total_to_client)}
    out["total_payable_local"] = q(total_payable * vals["fx_rate"])
    out["total_to_client_local"] = q(total_to_client * vals["fx_rate"])
    out["cif_local"] = q(cif * vals["fx_rate"])
    return out

def validate_shipment(data: dict) -> list[str]:
    errs = []
    if not str(data.get("reference", "")).strip():
        errs.append("Reference is required.")
    elif len(str(data["reference"]).strip()) < 3:
        errs.append("Reference must be at least 3 characters.")
    if not str(data.get("client_id", "")).strip():
        errs.append("Client is required.")
    if data.get("direction") not in DIRECTIONS:
        errs.append("Direction must be Import, Export or Transit.")
    if data.get("mode") not in MODES:
        errs.append("Mode must be Sea, Air, Road or Rail.")
    if data.get("status") not in STATUSES:
        errs.append("Status is invalid.")
    for f in ("value", "freight", "insurance", "duty_rate", "gross_weight_kg", "fx_rate"):
        if data.get(f) not in (None, ""):
            v = D(data.get(f))
            if v is None:
                errs.append(f"{f.replace('_',' ').title()} must be a number.")
            elif v < 0:
                errs.append(f"{f.replace('_',' ').title()} cannot be negative.")
    if D(data.get("duty_rate", "0")) is not None and not (Decimal(0) <= D(data.get("duty_rate", "0") or 0) <= Decimal(100)):
        errs.append("Duty rate must be between 0 and 100 (%).")
    if data.get("arrival_date"):
        try:
            datetime.strptime(str(data["arrival_date"]), "%Y-%m-%d")
        except ValueError:
            errs.append("Arrival date must be YYYY-MM-DD.")
    if not str(data.get("description", "")).strip():
        errs.append("Goods description is required.")
    if not str(data.get("hs_code", "")).strip():
        errs.append("HS code is required.")
    return errs

def days_since(date_str: str, today: date | None = None) -> int | None:
    if not date_str:
        return None
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None
    return (today or date.today() - d).days if False else ((today or date.today()) - d).days

def is_overdue(shipment: dict, today: date | None = None) -> bool:
    """Arrived/Lodged/Assessed/Query for >7 days without release is overdue."""
    if shipment.get("status") not in ("ARRIVED", "LODGED", "ASSESSED", "QUERY"):
        return False
    d = days_since(shipment.get("arrival_date", ""), today)
    return d is not None and d > 7

def docs_complete(shipment: dict) -> bool:
    return all(shipment.get(k) for k, _ in DOC_FIELDS)
