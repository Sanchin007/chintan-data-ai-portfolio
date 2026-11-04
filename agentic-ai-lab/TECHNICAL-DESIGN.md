# Ocean Intelligence — Technical design & control library

Independent portfolio case study using synthetic maritime/logistics data. It is not an official CMA CGM or Airbus system and does not connect to enterprise systems.

## What is implemented in this repository

- `index.html`: agent command-centre simulation.
- `use-cases.html`: eight separate interactive use-case simulations, with case-specific records, decision rules, agent traces, evidence and recommendations; architecture and process diagrams.
- `python/analytics.py`: executable Python reference analytics using only the Python standard library and embedded synthetic records. Run with `python analytics.py`.
- `sql/control_library.sql`: BigQuery Standard SQL reference queries for eight controls. These are templates and require the documented demo tables/schema to be created before execution.

## Eight use cases

1. AP duplicate invoice candidates and payment evidence.
2. Procurement PO clustering around delegated approval thresholds.
3. Supplier bank-detail changes followed by high-value payments.
4. Route contribution margin and discount override review.
5. Vessel utilisation cohort outliers and unit-cost context.
6. Port-call delay propagation and connection-buffer exposure.
7. Critical data-quality gates and lineage checks.
8. Continuous audit alert generation and idempotent exception identity.

## Reference architecture

1. User / audit command centre: scope, use-case selection, role-aware mission intake.
2. API and workflow orchestration: identity, access checks, task graph, state, retries and trace IDs.
3. Agent layer: orchestrator, domain specialists, independent audit challenger and reporting agent.
4. Tool layer: read-only SQL, Python analytics, approved retrieval, policy catalogue and BI.
5. Data layer: governed ERP, finance, commercial, operations and supplier datasets.
6. Cross-cutting controls: privacy, AI risk tiering, model/prompt versions, security, observability, human review and lifecycle management.

## Decision contract

A finding is not emitted from an LLM assertion alone. The proposed contract is:

- `finding_id`, `use_case_id`, `control_id`, `control_version`
- `source_record_ids`, `source_snapshot_id`, `query_or_code_hash`
- `rule_result`, `calculation`, `severity`, `confidence`
- `alternative_explanations`, `evidence_gaps`, `review_status`
- `owner`, `due_date`, `human_decision`, `decision_timestamp`

Risk routing is a transparent policy decision: PASS continues; WARN requests context; ESCALATE creates a human-reviewed case; BLOCK stops downstream analytics for critical data, privacy or access failures. The exact materiality thresholds must be set by the enterprise control owner and never hard-coded from demo examples.

## Tool selection and boundaries

| Capability | Reference choice | Boundary |
|---|---|---|
| Data warehouse | BigQuery / governed SQL platform | Read-only, scoped views |
| Analytics | Python, pandas, SciPy / scikit-learn | Reproducible, versioned tests |
| Agent orchestration | Gemini or approved LLM + LangGraph-style workflow | Structured outputs; bounded tool access |
| Enterprise data apps | Palantir Foundry where licensed / selected | Not used by this demo |
| BI | Power BI or Qlik Sense | Human-readable KPIs and exception trends |
| Governance | SSO/OIDC, RBAC, secrets manager, audit log, model registry | Least privilege and approval gates |

## Production hardening

- Use service identities and short-lived credentials; never place secrets in browser code.
- Enforce tenant, role, purpose and row-level access at the API/data layer.
- Keep all source connectors read-only unless a separately approved workflow authorises a side effect.
- Validate LLM tool arguments against schemas; treat retrieved documents as untrusted input.
- Add prompt-injection controls, PII minimisation, encryption, retention and deletion policies.
- Version datasets, queries, prompts, models and control definitions.
- Evaluate precision/recall, false positives, evidence sufficiency, drift, latency and cost.
- Use immutable trace and decision logs; require human approval for regulated or material outcomes.
- Shadow-run before production and compare agent results with auditor decisions.
- Track baseline effort, coverage, exception yield, time-to-evidence, remediation ageing, adoption and realised value.

## Important implementation boundary

The browser use-case simulations run deterministic JavaScript and intentionally label themselves as simulations. The Python file is executable reference logic; the SQL file is a reference control library. Neither is wired to the hosted browser page or an enterprise data warehouse. No actual Gemini/LLM inference, Foundry runtime, Power BI report, scheduled control service, ERP connection or payment operation is claimed.
