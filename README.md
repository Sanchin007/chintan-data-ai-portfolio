# Chintan Changole — Solution Engineering Portfolio v13

Single-page, dependency-free portfolio prepared for GitHub Pages.

## What changed in v13
- Preserved the CMA CGM Gemini Shipping Operations Assistant flagship and its four selectable end-to-end workflows: disruption recovery, instant quote, booking amendment, and document exception.
- Added a responsive **booking journey before / AI-assisted target comparison** based on the supplied Click & Book guide, showing multi-section form navigation versus a guided conversation while preserving authoritative validation and explicit confirmation. The AI-assisted side is clearly labeled as a conceptual portfolio design, not a live integration or screenshot of a deployed agent.
- Added a dedicated **Reliability Lab** tab for idempotency, duplicate requests, changed-payload conflicts, timeout-after-acceptance recovery, and status reconciliation.
- Added a live operation ledger with operation ID, trace ID, idempotency key, request fingerprint, status, and synthetic provider reference.
- Added an explicit confirmation gate before running simulated transaction scenarios.
- Reused the existing animated workflow journey, scenario controls, agent/tool boundaries, and production-control explanation.
- Kept the boundary explicit: all lab records are synthetic and browser-local. This is not a live Amadeus or airline integration and the lab's in-memory map is not production-grade transaction protection.

## Quick interview walkthrough
1. Open the [portfolio site](https://sanchin007.github.io/chintan-data-ai-portfolio/).
2. In the flagship project, choose **Reliability Lab**.
3. Check the explicit confirmation box and run **Successful request**.
4. Click **Retry same request + key**; provider create calls and unique provider records should remain at `1`.
5. Click **Reuse key with changed payload**; the service simulation records an idempotency conflict without a second provider call.
6. Run **Simulate timeout after provider accepts**, retry with the same key, then **Reconcile operation status**. The same operation transitions from `PENDING_VERIFICATION` to `CONFIRMED` without another create call.

## Presentation mode and expanded scenarios

- Added a screen-share presentation overlay inside the Reliability Lab, with a compact full-screen layout, animated execution trace, request/response examples, synthetic metrics, keyboard navigation (left/right arrows), and a clear exit action. Open it from **Reliability Lab → Open selected case in presentation mode**; there is no separate floating launcher.
- Added eight fictional use cases: same-key retry, timeout after provider acceptance, same-key/different-payload conflict, duplicate webhook delivery, concurrent submissions, transient provider error with bounded backoff, stale quote/version revalidation, and authorization/explicit-approval gating.
- All operation IDs, booking references, quote amounts, event IDs, and provider responses shown in this presentation are invented demo data. They are not production records and do not represent live CMA CGM, airline, or Amadeus transactions.
- The backend in `api/` must be deployed and configured before its health/idempotency controls can call your own Worker. The demo operation endpoint persists synthetic records only and never invokes a booking provider.

## Production design points
- Persist the key and canonical request fingerprint atomically before the side effect.
- Enforce a concurrency-safe uniqueness constraint in durable server-side storage.
- Same key + same payload returns the existing operation; same key + changed payload is a conflict.
- A timeout after provider acceptance is an unknown outcome, not proof of failure.
- Use provider-side idempotency where supported, authenticated status lookup, bounded retries for safe reads, reconciliation, traceable audit events, and a defined manual-review path.

Deploy by publishing `index.html` through GitHub Pages.
