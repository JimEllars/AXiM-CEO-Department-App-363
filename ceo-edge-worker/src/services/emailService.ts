import type { Env, MailPayload } from '../types';

const TIMEOUT_MS = 3000;

export class ExecutiveMailer {
  constructor(private readonly env: Env) {}

  async sendAlert(payload: MailPayload): Promise<{ provider: string; id?: string }> {
    const html = this.withActionButton(payload.html, payload.hitlToken);

    try {
      return await this.sendEmailit({ ...payload, html });
    } catch (error) {
      console.error(JSON.stringify({
        stream: 'ticket_ai_telemetry',
        type: 'EMAILIT_FAILOVER',
        message: error instanceof Error ? error.message : 'Unknown Emailit failure',
        timestamp: new Date().toISOString()
      }));

      return this.sendResend({ ...payload, html });
    }
  }

  private withActionButton(html: string, token?: string): string {
    if (!token) return html;

    const url = `https://ceo.axim.us.com/api/v1/approve?token=${encodeURIComponent(token)}`;
    return `${html}
      <div style="padding:24px 0;text-align:center">
        <a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#66e3a4;color:#07100f;font-family:Arial,sans-serif;font-weight:700;text-decoration:none">
          Review executive directive
        </a>
      </div>`;
  }

  private async sendEmailit(payload: MailPayload): Promise<{ provider: string; id?: string }> {
    const response = await this.fetchWithTimeout(this.env.EMAILIT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.EMAILIT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.env.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html
      })
    });

    if (!response.ok) {
      throw new Error(`Emailit returned ${response.status}`);
    }

    const result = await response.json() as { id?: string };
    return { provider: 'emailit', id: result.id };
  }

  private async sendResend(payload: MailPayload): Promise<{ provider: string; id?: string }> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.env.EMAIL_FROM,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html
      })
    });

    if (!response.ok) {
      throw new Error(`Both email providers failed; Resend returned ${response.status}`);
    }

    const result = await response.json() as { id?: string };
    return { provider: 'resend', id: result.id };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}