import type { CoreEvent } from '../types';

const MAX_EVENTS = 100;

export interface StoredTelemetry {
  event: CoreEvent;
  received_at: string;
  resolved?: string;
}

const events: StoredTelemetry[] = [];

export function addTelemetry(event: CoreEvent): StoredTelemetry {
  const record = {
    event,
    received_at: new Date().toISOString()
  };

  events.unshift(record);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  return record;
}

export function listTelemetry(limit = 25): StoredTelemetry[] {
  return events.slice(0, Math.min(Math.max(limit, 1), MAX_EVENTS));
}

export function resolveTelemetry(actionId: string, resolution: string): boolean {
  const record = events.find((item) => item.event.action_schema?.action_id === actionId);

  if (!record) return false;

  record.resolved = resolution;
  return true;
}