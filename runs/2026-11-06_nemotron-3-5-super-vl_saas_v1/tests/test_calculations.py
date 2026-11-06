"""Unit tests for the core clearance calculation logic.

Run with:  python -m unittest tests.test_calculations -v
"""

import unittest
from calc import (
    compute_duty, compute_demurrage, assessable_value,
    allowed_transition, STATUSES, STATUS_ORDER,
)


class TestDutyCalculation(unittest.TestCase):
    def test_standard_rates(self):
        result = compute_duty(10000.00, 10.0, 3.0, 18.0)
        self.assertAlmostEqual(result["duty_amount"], 1000.00, places=2)
        # cess on (cif + duty)
        self.assertAlmostEqual(result["cess_amount"], (10000 + 1000) * 0.03, places=2)
        # igst on (cif + duty + cess)
        self.assertAlmostEqual(result["igst_amount"], (10000 + 1000 + 330) * 0.18, places=2)
        self.assertAlmostEqual(
            result["total_payable"],
            result["duty_amount"] + result["cess_amount"] + result["igst_amount"],
            places=2,
        )

    def test_zero_rates(self):
        result = compute_duty(5000.00, 0, 0, 0)
        self.assertEqual(result["duty_amount"], 0.0)
        self.assertEqual(result["cess_amount"], 0.0)
        self.assertEqual(result["igst_amount"], 0.0)
        self.assertEqual(result["total_payable"], 0.0)

    def test_rounding(self):
        result = compute_duty(1234.56, 7.5, 2.0, 12.0)
        for key in ("duty_amount", "cess_amount", "igst_amount", "total_payable"):
            self.assertEqual(result[key], round(result[key], 2))


class TestDemurrage(unittest.TestCase):
    def test_within_free_days(self):
        result = compute_demurrage("2026-05-10", 7, 150.0, as_of=__import__("datetime").date(2026, 5, 15))
        self.assertEqual(result["days_elapsed"], 5)
        self.assertEqual(result["billable_days"], 0)
        self.assertEqual(result["charge"], 0.0)

    def test_beyond_free_days(self):
        result = compute_demurrage("2026-05-01", 7, 100.0, as_of=__import__("datetime").date(2026, 5, 15))
        self.assertEqual(result["days_elapsed"], 14)
        self.assertEqual(result["billable_days"], 7)
        self.assertEqual(result["charge"], 700.0)

    def test_no_arrival(self):
        result = compute_demurrage(None, 7, 100.0)
        self.assertEqual(result, {"days_elapsed": 0, "billable_days": 0, "charge": 0.0})


class TestAssessableValue(unittest.TestCase):
    def test_cif_composition(self):
        self.assertEqual(assessable_value(100, 10, 500, 200), 1700.0)
        self.assertEqual(assessable_value(0, 0, 0, 0), 0.0)


class TestStatusTransitions(unittest.TestCase):
    def test_forward_allowed(self):
        self.assertTrue(allowed_transition("draft", "filed"))
        self.assertTrue(allowed_transition("assessed", "duty_paid"))
        self.assertTrue(allowed_transition("duty_paid", "delivered"))

    def test_regress_not_allowed(self):
        self.assertFalse(allowed_transition("delivered", "assessed"))
        self.assertFalse(allowed_transition("filed", "draft"))

    def test_same_status_not_allowed(self):
        self.assertFalse(allowed_transition("draft", "draft"))

    def test_all_statuses_ordered(self):
        self.assertEqual(len(STATUSES), len(set(STATUSES)))
        for i, s in enumerate(STATUSES):
            self.assertEqual(STATUS_ORDER[s], i)


if __name__ == "__main__":
    unittest.main()
