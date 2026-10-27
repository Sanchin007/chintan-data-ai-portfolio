# Chintan Changole — Solution Engineering Portfolio v11

Single-page, dependency-free portfolio prepared for GitHub Pages.

## What changed in v11
- Preserved the CMA CGM Gemini Shipping Operations Assistant flagship and its four selectable end-to-end workflows: disruption recovery, instant quote, booking amendment, and document exception.
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

## Production design points
- Persist the key and canonical request fingerprint atomically before the side effect.
- Enforce a concurrency-safe uniqueness constraint in durable server-side storage.
- Same key + same payload returns the existing operation; same key + changed payload is a conflict.
- A timeout after provider acceptance is an unknown outcome, not proof of failure.
- Use provider-side idempotency where supported, authenticated status lookup, bounded retries for safe reads, reconciliation, traceable audit events, and a defined manual-review path.

Deploy by publishing `index.html` through GitHub Pages.
