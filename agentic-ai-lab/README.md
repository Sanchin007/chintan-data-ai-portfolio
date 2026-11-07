# Enterprise AI & Audit Intelligence — Portfolio Case Study

This directory contains the interactive audit-intelligence demonstrator and its supporting technical reference material.

## How to read this case study

The page intentionally separates two things:

1. **Professional enterprise experience** — hands-on engineering and delivery work during a Google Cloud strategic engagement at CMA CGM.
2. **Portfolio audit demonstrator** — a separate implementation created to demonstrate an AI-enabled audit workflow, deterministic checks, evidence review and human oversight.

The audit demonstrator is not presented as a CMA CGM production system and is not connected to CMA CGM enterprise data or applications.

## Professional experience represented on the page

The professional experience section describes the user's hands-on work across:

- 6+ AI agents and 18+ workflows built.
- Palantir Foundry and Palantir AIP.
- Google Gemini integrated with hybrid Google Cloud infrastructure.
- Single-agent and multi-agent workflows, including dynamic tool selection, planning, task delegation, multi-step execution, result validation and recovery.
- Python, SQL, APIs, backend services, data pipelines and AI/ML integrations.
- Technical solution design in collaboration with architects.
- Production releases, debugging, monitoring, integration maintenance and continuous improvement.
- Collaboration with Google's wider engineering team, which handled other aspects of the shared environment.

The professional scope also includes work across 12 countries, 8 business units, 6+ ML-related initiatives and 20+ BigQuery / Qlik Sense KPI dashboards.

## Interactive audit demonstrator

The web page provides a guided walkthrough of an illustrative audit process:

1. Describe an audit objective in natural language.
2. Select a supported investigation scope.
3. Run deterministic checks against synthetic records.
4. Inspect the execution trace and evidence.
5. Challenge findings and review alternative explanations.
6. Route items for human verification.
7. Prepare a draft working paper.

### Execution modes

- **Presentation mode:** Local, deterministic checks against fixed synthetic records. It does not call a model or connect to enterprise systems.
- **Optional Live Gemini mode:** Uses the included Cloudflare Worker integration pattern to orchestrate allow-listed deterministic tools. The Worker must be deployed and configured with the required secrets and bindings before this mode can operate.

## Important boundaries

- The audit data and operational signal feed are synthetic.
- The demonstrator is not connected to CMA CGM, Airbus, an ERP, an enterprise Foundry tenant, a Power BI tenant or a production audit repository.
- The audit demonstrator does not make legal, export-control, sanctions, licence or shipment-clearance decisions.
- Human reviewers retain responsibility for validating evidence, accepting findings and making consequential decisions.
- Detailed Foundry / Power BI mappings in the platform blueprint are reference designs for this audit demonstrator. They are not evidence that this particular demonstrator is deployed on those platforms.
- Do not treat illustrative simulator counters as real operational throughput or measured business outcomes.

## Supporting implementation material

- [Platform implementation blueprint](./PLATFORM-IMPLEMENTATION.md)
- [Continuous monitoring reference implementation](./python/continuous_monitor.py)
- [Audit analytics SQL reference model](./sql/audit_analytics_model.sql)
- [Python monitoring tests](./python/test_continuous_monitor.py)

## Interview walkthrough

A concise walkthrough should follow this sequence:

1. Start with the professional experience section: explain what you personally designed, coded, built and operated.
2. Explain the hybrid Palantir AIP / Foundry / Gemini / Google Cloud environment without implying every component was owned by one person.
3. Open the audit demonstrator and run one investigation.
4. Show deterministic execution, evidence challenge and human review.
5. Close with governance, production boundaries and what would be required for an enterprise deployment.

The main page is designed to tell the story first. The technical reference files are available for deeper questions.
