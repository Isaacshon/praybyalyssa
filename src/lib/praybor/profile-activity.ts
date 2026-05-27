import type { MoodId } from './domain';
import { MOODS } from './domain';
import type { PrayerPostRow } from './prayer-posts';
import { ensureSupabaseProfile, getSupabaseRuntime, warnServerFallback } from './session';

export type ProfilePrayerActivityItem = {
  body: string;
  color: string;
  count: number;
  id: string;
  mood: MoodId;
  source: string;
  title: string;
};

export type PrayerCalendarEntry = {
  day: number;
  dateKey: string;
  received: number;
  sent: number;
};

export type ProfileActivitySummary = {
  calendarEntries: PrayerCalendarEntry[];
  prayers: ProfilePrayerActivityItem[];
  prayerRequests: number;
  prayersSent: number;
};

type ReactionRow = {
  created_at?: string | null;
  prayer_id: string;
  updated_at?: string | null;
  user_id?: string | null;
};

type GroupRow = {
  id: string;
  name: string;
};

const profilePrayerSelect =
  'id,title,body,mood,visibility,group_id,created_at,paper_color,neighborhood';

export async function fetchCurrentUserProfileActivity(): Promise<ProfileActivitySummary> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return emptyProfileActivity();
  }

  try {
    const ownerId = await ensureSupabaseProfile();
    const { data: prayerRows, error: prayerError } = await supabase
      .from('prayer_posts')
      .select(profilePrayerSelect)
      .eq('author_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(120);

    if (prayerError) {
      throw prayerError;
    }

    const prayers = (prayerRows ?? []) as PrayerPostRow[];
    const prayerIds = prayers.map((prayer) => prayer.id);
    const groupNames = await fetchGroupNames(prayers);
    const receivedReactions = await fetchReceivedReactions(prayerIds);
    const sentReactions = await fetchSentReactions(ownerId);
    const receivedByPrayerId = countBy(receivedReactions.map((reaction) => reaction.prayer_id));

    return {
      calendarEntries: buildCalendarEntries(prayers, receivedReactions, sentReactions),
      prayerRequests: prayers.length,
      prayers: prayers.map((prayer) => ({
        body: prayer.body,
        color: prayer.paper_color ?? moodColor(prayer.mood),
        count: receivedByPrayerId[prayer.id] ?? 0,
        id: prayer.id,
        mood: prayer.mood,
        source: sourceLabelForPrayer(prayer, groupNames),
        title: prayer.title,
      })),
      prayersSent: sentReactions.length,
    };
  } catch (error) {
    warnServerFallback('load profile prayer activity', error);
    return emptyProfileActivity();
  }
}

function emptyProfileActivity(): ProfileActivitySummary {
  return {
    calendarEntries: [],
    prayerRequests: 0,
    prayers: [],
    prayersSent: 0,
  };
}

async function fetchGroupNames(prayers: PrayerPostRow[]) {
  const groupIds = Array.from(
    new Set(
      prayers
        .map((prayer) => prayer.group_id)
        .filter((groupId): groupId is string => typeof groupId === 'string' && groupId.length > 0),
    ),
  );

  if (groupIds.length === 0) {
    return new Map<string, string>();
  }

  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from('prayer_groups')
    .select('id,name')
    .in('id', groupIds);

  if (error) {
    return new Map<string, string>();
  }

  return new Map((data ?? []).map((row) => [(row as GroupRow).id, (row as GroupRow).name]));
}

async function fetchReceivedReactions(prayerIds: string[]) {
  if (prayerIds.length === 0) {
    return [];
  }

  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('prayer_reactions')
    .select('prayer_id,user_id,created_at,updated_at')
    .in('prayer_id', prayerIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as ReactionRow[];
}

async function fetchSentReactions(ownerId: string) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('prayer_reactions')
    .select('prayer_id,user_id,created_at,updated_at')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data ?? []) as ReactionRow[];
}

function buildCalendarEntries(
  prayers: PrayerPostRow[],
  receivedReactions: ReactionRow[],
  sentReactions: ReactionRow[],
) {
  const entries = new Map<string, PrayerCalendarEntry>();

  for (const prayer of prayers) {
    const dateKey = toDateKey(prayer.created_at);
    const entry = ensureCalendarEntry(entries, dateKey);

    entry.sent += 1;
  }

  for (const reaction of sentReactions) {
    const dateKey = toDateKey(reaction.created_at ?? reaction.updated_at);
    const entry = ensureCalendarEntry(entries, dateKey);

    entry.sent += 1;
  }

  for (const reaction of receivedReactions) {
    const dateKey = toDateKey(reaction.created_at ?? reaction.updated_at);
    const entry = ensureCalendarEntry(entries, dateKey);

    entry.received += 1;
  }

  return Array.from(entries.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function ensureCalendarEntry(entries: Map<string, PrayerCalendarEntry>, dateKey: string) {
  const existing = entries.get(dateKey);

  if (existing) {
    return existing;
  }

  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  const entry = {
    dateKey,
    day: day || new Date().getDate(),
    received: 0,
    sent: 0,
  };

  entries.set(
    Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? dateKey
      : new Date().toISOString().slice(0, 10),
    entry,
  );

  return entry;
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function toDateKey(value?: string | null) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function moodColor(moodId: MoodId) {
  return MOODS.find((mood) => mood.id === moodId)?.color ?? '#FFF1CC';
}

function sourceLabelForPrayer(prayer: PrayerPostRow, groupNames: Map<string, string>) {
  if (prayer.visibility === 'group' && prayer.group_id) {
    return groupNames.get(prayer.group_id) ?? 'Private group';
  }

  return prayer.neighborhood ?? 'Public board';
}
