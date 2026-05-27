import { describe, expect, it, vi } from 'vitest';
import { mapPrayerReminderRow } from './reminders';

vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
  },
}));

describe('prayer reminder persistence mapping', () => {
  it('preserves the native notification id separately from the server row id', () => {
    expect(
      mapPrayerReminderRow({
        id: 'row-1',
        native: true,
        notification_id: 'native-notification-1',
        scheduled_for: '2026-05-25T11:00:00.000Z',
      }),
    ).toMatchObject({
      dateKey: '2026-05-25',
      id: 'row-1',
      native: true,
      notificationId: 'native-notification-1',
      scheduledFor: new Date('2026-05-25T11:00:00.000Z'),
    });
  });
});
