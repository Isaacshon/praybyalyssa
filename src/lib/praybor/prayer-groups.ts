import type { MoodId } from './domain';
import { formatRelativeTime } from './prayer-posts';
import type { PrayerCard } from './sample-data';
import { ensureSupabaseProfile, getSupabaseRuntime, warnServerFallback } from './session';

export type GroupCategory = 'church' | 'friends' | 'family' | 'random' | 'small_group';

export type PrayerGroupRow = {
  id: string;
  owner_id: string;
  name: string;
  invitation_code: string;
  category?: GroupCategory | string | null;
  rhythm?: string | null;
  accent_color?: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

export type PrayerGroupInsert = {
  owner_id: string;
  name: string;
  invitation_code: string;
  category: GroupCategory;
  rhythm: string;
  accent_color: string;
};

export type PersistedPrayerGroup = {
  id: string;
  name: string;
  subtitle: string;
  rhythm: string;
  updatedAgo: string;
  memberCount: number;
  accent: string;
  members: MoodId[];
  posts: PrayerCard[];
  invitationCode: string;
  category: GroupCategory;
};

type GroupMetric = {
  memberCount?: number;
  postCount?: number;
};

type GroupMetricsRow = {
  group_id: string;
  member_count: number;
  post_count: number;
};

const groupSelect =
  'id,owner_id,name,invitation_code,category,rhythm,accent_color,created_at,updated_at';

const groupAccentByCategory: Record<GroupCategory, string> = {
  church: '#FFD8D4',
  friends: '#DDEDF5',
  family: '#E7F3DD',
  random: '#F6A5C4',
  small_group: '#FFF1CC',
};

const groupMoodsByCategory: Record<GroupCategory, MoodId[]> = {
  church: ['joy', 'gratitude', 'ordinary', 'excitement'],
  friends: ['excitement', 'joy', 'surprised', 'ordinary'],
  family: ['gratitude', 'sad', 'joy', 'afraid'],
  random: ['surprised', 'ordinary', 'joy', 'gratitude'],
  small_group: ['joy', 'afraid', 'gratitude', 'ordinary'],
};

export function normalizeInviteCode(code: string) {
  return code.trim().replace(/^#/, '').toLowerCase();
}

export function generateInviteCode() {
  return Math.random().toString(36).slice(2, 9).padEnd(7, '0');
}

export function buildPrayerGroupInsert({
  category,
  invitationCode,
  name,
  ownerId,
}: {
  category: GroupCategory;
  invitationCode: string;
  name: string;
  ownerId: string;
}): PrayerGroupInsert {
  const normalizedCode = normalizeInviteCode(invitationCode);

  return {
    owner_id: ownerId,
    name,
    invitation_code: normalizedCode,
    category,
    rhythm: `Invite code #${normalizedCode}`,
    accent_color: groupAccentByCategory[category],
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? error.message : null;
    const maybeDetails = 'details' in error ? error.details : null;
    const maybeHint = 'hint' in error ? error.hint : null;

    return [maybeMessage, maybeDetails, maybeHint]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      || fallbackMessage;
  }

  return fallbackMessage;
}

function throwAppError(error: unknown, fallbackMessage: string): never {
  throw new Error(getErrorMessage(error, fallbackMessage));
}

export function mapPrayerGroupRowToGroup(
  row: PrayerGroupRow,
  metrics: GroupMetric = {},
): PersistedPrayerGroup {
  const category = normalizeGroupCategory(row.category);
  const postCount = metrics.postCount ?? 0;

  return {
    id: row.id,
    name: row.name,
    subtitle: `${postCount} prayer request${postCount === 1 ? '' : 's'} from members`,
    rhythm: row.rhythm ?? `Invite code #${row.invitation_code}`,
    updatedAgo: formatRelativeTime(row.updated_at ?? row.created_at),
    memberCount: metrics.memberCount ?? 1,
    accent: row.accent_color ?? groupAccentByCategory[category],
    members: groupMoodsByCategory[category],
    posts: [],
    invitationCode: row.invitation_code,
    category,
  };
}

export async function fetchPersistedPrayerGroups(): Promise<PersistedPrayerGroup[]> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    await ensureSupabaseProfile();

    const { data, error } = await supabase
      .from('prayer_groups')
      .select(groupSelect)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as PrayerGroupRow[];
    const groupIds = rows.map((row) => row.id);
    const metrics = await fetchGroupMetrics(groupIds);

    return rows.map((row) =>
      mapPrayerGroupRowToGroup(row, {
        memberCount: metrics[row.id]?.memberCount ?? 1,
        postCount: metrics[row.id]?.postCount ?? 0,
      }),
    );
  } catch (error) {
    warnServerFallback('load prayer groups from Supabase', error);
    return [];
  }
}

export async function createPersistedPrayerGroup({
  category,
  invitationCode = generateInviteCode(),
  name,
}: {
  category: GroupCategory;
  invitationCode?: string;
  name: string;
}): Promise<PersistedPrayerGroup> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key before creating groups.');
  }

  const { data, error } = await supabase.rpc('create_prayer_group', {
    group_category: category,
    group_name: name,
    invite_code: normalizeInviteCode(invitationCode),
  });

  if (error) {
    throwAppError(error, 'Unable to create this group.');
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error('Unable to create this group.');
  }

  return mapPrayerGroupRowToGroup(row as PrayerGroupRow, { memberCount: 1, postCount: 0 });
}

export async function joinPersistedPrayerGroup(code: string): Promise<PersistedPrayerGroup> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key before joining groups.');
  }

  await ensureSupabaseProfile();

  const { data, error } = await supabase.rpc('join_prayer_group', {
    invite_code: normalizeInviteCode(code),
  });

  if (error) {
    throwAppError(error, 'Unable to join this group.');
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error('No group found for that invite code.');
  }

  return mapPrayerGroupRowToGroup(row as PrayerGroupRow, { memberCount: 1, postCount: 0 });
}

function normalizeGroupCategory(category: PrayerGroupRow['category']): GroupCategory {
  if (
    category === 'church' ||
    category === 'friends' ||
    category === 'family' ||
    category === 'random' ||
    category === 'small_group'
  ) {
    return category;
  }

  return 'church';
}

async function fetchGroupMetrics(groupIds: string[]) {
  const metrics: Record<string, Required<GroupMetric>> = {};

  if (groupIds.length === 0) {
    return metrics;
  }

  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    return metrics;
  }

  const { data, error } = await supabase.rpc('get_prayer_group_metrics', {
    group_ids: groupIds,
  });

  if (error) {
    return metrics;
  }

  for (const row of (data ?? []) as GroupMetricsRow[]) {
    metrics[row.group_id] = {
      memberCount: Number(row.member_count) || 0,
      postCount: Number(row.post_count) || 0,
    };
  }

  return metrics;
}
