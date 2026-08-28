const encoder = new TextEncoder();

function normalizeSignature(signature: string): string {
  return signature.trim().replace(/^sha256=/i, '').toLowerCase();
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

export async function createHmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifySignature(
  payload: string,
  suppliedSignature: string,
  secret: string
): Promise<boolean> {
  if (!secret || !suppliedSignature) return false;

  const expected = await createHmac(payload, secret);
  return constantTimeEqual(expected, normalizeSignature(suppliedSignature));
}

export async function createHitlToken(
  actionId: string,
  eventId: string,
  secret: string
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + 900;
  const claims = `${actionId}.${eventId}.${expiresAt}`;
  const signature = await createHmac(claims, secret);

  return btoa(`${claims}.${signature}`)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function verifyHitlToken(token: string, secret: string): Promise<boolean> {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/')
      .padEnd(Math.ceil(token.length / 4) * 4, '=');
    const decoded = atob(padded);
    const parts = decoded.split('.');
    if (parts.length !== 4) return false;

    const [actionId, eventId, expiresAt, suppliedSignature] = parts;
    const expires = Number(expiresAt);
    if (!actionId || !eventId || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) {
      return false;
    }

    const expected = await createHmac(`${actionId}.${eventId}.${expiresAt}`, secret);
    return constantTimeEqual(expected, suppliedSignature);
  } catch {
    return false;
  }
}