import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_DELETION_GRACE_HOURS,
  buildAccountDeletionRequestUpsert,
  isAccountDeletionPending,
  mapAccountDeletionRequestRow,
} from './account-deletion';

describe('account deletion helpers', () => {
  it('schedules account deletion 24 hours after the request time', () => {
    expect(
      buildAccountDeletionRequestUpsert('user-1', new Date('2026-05-22T10:00:00.000Z')),
    ).toMatchObject({
      user_id: 'user-1',
      status: 'pending',
      requested_at: '2026-05-22T10:00:00.000Z',
      scheduled_for: '2026-05-23T10:00:00.000Z',
      canceled_at: null,
    });
    expect(ACCOUNT_DELETION_GRACE_HOURS).toBe(24);
  });

  it('treats canceled requests as not pending', () => {
    expect(
      isAccountDeletionPending(
        mapAccountDeletionRequestRow({
          user_id: 'user-1',
          status: 'canceled',
          requested_at: '2026-05-22T10:00:00.000Z',
          scheduled_for: '2026-05-23T10:00:00.000Z',
          canceled_at: '2026-05-22T11:00:00.000Z',
          created_at: '2026-05-22T10:00:00.000Z',
          updated_at: '2026-05-22T11:00:00.000Z',
        }),
      ),
    ).toBe(false);
  });
});
