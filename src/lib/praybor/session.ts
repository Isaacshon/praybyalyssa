import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseRuntime = {
  isSupabaseConfigured: boolean;
  supabase: SupabaseClient | null;
};

const disabledSupabaseRuntime: SupabaseRuntime = {
  isSupabaseConfigured: false,
  supabase: null,
};

const defaultSupabaseRuntimeLoader = () => import('../supabase') as Promise<SupabaseRuntime>;

let supabaseRuntimeLoader = defaultSupabaseRuntimeLoader;
let supabaseRuntimePromise: Promise<SupabaseRuntime> | null = null;

export async function getSupabaseRuntime(): Promise<SupabaseRuntime> {
  try {
    supabaseRuntimePromise ??= supabaseRuntimeLoader();

    return await supabaseRuntimePromise;
  } catch (error) {
    supabaseRuntimePromise = null;
    warnServerFallback('load Supabase runtime', error);

    return disabledSupabaseRuntime;
  }
}

export function setSupabaseRuntimeLoaderForTesting(
  loader?: () => Promise<SupabaseRuntime>,
) {
  supabaseRuntimeLoader = loader ?? defaultSupabaseRuntimeLoader;
  supabaseRuntimePromise = null;
}

export async function getCurrentSupabaseUser() {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.user ?? null;
}

export async function requireSupabaseUser(message = 'Please sign in to continue.') {
  const user = await getCurrentSupabaseUser();

  if (!user || user.is_anonymous) {
    throw new Error(message);
  }

  return user;
}

export async function ensureSupabaseProfile(): Promise<string> {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) {
    throw sessionResult.error;
  }

  let userId = sessionResult.data.session?.user.id ?? null;

  if (!userId || sessionResult.data.session?.user.is_anonymous) {
    throw new Error('Please sign in to save this on the server.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' });

  if (profileError) {
    throw profileError;
  }

  return userId;
}

export async function getAsyncStorage() {
  return (await import('@react-native-async-storage/async-storage')).default;
}

export function warnServerFallback(action: string, error: unknown) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.warn(`Could not ${action}; showing the last available app state instead.`, error);
}
