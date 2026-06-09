import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  completeOAuthCallbackUrl,
  createOAuthCallbackErrorMessage,
  createOAuthRedirectTo,
  createOAuthSignInOptions,
  parseOAuthCallbackSession,
  resetOAuthCallbackCompletionsForTesting,
  signInWithOAuthProvider,
} from './auth';
import { setSupabaseRuntimeLoaderForTesting } from './session';

const openAuthSessionAsync = vi.fn();

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync,
}));

const fetchMock = vi.fn();

beforeEach(() => {
  resetOAuthCallbackCompletionsForTesting();
  openAuthSessionAsync.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    headers: { get: () => 'text/html' },
    status: 302,
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  resetOAuthCallbackCompletionsForTesting();
  setSupabaseRuntimeLoaderForTesting();
  vi.unstubAllGlobals();
});

function setOAuthRuntime({
  exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null }),
  setSession = vi.fn().mockResolvedValue({ error: null }),
  signInWithOAuth = vi.fn().mockResolvedValue({
    data: { url: 'https://auth.example.test/oauth' },
    error: null,
  }),
} = {}) {
  setSupabaseRuntimeLoaderForTesting(async () => ({
    isSupabaseConfigured: true,
    supabase: {
      auth: {
        exchangeCodeForSession,
        setSession,
        signInWithOAuth,
      },
    } as never,
  }));

  return { exchangeCodeForSession, setSession, signInWithOAuth };
}

describe('OAuth redirect handling', () => {
  it('uses the Blessie app scheme for native OAuth callbacks', () => {
    expect(createOAuthRedirectTo('android')).toBe('blessie://auth-callback');
    expect(createOAuthRedirectTo('ios')).toBe('blessie://auth-callback');
  });

  it('keeps the native OAuth options away from localhost redirects', () => {
    const options = createOAuthSignInOptions('android');

    expect(options).toEqual({
      redirectTo: 'blessie://auth-callback',
      skipBrowserRedirect: true,
    });
    expect(options.redirectTo).not.toContain('localhost');
  });

  it('uses the current origin only for web OAuth callbacks', () => {
    expect(createOAuthRedirectTo('web', 'http://localhost:3000')).toBe('http://localhost:3000/auth-callback');
  });

  it('parses PKCE codes from app callback URLs', () => {
    expect(parseOAuthCallbackSession('blessie://auth-callback?code=abc123')).toEqual({
      code: 'abc123',
      error: null,
      errorCode: null,
      errorDescription: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  it('parses implicit tokens from app callback URLs', () => {
    expect(parseOAuthCallbackSession('blessie://auth-callback#access_token=access&refresh_token=refresh')).toEqual({
      code: null,
      error: null,
      errorCode: null,
      errorDescription: null,
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('parses provider errors from app callback URLs', () => {
    expect(
      parseOAuthCallbackSession(
        'blessie://auth-callback?error=server_error&error_code=unexpected_failure&error_description=Unable%20to%20exchange%20external%20code%3A%204%2F0A',
      ),
    ).toEqual({
      code: null,
      error: 'server_error',
      errorCode: 'unexpected_failure',
      errorDescription: 'Unable to exchange external code: 4/0A',
      accessToken: null,
      refreshToken: null,
    });
  });

  it('formats provider callback errors with setup guidance', () => {
    const callback = parseOAuthCallbackSession(
      'blessie://auth-callback?error=server_error&error_description=Unable%20to%20exchange%20external%20code%3A%204%2F0A',
    );

    expect(createOAuthCallbackErrorMessage('google', callback)).toBe(
      'Google sign-in could not be completed. Check the Google OAuth client ID, client secret, and authorized redirect URI in Supabase, then try again.',
    );
  });

  it('completes cold-start OAuth callbacks by exchanging returned codes', async () => {
    const { exchangeCodeForSession } = setOAuthRuntime();

    await expect(completeOAuthCallbackUrl('blessie://auth-callback?code=cold-start-code', 'google')).resolves.toEqual({
      status: 'completed',
    });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('cold-start-code');
  });

  it('shares duplicate callback completion work between route and browser-session handlers', async () => {
    const { exchangeCodeForSession } = setOAuthRuntime();
    const callbackUrl = 'blessie://auth-callback?code=shared-code';

    await expect(Promise.all([
      completeOAuthCallbackUrl(callbackUrl, 'google'),
      completeOAuthCallbackUrl(callbackUrl, 'google'),
    ])).resolves.toEqual([{ status: 'completed' }, { status: 'completed' }]);
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('returns a readable error for cold-start provider failures', async () => {
    setOAuthRuntime();

    await expect(
      completeOAuthCallbackUrl(
        'blessie://auth-callback?error=server_error&error_description=Unable%20to%20exchange%20external%20code%3A%204%2F0A',
        'google',
      ),
    ).resolves.toEqual({
      status: 'error',
      message:
        'Google sign-in could not be completed. Check the Google OAuth client ID, client secret, and authorized redirect URI in Supabase, then try again.',
    });
  });

  it('opens the provider URL with the native callback and exchanges returned PKCE codes', async () => {
    const { exchangeCodeForSession, setSession, signInWithOAuth } = setOAuthRuntime();

    openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'blessie://auth-callback?code=pkce-code',
    });

    await signInWithOAuthProvider('google');

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'blessie://auth-callback',
        skipBrowserRedirect: true,
      },
    });
    expect(openAuthSessionAsync).toHaveBeenCalledWith('https://auth.example.test/oauth', 'blessie://auth-callback');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
    expect(setSession).not.toHaveBeenCalled();
  });

  it('sets a returned implicit OAuth session without exchanging a code', async () => {
    const { exchangeCodeForSession, setSession } = setOAuthRuntime();

    openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'blessie://auth-callback#access_token=access-token&refresh_token=refresh-token',
    });

    await signInWithOAuthProvider('google');

    expect(setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('throws a clear message when the browser auth session is canceled', async () => {
    setOAuthRuntime();
    openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

    await expect(signInWithOAuthProvider('google')).rejects.toThrow('Sign in was canceled.');
  });

  it('throws the Supabase provider callback error before trying session exchange', async () => {
    const { exchangeCodeForSession, setSession } = setOAuthRuntime();

    openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'blessie://auth-callback?error=server_error&error_description=Unable%20to%20exchange%20external%20code%3A%204%2F0A',
    });

    await expect(signInWithOAuthProvider('google')).rejects.toThrow(
      'Google sign-in could not be completed. Check the Google OAuth client ID, client secret, and authorized redirect URI in Supabase, then try again.',
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });

  it('throws when the successful callback has no session material', async () => {
    setOAuthRuntime();
    openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'blessie://auth-callback',
    });

    await expect(signInWithOAuthProvider('google')).rejects.toThrow('Authentication callback did not include a session.');
  });

  it('throws auth-session error results distinctly from user cancellation', async () => {
    setOAuthRuntime();
    openAuthSessionAsync.mockResolvedValue({
      message: 'Provider rejected the request.',
      type: 'error',
    });

    await expect(signInWithOAuthProvider('google')).rejects.toThrow('Provider rejected the request.');
  });
});
