-- BigQuery Standard SQL | canonical audit analytics model
-- Synthetic/reference DDL only. Review names, partitioning, access and policy
-- with the target platform owner before deployment. Not executed on a live schema.

CREATE SCHEMA IF NOT EXISTS `demo_audit_mart`;

CREATE TABLE IF NOT EXISTS `demo_audit_mart.dim_control` (
  control_id STRING NOT NULL,
  control_version STRING NOT NULL,
  control_name STRING NOT NULL,
  domain STRING NOT NULL,
  objective STRING,
  owner_role STRING,
  cadence STRING,
  severity_default STRING,
  threshold_value NUMERIC,
  threshold_currency STRING,
  effective_from DATE NOT NULL,
  effective_to DATE,
  policy_approval_ref STRING,
  is_active BOOL NOT NULL
);

CREATE TABLE IF NOT EXISTS `demo_audit_mart.dim_source` (
  source_id STRING NOT NULL,
  source_system STRING NOT NULL,
  dataset_name STRING NOT NULL,
  data_owner STRING,
  data_classification STRING,
  refresh_sla_minutes INT64,
  approved_purpose STRING,
  retention_days INT64
);

CREATE TABLE IF NOT EXISTS `demo_audit_mart.fact_control_run` (
  run_id STRING NOT NULL,
  control_id STRING NOT NULL,
  control_version STRING NOT NULL,
  source_id STRING NOT NULL,
  source_snapshot_id STRING NOT NULL,
  source_watermark TIMESTAMP,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  run_status STRING NOT NULL,
  records_scanned INT64,
  records_excluded INT64,
  exception_count INT64,
  code_hash STRING,
  model_name STRING,
  prompt_version STRING,
  error_code STRING
)
PARTITION BY DATE(started_at)
CLUSTER BY control_id, source_id, run_status;

CREATE TABLE IF NOT EXISTS `demo_audit_mart.fact_finding` (
  finding_id STRING NOT NULL,
  idempotency_key STRING NOT NULL,
  control_id STRING NOT NULL,
  control_version STRING NOT NULL,
  run_id STRING NOT NULL,
  source_record_id STRING NOT NULL,
  business_event_key STRING NOT NULL,
  detected_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  severity STRING NOT NULL,
  estimated_amount NUMERIC,
  currency STRING,
  finding_status STRING NOT NULL,
  evidence_status STRING NOT NULL,
  owner_role STRING,
  owner_id STRING,
  due_at TIMESTAMP,
  closed_at TIMESTAMP,
  human_disposition STRING,
  is_current BOOL NOT NULL
)
PARTITION BY DATE(detected_at)
CLUSTER BY control_id, finding_status, severity;

CREATE TABLE IF NOT EXISTS `demo_audit_mart.bridge_finding_evidence` (
  finding_id STRING NOT NULL,
  evidence_id STRING NOT NULL,
  evidence_type STRING,
  source_uri STRING,
  source_record_hash STRING,
  captured_at TIMESTAMP,
  verified_by STRING,
  verified_at TIMESTAMP,
  verification_status STRING
)
PARTITION BY DATE(captured_at);

CREATE TABLE IF NOT EXISTS `demo_audit_mart.fact_review_event` (
  review_event_id STRING NOT NULL,
  finding_id STRING NOT NULL,
  actor_id STRING NOT NULL,
  actor_role STRING NOT NULL,
  event_at TIMESTAMP NOT NULL,
  prior_status STRING,
  new_status STRING NOT NULL,
  rationale STRING NOT NULL,
  assignment_target STRING,
  evidence_requested STRING,
  correlation_id STRING
)
PARTITION BY DATE(event_at)
CLUSTER BY finding_id, actor_role;

CREATE TABLE IF NOT EXISTS `demo_audit_mart.fact_remediation` (
  remediation_id STRING NOT NULL,
  finding_id STRING NOT NULL,
  action_owner STRING NOT NULL,
  action_description STRING NOT NULL,
  opened_at TIMESTAMP NOT NULL,
  due_at TIMESTAMP,
  completed_at TIMESTAMP,
  retest_run_id STRING,
  closure_evidence_id STRING,
  closure_approved_by STRING,
  closure_approved_at TIMESTAMP,
  remediation_status STRING NOT NULL
)
PARTITION BY DATE(opened_at);

CREATE TABLE IF NOT EXISTS `demo_audit_mart.fact_value_measure` (
  measure_id STRING NOT NULL,
  use_case_id STRING NOT NULL,
  business_unit STRING NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_name STRING NOT NULL,
  baseline_value NUMERIC,
  observed_value NUMERIC,
  target_value NUMERIC,
  unit STRING NOT NULL,
  attribution_method STRING,
  evidence_reference STRING,
  approved_by STRING,
  measurement_status STRING
)
PARTITION BY period_start
CLUSTER BY use_case_id, business_unit, metric_name;

-- Stable finding key excludes run_id: repeat runs refresh the same business event.
CREATE OR REPLACE VIEW `demo_audit_mart.v_current_finding` AS
SELECT * EXCEPT(row_num)
FROM (
  SELECT f.*,
    ROW_NUMBER() OVER (
      PARTITION BY idempotency_key
      ORDER BY last_seen_at DESC, detected_at DESC
    ) AS row_num
  FROM `demo_audit_mart.fact_finding` f
  WHERE is_current = TRUE
)
WHERE row_num = 1;

CREATE OR REPLACE VIEW `demo_audit_mart.v_control_run_kpis` AS
SELECT
  control_id,
  control_version,
  DATE(started_at) AS run_date,
  COUNT(*) AS run_count,
  COUNTIF(run_status = 'SUCCEEDED') AS successful_runs,
  SAFE_DIVIDE(COUNTIF(run_status = 'SUCCEEDED'), COUNT(*)) AS execution_success_rate,
  SUM(records_scanned) AS records_scanned,
  SUM(records_excluded) AS records_excluded,
  SUM(exception_count) AS exceptions_returned,
  MAX(completed_at) AS last_completed_at
FROM `demo_audit_mart.fact_control_run`
GROUP BY control_id, control_version, run_date;

CREATE OR REPLACE VIEW `demo_audit_mart.v_finding_ageing` AS
SELECT
  finding_id, control_id, severity, finding_status, owner_role, owner_id,
  detected_at, due_at,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), detected_at, HOUR) AS age_hours,
  GREATEST(TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), due_at, HOUR), 0) AS overdue_hours,
  evidence_status, human_disposition
FROM `demo_audit_mart.v_current_finding`
WHERE finding_status NOT IN ('CLOSED', 'REJECTED');

-- Example idempotent key material. Include a business-event key if one source
-- record can legitimately generate multiple exceptions for the same control.
SELECT TO_HEX(SHA256(CONCAT(control_id, '|', source_record_id, '|', business_event_key)))
  AS idempotency_key
FROM `demo_audit_mart.fact_finding`;
