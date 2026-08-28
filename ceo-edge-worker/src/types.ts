export interface Env {
  ENVIRONMENT: string;
  CEO_APP_ORIGIN: string;
  AXIM_CORE_SECRET: string;
  EMAILIT_API_KEY: string;
  EMAILIT_API_URL: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  TELEMETRY_KV: KVNamespace;
}

export interface CoreEvent {
  event_id: string;
  source_department: string;
  timestamp: string;
  event_type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  payload: Record<string, unknown>;
  hitl_required: boolean;
  action_schema?: {
    action_id: string;
    prompt: string;
    options: string[];
  };
  signature?: string;
}

export interface MailPayload {
  to: string | string[];
  subject: string;
  html: string;
  hitlToken?: string;
}