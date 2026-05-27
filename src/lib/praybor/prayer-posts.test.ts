import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildPrayerPostInsert,
  getPrayerPostsCacheKey,
  mapPrayerPostRowToCard,
  type PrayerPostRow,
} from './prayer-posts';

describe('prayer post persistence mapping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps a Supabase prayer row into a board card', () => {
    const row: PrayerPostRow = {
      id: 'post-1',
      author_id: 'user-1',
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
      location_lat: 43.6532,
      location_lng: -79.3832,
    };

    expect(mapPrayerPostRowToCard(row)).toMatchObject({
      id: 'post-1',
      authorId: 'user-1',
      title: 'Prayer for peace',
      body: 'Please pray for peace in my home. Thank you.',
      mood: 'joy',
      visibility: 'public',
      identity: 'anonymous',
      authorLabel: 'A neighbor',
      neighborhood: 'Midtown',
      postedAgo: '4d',
      paperColor: '#FFF1CC',
      pinSeed: 17,
      location: {
        latitude: 43.6532,
        longitude: -79.3832,
      },
    });
  });

  it('avoids local viewer labels and fixed neighborhoods when server metadata is missing', () => {
    const row: PrayerPostRow = {
      id: 'post-2',
      author_id: 'user-2',
      title: 'Prayer for a new start',
      body: 'Please pray for a new start this week. Thank you.',
      mood: 'ordinary',
      visibility: 'public',
      identity: 'real_name',
      is_sensitive: false,
      created_at: '2026-05-24T11:30:00.000Z',
      author_label: null,
      neighborhood: null,
      paper_color: null,
      pin_seed: null,
    };

    expect(mapPrayerPostRowToCard(row)).toMatchObject({
      authorLabel: 'A Blessie neighbor',
      neighborhood: 'Nearby',
      postedAgo: '1h',
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
        undefined,
        { latitude: 43.6532, longitude: -79.3832 },
      ),
    ).toMatchObject({
      author_id: 'user-1',
      title: 'Prayer for courage',
      body: 'Please pray for courage at work. Thank you.',
      mood: 'afraid',
      visibility: 'public',
      identity: 'real_name',
      author_label: 'A Blessie neighbor',
      neighborhood: null,
      paper_color: '#F6A5C4',
      pin_seed: 42,
      location_lat: 43.6532,
      location_lng: -79.3832,
      group_id: null,
    });
  });

  it('builds a group insert payload with the selected group id', () => {
    expect(
      buildPrayerPostInsert(
        {
          title: 'Prayer for our small group',
          body: 'Please pray for honest community this week. Thank you.',
          mood: 'gratitude',
          visibility: 'group',
          identity: 'anonymous',
          groupId: 'group-1',
          createdAt: '2026-05-20T05:00:00.000Z',
          paperColor: '#E7F3DD',
          pinSeed: 18,
        },
        'user-1',
        'group-1',
      ),
    ).toMatchObject({
      author_id: 'user-1',
      group_id: 'group-1',
      visibility: 'group',
      author_label: 'A neighbor',
      neighborhood: null,
      paper_color: '#E7F3DD',
      pin_seed: 18,
    });
  });

  it('uses a server-result cache key, not a local-only posting key', () => {
    expect(getPrayerPostsCacheKey()).toBe('praybor.serverPrayerPostsCache.v2');
  });
});
