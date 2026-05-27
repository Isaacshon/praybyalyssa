import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.0';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type AccountDeletionRequest = {
  user_id: string;
  scheduled_for: string;
  status: 'pending' | 'canceled' | 'completed';
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const executorSecret = Deno.env.get('ACCOUNT_DELETION_EXECUTOR_SECRET');
  const authorization = request.headers.get('authorization') ?? '';

  if (!executorSecret) {
    return json({ error: 'ACCOUNT_DELETION_EXECUTOR_SECRET is required.' }, 500);
  }

  if (authorization !== `Bearer ${executorSecret}`) {
    return json({ error: 'Unauthorized.' }, 401);
  }

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('user_id,scheduled_for,status')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(50);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const processed: string[] = [];
  const failed: { userId: string; error: string }[] = [];

  for (const row of (data ?? []) as AccountDeletionRequest[]) {
    await supabase.from('account_deletion_audit').insert({
      detail: `Deleting account scheduled for ${row.scheduled_for}`,
      status: 'started',
      user_id: row.user_id,
    });

    try {
      await removeProfileAvatars(supabase, row.user_id);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(row.user_id);

      if (deleteError) {
        throw deleteError;
      }

      await supabase.from('account_deletion_requests').update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      }).eq('user_id', row.user_id);

      await supabase.from('account_deletion_audit').insert({
        detail: 'Auth user and cascading profile data deleted.',
        status: 'completed',
        user_id: row.user_id,
      });

      processed.push(row.user_id);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unknown deletion error.';

      await supabase.from('account_deletion_audit').insert({
        detail: message,
        status: 'failed',
        user_id: row.user_id,
      });

      failed.push({ userId: row.user_id, error: message });
    }
  }

  return json({ failed, processed });
});

async function removeProfileAvatars(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from('profile-avatars').list(userId, {
      limit: 100,
      offset,
    });

    if (error) {
      throw error;
    }

    const files = data ?? [];

    paths.push(...files.map((file) => `${userId}/${file.name}`));

    if (files.length < 100) {
      break;
    }

    offset += files.length;
  }

  if (paths.length === 0) {
    return;
  }

  const { error: removeError } = await supabase.storage.from('profile-avatars').remove(paths);

  if (removeError) {
    throw removeError;
  }
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });
}
