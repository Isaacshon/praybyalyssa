// @ts-nocheck
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CODE_TTL_SECONDS = 60;

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

    if (!isValidEmail(email)) {
      return json({ error: 'Enter a valid email address.' }, 400);
    }

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = requireEnv('RESEND_API_KEY');
    const fromEmail = requireEnv('RESEND_FROM_EMAIL');
    const code = createVerificationCode();
    const codeHash = await hashCode(email, code);
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

    await postgrest(supabaseUrl, serviceRoleKey, '/rest/v1/email_verification_codes', {
      method: 'POST',
      headers: {
        Prefer: 'return=minimal',
      },
      body: {
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
      },
    });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Your Blessie verification code',
        text: `Your Blessie verification code is ${code}. It expires in ${CODE_TTL_SECONDS} seconds.`,
        html: buildEmailHtml(code),
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await readError(resendResponse);
      return json({ error: resendError || 'Could not send verification email.' }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: getErrorMessage(error, 'Could not send verification email.') }, 500);
  }
});

function buildEmailHtml(code) {
  return `
    <div style="font-family: Arial, sans-serif; color: #2a1c13; line-height: 1.5;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Verify your Blessie account</h1>
      <p style="margin: 0 0 16px;">Use this code to finish creating your account.</p>
      <div style="display: inline-block; padding: 14px 20px; border-radius: 14px; background: #FCEADE; color: #FF6628; font-size: 28px; font-weight: 800; letter-spacing: 5px;">
        ${code}
      </div>
      <p style="margin: 18px 0 0; color: #69543a;">This code expires in ${CODE_TTL_SECONDS} seconds.</p>
    </div>
  `;
}

function createVerificationCode() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);

  return String(value[0] % 1000000).padStart(6, '0');
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
    body: JSON.stringify(options.body),
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
