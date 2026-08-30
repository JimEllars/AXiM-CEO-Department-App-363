const fs = require('fs');
const file = 'ceo-edge-worker/src/index.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('ExecutiveMailer')) {
    code = code.replace(
        "import { getMetrics } from './services/metrics';",
        "import { getMetrics } from './services/metrics';\nimport { ExecutiveMailer } from './services/emailService';"
    );
}

const newHandlers = `
async function handleVoiceFeed(request: Request, env: Env): Promise<Response> {
  const mockFeed = [
    {
      caller_id: '+1 (555) 019-2834',
      status: 'completed',
      duration: 142,
      transcript_summary: 'Client inquiring about Q3 enterprise pricing tiers.',
      audio_url: 'https://example.com/audio1.mp3'
    },
    {
      caller_id: 'Internal: Onyx Team',
      status: 'voicemail',
      duration: 45,
      transcript_summary: 'Onyx node 3 requires manual override for dependency update.',
      audio_url: 'https://example.com/audio2.mp3'
    }
  ];
  return json({ feed: mockFeed }, 200);
}

async function handleDispatchDirective(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('X-Axim-Signature');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  const directiveRecord = {
    command: payload.directive_body,
    schedule: 'immediate',
    status: 'active',
    created_by: 'CEO_OFFICE',
    priority: 'CRITICAL',
    target: payload.target || 'onyx'
  };

  console.log(JSON.stringify({
    stream: 'executive_directives_dispatch',
    directive: directiveRecord,
    timestamp: new Date().toISOString()
  }));

  await new Promise(r => setTimeout(r, 1000));

  return json({
    success: true,
    status: 'DISPATCHED',
    id: 'dir_' + Math.random().toString(36).substring(7)
  }, 200);
}

async function handleDispatchMemo(request: Request, env: Env): Promise<Response> {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  const { subject, priority, recipients, body } = payload;
  if (!subject || !recipients || !body) {
    return json({ error: 'Missing required fields' }, 422);
  }

  const mailer = new ExecutiveMailer(env);

  try {
    const result = await mailer.sendAlert({
      to: recipients.split(',').map((r: string) => r.trim()),
      subject: \`[\${priority} Priority] \${subject}\`,
      html: \`<p>\${body}</p>\`
    });

    console.log(JSON.stringify({
      stream: 'executive_audit_logs',
      action: 'dispatch_memo',
      recipients,
      priority,
      provider: result.provider,
      timestamp: new Date().toISOString()
    }));

    return json({ success: true, result }, 200);
  } catch (err: any) {
    console.error('Failed to dispatch memo:', err.message);
    return json({ error: 'Failed to dispatch memo' }, 500);
  }
}
`;

if (!code.includes('handleVoiceFeed')) {
    code = code.replace(
        "async function handleSelldoneWebhook",
        newHandlers + "\nasync function handleSelldoneWebhook"
    );
}

const routesToPatch = `
      } else if (request.method === 'GET' && url.pathname === '/api/v1/communications/voice-feed') {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: 'Unauthorized' }, 401);
        } else {
          response = await handleVoiceFeed(request, env);
        }
      } else if (request.method === 'POST' && url.pathname === '/api/v1/communications/dispatch-memo') {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: 'Unauthorized' }, 401);
        } else {
          response = await handleDispatchMemo(request, env);
        }
      } else if (request.method === 'POST' && url.pathname === '/api/v1/directives/dispatch') {
        if (!verifyClientAuth(request, env)) {
          response = json({ error: 'Unauthorized' }, 401);
        } else {
          response = await handleDispatchDirective(request, env);
        }
`;

if (!code.includes('/api/v1/communications/voice-feed')) {
    code = code.replace(
        "} else if (request.method === 'POST' && url.pathname === '/api/v1/hitl-resolve') {",
        routesToPatch + "      } else if (request.method === 'POST' && url.pathname === '/api/v1/hitl-resolve') {"
    );
}

fs.writeFileSync(file, code, 'utf8');
