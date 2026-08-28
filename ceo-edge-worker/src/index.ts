import { createHitlToken, verifyHitlToken, verifySignature } from './security';
import { addTelemetry, listTelemetry, resolveTelemetry } from './services/telemetryStore';
import { getMetrics } from './services/metrics';
import type { CoreEvent, Env } from './types';

const DEVELOPMENT_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

const RESOLUTIONS = new Set(['APPROVE', 'REJECT', 'REQUEST_INFO']);

function isAllowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return true;
  if (env.ENVIRONMENT === 'development' && DEVELOPMENT_ORIGINS.has(origin)) return true;

  return origin === env.CEO_APP_ORIGIN || origin === 'https://ceo.axim.us.com';
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowedOrigin = origin && isAllowedOrigin(origin, env)
    ? origin
    : env.CEO_APP_ORIGIN;

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, X-AXiM-Signature, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(data: unknown, status: number, headers: HeadersInit = {}): Response {
  return Response.json(data, { status, headers });
}

function validateCoreEvent(event: Partial<CoreEvent>): event is CoreEvent {
  return Boolean(
    event.event_id &&
    event.source_department &&
    event.timestamp &&
    event.event_type &&
    event.priority &&
    event.payload &&
    typeof event.hitl_required === 'boolean'
  );
}

async function parseVerifiedRequest(
  request: Request,
  env: Env
): Promise<{ payload: Record<string, unknown> } | Response> {
  const rawBody = await request.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  const headerSignature = request.headers.get('X-AXiM-Signature');
  const embeddedSignature = typeof payload.signature === 'string' ? payload.signature : '';
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

  return valid
    ? { payload }
    : json({ error: 'Unauthorized: Invalid webhook signature' }, 401);
}

async function handleCoreWebhook(request: Request, env: Env): Promise<Response> {
  const verified = await parseVerifiedRequest(request, env);
  if (verified instanceof Response) return verified;

  const event = verified.payload as unknown as Partial<CoreEvent>;

  if (!validateCoreEvent(event)) {
    return json({ error: 'Payload does not match the Core event contract' }, 422);
  }

  const record = await addTelemetry(env, event);
  const hitlToken = event.hitl_required && event.action_schema?.action_id
    ? await createHitlToken(
      event.action_schema.action_id,
      event.event_id,
      env.AXIM_CORE_SECRET
    )
    : undefined;

  console.log(JSON.stringify({
    stream: 'ceo_core_telemetry',
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

async function handleTelemetry(request: Request, env: Env): Promise<Response> {
  const limit = Number(new URL(request.url).searchParams.get('limit') || 25);

  return json({
    events: await listTelemetry(env, Number.isFinite(limit) ? limit : 25),
    volatile: true,
    note: 'Worker memory is temporary. Connect durable storage before production use.'
  }, 200);
}

async function handleHitlResolve(request: Request, env: Env): Promise<Response> {
  const verified = await parseVerifiedRequest(request, env);
  if (verified instanceof Response) return verified;

  const { action_id, resolution, actor } = verified.payload;

  if (
    typeof action_id !== 'string' ||
    typeof resolution !== 'string' ||
    !RESOLUTIONS.has(resolution)
  ) {
    return json({ error: 'Invalid HITL resolution contract' }, 422);
  }

  const resolved = await resolveTelemetry(env, action_id, resolution);

  console.log(JSON.stringify({
    stream: 'executive_directives',
    actionId: action_id,
    resolution,
    actor: typeof actor === 'string' ? actor : 'cloudflare-access-user',
    resolvedAt: new Date().toISOString()
  }));

  return json({ resolved: true, action_id, resolution, tracked: resolved }, 200);
}

async function handleApproval(request: Request, env: Env): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token');

  if (!token || !(await verifyHitlToken(token, env.AXIM_CORE_SECRET))) {
    return json({ error: 'Invalid or expired approval token' }, 401);
  }

  return json({
    valid: true,
    message: 'Approval token verified. Submit the signed HITL resolution through the executive client.'
  }, 200);
}



function verifyClientAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === env.CEO_CLIENT_SECRET;
}

const RATE_LIMIT_WINDOW_MS = 10 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Lazy cleanup
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.expiresAt < now) {
      rateLimitMap.delete(key);
    }
  }

  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // rate limited
  }

  record.count++;
  return true; // allowed
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();

    const ip = request.headers.get('cf-connecting-ip');
    if (ip && !checkRateLimit(ip)) {
      return json({ error: 'Too Many Requests' }, 429);
    }
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin, env);

    if (origin && !isAllowedOrigin(origin, env)) {
      return json({ error: 'Origin not allowed' }, 403, headers);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    let response: Response;
    let errorRate = 0;

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        response = json({ status: 'healthy', service: 'ceo-edge-worker' }, 200);
      } else if (request.method === 'GET' && url.pathname === '/api/v1/metrics') {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: 'Unauthorized' }, 401);
        } else {
          response = json(getMetrics(), 200);
        }
      } else if (request.method === 'GET' && url.pathname === '/api/v1/telemetry') {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: 'Unauthorized' }, 401);
        } else {
          response = await handleTelemetry(request, env);
        }
      } else if (request.method === 'GET' && url.pathname === '/api/v1/approve') {
        response = await handleApproval(request, env);
      } else if (request.method === 'POST' && url.pathname === '/api/v1/core-webhook') {
        response = await handleCoreWebhook(request, env);
      } else if (request.method === 'POST' && url.pathname === '/api/v1/hitl-resolve') {
        response = await handleHitlResolve(request, env);
      } else {
        response = json({ error: 'Route not found' }, 404);
      }

      if (!response.ok) {
        errorRate = 1;
      }
    } catch (err) {
      errorRate = 1;
      response = json({ error: 'Internal Server Error' }, 500);
      console.error(err);
    }

    const latency = Date.now() - startTime;

    // Cloudflare Workers Observability logging
    console.log(JSON.stringify({
      stream: 'observability',
      path: url.pathname,
      method: request.method,
      status: response.status,
      latency,
      errorRate,
      timestamp: new Date().toISOString()
    }));

    const outgoing = new Response(response.body, response);
    Object.entries(headers).forEach(([key, value]) => outgoing.headers.set(key, value));

    return outgoing;
  }
};