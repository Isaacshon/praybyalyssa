import { describe, expect, it } from 'vitest';

import {
  createOAuthCallbackErrorMessage,
  createOAuthRedirectTo,
  createOAuthSignInOptions,
  parseOAuthCallbackSession,
} from './auth';

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
      'Google sign-in failed in Supabase Auth: Unable to exchange external code: 4/0A. Check the Google OAuth client ID, client secret, and authorized redirect URI.',
    );
  });
});
