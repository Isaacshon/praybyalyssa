import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildPrayerGroupInsert,
  mapPrayerGroupRowToGroup,
  normalizeInviteCode,
  type PrayerGroupRow,
} from './prayer-groups';

describe('prayer group persistence mapping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-24T12:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes invite codes for join and share flows', () => {
    expect(normalizeInviteCode(' #CcQnw01 ')).toBe('ccqnw01');
  });

  it('builds a persisted group insert payload', () => {
    expect(
      buildPrayerGroupInsert({
        ownerId: 'user-1',
        name: 'Friday House Church',
        category: 'church',
        invitationCode: 'ccqnw01',
      }),
    ).toMatchObject({
      owner_id: 'user-1',
      name: 'Friday House Church',
      category: 'church',
      invitation_code: 'ccqnw01',
    });
  });

  it('maps a Supabase group row into the screen model', () => {
    const row: PrayerGroupRow = {
      id: 'group-1',
      owner_id: 'user-1',
      name: 'Friday House Church',
      invitation_code: 'ccqnw01',
      category: 'church',
      rhythm: 'Invite code #ccqnw01',
      accent_color: '#FFD8D4',
      created_at: '2026-05-20T05:00:00.000Z',
      updated_at: '2026-05-20T05:00:00.000Z',
    };

    expect(mapPrayerGroupRowToGroup(row, { memberCount: 4, postCount: 2 })).toMatchObject({
      id: 'group-1',
      name: 'Friday House Church',
      subtitle: '2 prayer requests from members',
      rhythm: 'Invite code #ccqnw01',
      updatedAgo: '4d',
      memberCount: 4,
      accent: '#FFD8D4',
      invitationCode: 'ccqnw01',
      category: 'church',
    });
  });
});
