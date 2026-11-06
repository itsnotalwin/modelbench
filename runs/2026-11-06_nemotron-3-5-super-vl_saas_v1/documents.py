"""PDF document generation for clearance files.

Uses ReportLab (no external service, no API key). Outputs are real PDFs a
clearing agent can send to a client, carrier or customs broker.
"""

import os
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "generated_pdfs")


def _ensure_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    return OUTPUT_DIR


# Monochrome palette shared across every document.
INK = colors.HexColor("#1a1a1a")
MUTE = colors.HexColor("#666666")
LINE = colors.HexColor("#999999")
LIGHT = colors.HexColor("#f2f2f2")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold",
                                fontSize=17, leading=21, textColor=INK, spaceAfter=2),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontName="Helvetica",
                                   fontSize=9, leading=12, textColor=MUTE, spaceAfter=10),
        "heading": ParagraphStyle("heading", parent=base["Heading3"], fontName="Helvetica-Bold",
                                  fontSize=10.5, leading=14, textColor=INK, spaceBefore=8, spaceAfter=3),
        "body": ParagraphStyle("body", parent=base["Normal"], fontName="Helvetica",
                               fontSize=8.5, leading=11.5, textColor=INK),
        "small": ParagraphStyle("small", parent=base["Normal"], fontName="Helvetica",
                                fontSize=7.5, leading=10, textColor=MUTE),
        "cell": ParagraphStyle("cell", parent=base["Normal"], fontName="Helvetica",
                               fontSize=8, leading=10, textColor=INK),
        "cellb": ParagraphStyle("cellb", parent=base["Normal"], fontName="Helvetica-Bold",
                                fontSize=8, leading=10, textColor=INK),
    }


def _header_footer(canvas, doc, title_text):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(18 * mm, 272 * mm, 192 * mm, 272 * mm)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.setFillColor(INK)
    canvas.drawString(18 * mm, 276 * mm, "CLEAROPS  —  CUSTOMS CLEARANCE")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTE)
    canvas.drawRightString(192 * mm, 276 * mm, title_text)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 14 * mm, "Generated %s" % datetime.now().strftime("%Y-%m-%d %H:%M"))
    canvas.drawRightString(192 * mm, 14 * mm, "Page %d" % doc.page)
    canvas.restoreState()


def _table(data, col_widths, header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
        ]
        style += [("FONTNAME", (0, 1), (-1, -1), "Helvetica"), ("FONTSIZE", (0, 1), (-1, -1), 8)]
    t.setStyle(TableStyle(style))
    return t


def _money(value):
    return "%.2f" % float(value or 0)


def generate_pdf(shipment, parties, doc_type):
    """Generate a PDF for a shipment. Returns the absolute file path."""
    _ensure_dir()
    safe_ref = "".join(c for c in shipment["reference"] if c.isalnum() or c in "-_")
    filename = "%s_%s.pdf" % (safe_ref, doc_type)
    path = os.path.join(OUTPUT_DIR, filename)

    party = lambda pid: next((p for p in parties if p["id"] == pid), {}) if parties else {}

    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=30 * mm, bottomMargin=20 * mm,
                            title="%s - %s" % (doc_type, shipment["reference"]),
                            author="ClearOps")
    styles = _styles()
    story = []

    def p(text, style="body"):
        story.append(Paragraph(text, styles[style]))
        return story

    # --- Common header block ---
    importer = party(shipment.get("importer_id"))
    exporter = party(shipment.get("exporter_id"))
    consignee = party(shipment.get("consignee_id"))

    p("CLEAROPS", "title")
    p("Customs Clearance & Freight Documentation", "subtitle")
    story.append(HRFlowable(width="100%", thickness=0.7, color=LINE, spaceAfter=8))

    p("<b>Document:</b> %s &nbsp;&nbsp;|&nbsp;&nbsp; <b>Shipment ref:</b> %s &nbsp;&nbsp;|&nbsp;&nbsp; <b>Status:</b> %s"
    % (doc_type.replace("_", " ").title(), shipment["reference"],
       shipment.get("status", "draft").replace("_", " ").title()))

    meta = [
        ["Party", "Name", "Address", "Contact / Tax ID"],
        ["Importer", importer.get("name", "—"), importer.get("address", "—"),
         "%s / %s" % (importer.get("contact_person", "—"), importer.get("tax_id", "—"))],
        ["Exporter", exporter.get("name", "—"), exporter.get("address", "—"),
         "%s / %s" % (exporter.get("contact_person", "—"), exporter.get("tax_id", "—"))],
        ["Consignee", consignee.get("name", "—"), consignee.get("address", "—"),
         "%s / %s" % (consignee.get("contact_person", "—"), consignee.get("tax_id", "—"))],
    ]
    story.append(_table(meta, [22 * mm, 42 * mm, 62 * mm, 60 * mm]))
    story.append(Spacer(1, 6))

    # --- Document-specific body ---
    if doc_type == "commercial_invoice":
        p("Commercial Invoice", "heading")
        inv = [
            ["Field", "Detail"],
            ["Bill of Lading / AWB", shipment.get("bl_number", "—")],
            ["Vessel / Flight", shipment.get("vessel_flight", "—")],
            ["Port of Loading", shipment.get("port_of_loading", "—")],
            ["Port of Discharge", shipment.get("port_of_discharge", "—")],
            ["HS Code", shipment.get("hs_code", "—")],
            ["Description", shipment.get("description", "—")],
            ["Quantity", "%s %s" % (shipment.get("quantity", "—"), shipment.get("unit", "—"))],
            ["Unit Price", "%s %s" % (_money(shipment.get("unit_price")), shipment.get("currency", "USD"))],
            ["Freight", _money(shipment.get("freight"))],
            ["Insurance", _money(shipment.get("insurance"))],
            ["CIF / Assessable Value", _money(shipment.get("cif_value"))],
        ]
        story.append(_table(inv, [48 * mm, 144 * mm]))
        story.append(Spacer(1, 8))
        duty = [
            ["Charge", "Rate %", "Amount"],
            ["Customs Duty", _money(shipment.get("duty_rate")), _money(shipment.get("duty_amount"))],
            ["Cess", _money(shipment.get("cess_rate")), _money(shipment.get("cess_amount"))],
            ["IGST / VAT", _money(shipment.get("igst_rate")), _money(shipment.get("igst_amount"))],
            ["Total Payable", "", _money(shipment.get("total_payable"))],
        ]
        story.append(_table(duty, [90 * mm, 30 * mm, 72 * mm]))
    elif doc_type == "packing_list":
        p("Packing List", "heading")
        pl = [
            ["Item", "Description", "Quantity", "Unit", "Gross Weight", "Measurements"],
            ["1", shipment.get("description", "—"), shipment.get("quantity", "—"),
             shipment.get("unit", "—"), "—", "—"],
        ]
        story.append(_table(pl, [14 * mm, 62 * mm, 30 * mm, 22 * mm, 30 * mm, 34 * mm]))
        story.append(Spacer(1, 8))
        p("Total packages: %s  |  Total weight: to be confirmed at stuffing"
          % shipment.get("quantity", "—"))
    elif doc_type == "bill_of_entry":
        p("Bill of Entry (Import Declaration) — Draft", "heading")
        boe = [
            ["Field", "Declaration"],
            ["Importer of Record", importer.get("name", "—")],
            ["Exporter / Supplier", exporter.get("name", "—")],
            ["Bill of Lading / AWB No.", shipment.get("bl_number", "—")],
            ["Vessel / Flight", shipment.get("vessel_flight", "—")],
            ["Port of Loading", shipment.get("port_of_loading", "—")],
            ["Port of Discharge", shipment.get("port_of_discharge", "—")],
            ["HS Code", shipment.get("hs_code", "—")],
            ["Description of Goods", shipment.get("description", "—")],
            ["CIF Value", _money(shipment.get("cif_value"))],
            ["Customs Duty", _money(shipment.get("duty_amount"))],
            ["Cess", _money(shipment.get("cess_amount"))],
            ["IGST / VAT", _money(shipment.get("igst_amount"))],
            ["Total Duty & Tax Payable", _money(shipment.get("total_payable"))],
        ]
        story.append(_table(boe, [52 * mm, 140 * mm]))
        story.append(Spacer(1, 10))
        p("I hereby declare the particulars given above to be true and correct to the best of my "
          "knowledge and belief.", "small")
        story.append(Spacer(1, 16))
        p("Authorised signatory: ____________________   Date: ____________", "small")

    doc.build(
        story,
        onFirstPage=lambda canvas, d: _header_footer(canvas, d, doc_type.replace("_", " ").title()),
        onLaterPages=lambda canvas, d: _header_footer(canvas, d, doc_type.replace("_", " ").title()),
    )
    return path


def generate_invoice_pdf(shipment, parties):
    return generate_pdf(shipment, parties, "commercial_invoice")


def generate_packing_list_pdf(shipment, parties):
    return generate_pdf(shipment, parties, "packing_list")


def generate_bill_of_entry_pdf(shipment, parties):
    return generate_pdf(shipment, parties, "bill_of_entry")
