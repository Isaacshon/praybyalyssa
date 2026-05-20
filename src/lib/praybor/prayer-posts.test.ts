import { describe, expect, it } from 'vitest';

import {
  buildPrayerPostInsert,
  getPrayerPostsCacheKey,
  mapPrayerPostRowToCard,
  type PrayerPostRow,
} from './prayer-posts';

describe('prayer post persistence mapping', () => {
  it('maps a Supabase prayer row into a board card', () => {
    const row: PrayerPostRow = {
      id: 'post-1',
      title: 'Prayer for peace',
      body: 'Please pray for peace in my home. Thank you.',
      mood: 'joy',
      visibility: 'public',
      identity: 'anonymous',
      is_sensitive: false,
      created_at: '2026-05-20T05:00:00.000Z',
      author_label: 'A neighbor',
      neighborhood: 'Midtown',
      paper_color: '#FFF1CC',
      pin_seed: 17,
    };

    expect(mapPrayerPostRowToCard(row)).toMatchObject({
      id: 'post-1',
      title: 'Prayer for peace',
      body: 'Please pray for peace in my home. Thank you.',
      mood: 'joy',
      visibility: 'public',
      identity: 'anonymous',
      authorLabel: 'A neighbor',
      neighborhood: 'Midtown',
      postedAgo: 'now',
      paperColor: '#FFF1CC',
      pinSeed: 17,
    });
  });

  it('builds an insert payload that preserves composer visual choices', () => {
    expect(
      buildPrayerPostInsert(
        {
          title: 'Prayer for courage',
          body: 'Please pray for courage at work. Thank you.',
          mood: 'afraid',
          visibility: 'public',
          identity: 'real_name',
          createdAt: '2026-05-20T05:00:00.000Z',
          paperColor: '#F6A5C4',
          pinSeed: 42,
        },
        'user-1',
      ),
    ).toMatchObject({
      author_id: 'user-1',
      title: 'Prayer for courage',
      body: 'Please pray for courage at work. Thank you.',
      mood: 'afraid',
      visibility: 'public',
      identity: 'real_name',
      author_label: 'You',
      neighborhood: 'Midtown',
      paper_color: '#F6A5C4',
      pin_seed: 42,
      group_id: null,
    });
  });

  it('uses a server-result cache key, not a local-only posting key', () => {
    expect(getPrayerPostsCacheKey()).toBe('praybor.serverPrayerPostsCache.v1');
  });
});
