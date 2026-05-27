// @ts-nocheck
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const fullName = `${payload.fullName ?? ''}`.trim();
    const nickname = normalizeNickname(payload.nickname);
    const password = `${payload.password ?? ''}`;
    const token = `${payload.token ?? ''}`.trim();
    const notificationOptIn = Boolean(payload.notificationOptIn);

    if (!isValidEmail(email)) {
      return json({ error: 'Enter a valid email address.' }, 400);
    }

    if (!fullName || !nickname) {
      return json({ error: 'Name and ID are required.' }, 400);
    }

    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }

    if (!/^\d{6}$/.test(token)) {
      return json({ error: 'Enter the 6-digit verification code.' }, 400);
    }

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    const codeHash = await hashCode(email, token);

    const availability = await rpc(supabaseUrl, serviceRoleKey, 'check_profile_availability', {
      check_email: email,
      check_nickname: nickname,
    });
    const availabilityRow = Array.isArray(availability) ? availability[0] : availability;

    if (!availabilityRow?.nickname_available || !availabilityRow?.email_available) {
      return json({ error: 'This ID or email is already in use.' }, 409);
    }

    const verification = await findVerificationCode(supabaseUrl, serviceRoleKey, email, codeHash);

    if (!verification) {
      return json({ error: 'Verification code is invalid or expired.' }, 400);
    }

    const incompleteProfile = await findIncompleteEmailProfile(supabaseUrl, serviceRoleKey, email);
    const user = incompleteProfile
      ? await updateAuthUser(supabaseUrl, serviceRoleKey, incompleteProfile.id, {
        email,
        fullName,
        nickname,
        password,
      })
      : await createAuthUser(supabaseUrl, serviceRoleKey, {
        email,
        fullName,
        nickname,
        password,
      });

    try {
      await upsertProfile(supabaseUrl, serviceRoleKey, {
        email,
        fullName,
        nickname,
        notificationOptIn,
        userId: user.id,
      });
      await consumeVerificationCode(supabaseUrl, serviceRoleKey, verification.id);
    } catch (error) {
      if (!incompleteProfile) {
        await deleteAuthUser(supabaseUrl, serviceRoleKey, user.id);
      }
      throw error;
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: getErrorMessage(error, 'Could not create account.') }, 500);
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

async function findIncompleteEmailProfile(supabaseUrl, serviceRoleKey, email) {
  const query = new URLSearchParams({
    select: 'id,email,policy_accepted_at',
    email: `eq.${email}`,
    policy_accepted_at: 'is.null',
    limit: '1',
  });
  const response = await postgrest(
    supabaseUrl,
    serviceRoleKey,
    `/rest/v1/profiles?${query.toString()}`,
    { method: 'GET' },
  );
  const rows = await response.json();

  return rows[0] ?? null;
}

async function consumeVerificationCode(supabaseUrl, serviceRoleKey, verificationId) {
  await postgrest(
    supabaseUrl,
    serviceRoleKey,
    `/rest/v1/email_verification_codes?id=eq.${verificationId}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal',
      },
      body: {
        consumed_at: new Date().toISOString(),
      },
    },
  );
}

async function createAuthUser(supabaseUrl, serviceRoleKey, request) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: request.email,
      password: request.password,
      email_confirm: true,
      user_metadata: {
        display_name: request.fullName,
        full_name: request.fullName,
        nickname: request.nickname,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response) || 'Could not create auth user.');
  }

  return await response.json();
}

async function updateAuthUser(supabaseUrl, serviceRoleKey, userId, request) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: request.email,
      password: request.password,
      email_confirm: true,
      user_metadata: {
        display_name: request.fullName,
        full_name: request.fullName,
        nickname: request.nickname,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response) || 'Could not complete pending auth user.');
  }

  return await response.json();
}

async function deleteAuthUser(supabaseUrl, serviceRoleKey, userId) {
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
}

async function upsertProfile(supabaseUrl, serviceRoleKey, request) {
  await postgrest(supabaseUrl, serviceRoleKey, '/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: {
      id: request.userId,
      display_name: request.fullName,
      email: request.email,
      full_name: request.fullName,
      nickname: request.nickname,
      notification_opt_in: request.notificationOptIn,
      policy_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}

async function rpc(supabaseUrl, serviceRoleKey, name, body) {
  const response = await postgrest(supabaseUrl, serviceRoleKey, `/rest/v1/rpc/${name}`, {
    method: 'POST',
    body,
  });

  return await response.json();
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

async function hashCode(email, code) {
  const secret = requireEnv('EMAIL_OTP_SECRET');
  const bytes = new TextEncoder().encode(`${email}:${code}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeEmail(email) {
  return `${email ?? ''}`.trim().toLowerCase();
}

function normalizeNickname(nickname) {
  return `${nickname ?? ''}`.trim().replace(/\s+/g, ' ');
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
