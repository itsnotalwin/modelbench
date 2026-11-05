import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from decimal import Decimal
from clearline.domain import calculate_costs, can_transition, validate_shipment, is_overdue, docs_complete

class DomainTests(unittest.TestCase):
    def test_cif_duty_vat(self):
        c = calculate_costs(value="1000", freight="100", insurance="50", duty_rate="10", vat_rate="15", port_charge="0")
        self.assertEqual(c["cif"], Decimal("1150.00"))
        self.assertEqual(c["duty"], Decimal("115.00"))
        # VAT = (1150+115)*15% = 189.75
        self.assertEqual(c["vat"], Decimal("189.75"))
        self.assertEqual(c["total_payable"], Decimal("1454.75"))
    def test_fx_and_fees(self):
        c = calculate_costs(value="100", duty_rate="0", vat_rate="0", clearing_fee="50", disbursement="25", fx_rate="18")
        self.assertEqual(c["total_to_client"], Decimal("175.00"))
        self.assertEqual(c["total_to_client_local"], Decimal("3150.00"))
    def test_negative_rejected(self):
        with self.assertRaises(ValueError):
            calculate_costs(value="-1")
    def test_bad_rate_rejected(self):
        with self.assertRaises(ValueError):
            calculate_costs(value="10", duty_rate="150")
    def test_transitions(self):
        self.assertTrue(can_transition("PRE_ARRIVAL", "ARRIVED"))
        self.assertTrue(can_transition("QUERY", "ASSESSED"))
        self.assertFalse(can_transition("PRE_ARRIVAL", "RELEASED"))
        self.assertFalse(can_transition("DELIVERED", "ARRIVED"))
    def test_validate(self):
        self.assertTrue(validate_shipment({}))
        ok = {"reference":"CL-1","client_id":"1","direction":"Import","mode":"Sea","status":"ARRIVED","hs_code":"0901.21","description":"Coffee","value":"100"}
        self.assertEqual(validate_shipment(ok), [])
    def test_overdue_and_docs(self):
        s = {"status":"ARRIVED","arrival_date":"2020-01-01"}
        self.assertTrue(is_overdue(s))
        self.assertFalse(is_overdue({"status":"DELIVERED","arrival_date":"2020-01-01"}))
        self.assertTrue(docs_complete({k:1 for k,_ in [("doc_bl",""),("doc_invoice",""),("doc_packing",""),("doc_origin",""),("doc_import_permit",""),("doc_freight_invoice","")]}))

if __name__ == "__main__":
    unittest.main()
