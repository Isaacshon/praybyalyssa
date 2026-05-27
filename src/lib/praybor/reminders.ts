import { Platform } from 'react-native';

import { ensureSupabaseProfile, getSupabaseRuntime, warnServerFallback } from './session';

export type PrayerReminderScheduleResult =
  | {
      id: string;
      native: true;
      scheduledFor: Date;
    }
  | {
      id: string;
      native: false;
      reason: 'preview-unavailable';
      scheduledFor: Date;
    };

export type PersistedPrayerReminder = {
  dateKey: string;
  id: string;
  native: boolean;
  notificationId: string;
  scheduledFor: Date;
};

type ScheduledNotification = Awaited<
  ReturnType<typeof import('expo-notifications')['getAllScheduledNotificationsAsync']>
>[number];

export type PrayerReminderRow = {
  id: string;
  native: boolean;
  notification_id: string;
  scheduled_for: string;
};

export async function schedulePrayerReminderNotification(
  scheduledFor: Date,
): Promise<PrayerReminderScheduleResult> {
  if (Platform.OS === 'web') {
    return {
      id: `preview-${scheduledFor.getTime()}`,
      native: false,
      reason: 'preview-unavailable',
      scheduledFor,
    };
  }

  const Notifications = await import('expo-notifications');

  await requestPrayerReminderNotificationPermission();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to pray',
      body: 'Take a quiet moment to pray for someone today.',
      data: {
        type: 'prayer-reminder',
        scheduledFor: scheduledFor.toISOString(),
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledFor,
      channelId: 'prayer-reminders',
    },
  });

  return {
    id,
    native: true,
    scheduledFor,
  };
}

export async function requestPrayerReminderNotificationPermission() {
  if (Platform.OS === 'web') {
    return false;
  }

  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await ensurePrayerReminderNotificationPermission(Notifications);

  return true;
}

export async function persistPrayerReminder(
  reminder: PrayerReminderScheduleResult,
): Promise<PersistedPrayerReminder | null> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const ownerId = await ensureSupabaseProfile();
    const { data, error } = await supabase
      .from('prayer_reminders')
      .insert({
        native: reminder.native,
        notification_id: reminder.id,
        owner_id: ownerId,
        scheduled_for: reminder.scheduledFor.toISOString(),
      })
      .select('id,native,notification_id,scheduled_for')
      .single();

    if (error) {
      throw error;
    }

    return mapPrayerReminderRow(data as PrayerReminderRow);
  } catch (error) {
    warnServerFallback('save prayer reminder', error);
    return null;
  }
}

export async function fetchPersistedPrayerReminders(): Promise<PersistedPrayerReminder[]> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    await ensureSupabaseProfile();
    const { data, error } = await supabase
      .from('prayer_reminders')
      .select('id,native,notification_id,scheduled_for')
      .gte('scheduled_for', new Date(Date.now() - 1000 * 60 * 60 * 24 * 35).toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(200);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => mapPrayerReminderRow(row as PrayerReminderRow));
  } catch (error) {
    warnServerFallback('load prayer reminders', error);
    return [];
  }
}

export async function reconcilePrayerRemindersWithDevice(
  persistedReminders: PersistedPrayerReminder[],
): Promise<PersistedPrayerReminder[]> {
  if (Platform.OS === 'web') {
    return persistedReminders;
  }

  try {
    const Notifications = await import('expo-notifications');
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const reminders = new Map(persistedReminders.map((reminder) => [reminder.notificationId, reminder]));

    for (const notification of scheduledNotifications) {
      const reminder = mapScheduledNotificationToReminder(notification);

      if (reminder && !reminders.has(reminder.notificationId)) {
        reminders.set(reminder.notificationId, reminder);
      }
    }

    return Array.from(reminders.values()).sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  } catch (error) {
    warnServerFallback('reconcile prayer reminders with scheduled notifications', error);
    return persistedReminders;
  }
}

export async function cancelPrayerReminder(reminder: PersistedPrayerReminder) {
  if (Platform.OS !== 'web' && reminder.native && reminder.notificationId) {
    try {
      const Notifications = await import('expo-notifications');

      await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
    } catch (error) {
      warnServerFallback('cancel scheduled prayer reminder notification', error);
    }
  }

  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase || reminder.id === reminder.notificationId) {
    return;
  }

  const { error } = await supabase
    .from('prayer_reminders')
    .delete()
    .eq('id', reminder.id);

  if (error) {
    warnServerFallback('delete prayer reminder from Supabase', error);
  }
}

async function ensurePrayerReminderNotificationPermission(
  Notifications: typeof import('expo-notifications'),
) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-reminders', {
      name: 'Prayer reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FF6628',
      vibrationPattern: [0, 180, 120, 180],
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  const finalPermission =
    existingPermission.status === 'granted'
      ? existingPermission
      : await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });

  if (finalPermission.status !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }
}

export function mapPrayerReminderRow(row: PrayerReminderRow): PersistedPrayerReminder {
  const scheduledFor = new Date(row.scheduled_for);

  return {
    dateKey: scheduledFor.toISOString().slice(0, 10),
    id: row.id,
    native: row.native,
    notificationId: row.notification_id,
    scheduledFor,
  };
}

function mapScheduledNotificationToReminder(
  notification: ScheduledNotification,
): PersistedPrayerReminder | null {
  const data = notification.content.data as Record<string, unknown> | undefined;

  if (data?.type !== 'prayer-reminder' || typeof data.scheduledFor !== 'string') {
    return null;
  }

  const scheduledFor = new Date(data.scheduledFor);

  if (Number.isNaN(scheduledFor.getTime())) {
    return null;
  }

  return {
    dateKey: scheduledFor.toISOString().slice(0, 10),
    id: notification.identifier,
    native: true,
    notificationId: notification.identifier,
    scheduledFor,
  };
}
