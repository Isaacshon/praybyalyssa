import { describe, expect, it } from 'vitest';

import { rewriteBlessieNativeIntentPath } from './native-intent';

describe('native OAuth intent rewriting', () => {
  it('rewrites double-slash Blessie callback URLs to the auth callback route', () => {
    expect(
      rewriteBlessieNativeIntentPath(
        'blessie://auth-callback?error=server_error&error_description=Unable%20to%20exchange%20external%20code%3A%204%2F0A',
      ),
    ).toBe(
      '/auth-callback?error=server_error&error_description=Unable%20to%20exchange%20external%20code%3A%204%2F0A',
    );
  });

  it('rewrites triple-slash Blessie callback URLs to the auth callback route', () => {
    expect(rewriteBlessieNativeIntentPath('blessie:///auth-callback?code=abc123')).toBe('/auth-callback?code=abc123');
  });

  it('rewrites already-stripped callback host paths to the auth callback route', () => {
    expect(rewriteBlessieNativeIntentPath('auth-callback?code=abc123')).toBe('/auth-callback?code=abc123');
  });

  it('keeps route-shaped auth callback paths unchanged', () => {
    expect(rewriteBlessieNativeIntentPath('/auth-callback?code=abc123')).toBe('/auth-callback?code=abc123');
  });

  it('rewrites Blessie web callback URLs to the in-app route', () => {
    expect(rewriteBlessieNativeIntentPath('https://blessie.ca/auth-callback?code=abc123')).toBe(
      '/auth-callback?code=abc123',
    );
  });

  it('keeps unrelated paths unchanged', () => {
    expect(rewriteBlessieNativeIntentPath('/groups/active')).toBe('/groups/active');
    expect(rewriteBlessieNativeIntentPath('blessie://profile?id=123')).toBe('blessie://profile?id=123');
  });

  it('handles fully encoded callback URLs without throwing', () => {
    expect(rewriteBlessieNativeIntentPath('blessie%3A%2F%2Fauth-callback%3Fcode%3Dabc123')).toBe(
      '/auth-callback?code=abc123',
    );
  });
});
