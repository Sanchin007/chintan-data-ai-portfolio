# Enterprise audit analytics — platform implementation blueprint

This reference package closes the design-evidence gaps for continuous auditing, governed data models, Palantir Foundry, Power BI, lifecycle governance, export-control triage and value tracking.

#> **Scope note:** This blueprint documents the separate portfolio audit demonstrator only. Its Foundry and Power BI mappings are reference designs, not deployments of this demonstrator. They do not describe or qualify the author's separate hands-on professional experience with Palantir Foundry and AIP.

# What is implemented here versus platform-ready design

| Capability | Evidence in this repository | Runtime boundary |
|---|---|---|
| Repeatable control cycle | `python/continuous_monitor.py` and BigQuery model SQL | Invoked by a caller; no scheduler or persistent case database is connected |
| Exception lifecycle and SLA logic | Deterministic Python reference engine | In-memory demonstration; production state must be persisted |
| Canonical audit data model | BigQuery Standard SQL DDL and curated views | Reference schema; not run against an enterprise warehouse |
| Palantir Foundry | Ontology, pipeline, action and security mapping below | No Foundry tenant, SDK or deployment is connected |
| Power BI | Star-schema contract and DAX measures below | Power BI model/report is specified, not published or connected |
| Governance lifecycle | Stage gates, RACI, model evaluation and change controls below | Operating model design; not an approved corporate policy |
| Export controls | Evidence checklist, jurisdictional decision path and specialist gate | No classification, sanctions, licence or shipment-clearance automation |
| Business value | KPI definitions, formulas and benefits-realisation method | Historical programme metrics are separately attributed; demo ROI assumptions are not actual savings |

## 1. Continuous auditing operating model

A control cycle is designed as a repeatable sequence:

1. **Schedule / trigger** — an approved scheduler invokes a named control pack on a defined cadence or source event.
2. **Snapshot** — capture source watermark, extraction timestamp, source system, schema version and row counts.
3. **Data-quality gate** — fail closed for critical schema, completeness, uniqueness or freshness failures; disclose non-critical warnings.
4. **Execute controls** — run versioned SQL/Python rules with approved parameters and effective dates.
5. **Normalise exceptions** — produce a stable finding key from control, source record and business-event identity; do not use run ID as the deduplication key.
6. **Enrich and challenge** — attach evidence references, rule version, calculation, limitations and plausible alternative explanations.
7. **Route** — assign a responsible owner and specialist queue based on domain, materiality and jurisdiction.
8. **Age and escalate** — calculate business-calendar SLA, overdue age and escalation tier; preserve the previous state and actor.
9. **Human disposition** — reviewer can confirm, reject, request evidence or escalate. “Verified” is a reviewer action, not legal clearance.
10. **Retest and close** — rerun the control after remediation, compare the new source snapshot, retain closure evidence and independently approve closure.
11. **Benefits review** — measure coverage, timeliness, recurrence, false-positive rate, review effort and remediation effectiveness.

### Cadence and operational service levels

Cadence is risk-based and must be approved by the control owner. Illustrative defaults for design discussion only:

| Control family | Illustrative cadence | Trigger / escalation |
|---|---|---|
| High-value payments and supplier bank changes | Daily or event-driven | High severity: same-business-day triage |
| Invoice duplicates and procurement threshold clusters | Daily / weekly | High severity: 1 business day; medium: 5 |
| Pricing / margin exceptions | Weekly or monthly close | Commercial owner; materiality-based |
| Fleet utilisation and operational outliers | Weekly / voyage milestone | Operations owner; cohort/context validation |
| Export documentation completeness | Before shipment release gate | Immediate specialist review if required evidence is missing |

These are not Airbus or CMA CGM policy values. A production implementation must load approved control-specific cadence, calendar, materiality and SLA parameters from a governed policy table.

### Exception state machine

`NEW → TRIAGED → ASSIGNED → IN_REVIEW → (EVIDENCE_REQUESTED | ESCALATED | REVIEWER_VERIFIED) → REMEDIATION_OPEN → RETEST_PENDING → CLOSED`

Rejected or duplicate signals are retained with a reason and reviewer identity. Reopening creates a new lifecycle event, not a destructive overwrite. A human reviewer can mark evidence verified; only an authorised control owner/auditor can approve final disposition or closure.

### Monitoring measures

- Control execution success and missed-run rate
- Source freshness and data-quality gate failures
- Records tested, population coverage and exclusions
- New / open / overdue / escalated exceptions
- Median and 90th-percentile time to triage and resolve
- Repeat finding rate after remediation
- Confirmed / rejected / duplicate signal ratio
- Reviewer workload by domain and business unit
- Model-assisted output acceptance, correction and hallucination rate
- Cost and latency per completed control cycle

## 2. Canonical audit data model

The SQL reference schema in `sql/audit_analytics_model.sql` separates dimensions, execution facts, findings, evidence, review events and benefits measures. The stable finding key is independent of run ID so the same exception is not recreated on every scheduled execution.

### Core entities and relationships

- **DimControl**: control ID, version, objective, owner, domain, risk, cadence, approved threshold, effective dates.
- **DimSource**: source ID, system, dataset, data owner, classification, refresh SLA.
- **FactControlRun**: run ID, control version, source snapshot, execution timestamps, result and row counts.
- **FactFinding**: finding ID, idempotency key, control/run IDs, source record key, severity, amount, state and owner.
- **BridgeFindingEvidence**: finding to evidence references, evidence type, source URI, timestamp, hash and verification status.
- **FactReviewEvent**: append-only reviewer actions, prior/new state, actor, timestamp, rationale and assigned specialist.
- **FactRemediation**: action owner, due date, action, retest run, closure evidence and approval.
- **FactValueMeasure**: baseline, observed value, target, unit, measurement period, attribution and confidence.

Data lineage follows source → immutable snapshot → control run → finding → evidence → review → remediation → retest. No model-generated narrative replaces the source record or deterministic calculation.

## 3. Palantir Foundry implementation mapping

This is a concrete Foundry-oriented implementation design, not a claim of a connected Foundry tenant.

| Foundry capability | Proposed implementation |
|---|---|
| Source integrations | Governed connectors for ERP/AP, procurement, supplier master, pricing, logistics and export records; service identities and least privilege |
| Raw / staging datasets | Immutable source snapshots with ingestion metadata, schema contracts and quality checks |
| Transforms / pipelines | Versioned PySpark or SQL transforms for canonical facts, control calculations and exception normalisation |
| Ontology object types | `Control`, `ControlRun`, `Finding`, `EvidenceItem`, `BusinessUnit`, `Owner`, `ReviewEvent`, `RemediationAction`, `PolicyVersion` |
| Links | Control → runs → findings; finding → evidence; finding → owner; finding → review events; finding → remediation and retest |
| Actions | Assign owner, request evidence, escalate, record reviewer disposition, open remediation, request retest |
| Functions | Deterministic control execution wrappers, evidence challenge preparation and working-paper assembly |
| Workshop / operational app | Auditor workspace for queue prioritisation, evidence inspection, review and remediation tracking |
| Governance | Ontology permissions, row/object-level access, audit logs, dataset lineage, project separation and release promotion |

**Ontology contract for a Finding object:** immutable `finding_id`; stable `idempotency_key`; `control_id` + `control_version`; `source_snapshot_id`; `source_record_ids`; `rule_result`; `severity`; `evidence_status`; `owner_id`; `review_status`; `created_at`; `last_seen_at`; `due_at`; `closed_at`. A finding update should append a ReviewEvent and preserve prior states.

**Security design:** separate read and write identities; source-level least privilege; row/object-level permissions; purpose-bound access; sensitive-field minimisation; environment separation; lineage and audit logging. Human actions require authenticated identities and policy checks. No autonomous action can approve a transaction, clear a shipment or close an audit finding.

## 4. Power BI semantic model and report design

This is a Power BI-ready star-schema and DAX specification, not a published PBIX or a live Power BI connection.

### Semantic model

- Fact tables: `FactControlRun`, `FactFinding`, `FactReviewEvent`, `FactRemediation`, `FactValueMeasure`.
- Dimensions: `DimDate`, `DimControl`, `DimBusinessUnit`, `DimDomain`, `DimOwner`, `DimSeverity`, `DimSource`.
- Relationships: one-to-many from dimensions to facts; single-direction filtering by default. Use a role-playing date dimension for detected, due, reviewed and closed dates.
- Security: row-level security by authorised business unit / audit assignment; do not rely on hidden report filters as a security boundary.
- Refresh: incremental refresh by event date and source watermark; expose last successful refresh and stale-source warnings.

### Example DAX measures

```dax
Control Runs = DISTINCTCOUNT(FactControlRun[run_id])

Successful Control Runs =
CALCULATE(
    [Control Runs],
    FactControlRun[run_status] = "SUCCEEDED"
)

Execution Success Rate =
DIVIDE([Successful Control Runs], [Control Runs])

Open Findings =
CALCULATE(
    DISTINCTCOUNT(FactFinding[finding_id]),
    FactFinding[is_current] = TRUE(),
    FactFinding[review_status] <> "CLOSED",
    FactFinding[review_status] <> "REJECTED"
)

Overdue Findings =
CALCULATE(
    [Open Findings],
    FILTER(
        FactFinding,
        FactFinding[due_at] < NOW()
            && FactFinding[review_status] <> "CLOSED"
            && FactFinding[review_status] <> "REJECTED"
    )
)

Evidence Coverage =
DIVIDE(
    CALCULATE(
        DISTINCTCOUNT(FactFinding[finding_id]),
        FactFinding[is_current] = TRUE(),
        FactFinding[review_status] <> "CLOSED",
        FactFinding[review_status] <> "REJECTED",
        FactFinding[evidence_status] = "LINKED"
    ),
    [Open Findings]
)

Average Review Age (Days) =
AVERAGEX(
    FILTER(FactFinding, FactFinding[review_status] <> "CLOSED"),
    DATEDIFF(FactFinding[detected_at], NOW(), DAY)
)

Confirmed Signal Rate =
DIVIDE(
    CALCULATE(
        DISTINCTCOUNT(FactFinding[finding_id]),
        FactFinding[human_disposition] = "CONFIRMED"
    ),
    CALCULATE(
        DISTINCTCOUNT(FactFinding[finding_id]),
        FactFinding[human_disposition] IN {"CONFIRMED", "REJECTED"}
    )
)
```

### Report pages

1. **Executive assurance** — control coverage, open material findings, overdue exposure, execution reliability and trend.
2. **Control performance** — run history, source freshness, data-quality gates, exceptions by control and business unit.
3. **Finding lifecycle** — ageing, SLA breaches, assignment, escalation, evidence completeness and closure/reopen rates.
4. **Commercial / operational analytics** — pricing margin, procurement clusters, supplier-change controls and fleet cohorts.
5. **Trade compliance readiness** — documentation completeness, missing evidence categories, jurisdiction and specialist queue; never a legal-clearance dashboard.
6. **Benefits realisation** — baseline versus observed review effort, detection lead time, recurrence and verified operational outcomes.

## 5. Lifecycle governance and accountability

| Gate | Required evidence | Accountable role |
|---|---|---|
| Intake and prioritisation | Risk statement, materiality, process owner, expected value | Audit / business sponsor |
| Data approval | Purpose, lawful basis, classification, source owner, retention and access | Data owner / privacy / security |
| Control design | Policy source, effective date, threshold, test logic, exclusions | Control owner + audit |
| Build and validation | Code review, unit tests, reconciliation, edge cases, independent challenge | Engineering + audit analytics |
| AI evaluation | Versioned test set, precision/recall, false positives, groundedness, prompt-injection and robustness tests | AI governance + audit |
| Release approval | Change record, segregation of duties, rollback, monitoring and runbook | Product owner / platform owner |
| Operate | Freshness, run success, drift, cost, incidents, access reviews | Service owner |
| Change / retire | Impact assessment, revalidation, user notice, archive and deletion schedule | Product owner + data owner |

Minimum controls include model and prompt versioning, deterministic rule versioning, approved test datasets, evaluation thresholds, human override, incident response, data retention, access reviews, audit logs and documented rollback. GDPR principles, data minimisation, purpose limitation and retention must be assessed with the organisation's privacy/legal functions. This design is not a legal compliance certification.

## 6. Export control and trade-law specialist workflow

The demonstrator's export feature remains **documentation completeness triage**. The production design separates data collection from legal assessment:

1. Capture product technical description, part number, origin, destination, exporter, consignee, end-user, end-use, route and transaction date.
2. Collect classification rationale and source/version of the applicable control list.
3. Record authorisation evidence or a documented no-authorisation rationale.
4. Capture restricted-party screening evidence with provider, timestamp, list version, match disposition and reviewer.
5. Check destination, end-use, end-user, re-export and diversion-risk evidence.
6. Route incomplete or potentially material cases to an authorised export-control specialist.
7. Specialist verifies applicable jurisdiction, current official rules, technical classification, licence requirements and transaction facts.
8. Record the specialist's decision, evidence, legal basis, timestamp and any conditions in the controlled case system.

The agent may identify missing fields and prepare questions. It must not decide classification, sanctions matches, licence requirements or shipment release. Applicable frameworks may include EU Regulation 2021/821, EU restrictive measures, French national export-control requirements, the Union Customs Code and—where jurisdictional nexus applies—US EAR/OFAC or UK export-control regimes. Applicability must be assessed by qualified specialists; this list is not an exhaustive legal determination.

## 7. Business case and value tracking

Benefits are measured against an agreed baseline, not inferred from dashboard activity.

| KPI | Definition | Measurement source |
|---|---|---|
| Review effort saved | Baseline analyst hours per case minus observed hours, adjusted for complexity | Time study / workflow timestamps |
| Detection lead time | First detectable event timestamp to alert timestamp | Source and control-run logs |
| Review cycle time | Finding creation to first qualified review / final disposition | Append-only review events |
| False-positive rate | Rejected or non-actionable findings divided by findings with completed disposition | Human dispositions |
| Recurrence rate | Reopened or repeated control exceptions after remediation | Finding and retest history |
| Coverage | Eligible population tested divided by eligible population in source snapshot | Source reconciliation and control runs |
| Cost per reviewed finding | Platform + compute + human review cost divided by reviewed findings | FinOps and time records |
| Remediation effectiveness | Retested exceptions resolved and not recurring over the defined period | Remediation and retest facts |

`Net benefit = (verified hours saved × loaded hourly cost) + verified avoided loss − platform and operating cost`.

`ROI = net benefit ÷ platform and operating cost`.

Use a pilot with matched periods or comparable business units, document confounders and obtain Finance / Audit sign-off. Never label a scenario estimate as realised savings. The existing CMA CGM engagement metrics on the portfolio page remain separately attributed to the wider programme and must not be presented as outcomes generated by this audit demonstrator.

## 8. Validation checklist before production

- [ ] Map every source field to an approved data contract and owner.
- [ ] Reconcile source row counts, balances and extraction watermarks.
- [ ] Approve control logic, thresholds, materiality and effective dates.
- [ ] Test duplicate, late-arriving, corrected and deleted source records.
- [ ] Test idempotency, retries, backfills and partial failures.
- [ ] Validate business-calendar SLA and escalation rules.
- [ ] Test role permissions, segregation of duties and audit-log immutability.
- [ ] Independently evaluate model outputs, prompt injection and unsupported claims.
- [ ] Validate Foundry ontology permissions and Power BI RLS with platform owners.
- [ ] Complete privacy, security, AI governance and export-control approvals.
- [ ] Run parallel pilot, reconcile outputs and obtain control-owner acceptance.
- [ ] Approve runbooks, incident response, rollback, retention and service ownership.
