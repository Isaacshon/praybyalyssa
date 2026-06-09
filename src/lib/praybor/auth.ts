import type { Provider } from '@supabase/supabase-js';

import { getSupabaseRuntime } from './session';

type EmailCredentials = {
  email: string;
  password: string;
};

type ProfileAvailabilityRequest = {
  email: string;
  nickname: string;
};

type CreateEmailProfileRequest = EmailCredentials & {
  fullName: string;
  nickname: string;
  notificationOptIn: boolean;
  token: string;
};

type FunctionErrorPayload = {
  error?: string;
  message?: string;
};

type VerifyEmailCodeRequest = {
  email: string;
  token: string;
};

type CompleteProfileConsentRequest = {
  notificationOptIn: boolean;
};

type OAuthPlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';

const nativeOAuthCallbackUrl = 'blessie://auth-callback';
const webOAuthCallbackPath = 'auth-callback';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeLoginIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

function normalizeNickname(nickname: string) {
  return nickname.trim().replace(/\s+/g, ' ');
}

async function resolveEmailForLoginIdentifier(identifier: string) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (normalizedIdentifier.includes('@')) {
    return normalizedIdentifier;
  }

  const { data, error } = await supabase.rpc('resolve_login_email', {
    login_identifier: normalizedIdentifier,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No account was found for that ID.');
  }

  return `${data}`.trim().toLowerCase();
}

function getProviderSetupError(provider: Provider) {
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

  return `${providerLabel} sign-in is ready in the app, but the ${providerLabel} provider is not enabled in Supabase Auth yet.`;
}

async function readOAuthConfigurationError(oauthUrl: string, provider: Provider) {
  try {
    const response = await fetch(oauthUrl, {
      method: 'GET',
      redirect: 'manual',
    });
    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.toLowerCase().includes('application/json')) {
      if (response.status >= 400) {
        return `${providerLabel} sign-in is not configured correctly in Supabase Auth yet. Check the provider client ID, secret, and redirect URLs.`;
      }

      return null;
    }

    const payload = (await response.json()) as { msg?: string; error_description?: string };
    const message = `${payload.msg ?? payload.error_description ?? ''}`.toLowerCase();

    if (message.includes('provider is not enabled')) {
      return getProviderSetupError(provider);
    }

    if (response.status >= 400) {
      return payload.msg ?? payload.error_description ?? `${providerLabel} sign-in is not configured correctly in Supabase Auth yet.`;
    }
  } catch {
    return null;
  }

  return null;
}

export async function signInWithEmail({ email, password }: EmailCredentials) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const resolvedEmail = await resolveEmailForLoginIdentifier(email);

  const { error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  });

  if (error) {
    throw error;
  }
}

export async function checkProfileAvailability({ email, nickname }: ProfileAvailabilityRequest) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.rpc('check_profile_availability', {
    check_email: normalizeEmail(email),
    check_nickname: normalizeNickname(nickname),
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    emailAvailable: Boolean(row?.email_available),
    nicknameAvailable: Boolean(row?.nickname_available),
  };
}

export async function sendEmailVerificationCode(email: string) {
  await invokePublicFunction('send-email-verification', {
    email: normalizeEmail(email),
  }, 'Could not send verification code.');
}

export async function verifyEmailVerificationCode({ email, token }: VerifyEmailCodeRequest) {
  await invokePublicFunction('verify-email-code', {
    email: normalizeEmail(email),
    token: token.trim(),
  }, 'Could not verify this code.');
}

export async function signUpWithEmail({
  email,
  fullName,
  nickname,
  notificationOptIn,
  password,
  token,
}: CreateEmailProfileRequest) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedNickname = normalizeNickname(nickname);

  await invokePublicFunction('verify-email-signup', {
    email: normalizedEmail,
    fullName: fullName.trim(),
    nickname: normalizedNickname,
    notificationOptIn,
    password,
    token: token.trim(),
  }, 'Could not create account.');

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInError) {
    throw signInError;
  }
}

export async function completeCurrentUserProfileConsent({
  notificationOptIn,
}: CompleteProfileConsentRequest) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error: userError } = await supabase.auth.getUser();
  const user = data.user;

  if (userError) {
    throw userError;
  }

  if (!user || user.is_anonymous) {
    throw new Error('Please sign in before saving profile consent.');
  }

  const metadata = user.user_metadata ?? {};
  const displayName = firstNonEmptyString(
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    user.email?.split('@')[0],
  );

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        display_name: displayName,
        email: user.email ? normalizeEmail(user.email) : null,
        full_name: firstNonEmptyString(metadata.full_name, metadata.name),
        id: user.id,
        notification_opt_in: notificationOptIn,
        policy_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (error) {
    throw error;
  }
}

async function invokePublicFunction(
  functionName: string,
  body: Record<string, unknown>,
  fallbackMessage: string,
) {
  const { supabase } = await getSupabaseRuntime();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabase || !supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase is not configured.');
  }

  const session = await supabase.auth.getSession().catch(() => null);
  const authorizationToken = session?.data.session?.access_token ?? supabasePublishableKey;
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${authorizationToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let payload: FunctionErrorPayload | null = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as FunctionErrorPayload;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error ?? payload?.message ?? (responseText || fallbackMessage));
  }

  return payload;
}

export async function signInWithOAuthProvider(provider: Provider) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const ReactNative = await import('react-native');
  const WebBrowser = await import('expo-web-browser');
  const oauthOptions = createOAuthSignInOptions(ReactNative.Platform.OS as OAuthPlatform);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: oauthOptions,
  });

  if (error) {
    if (error.message.toLowerCase().includes('provider is not enabled')) {
      throw new Error(getProviderSetupError(provider));
    }

    throw error;
  }

  if (!data.url) {
    throw new Error('No authentication URL was returned.');
  }

  const setupError = await readOAuthConfigurationError(data.url, provider);

  if (setupError) {
    throw new Error(setupError);
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, oauthOptions.redirectTo);

  if (result.type !== 'success') {
    throw new Error('Sign in was canceled.');
  }

  const { accessToken, code, refreshToken } = parseOAuthCallbackSession(result.url);

  if (accessToken && refreshToken) {
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (setSessionError) {
      throw setSessionError;
    }

    return;
  }

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      throw exchangeError;
    }

    return;
  }

  throw new Error('Authentication callback did not include a session.');
}

export function createOAuthSignInOptions(platform: OAuthPlatform = 'android') {
  return {
    redirectTo: createOAuthRedirectTo(platform),
    skipBrowserRedirect: true,
  };
}

export function createOAuthRedirectTo(platform: OAuthPlatform = 'android', webOrigin = getWindowOrigin()) {
  if (platform === 'web') {
    return `${webOrigin.replace(/\/$/, '')}/${webOAuthCallbackPath}`;
  }

  return nativeOAuthCallbackUrl;
}

export function parseOAuthCallbackSession(url: string) {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
  const searchParams = parsedUrl.searchParams;

  return {
    accessToken: hashParams.get('access_token') ?? searchParams.get('access_token'),
    code: searchParams.get('code') ?? hashParams.get('code'),
    refreshToken: hashParams.get('refresh_token') ?? searchParams.get('refresh_token'),
  };
}

function getWindowOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:8081';
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}
