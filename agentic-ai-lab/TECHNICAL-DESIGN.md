# AI Audit Intelligence — technical design

Interactive portfolio demonstrator for evidence-led audit and control workflows. The live agent uses synthetic records only and is not connected to CMA CGM, Airbus, or any other enterprise environment.

## Implementation status

| Component | Current status | Boundary |
|---|---|---|
| `index.html` | Interactive command centre with live Gemini orchestration, architecture view, before/after process map, decision map, tool catalogue, execution trace, findings and local review queue | Browser UI; review actions are session-local |
| `worker/src/index.js` | Deployed Worker implementation using Gemini Interactions API and allow-listed deterministic tools | Synthetic data only; no external write actions |
| `use-cases.html` | Eight separate deterministic use-case simulations with case-specific records, decision rules, traces and recommendations | Separate from the live Worker |
| `python/analytics.py` | Executable Python reference analytics using the standard library and embedded synthetic records | Not called by the hosted agent |
| `sql/control_library.sql` | BigQuery Standard SQL reference queries for eight controls | Templates only; not connected to a warehouse |

## Runtime architecture — live path

1. **Browser command centre** — accepts a natural-language audit objective, selected scope and follow-up question.
2. **Cloudflare Worker API** — checks the approved portfolio origin, enforces a request-size limit and reads the Gemini API key from a Worker secret. The browser never receives the key.
3. **Gemini Interactions API** — Gemini 3.8 Flash interprets the objective and selects functions from a fixed allow-list. It is one orchestrating model, not eight separate autonomous agents.
4. **Deterministic tool executor** — validates the selected function name against the tool catalogue and executes bounded JavaScript checks.
5. **Synthetic data layer** — seeded finance, procurement, supplier, pricing, fleet and export-documentation records.
6. **Evidence challenge and reporting** — tool traces, findings and record references return to Gemini; `challenge_evidence` challenges material findings; `draft_workpaper` creates a draft only after the selected findings have been challenged.
7. **Human review** — the browser displays suggested domain ownership and allows a reviewer to record a local demo status. No external ticket, approval, transaction hold or write-back is performed.

### Runtime guardrails

- Gemini API key stored as a Cloudflare Worker secret.
- Approved GitHub Pages origin enforced for browser requests.
- Request body capped at 24,000 characters.
- Maximum five tool-calling rounds and twenty tool calls per request.
- Eleven named, schema-bounded functions; no arbitrary code execution or unrestricted SQL.
- Tool functions are deterministic and read-only.
- Tool outputs and user-supplied content are treated as untrusted data.
- Findings are audit leads, not proof of fraud, loss, misconduct or control failure.

These controls are prototype guardrails, not a substitute for production identity, authentication, tenant isolation, rate limiting, persistent audit logging or security certification.

## Tool catalogue

| Tool | Purpose | Output |
|---|---|---|
| `profile_demo_dataset` | Dataset discovery, row counts and field profile | Dataset profile |
| `run_data_quality_assessment` | Blank-cell and exact duplicate-row checks | PASS / REVIEW observations |
| `run_control_coverage_assessment` | Implemented and unavailable control catalogue | Coverage disclosure |
| `run_invoice_duplicate_test` | Supplier, amount, PO and currency matching within a date window; payment evidence fields | Duplicate candidates |
| `run_procurement_threshold_test` | Purchase-order clusters around an illustrative approval threshold | Clustering indicators |
| `run_supplier_change_test` | Supplier-master change timing, payment value, callback and dual-approval fields | Supplier-control candidates |
| `run_pricing_variance_test` | Contribution margin and discount-to-reference comparison | Commercial variance candidates |
| `run_fleet_utilisation_test` | Utilisation against synthetic cohort benchmark and unit-cost context | Operations outlier candidates |
| `run_export_documentation_triage` | Missing or unverified export documentation fields | Specialist review flags |
| `challenge_evidence` | Alternative explanations, missing evidence and corroboration questions | Evidence challenge |
| `draft_workpaper` | Draft from tool-returned findings after evidence challenge | Draft pending human review |

## Export compliance and trade-law boundary

The live export tool performs **documentation completeness triage only**. It can flag missing or unverified item-classification rationale, authorisation or no-authorisation evidence, end-user / end-use information, and party-screening evidence in synthetic shipment records.

It does **not**:
- classify an item against a control list;
- query sanctions or restricted-party databases;
- determine whether a licence is legally required;
- decide whether a shipment is permissible;
- provide legal advice or clear a shipment.

Export flags are routed in the demo interface to a trade-compliance specialist lane. The review queue is local to the browser session and does not notify a real person or create a ticket. An authorised specialist must verify current law, official sources, technical specifications, jurisdictional nexus and transaction facts.

The page links to official reference frameworks, including Regulation (EU) 2021/821, EU restrictive measures, French export-control resources, the Union Customs Code and conditional US / UK controls. These links are reference material, not a connected policy engine.

## Decision mapping

- **PASS** — configured data-quality checks pass; relevant tests may proceed with scope caveats.
- **REVIEW** — missing fields, duplicates or evidence gaps are disclosed and routed for validation.
- **ESCALATE** — a potential material, policy or regulatory issue is presented for an authorised specialist. The demo offers local review actions only.
- **BLOCK** — a production design state reserved for critical access, privacy or integrity failures; it is not an active runtime state in this demonstrator.

A finding should carry its record references, test parameters, rule result, limitations, alternative explanations, evidence gaps, owner and eventual human decision. The current demo provides a draft review summary and browser-session decisions; it does not persist an immutable enterprise decision log.

## Before / after process design

The page compares a generic fragmented manual audit sequence with the agent-assisted sequence: natural-language intake, data readiness checks, model-selected tests, deterministic execution, evidence challenge, specialist review and draft reporting. This is a process-design comparison, not a claim of measured time savings or a statement about a specific employer's historical operating procedure.

## Production extensions — not implemented here

- Enterprise ERP, finance, procurement, logistics and data-warehouse connectors.
- SSO / OIDC, RBAC, tenant and row-level security, purpose limitation and service identities.
- Governed source data contracts, lineage, freshness and immutable source snapshots.
- Persistent case management, ticketing, reviewer assignment and decision logs.
- Live sanctions / restricted-party screening and validated export classification / licensing services.
- Approved control thresholds, policy ownership, formal validation and audit sign-off.
- Model and prompt versioning, precision / recall evaluation, false-positive analysis, drift, latency and cost monitoring.
- Retention, deletion, encryption, privacy impact and AI risk governance.

## Decision contract

A production finding should retain:

- `finding_id`, `use_case_id`, `control_id`, `control_version`
- `source_record_ids`, `source_snapshot_id`, `query_or_code_hash`
- `rule_result`, `calculation`, `severity`, `confidence` (only when calibrated)
- `alternative_explanations`, `evidence_gaps`, `review_status`
- `owner`, `due_date`, `human_decision`, `decision_timestamp`

Thresholds and control criteria must be approved by the relevant control owner; illustrative demo parameters must never be represented as enterprise policy.
