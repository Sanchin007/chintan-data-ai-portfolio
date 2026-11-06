import unittest
import pandas as pd
from audit_analytics import (duplicate_invoice_candidates, procurement_threshold_candidates,
    supplier_change_to_payment_candidates, pricing_variance_candidates, fleet_utilisation_candidates)


class AnalyticsTests(unittest.TestCase):
    def test_duplicate_invoice_candidate(self):
        df=pd.DataFrame([
            {"invoice_id":"I1","supplier_id":"S1","invoice_number":"INV 01","amount":1000,"currency":"EUR","invoice_date":"2026-01-01","paid":True,"payment_reference":"P1"},
            {"invoice_id":"I2","supplier_id":"S1","invoice_number":"INV-01","amount":1000,"currency":"EUR","invoice_date":"2026-01-03","paid":True,"payment_reference":"P2"}])
        result=duplicate_invoice_candidates(df)
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["candidate_type"],"possible_duplicate_payment")

    def test_procurement_cluster(self):
        df=pd.DataFrame([
            {"po_id":"PO1","supplier_id":"S1","requester_id":"U1","cost_centre":"C1","project_code":"P1","created_at":"2026-01-01","amount":4000},
            {"po_id":"PO2","supplier_id":"S1","requester_id":"U1","cost_centre":"C1","project_code":"P1","created_at":"2026-01-03","amount":3500},
            {"po_id":"PO3","supplier_id":"S1","requester_id":"U1","cost_centre":"C1","project_code":"P1","created_at":"2026-01-04","amount":3000}])
        result=procurement_threshold_candidates(df,5000)
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["aggregate_amount"],10500)

    def test_supplier_change_to_payment(self):
        c=pd.DataFrame([{"change_id":"C1","supplier_id":"S1","change_date":"2026-01-01","callback_verified":False,"dual_approved":True}])
        p=pd.DataFrame([{"payment_id":"P1","supplier_id":"S1","payment_date":"2026-01-05","amount":90000}])
        self.assertEqual(len(supplier_change_to_payment_candidates(c,p,80000)),1)

    def test_pricing_gap(self):
        df=pd.DataFrame([{"lane":"L1","revenue":1000,"cost":800,"discount_pct":18,"approved_discount_pct":12,"volume":10}])
        self.assertEqual(pricing_variance_candidates(df,5)[0]["margin_pct"],20.0)

    def test_robust_statistics_refuse_small_cohorts(self):
        from audit_analytics import robust_mad_outliers
        result=robust_mad_outliers(pd.Series([60,61,59,62]),min_sample_size=8)
        self.assertEqual(result["status"],"INSUFFICIENT_SAMPLE")

    def test_robust_mad_flags_extreme_value_with_sufficient_sample(self):
        from audit_analytics import robust_mad_outliers
        result=robust_mad_outliers(pd.Series([50,51,49,52,48,50,51,95]),min_sample_size=8)
        self.assertEqual(result["status"],"REVIEW")
        self.assertTrue(result["outlier_positions"])

    def test_fleet_gap(self):
        df=pd.DataFrame([{"asset_id":"A1","cohort":"C1","utilisation_pct":60,"benchmark_pct":75,"cost_per_unit":120}])
        self.assertEqual(fleet_utilisation_candidates(df,10)[0]["benchmark_gap_pct"],15.0)


if __name__=="__main__": unittest.main()
