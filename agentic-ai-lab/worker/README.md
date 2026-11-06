# Independent Audit Intelligence API

Separate Cloudflare Worker for the portfolio's live-model audit assistant. It is isolated from the NexTrip worker.

## What is live
- Gemini Interactions API with Gemini 3.8 Flash performs natural-language orchestration and selects allow-listed tools.
- The Worker executes deterministic, read-only tests against seeded synthetic datasets.
- Tool names, arguments, results, timings and limitations are returned as an execution trace.
- The model is instructed to challenge evidence and distinguish indicators from proven control failures.
- No enterprise connectors, payment actions or write-back operations exist.

## Deploy
1. Install Wrangler with npm install -g wrangler.
2. From this directory run wrangler login.
3. Set the secret with wrangler secret put GEMINI_API_KEY. Paste the key into the terminal prompt, never into GitHub or the browser.
4. Deploy with wrangler deploy.
5. Verify the /health endpoint on your workers.dev URL.
6. Configure that Worker base URL in the live dashboard.

## API
POST /api/agent with JSON body: {"mission":"Review invoice duplicates and determine which candidates have payment evidence."}
GET /health

## Security and limitations
- Synthetic demo data only; no CMA CGM, Dassault, Airbus or other enterprise data.
- Gemini API key is read only from the Worker secret.
- Request body is size-limited; tool execution is allow-listed and bounded to five rounds.
- Tool functions are deterministic and have no external write capability.
- This is a portfolio prototype, not a production audit platform. Production use requires authentication, rate limiting, persistent audit logs, tenant isolation, privacy and retention controls, governed data access, security testing and formal validation of control criteria.
- Do not submit confidential or personal data. Review provider-side retention and account terms before use.
