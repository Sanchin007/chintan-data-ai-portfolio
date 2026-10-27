# Portfolio API backend (Cloudflare Workers + D1)

This backend supports the portfolio's real HTTP/API integration and server-side idempotency demonstration.

## What is live vs. not yet connected

- `GET /api/health`: backend/database health.
- `GET /api/travel/weather?city=Marseille`: makes real server-side HTTP calls to Open-Meteo geocoding and current weather. This is travel-context data, not flight status.
- `POST /api/operations`: persists a synthetic demo operation in D1 and enforces an idempotency key plus canonical request fingerprint. It does **not** call a booking provider or create a real booking.
- `GET /api/amadeus/status`: reports whether required configuration exists without exposing secrets.
- Amadeus Enterprise flight shopping is deliberately not enabled until the user obtains approved sandbox access and the exact endpoint/authentication contract from Amadeus. Do not assume legacy Self-Service endpoints are available to new developers.

The portfolio can also call Open-Meteo directly from the browser, so the live read-only API demo works before this Worker is deployed.

## Deploy

Requirements: Node.js/npm and a Cloudflare account with Workers and D1 enabled.

1. From this folder, install Wrangler: `npm install --save-dev wrangler`.
2. Create the database: `npx wrangler d1 create chintan-travel-demo`.
3. Copy the returned database ID into `wrangler.toml`, replacing `REPLACE_WITH_D1_DATABASE_ID`.
4. Apply the schema: `npx wrangler d1 execute chintan-travel-demo --remote --file=./schema.sql`.
5. Deploy: `npx wrangler deploy`.
6. Add the resulting `https://chintan-travel-api.<your-subdomain>.workers.dev` URL to the portfolio's optional backend endpoint field.

For local development, use `npx wrangler d1 execute chintan-travel-demo --local --file=./schema.sql` and `npx wrangler dev`.

## API examples

Health:
```bash
curl https://YOUR-WORKER.workers.dev/api/health
```

Weather:
```bash
curl 'https://YOUR-WORKER.workers.dev/api/travel/weather?city=Marseille'
```

Create/replay the same operation:
```bash
curl -i -X POST 'https://YOUR-WORKER.workers.dev/api/operations' \
  -H 'Content-Type: application/json' \
  -H 'X-Idempotency-Key: interview-demo-key-001' \
  -d '{"bookingReference":"BK-DEMO-874201","action":"AMEND_EQUIPMENT","from":"1 x 40HC","to":"2 x 40HC","route":"SHA-MRS","expectedDeltaEUR":320}'
```
Repeat the exact call: it should return the same operation ID with `replayed: true`. Reuse the key with a changed `to` or `expectedDeltaEUR`: it should return HTTP 409 without a new operation.

## Security notes

- Never commit provider secrets. Set them with Wrangler secrets only after the approved Amadeus Enterprise contract is available.
- The demo accepts synthetic identifiers only, limits payload size, restricts CORS origins, and rate-limits writes by IP hash/minute.
- CORS is not authentication. This endpoint has no real-world transaction side effects, and should remain a portfolio demo endpoint.
- The idempotency record is persisted in D1; this demonstrates durable replay/conflict behavior, but it is not a substitute for provider-side idempotency, transaction orchestration, or a production booking service.
