# AI Audit Intelligence Worker

Cloudflare Worker API for the portfolio's live Gemini-orchestrated audit assistant. It is isolated from the NexTrip worker.

## Live runtime

- Gemini Interactions API using Gemini 3.8 Flash interprets audit objectives and selects allow-listed functions.
- Eleven bounded functions cover dataset profiling, data quality, control coverage, invoice duplicate candidates, procurement threshold clustering, supplier change-to-payment checks, pricing variance, fleet utilisation, export-documentation completeness triage, evidence challenge and draft working papers.
- Deterministic JavaScript functions run against seeded synthetic datasets.
- Tool names, arguments, outputs, status and duration are returned in the execution trace.
- Material findings are challenged for alternative explanations and missing corroboration.
- Draft workpapers require completed evidence-challenge events and remain pending human review.
- The named specialist roles are workflow responsibilities coordinated by one model, not separate autonomous LLMs.

## Export compliance boundary

The export tool flags missing or unverified documentation fields in synthetic shipment records: classification rationale, authorisation or no-authorisation evidence, end-user / end-use information, and party-screening evidence. It routes flags to a trade-compliance specialist lane in the demo UI.

It does not perform live classification, sanctions / restricted-party screening, legal licence determination or shipment clearance. A missing document is an evidence gap, not proof of a breach. Human specialist verification is mandatory.

## Deploy

1. Install Wrangler: `npm install -g wrangler`.
2. From this directory run `wrangler login`.
3. Set the secret with `wrangler secret put GEMINI_API_KEY`. Paste the key into the terminal prompt, never into GitHub or browser code.
4. Deploy with `wrangler deploy`.
5. Verify the `/health` endpoint on the configured workers.dev URL.
6. The portfolio page calls `POST /api/agent` with a JSON body such as `{"mission":"Review invoice duplicates and determine which candidates have payment evidence."}`.

## Runtime limits and security

- Gemini API key is read only from the Worker secret.
- Approved portfolio origin is enforced for browser requests.
- Request body limit: 24,000 characters.
- Maximum four tool-calling rounds and twenty tool calls per request. The live endpoint requires a Cloudflare Rate Limiting binding (8 requests per IP per 60 seconds). Provision the binding in the target Cloudflare account before deployment; live execution fails closed if it is absent.
- Function names and argument schemas are allow-listed; no arbitrary code execution or unrestricted SQL.
- Tools are deterministic and read-only. No enterprise connectors, payment actions, approvals or write-back exist.
- Synthetic records only; no CMA CGM, Dassault, Airbus or other enterprise data.
- The Worker origin check is not user authentication. Production use requires authentication, rate limiting, tenant isolation, privacy and retention controls, persistent audit logs, governed data access, security testing and formal validation of control criteria.
- Do not submit confidential or personal data. Review provider-side retention and account terms before use.
