import unittest
from continuous_monitor import ControlPolicy, run_cycle, stable_key

class ContinuousMonitorTests(unittest.TestCase):
    def setUp(self):
        self.policies = {
            "SUPPLIER_BANK_CHANGE": ControlPolicy(
                "SUPPLIER_BANK_CHANGE", "1.0", "HIGH", 8, "Finance controls specialist"
            )
        }
        self.event = {
            "control_id": "SUPPLIER_BANK_CHANGE",
            "source_record_id": "SUP-81",
            "event_key": "PAY-771",
            "detected_at": "2026-11-07T08:00:00Z",
            "evidence_refs": ["E-1"],
        }

    def test_stable_key_is_repeatable_and_run_independent(self):
        self.assertEqual(
            stable_key("C1", "R1", "E1"),
            stable_key("C1", "R1", "E1")
        )

    def test_first_cycle_creates_and_escalates_overdue_finding(self):
        result = run_cycle([self.event], self.policies, now="2026-11-07T20:00:00Z")
        self.assertEqual(result["created_count"], 1)
        self.assertEqual(result["escalated_count"], 1)
        self.assertEqual(result["findings"][0]["status"], "ESCALATED")

    def test_repeat_cycle_refreshes_same_finding(self):
        first = run_cycle([self.event], self.policies, now="2026-11-07T09:00:00Z")
        from continuous_monitor import Finding
        existing = [Finding(**row) for row in first["findings"]]
        second = run_cycle([self.event], self.policies, existing, now="2026-11-07T10:00:00Z")
        self.assertEqual(second["created_count"], 0)
        self.assertEqual(second["refreshed_count"], 1)
        self.assertEqual(len(second["findings"]), 1)
        self.assertEqual(second["findings"][0]["occurrence_count"], 2)

    def test_unapproved_control_policy_is_rejected(self):
        result = run_cycle([self.event], {}, now="2026-11-07T09:00:00Z")
        self.assertEqual(result["rejected_count"], 1)

if __name__ == "__main__":
    unittest.main()
