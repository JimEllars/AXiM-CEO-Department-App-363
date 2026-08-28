import type { CoreEvent, Env } from '../types';

const MAX_EVENTS = 100;
const KV_KEY = 'TELEMETRY_EVENTS';

export interface StoredTelemetry {
  event: CoreEvent;
  received_at: string;
  resolved?: string;
}

async function getEvents(env: Env): Promise<StoredTelemetry[]> {
  const data = await env.TELEMETRY_KV.get(KV_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as StoredTelemetry[];
  } catch {
    return [];
  }
}

async function saveEvents(env: Env, events: StoredTelemetry[]): Promise<void> {
  await env.TELEMETRY_KV.put(KV_KEY, JSON.stringify(events));
}

export async function addTelemetry(env: Env, event: CoreEvent): Promise<StoredTelemetry> {
  const events = await getEvents(env);

  const record = {
    event,
    received_at: new Date().toISOString()
  };

  events.unshift(record);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  await saveEvents(env, events);
  return record;
}

export async function listTelemetry(env: Env, limit = 25): Promise<StoredTelemetry[]> {
  const events = await getEvents(env);
  return events.slice(0, Math.min(Math.max(limit, 1), MAX_EVENTS));
}

export async function resolveTelemetry(env: Env, actionId: string, resolution: string): Promise<boolean> {
  const events = await getEvents(env);
  const record = events.find((item) => item.event.action_schema?.action_id === actionId);

  if (!record) return false;

  record.resolved = resolution;
  await saveEvents(env, events);
  return true;
}
