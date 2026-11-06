-- PostgreSQL reference queries. Bind parameters; never interpolate untrusted SQL.
-- Outputs are exception candidates for auditor review, not fraud/control conclusions.
-- Required source tables: ap_invoice, purchase_order, supplier_master_change,
-- ap_payment, pricing_lane_period, fleet_asset_period.

-- 1. Similar invoice / payment candidates. Parameter: :window_days
WITH normalized AS (
 SELECT invoice_id,supplier_id,
        UPPER(REGEXP_REPLACE(invoice_number,'[^A-Za-z0-9]','','g')) AS invoice_no_norm,
        amount,currency,invoice_date,paid_flag,payment_reference
 FROM ap_invoice WHERE invoice_date IS NOT NULL
)
SELECT a.invoice_id AS invoice_a,b.invoice_id AS invoice_b,a.supplier_id,
       a.invoice_no_norm,a.amount,a.currency,
       ABS(a.invoice_date::date-b.invoice_date::date) AS date_gap_days,
       a.paid_flag AS paid_a,b.paid_flag AS paid_b,
       a.payment_reference AS payment_ref_a,b.payment_reference AS payment_ref_b
FROM normalized a JOIN normalized b
 ON a.invoice_id<b.invoice_id AND a.supplier_id=b.supplier_id
 AND a.invoice_no_norm=b.invoice_no_norm AND a.amount=b.amount AND a.currency=b.currency
 AND ABS(a.invoice_date::date-b.invoice_date::date)<=:window_days;

-- 2. Procurement clustering. Parameters: :approval_threshold_eur, :window_days
SELECT p1.supplier_id,p1.requester_id,p1.cost_centre,p1.project_code,
       ARRAY_AGG(DISTINCT p2.po_id ORDER BY p2.po_id) AS candidate_po_ids,
       COUNT(DISTINCT p2.po_id) AS order_count,
       SUM(p2.amount) AS aggregate_amount_eur
FROM purchase_order p1 JOIN purchase_order p2
 ON p2.supplier_id=p1.supplier_id AND p2.requester_id=p1.requester_id
 AND p2.cost_centre=p1.cost_centre AND p2.project_code=p1.project_code
 AND p2.created_at>=p1.created_at
 AND p2.created_at<p1.created_at+(:window_days*INTERVAL '1 day')
WHERE p1.amount<:approval_threshold_eur AND p2.amount<:approval_threshold_eur
  AND NOT EXISTS (
      SELECT 1 FROM purchase_order prior
      WHERE prior.supplier_id=p1.supplier_id
        AND prior.requester_id=p1.requester_id
        AND prior.cost_centre=p1.cost_centre
        AND prior.project_code=p1.project_code
        AND prior.created_at<p1.created_at
        AND prior.created_at>=p1.created_at-(:window_days*INTERVAL '1 day')
  )
GROUP BY p1.supplier_id,p1.requester_id,p1.cost_centre,p1.project_code,p1.po_id,p1.created_at
HAVING COUNT(DISTINCT p2.po_id)>1 AND SUM(p2.amount)>=:approval_threshold_eur;

-- 3. Supplier change followed by high-value payment.
-- Parameters: :lookback_days, :high_value_threshold_eur
SELECT c.change_id,c.supplier_id,c.changed_at,p.payment_id,p.payment_date,p.amount_eur,
       c.callback_verified,c.dual_approved,
       p.payment_date::date-c.changed_at::date AS days_to_payment
FROM supplier_master_change c JOIN ap_payment p
 ON p.supplier_id=c.supplier_id AND p.payment_date>=c.changed_at
 AND p.payment_date<c.changed_at+(:lookback_days*INTERVAL '1 day')
WHERE p.amount_eur>=:high_value_threshold_eur
 AND (COALESCE(c.callback_verified,FALSE)=FALSE OR COALESCE(c.dual_approved,FALSE)=FALSE);

-- 4. Discount authority and contribution margin. Parameter: :material_discount_gap_pct
SELECT lane_id,period_id,revenue_eur,cost_eur,
 CASE WHEN revenue_eur=0 THEN NULL ELSE ROUND(((revenue_eur-cost_eur)/revenue_eur)*100,2) END AS margin_pct,
 discount_pct,approved_discount_pct,
 ROUND(discount_pct-approved_discount_pct,2) AS discount_gap_pct,volume
FROM pricing_lane_period
WHERE discount_pct-approved_discount_pct>=:material_discount_gap_pct;

-- 5. Like-for-like fleet utilisation gap. Parameter: :minimum_gap_pct
SELECT asset_id,cohort_id,period_id,utilisation_pct,benchmark_pct,
 ROUND(benchmark_pct-utilisation_pct,1) AS benchmark_gap_pct,cost_per_unit
FROM fleet_asset_period
WHERE benchmark_pct-utilisation_pct>=:minimum_gap_pct;


-- 6) Robust fleet outlier screen using cohort median and MAD.
-- Parameters: :minimum_cohort_size, :modified_z_threshold
-- Small cohorts are deliberately excluded; the four-row portfolio sample is insufficient.
WITH cohort_median AS (
    SELECT cohort_id, COUNT(*) AS cohort_n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY utilisation_pct) AS median_utilisation
    FROM fleet_asset_period
    GROUP BY cohort_id
),
cohort_mad AS (
    SELECT f.cohort_id,
           percentile_cont(0.5) WITHIN GROUP (
               ORDER BY ABS(f.utilisation_pct - m.median_utilisation)
           ) AS mad
    FROM fleet_asset_period f
    JOIN cohort_median m ON m.cohort_id=f.cohort_id
    GROUP BY f.cohort_id
)
SELECT f.asset_id,f.cohort_id,f.period_id,f.utilisation_pct,
       m.cohort_n,m.median_utilisation,d.mad,
       0.6745*(f.utilisation_pct-m.median_utilisation)/NULLIF(d.mad,0) AS modified_z_score
FROM fleet_asset_period f
JOIN cohort_median m ON m.cohort_id=f.cohort_id
JOIN cohort_mad d ON d.cohort_id=f.cohort_id
WHERE m.cohort_n>=:minimum_cohort_size
  AND d.mad>0
  AND ABS(0.6745*(f.utilisation_pct-m.median_utilisation)/d.mad)>=:modified_z_threshold;

-- Enterprise deployment gates: effective-dated control criteria, approved thresholds,
-- data contracts, freshness SLAs, lineage, reconciliations, row-level security,
-- query cost limits, currency/time-zone normalisation and immutable execution logs.
