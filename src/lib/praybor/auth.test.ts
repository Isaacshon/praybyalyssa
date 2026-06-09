import { describe, expect, it } from 'vitest';

import {
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
      accessToken: null,
      refreshToken: null,
    });
  });

  it('parses implicit tokens from app callback URLs', () => {
    expect(parseOAuthCallbackSession('blessie://auth-callback#access_token=access&refresh_token=refresh')).toEqual({
      code: null,
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });
});
