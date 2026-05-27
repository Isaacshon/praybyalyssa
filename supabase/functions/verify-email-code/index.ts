// @ts-nocheck
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VERIFIED_SESSION_TTL_MINUTES = 30;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return json({}, 200);
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const payload = await request.json();
    const email = normalizeEmail(payload.email);
    const token = `${payload.token ?? ''}`.trim();

    if (!isValidEmail(email)) {
      return json({ error: 'Enter a valid email address.' }, 400);
    }

    if (!/^\d{6}$/.test(token)) {
      return json({ error: 'Enter the 6-digit verification code.' }, 400);
    }

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const codeHash = await hashCode(email, token);
    const verification = await findVerificationCode(supabaseUrl, serviceRoleKey, email, codeHash);

    if (!verification) {
      return json({ error: 'Verification code is invalid or expired.' }, 400);
    }

    await postgrest(
      supabaseUrl,
      serviceRoleKey,
      `/rest/v1/email_verification_codes?id=eq.${verification.id}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal',
        },
        body: {
          expires_at: new Date(Date.now() + VERIFIED_SESSION_TTL_MINUTES * 60 * 1000).toISOString(),
        },
      },
    );

    return json({ ok: true });
  } catch (error) {
    return json({ error: getErrorMessage(error, 'Could not verify this code.') }, 500);
  }
});

async function findVerificationCode(supabaseUrl, serviceRoleKey, email, codeHash) {
  const query = new URLSearchParams({
    select: 'id',
    email: `eq.${email}`,
    code_hash: `eq.${codeHash}`,
    consumed_at: 'is.null',
    expires_at: `gt.${new Date().toISOString()}`,
    order: 'created_at.desc',
    limit: '1',
  });
  const response = await postgrest(
    supabaseUrl,
    serviceRoleKey,
    `/rest/v1/email_verification_codes?${query.toString()}`,
    { method: 'GET' },
  );
  const rows = await response.json();

  return rows[0] ?? null;
}

async function hashCode(email, code) {
  const secret = requireEnv('EMAIL_OTP_SECRET');
  const bytes = new TextEncoder().encode(`${email}:${code}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function postgrest(supabaseUrl, serviceRoleKey, path, options) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: options.method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(await readError(response) || 'Supabase request failed.');
  }

  return response;
}

function normalizeEmail(email) {
  return `${email ?? ''}`.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireEnv(name) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

async function readError(response) {
  try {
    const payload = await response.json();
    return payload.error ?? payload.message ?? payload.msg ?? '';
  } catch {
    return await response.text();
  }
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
