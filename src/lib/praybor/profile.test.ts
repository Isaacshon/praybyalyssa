import { describe, expect, it } from 'vitest';

import { resolveProfileSession } from './profile';

describe('profile display resolution', () => {
  it('uses full name when display name is not populated', () => {
    expect(
      resolveProfileSession(
        {
          display_name: null,
          full_name: 'Alyssa Byeon',
          nickname: 'alyssa',
          email: 'alyssa@example.com',
        },
        { email: 'fallback@example.com' },
      ),
    ).toMatchObject({
      displayName: 'Alyssa Byeon',
      sessionLabel: 'alyssa@example.com',
    });
  });

  it('falls back to nickname before the email local part', () => {
    expect(
      resolveProfileSession(
        {
          display_name: '   ',
          full_name: '',
          nickname: 'thswndrnr',
          email: 'thswndrnr80@gmail.com',
        },
        { email: 'ignored@example.com' },
      ).displayName,
    ).toBe('thswndrnr');
  });

  it('uses OAuth metadata for image and name when the profile row is sparse', () => {
    expect(
      resolveProfileSession(
        { email: null },
        {
          email: 'oauth@example.com',
          user_metadata: {
            avatar_url: 'https://example.com/avatar.png',
            full_name: 'OAuth User',
          },
        },
      ),
    ).toEqual({
      avatarUrl: 'https://example.com/avatar.png',
      displayName: 'OAuth User',
      sessionLabel: 'oauth@example.com',
    });
  });
});
