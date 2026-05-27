import { describe, expect, it } from 'vitest';

import {
  buildPrayerReactionUpsert,
  countPrayerReactions,
  mapPrayerReactionRowToReaction,
  type PrayerReactionRow,
} from './prayer-reactions';

describe('prayer reaction persistence mapping', () => {
  it('maps a Supabase reaction row into the domain shape', () => {
    const row: PrayerReactionRow = {
      prayer_id: 'post-1',
      user_id: 'user-1',
      reaction: 'prayer',
      created_at: '2026-05-20T05:00:00.000Z',
      updated_at: '2026-05-20T06:00:00.000Z',
    };

    expect(mapPrayerReactionRowToReaction(row)).toEqual({
      prayerId: 'post-1',
      userId: 'user-1',
      type: 'prayer',
      reactedAt: '2026-05-20T06:00:00.000Z',
    });
  });

  it('builds an upsert payload for one reaction per user per prayer', () => {
    expect(
      buildPrayerReactionUpsert(
        'post-1',
        'user-1',
        'prayer',
        '2026-05-20T05:00:00.000Z',
      ),
    ).toEqual({
      prayer_id: 'post-1',
      user_id: 'user-1',
      reaction: 'prayer',
      created_at: '2026-05-20T05:00:00.000Z',
      updated_at: '2026-05-20T05:00:00.000Z',
    });
  });

  it('counts only matching prayer reactions by type', () => {
    expect(
      countPrayerReactions('post-1', [
        { prayerId: 'post-1', userId: 'a', type: 'prayer' },
        { prayerId: 'post-1', userId: 'b', type: 'love' },
        { prayerId: 'post-2', userId: 'c', type: 'prayer' },
      ]),
    ).toEqual({ prayer: 1, amen: 0, comfort: 0, love: 1 });
  });
});
