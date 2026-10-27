const DEFAULT_ORIGIN = "https://sanchin007.github.io";

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || DEFAULT_ORIGIN + ",http://localhost:8787,http://127.0.0.1:8787")
    .split(",").map((x) => x.trim()).filter(Boolean);
}
function response(body, status, origin, env, extra) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  });
  if (origin && allowedOrigins(env).includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type,X-Idempotency-Key");
    headers.set("Access-Control-Max-Age", "86400");
  }
  if (extra) for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(JSON.stringify(body), { status, headers });
}
function traceId() {
  return "tr_" + crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function enforceRateLimit(request, env) {
  const minute = Math.floor(Date.now() / 60000);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(ip);
  const bucketKey = ipHash + ":" + minute;
  const result = await env.DB.prepare(
    "INSERT INTO rate_limits (bucket_key, request_count, window_start) VALUES (?, 1, ?) " +
    "ON CONFLICT(bucket_key) DO UPDATE SET request_count = request_count + 1 RETURNING request_count"
  ).bind(bucketKey, minute).first();
  return Number(result && result.request_count || 0) <= 30;
}
async function weatherForCity(city) {
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.search = new URLSearchParams({ name: city, count: "1", language: "en", format: "json" });
  const geoResponse = await fetch(geoUrl, { signal: AbortSignal.timeout(8000) });
  if (!geoResponse.ok) throw new Error("Geocoding provider returned HTTP " + geoResponse.status);
  const geo = await geoResponse.json();
  if (!geo.results || !geo.results.length) return { found: false, city: city };
  const place = geo.results[0];
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
    timezone: "auto",
    forecast_days: "1"
  });
  const forecastResponse = await fetch(forecastUrl, { signal: AbortSignal.timeout(8000) });
  if (!forecastResponse.ok) throw new Error("Forecast provider returned HTTP " + forecastResponse.status);
  const forecast = await forecastResponse.json();
  return {
    found: true,
    place: { name: place.name, country: place.country, latitude: place.latitude, longitude: place.longitude },
    current: forecast.current || null,
    units: forecast.current_units || {},
    provider: "Open-Meteo",
    attribution: "Weather context only; not flight status, booking availability, or an Amadeus response."
  };
}
async function handleOperations(request, env, origin) {
  if (env.DEMO_WRITE_ENABLED !== "true") {
    return response({ error: "demo_write_disabled", message: "Enable DEMO_WRITE_ENABLED only for this synthetic portfolio demo." }, 403, origin, env);
  }
  if (!env.DB) return response({ error: "database_not_configured" }, 503, origin, env);
  if (!(await enforceRateLimit(request, env))) return response({ error: "rate_limited", message: "Try again in a minute." }, 429, origin, env);
  const key = request.headers.get("X-Idempotency-Key") || "";
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    return response({ error: "invalid_idempotency_key", message: "Send X-Idempotency-Key with 8–128 safe characters." }, 400, origin, env);
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 8192) return response({ error: "payload_too_large" }, 413, origin, env);
  let body;
  try { body = await request.json(); } catch (_) { return response({ error: "invalid_json" }, 400, origin, env); }
  const allowedActions = ["AMEND_EQUIPMENT", "QUOTE_CHECK", "DISRUPTION_REVIEW"];
  const payload = {
    bookingReference: String(body.bookingReference || ""),
    action: String(body.action || ""),
    from: String(body.from || ""),
    to: String(body.to || ""),
    route: String(body.route || ""),
    expectedDeltaEUR: Number(body.expectedDeltaEUR)
  };
  if (!/^BK-DEMO-[A-Z0-9-]{3,32}$/.test(payload.bookingReference) ||
      !allowedActions.includes(payload.action) ||
      !payload.from || payload.from.length > 80 ||
      !payload.to || payload.to.length > 80 ||
      !/^[A-Z]{3}-[A-Z]{3}$/.test(payload.route) ||
      !Number.isFinite(payload.expectedDeltaEUR) || payload.expectedDeltaEUR < 0 || payload.expectedDeltaEUR > 50000) {
    return response({ error: "invalid_demo_payload", message: "Use synthetic demo data and a supported action only." }, 400, origin, env);
  }
  const canonical = JSON.stringify(payload);
  const fingerprint = await sha256(canonical);
  const now = new Date().toISOString();
  const operationId = "op_" + crypto.randomUUID();
  const trace = traceId();
  const providerReference = "DEMO-" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  try {
    const insert = await env.DB.prepare(
      "INSERT OR IGNORE INTO operations " +
      "(idempotency_key, request_fingerprint, operation_id, trace_id, status, provider_reference, request_json, created_at, updated_at) " +
      "VALUES (?, ?, ?, ?, 'DEMO_ACCEPTED', ?, ?, ?, ?)"
    ).bind(key, fingerprint, operationId, trace, providerReference, canonical, now, now).run();
    const existing = await env.DB.prepare(
      "SELECT idempotency_key, request_fingerprint, operation_id, trace_id, status, provider_reference, request_json, created_at, updated_at " +
      "FROM operations WHERE idempotency_key = ?"
    ).bind(key).first();
    if (!existing) throw new Error("Operation insert could not be read back");
    if (existing.request_fingerprint !== fingerprint) {
      return response({
        error: "idempotency_conflict",
        message: "This idempotency key is already bound to a different canonical request.",
        traceId: trace,
        existingOperationId: existing.operation_id,
        existingFingerprint: existing.request_fingerprint,
        requestedFingerprint: fingerprint,
        providerCreateCalls: 0
      }, 409, origin, env);
    }
    const created = Number(insert && insert.meta && insert.meta.changes || 0) > 0;
    return response({
      operationId: existing.operation_id,
      traceId: existing.trace_id,
      idempotencyKey: existing.idempotency_key,
      requestFingerprint: existing.request_fingerprint,
      status: existing.status,
      providerReference: existing.provider_reference,
      request: JSON.parse(existing.request_json),
      createdAt: existing.created_at,
      replayed: !created,
      sideEffect: "NONE — durable demo operation only; no booking provider was called.",
      demoRecordCreated: created,
      providerCreateCalls: 0
    }, created ? 201 : 200, origin, env);
  } catch (error) {
    return response({ error: "operation_store_error", message: "Could not persist the demo operation.", traceId: trace }, 500, origin, env);
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (origin && !allowedOrigins(env).includes(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": origin || DEFAULT_ORIGIN,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-Idempotency-Key",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }
    if (origin && !allowedOrigins(env).includes(origin)) return response({ error: "origin_not_allowed" }, 403, origin, env);
    const start = Date.now();
    const trace = traceId();
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        if (!env.DB) return response({ status: "degraded", database: "not_configured", traceId: trace }, 503, origin, env);
        await env.DB.prepare("SELECT 1 AS ok").first();
        return response({ status: "ok", database: "connected", capabilities: ["live_weather_proxy", "persistent_idempotency_demo"], amadeus: "not_configured_until_enterprise_access_and_contract_are_provided", traceId: trace, elapsedMs: Date.now() - start }, 200, origin, env);
      }
      if (url.pathname === "/api/travel/weather" && request.method === "GET") {
        const city = (url.searchParams.get("city") || "Marseille").trim().slice(0, 80);
        if (!city || /[<>]/.test(city)) return response({ error: "invalid_city" }, 400, origin, env);
        const result = await weatherForCity(city);
        return response({ ...result, traceId: trace, elapsedMs: Date.now() - start }, 200, origin, env);
      }
      if (url.pathname === "/api/operations" && request.method === "POST") {
        return handleOperations(request, env, origin);
      }
      if (url.pathname === "/api/amadeus/status" && request.method === "GET") {
        const configured = Boolean(env.AMADEUS_API_BASE_URL && env.AMADEUS_AUTH_URL && env.AMADEUS_CLIENT_ID && env.AMADEUS_CLIENT_SECRET && env.AMADEUS_SEARCH_PATH);
        return response({
          configured,
          mode: env.AMADEUS_AUTH_MODE || "unset",
          message: configured
            ? "Credentials and endpoint settings are present. Verify them against the Enterprise API contract before enabling calls."
            : "Amadeus access is not configured. Request Enterprise sandbox access and use the exact endpoint/authentication contract provided by Amadeus.",
          secretsExposed: false,
          traceId: trace
        }, 200, origin, env);
      }
      return response({ error: "not_found", traceId: trace }, 404, origin, env);
    } catch (error) {
      return response({ error: "upstream_or_backend_error", message: "The request failed. Check the trace ID and server logs.", traceId: trace, elapsedMs: Date.now() - start }, 502, origin, env);
    }
  },
  async scheduled(event, env) {
    if (env.DB) {
      await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(Math.floor(Date.now() / 60000) - 1440).run();
    }
  }
};
