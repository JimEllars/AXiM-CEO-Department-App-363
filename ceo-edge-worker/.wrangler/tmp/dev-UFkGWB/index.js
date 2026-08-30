var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/security.ts
var encoder = new TextEncoder();
function normalizeSignature(signature) {
  return signature.trim().replace(/^sha256=/i, "").toLowerCase();
}
__name(normalizeSignature, "normalizeSignature");
function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
async function createHmac(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(createHmac, "createHmac");
async function verifySignature(payload, suppliedSignature, secret) {
  if (!secret || !suppliedSignature) return false;
  const expected = await createHmac(payload, secret);
  return constantTimeEqual(expected, normalizeSignature(suppliedSignature));
}
__name(verifySignature, "verifySignature");
async function createHitlToken(actionId, eventId, secret) {
  const expiresAt = Math.floor(Date.now() / 1e3) + 900;
  const claims = `${actionId}.${eventId}.${expiresAt}`;
  const signature = await createHmac(claims, secret);
  return btoa(`${claims}.${signature}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(createHitlToken, "createHitlToken");
async function verifyHitlToken(token, secret) {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
    const decoded = atob(padded);
    const parts = decoded.split(".");
    if (parts.length !== 4) return false;
    const [actionId, eventId, expiresAt, suppliedSignature] = parts;
    const expires = Number(expiresAt);
    if (!actionId || !eventId || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1e3)) {
      return false;
    }
    const expected = await createHmac(`${actionId}.${eventId}.${expiresAt}`, secret);
    return constantTimeEqual(expected, suppliedSignature);
  } catch {
    return false;
  }
}
__name(verifyHitlToken, "verifyHitlToken");

// src/services/telemetryStore.ts
var MAX_EVENTS = 100;
var KV_KEY = "TELEMETRY_EVENTS";
async function getEvents(env) {
  const data = await env.CEO_TELEMETRY_KV.get(KV_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}
__name(getEvents, "getEvents");
async function saveEvents(env, events) {
  await env.CEO_TELEMETRY_KV.put(KV_KEY, JSON.stringify(events));
}
__name(saveEvents, "saveEvents");
async function addTelemetry(env, event) {
  const events = await getEvents(env);
  const record = {
    event,
    received_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  events.unshift(record);
  const eventsToSave = events.slice(0, MAX_EVENTS);
  await saveEvents(env, eventsToSave);
  return record;
}
__name(addTelemetry, "addTelemetry");
async function listTelemetry(env, limit = 25) {
  const events = await getEvents(env);
  return events.slice(0, Math.min(Math.max(limit, 1), MAX_EVENTS));
}
__name(listTelemetry, "listTelemetry");
async function resolveTelemetry(env, actionId, resolution) {
  const events = await getEvents(env);
  const record = events.find((item) => item.event.action_schema?.action_id === actionId);
  if (!record) return false;
  record.resolved = resolution;
  await saveEvents(env, events);
  return true;
}
__name(resolveTelemetry, "resolveTelemetry");

// src/services/metrics.ts
function getMetrics() {
  return [
    { label: "Gross Revenue", value: "$81,155", change: "Target", tone: "green" },
    { label: "Contribution Margin", value: "77.6%", change: "+2.4%", tone: "green" },
    { label: "QTD Assessments", value: "1,800", change: "Q1 Baseline", tone: "blue" },
    { label: "Affiliate Yield", value: "$5,035", change: "Projected Payouts", tone: "amber" }
  ];
}
__name(getMetrics, "getMetrics");

// src/services/emailService.ts
var TIMEOUT_MS = 3e3;
var ExecutiveMailer = class {
  constructor(env) {
    this.env = env;
  }
  env;
  static {
    __name(this, "ExecutiveMailer");
  }
  async sendAlert(payload) {
    const html = this.withActionButton(payload.html, payload.hitlToken);
    try {
      return await this.sendEmailit({ ...payload, html });
    } catch (error) {
      console.error(JSON.stringify({
        stream: "ticket_ai_telemetry",
        type: "EMAILIT_FAILOVER",
        message: error instanceof Error ? error.message : "Unknown Emailit failure",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }));
      return this.sendResend({ ...payload, html });
    }
  }
  withActionButton(html, token) {
    if (!token) return html;
    const url = `https://ceo.axim.us.com/api/v1/approve?token=${encodeURIComponent(token)}`;
    return `${html}
      <div style="padding:24px 0;text-align:center">
        <a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#66e3a4;color:#07100f;font-family:Arial,sans-serif;font-weight:700;text-decoration:none">
          Review executive directive
        </a>
      </div>`;
  }
  async sendEmailit(payload) {
    const response = await this.fetchWithTimeout(this.env.EMAILIT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.EMAILIT_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.env.EMAIL_FROM,
        to: "james.ellars@axim.us.com",
        bcc: "jrellars@gmail.com",
        subject: payload.subject,
        html: payload.html
      })
    });
    if (!response.ok) {
      throw new Error(`Emailit returned ${response.status}`);
    }
    const result = await response.json();
    return { provider: "emailit", id: result.id };
  }
  async sendResend(payload) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.env.EMAIL_FROM,
        to: ["james.ellars@axim.us.com"],
        bcc: ["jrellars@gmail.com"],
        subject: payload.subject,
        html: payload.html
      })
    });
    if (!response.ok) {
      throw new Error(`Both email providers failed; Resend returned ${response.status}`);
    }
    const result = await response.json();
    return { provider: "resend", id: result.id };
  }
  async fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
};

// src/index.ts
var DEVELOPMENT_ORIGINS = /* @__PURE__ */ new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);
var RESOLUTIONS = /* @__PURE__ */ new Set(["APPROVE", "REJECT", "REQUEST_INFO"]);
function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  if (env.ENVIRONMENT === "development" && DEVELOPMENT_ORIGINS.has(origin)) return true;
  return origin === env.CEO_APP_ORIGIN || origin === "https://ceo.axim.us.com";
}
__name(isAllowedOrigin, "isAllowedOrigin");
function corsHeaders(origin, env) {
  const allowedOrigin = origin && isAllowedOrigin(origin, env) ? origin : env.CEO_APP_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, X-AXiM-Signature, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, status, headers = {}) {
  return Response.json(data, { status, headers });
}
__name(json, "json");
function validateCoreEvent(event) {
  return Boolean(
    event.event_id && event.source_department && event.timestamp && event.event_type && event.priority && event.payload && typeof event.hitl_required === "boolean"
  );
}
__name(validateCoreEvent, "validateCoreEvent");
async function parseVerifiedRequest(request, env) {
  const rawBody = await request.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }
  const headerSignature = request.headers.get("X-AXiM-Signature");
  const embeddedSignature = typeof payload.signature === "string" ? payload.signature : "";
  let signedContent = rawBody;
  if (!headerSignature && embeddedSignature) {
    const unsignedPayload = { ...payload };
    delete unsignedPayload.signature;
    signedContent = JSON.stringify(unsignedPayload);
  }
  const valid = await verifySignature(
    signedContent,
    headerSignature || embeddedSignature,
    env.AXIM_CORE_SECRET
  );
  return valid ? { payload } : json({ error: "Unauthorized: Invalid webhook signature" }, 401);
}
__name(parseVerifiedRequest, "parseVerifiedRequest");
async function handleCoreWebhook(request, env) {
  const verified = await parseVerifiedRequest(request, env);
  if (verified instanceof Response) return verified;
  const event = verified.payload;
  if (!validateCoreEvent(event)) {
    return json({ error: "Payload does not match the Core event contract" }, 422);
  }
  const record = await addTelemetry(env, event);
  const hitlToken = event.hitl_required && event.action_schema?.action_id ? await createHitlToken(
    event.action_schema.action_id,
    event.event_id,
    env.AXIM_CORE_SECRET
  ) : void 0;
  console.log(JSON.stringify({
    stream: "ceo_core_telemetry",
    eventId: event.event_id,
    source: event.source_department,
    type: event.event_type,
    priority: event.priority,
    hitlRequired: event.hitl_required,
    receivedAt: record.received_at
  }));
  return json({
    accepted: true,
    event_id: event.event_id,
    hitl_token: hitlToken,
    received_at: record.received_at
  }, 202);
}
__name(handleCoreWebhook, "handleCoreWebhook");
async function handleTelemetry(request, env) {
  const limit = Number(new URL(request.url).searchParams.get("limit") || 25);
  return json({
    events: await listTelemetry(env, Number.isFinite(limit) ? limit : 25),
    volatile: false,
    note: "Telemetry is retained in the CEO_TELEMETRY_KV namespace."
  }, 200);
}
__name(handleTelemetry, "handleTelemetry");
async function handleHitlResolve(request, env) {
  const verified = await parseVerifiedRequest(request, env);
  if (verified instanceof Response) return verified;
  const { action_id, resolution, actor } = verified.payload;
  if (typeof action_id !== "string" || typeof resolution !== "string" || !RESOLUTIONS.has(resolution)) {
    return json({ error: "Invalid HITL resolution contract" }, 422);
  }
  const resolved = await resolveTelemetry(env, action_id, resolution);
  console.log(JSON.stringify({
    stream: "executive_directives",
    actionId: action_id,
    resolution,
    actor: typeof actor === "string" ? actor : "cloudflare-access-user",
    resolvedAt: (/* @__PURE__ */ new Date()).toISOString()
  }));
  return json({ resolved: true, action_id, resolution, tracked: resolved }, 200);
}
__name(handleHitlResolve, "handleHitlResolve");
async function handleApproval(request, env) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !await verifyHitlToken(token, env.AXIM_CORE_SECRET)) {
    return json({ error: "Invalid or expired approval token" }, 401);
  }
  return json({
    valid: true,
    message: "Approval token verified. Submit the signed HITL resolution through the executive client."
  }, 200);
}
__name(handleApproval, "handleApproval");
async function handleVoiceFeed(request, env) {
  const mockFeed = [
    {
      call_id: "call_12345",
      caller_id: "+1 (555) 019-2834",
      status: "COMPLETED",
      duration: 142,
      noota_transcript_summary: "Client inquiring about Q3 enterprise pricing tiers.",
      audio_url: "https://example.com/audio1.mp3"
    },
    {
      call_id: "call_67890",
      caller_id: "Internal: Onyx Team",
      status: "MISSED",
      duration: 45,
      noota_transcript_summary: "Onyx node 3 requires manual override for dependency update.",
      audio_url: "https://example.com/audio2.mp3"
    }
  ];
  return json({ feed: mockFeed }, 200);
}
__name(handleVoiceFeed, "handleVoiceFeed");
async function handleDispatchDirective(request, env) {
  const authHeader = request.headers.get("Authorization") || request.headers.get("X-Axim-Signature");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }
  const directiveRecord = {
    command: payload.directive_body,
    schedule: "immediate",
    status: "active",
    created_by: "CEO_OFFICE",
    priority: "CRITICAL",
    target: payload.target || "onyx"
  };
  console.log(JSON.stringify({
    stream: "executive_directives_dispatch",
    directive: directiveRecord,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
  await new Promise((r) => setTimeout(r, 1e3));
  return json({
    success: true,
    status: "DISPATCHED",
    id: "dir_" + Math.random().toString(36).substring(7)
  }, 200);
}
__name(handleDispatchDirective, "handleDispatchDirective");
async function handleGateDecision(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }
  const { gate_id, decision, notes } = payload;
  if (typeof gate_id !== "string") {
    return json({ error: "Invalid or missing gate_id" }, 400);
  }
  if (!["APPROVE", "REJECT", "HOLD"].includes(decision)) {
    return json({ error: "Invalid or missing decision" }, 400);
  }
  console.log(JSON.stringify({
    stream: "governance_gate_decision",
    gate_id,
    decision,
    notes,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }));
  await new Promise((r) => setTimeout(r, 600));
  return json({
    success: true,
    status: "ACKNOWLEDGED",
    gate_id,
    decision
  }, 200);
}
__name(handleGateDecision, "handleGateDecision");
async function handleDispatchMemo(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }
  const { subject, priority, recipients, body } = payload;
  if (!subject || !recipients || !body) {
    return json({ error: "Missing required fields" }, 422);
  }
  const mailer = new ExecutiveMailer(env);
  try {
    const result = await mailer.sendAlert({
      to: recipients.split(",").map((r) => r.trim()),
      subject: `[${priority} Priority] ${subject}`,
      html: `<p>${body}</p>`
    });
    console.log(JSON.stringify({
      stream: "executive_audit_logs",
      action: "dispatch_memo",
      recipients,
      priority,
      provider: result.provider,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    return json({ success: true, result }, 200);
  } catch (err) {
    console.error("Failed to dispatch memo:", err.message);
    return json({ error: "Failed to dispatch memo" }, 500);
  }
}
__name(handleDispatchMemo, "handleDispatchMemo");
async function handleSelldoneWebhook(request, env) {
  const signature = request.headers.get("X-Selldone-Signature");
  if (!signature) {
    return json({ error: "Unauthorized: Missing signature" }, 401);
  }
  const rawBody = await request.text();
  const valid = await verifySignature(rawBody, signature, env.SELLDONE_WEBHOOK_SECRET);
  if (!valid) {
    return json({ error: "Unauthorized: Invalid webhook signature" }, 401);
  }
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }
  const { order_id, total_amount, affiliate_code, ...rest } = payload;
  const safeTelemetry = {
    stream: "selldone_telemetry",
    order_id,
    total_amount,
    affiliate_code,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  console.log(JSON.stringify(safeTelemetry));
  return json({ accepted: true }, 202);
}
__name(handleSelldoneWebhook, "handleSelldoneWebhook");
function verifyClientAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === env.CEO_CLIENT_SECRET;
}
__name(verifyClientAuth, "verifyClientAuth");
var RATE_LIMIT_WINDOW_MS = 10 * 1e3;
var RATE_LIMIT_MAX_REQUESTS = 20;
var rateLimitMap = /* @__PURE__ */ new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.expiresAt < now) {
      rateLimitMap.delete(key);
    }
  }
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  record.count++;
  return true;
}
__name(checkRateLimit, "checkRateLimit");
var src_default = {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const ip = request.headers.get("cf-connecting-ip");
    if (ip && !checkRateLimit(ip)) {
      return json({ error: "Too Many Requests" }, 429);
    }
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin, env);
    if (origin && !isAllowedOrigin(origin, env)) {
      return json({ error: "Origin not allowed" }, 403, headers);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    let response;
    let errorRate = 0;
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        response = json({ status: "healthy", service: "ceo-edge-worker" }, 200);
      } else if (request.method === "GET" && url.pathname === "/api/v1/metrics") {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: "Unauthorized" }, 401);
        } else {
          response = json(getMetrics(), 200);
        }
      } else if (request.method === "GET" && url.pathname === "/api/v1/telemetry") {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: "Unauthorized" }, 401);
        } else {
          response = await handleTelemetry(request, env);
        }
      } else if (request.method === "GET" && url.pathname === "/api/v1/approve") {
        response = await handleApproval(request, env);
      } else if (request.method === "POST" && url.pathname === "/api/v1/selldone-webhook") {
        response = await handleSelldoneWebhook(request, env);
      } else if (request.method === "POST" && url.pathname === "/api/v1/core-webhook") {
        response = await handleCoreWebhook(request, env);
      } else if (request.method === "GET" && url.pathname === "/api/v1/communications/voice-feed") {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: "Unauthorized" }, 401);
        } else {
          response = await handleVoiceFeed(request, env);
        }
      } else if (request.method === "POST" && url.pathname === "/api/v1/communications/dispatch-memo") {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: "Unauthorized" }, 401);
        } else {
          response = await handleDispatchMemo(request, env);
        }
      } else if (request.method === "POST" && url.pathname === "/api/v1/governance/gate-decision") {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: "Unauthorized" }, 401);
        } else {
          response = await handleGateDecision(request, env);
        }
      } else if (request.method === "POST" && url.pathname === "/api/v1/directives/dispatch") {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: "Unauthorized" }, 401);
        } else {
          response = await handleDispatchDirective(request, env);
        }
      } else if (request.method === "POST" && url.pathname === "/api/v1/hitl-resolve") {
        response = await handleHitlResolve(request, env);
      } else {
        response = json({ error: "Route not found" }, 404);
      }
      if (!response.ok) {
        errorRate = 1;
      }
    } catch (err) {
      errorRate = 1;
      response = json({ error: "Internal Server Error" }, 500);
      console.error(err);
    }
    const latency = Date.now() - startTime;
    console.log(JSON.stringify({
      stream: "observability",
      path: url.pathname,
      method: request.method,
      status: response.status,
      latency,
      errorRate,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    const outgoing = new Response(response.body, response);
    Object.entries(headers).forEach(([key, value]) => outgoing.headers.set(key, value));
    return outgoing;
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-2mWc01/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-2mWc01/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
