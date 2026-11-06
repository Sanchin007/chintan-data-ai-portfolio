-- OCEAN INTELLIGENCE | BigQuery Standard SQL control library
-- Independent portfolio reference implementation. Synthetic schema assumptions only.
-- Each query is read-only and returns candidate exceptions, never posts transactions.
-- Expected datasets/tables are documented in README.md in this folder.

-- 01. AP duplicate invoice candidates. Candidate != confirmed duplicate payment.
WITH normalised AS (
  SELECT invoice_id, supplier_id, purchase_order_id, currency,
         ROUND(invoice_amount, 2) AS invoice_amount,
         UPPER(REGEXP_REPLACE(invoice_number, r'[^A-Z0-9]', '')) AS invoice_key,
         invoice_date, payment_status, payment_reference
  FROM `demo.ap_invoices`
  WHERE invoice_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)
), candidates AS (
  SELECT a.invoice_id AS invoice_a, b.invoice_id AS invoice_b,
         a.supplier_id, a.purchase_order_id, a.currency, a.invoice_amount,
         a.payment_status AS payment_a, b.payment_status AS payment_b,
         CASE WHEN a.payment_status = 'PAID' AND b.payment_status = 'PAID'
              THEN 'BOTH_PAID_REQUIRES_REMITTANCE_CHECK'
              ELSE 'POTENTIAL_DUPLICATE_INVOICE' END AS classification
  FROM normalised a
  JOIN normalised b
    ON a.invoice_id < b.invoice_id
   AND a.supplier_id = b.supplier_id
   AND a.purchase_order_id = b.purchase_order_id
   AND a.currency = b.currency
   AND a.invoice_amount = b.invoice_amount
   AND (a.invoice_key = b.invoice_key OR EDIT_DISTANCE(a.invoice_key, b.invoice_key) <= 2)
)
SELECT * FROM candidates;

-- 02. Procurement splitting indicators. Replace threshold/window from approved policy tables.
WITH policy AS (
  SELECT * FROM `demo.approval_policy`
  WHERE effective_from <= CURRENT_DATE()
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE())
), eligible AS (
  SELECT po_id, supplier_id, requester_id, cost_centre, order_date,
         po_amount, approval_status
  FROM `demo.purchase_orders`
  WHERE DATE(order_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
), rolling_windows AS (
  SELECT *,
         ARRAY_AGG(STRUCT(po_id, order_date, po_amount, approval_status)) OVER (
           PARTITION BY supplier_id, requester_id, cost_centre
           ORDER BY UNIX_DATE(DATE(order_date))
           RANGE BETWEEN 7 PRECEDING AND CURRENT ROW
         ) AS window_orders
  FROM eligible
), candidates AS (
  SELECT DISTINCT r.supplier_id, r.requester_id, r.cost_centre,
         DATE(r.order_date) AS window_end, r.window_orders,
         (SELECT COUNT(*) FROM UNNEST(r.window_orders)) AS po_count,
         (SELECT SUM(w.po_amount) FROM UNNEST(r.window_orders) w) AS aggregate_amount
  FROM rolling_windows r
  WHERE (SELECT COUNT(*) FROM UNNEST(r.window_orders)) > 1
), matched AS (
  SELECT c.*, p.approval_limit
  FROM candidates c JOIN policy p USING (cost_centre)
  WHERE c.aggregate_amount > p.approval_limit
    AND NOT EXISTS (
      SELECT 1 FROM UNNEST(c.window_orders) o
      WHERE o.po_amount >= p.approval_limit
    )
)
SELECT supplier_id, requester_id, cost_centre, window_end, po_count, aggregate_amount,
       ARRAY(SELECT o.po_id FROM UNNEST(window_orders) o ORDER BY o.order_date, o.po_id) AS po_ids,
       approval_limit, SAFE_DIVIDE(aggregate_amount, approval_limit) AS threshold_multiple
FROM matched;

-- 03. Supplier bank changes followed by high-value payments.
WITH changes AS (
  SELECT supplier_id, change_timestamp, old_bank_hash, new_bank_hash,
         callback_verified, dual_approved, change_ticket_id
  FROM `demo.supplier_bank_change_log`
), payments AS (
  SELECT supplier_id, payment_id, payment_timestamp, payment_amount, currency
  FROM `demo.ap_payments`
)
SELECT p.*, c.change_timestamp, c.callback_verified, c.dual_approved,
       TIMESTAMP_DIFF(p.payment_timestamp, c.change_timestamp, HOUR) AS hours_after_change,
       CASE WHEN c.callback_verified = FALSE OR c.dual_approved = FALSE
            THEN 'CONTROL_EVIDENCE_MISSING' ELSE 'CONTROL_FIELDS_PRESENT' END AS review_status
FROM payments p
JOIN changes c USING (supplier_id)
WHERE p.payment_timestamp >= c.change_timestamp
  AND TIMESTAMP_DIFF(p.payment_timestamp, c.change_timestamp, HOUR) <= 72
  AND p.payment_amount >= 50000;

-- 04. Route margin and discount override review.
WITH lane AS (
  SELECT lane_id, SUM(net_revenue_eur) AS revenue_eur,
         SUM(direct_cost_eur) AS direct_cost_eur,
         SAFE_DIVIDE(SUM(net_revenue_eur)-SUM(direct_cost_eur),
                     SUM(net_revenue_eur)) AS contribution_margin,
         SAFE_DIVIDE(SUM(discount_eur), SUM(gross_quote_eur)) AS discount_rate,
         COUNT(*) AS booking_count
  FROM `demo.booking_revenue_cost`
  WHERE service_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  GROUP BY lane_id
)
SELECT *, CASE
  WHEN contribution_margin < 0.08 THEN 'HIGH_MARGIN_REVIEW'
  WHEN discount_rate > 0.12 THEN 'DISCOUNT_POLICY_REVIEW'
  ELSE 'WITHIN_DEMO_BAND' END AS control_signal
FROM lane;

-- 05. Fleet utilisation, cohort comparison and delay context.
WITH vessel_period AS (
  SELECT vessel_id, vessel_class, lane_id, service_month,
         SAFE_DIVIDE(SUM(loaded_teu), SUM(available_teu)) AS utilisation,
         AVG(delay_hours) AS avg_delay_hours,
         SAFE_DIVIDE(SUM(voyage_cost_eur), SUM(available_teu)) AS cost_per_available_teu
  FROM `demo.vessel_voyage_monthly`
  GROUP BY vessel_id, vessel_class, lane_id, service_month
), cohort AS (
  SELECT *, AVG(utilisation) OVER (
      PARTITION BY vessel_class, lane_id, service_month
  ) AS cohort_avg_utilisation
  FROM vessel_period
)
SELECT *, utilisation - cohort_avg_utilisation AS utilisation_gap
FROM cohort
WHERE utilisation < cohort_avg_utilisation - 0.10;

-- 06. Port delay / connection buffer exposure.
WITH calls AS (
  SELECT voyage_id, port_id, actual_arrival, planned_arrival,
         next_connection_id, connection_buffer_hours,
         TIMESTAMP_DIFF(actual_arrival, planned_arrival, MINUTE)/60.0 AS delay_hours
  FROM `demo.port_calls`
)
SELECT *, GREATEST(delay_hours - connection_buffer_hours, 0) AS buffer_breach_hours,
       CASE WHEN delay_hours > connection_buffer_hours
            THEN 'CONNECTION_AT_RISK' ELSE 'BUFFER_REMAINS' END AS impact_signal
FROM calls;

-- 07. Data quality gate. Critical failures block downstream analytics.
WITH checks AS (
  SELECT record_id,
         supplier_id IS NULL OR TRIM(supplier_id) = '' AS missing_supplier,
         currency IS NULL OR currency NOT IN ('EUR','USD','GBP','INR','SGD') AS invalid_currency,
         invoice_amount IS NULL OR invoice_amount < 0 AS invalid_amount
  FROM `demo.ap_invoices`
), duplicates AS (
  SELECT record_id, COUNT(*) AS occurrences
  FROM `demo.ap_invoices`
  GROUP BY record_id HAVING COUNT(*) > 1
)
SELECT c.*, COALESCE(d.occurrences, 1) AS record_occurrences,
       (missing_supplier OR invalid_currency OR invalid_amount
        OR COALESCE(d.occurrences, 1) > 1) AS critical_failure
FROM checks c
LEFT JOIN duplicates d USING (record_id);

-- 08. Continuous audit: deterministic alert identity prevents duplicate cases.
-- Stable across reruns: run_id remains metadata, not part of the deduplication key.
-- Add a versioned business-event key if one source record can create multiple distinct exceptions.
SELECT
  TO_HEX(SHA256(CONCAT(control_id, '|', source_record_id))) AS alert_idempotency_key,
  control_id, source_record_id, run_id, severity, evidence_reference,
  CURRENT_TIMESTAMP() AS detected_at,
  'OPEN' AS case_status
FROM `demo.control_test_results`
WHERE result_status = 'EXCEPTION';
