import type { MoodId, PrayerDraft, PrayerIdentity, PrayerVisibility } from './domain';
import type { PrayerCard } from './sample-data';

export type PrayerPostRow = {
  id: string;
  title: string;
  body: string;
  mood: MoodId;
  visibility: PrayerVisibility;
  identity: PrayerIdentity;
  is_sensitive: boolean | null;
  created_at: string | null;
  group_id?: string | null;
  author_label?: string | null;
  neighborhood?: string | null;
  paper_color?: string | null;
  pin_seed?: number | null;
};

export type PrayerPostInsert = {
  author_id: string;
  group_id: string | null;
  visibility: PrayerVisibility;
  identity: PrayerIdentity;
  mood: MoodId;
  title: string;
  body: string;
  is_sensitive: boolean;
  created_at: string;
  author_label: string;
  neighborhood: string | null;
  paper_color: string | null;
  pin_seed: number | null;
};

const prayerPostsCacheKey = 'praybor.serverPrayerPostsCache.v1';
const prayerPostSelect =
  'id,title,body,mood,visibility,identity,is_sensitive,created_at,group_id,author_label,neighborhood,paper_color,pin_seed';

export function getPrayerPostsCacheKey() {
  return prayerPostsCacheKey;
}

export function mapPrayerPostRowToCard(row: PrayerPostRow): PrayerCard {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    mood: row.mood,
    visibility: row.visibility,
    identity: row.identity,
    authorLabel: row.author_label ?? (row.identity === 'anonymous' ? 'A neighbor' : 'You'),
    neighborhood: row.neighborhood ?? (row.visibility === 'public' ? 'Midtown' : undefined),
    groupName: row.visibility === 'group' ? 'Friday House Church' : undefined,
    postedAgo: 'now',
    isSensitive: row.is_sensitive ?? false,
    paperColor: row.paper_color ?? undefined,
    pinSeed: row.pin_seed ?? undefined,
  };
}

export function buildPrayerPostInsert(
  draft: PrayerDraft,
  authorId: string,
  groupId?: string,
): PrayerPostInsert {
  return {
    author_id: authorId,
    group_id: draft.visibility === 'group' ? groupId ?? null : null,
    visibility: draft.visibility,
    identity: draft.identity,
    mood: draft.mood,
    title: draft.title,
    body: draft.body,
    is_sensitive: false,
    created_at: draft.createdAt,
    author_label: draft.identity === 'anonymous' ? 'A neighbor' : 'You',
    neighborhood: draft.visibility === 'public' ? 'Midtown' : null,
    paper_color: draft.paperColor ?? null,
    pin_seed: draft.pinSeed ?? null,
  };
}

export async function fetchPersistedPrayerCards(scope: PrayerVisibility): Promise<PrayerCard[]> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return readCachedPrayerCards(scope);
  }

  try {
    await ensureSupabaseProfile();

    let query = supabase
      .from('prayer_posts')
      .select(prayerPostSelect)
      .eq('visibility', scope)
      .order('created_at', { ascending: false })
      .limit(50);

    if (scope === 'public') {
      query = query.is('group_id', null);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as PrayerPostRow[];

    await writeCachedPrayerRows(scope, rows);

    return rows.map(mapPrayerPostRowToCard);
  } catch (error) {
    warnCacheFallback('load prayers from Supabase', error);
    return readCachedPrayerCards(scope);
  }
}

export async function createPersistedPrayerCard(draft: PrayerDraft): Promise<PrayerCard> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key before posting.');
  }

  const userId = await ensureSupabaseProfile();
  const insert = buildPrayerPostInsert(draft, userId);
  const { data, error } = await supabase
    .from('prayer_posts')
    .insert(insert)
    .select(prayerPostSelect)
    .single();

  if (error) {
    throw error;
  }

  const row = data as PrayerPostRow;

  await prependCachedPrayerRow(row);

  return mapPrayerPostRowToCard(row);
}

async function ensureSupabaseProfile(): Promise<string> {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const sessionResult = await supabase.auth.getSession();
  if (sessionResult.error) {
    throw sessionResult.error;
  }

  let userId = sessionResult.data.session?.user.id ?? null;

  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      throw error;
    }

    userId = data.user?.id ?? null;
  }

  if (!userId) {
    throw new Error('Supabase did not return a user session.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' });

  if (profileError) {
    throw profileError;
  }

  return userId;
}

async function readCachedPrayerCards(scope: PrayerVisibility): Promise<PrayerCard[]> {
  const rows = await readCachedPrayerRows();

  return rows
    .filter((row) => row.visibility === scope)
    .map(mapPrayerPostRowToCard);
}

async function writeCachedPrayerRows(scope: PrayerVisibility, nextRows: PrayerPostRow[]) {
  const currentRows = await readCachedPrayerRows();
  const rows = [
    ...nextRows,
    ...currentRows.filter((row) => row.visibility !== scope),
  ];

  await saveCachedPrayerRows(rows);
}

async function prependCachedPrayerRow(row: PrayerPostRow) {
  const rows = await readCachedPrayerRows();

  await saveCachedPrayerRows([
    row,
    ...rows.filter((currentRow) => currentRow.id !== row.id),
  ]);
}

async function saveCachedPrayerRows(rows: PrayerPostRow[]) {
  const AsyncStorage = await getAsyncStorage();

  await AsyncStorage.setItem(prayerPostsCacheKey, JSON.stringify(rows.slice(0, 80)));
}

async function readCachedPrayerRows(): Promise<PrayerPostRow[]> {
  try {
    const AsyncStorage = await getAsyncStorage();
    const raw = await AsyncStorage.getItem(prayerPostsCacheKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as PrayerPostRow[]) : [];
  } catch (error) {
    warnCacheFallback('read cached prayers', error);
    return [];
  }
}

async function getSupabaseRuntime() {
  return import('../supabase');
}

async function getAsyncStorage() {
  return (await import('@react-native-async-storage/async-storage')).default;
}

function warnCacheFallback(action: string, error: unknown) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.warn(`Could not ${action}; showing last cached server prayers instead.`, error);
}
