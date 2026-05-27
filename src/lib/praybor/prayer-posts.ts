import type { MoodId, PrayerDraft, PrayerIdentity, PrayerVisibility } from './domain';
import {
  applyPrayerVisibilityControls,
  fetchPrayerSafetyControls,
} from './content-safety';
import { distanceKmBetween, type PrayerLocation } from './location';
import type { PrayerCard } from './sample-data';
import { ensureSupabaseProfile, getAsyncStorage, getSupabaseRuntime, warnServerFallback } from './session';

export type PrayerPostRow = {
  id: string;
  author_id?: string | null;
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
  location_lat?: number | null;
  location_lng?: number | null;
  distance_km?: number | null;
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
  location_lat: number | null;
  location_lng: number | null;
};

const prayerPostsCacheKey = 'praybor.serverPrayerPostsCache.v2';
const prayerPostSelect =
  'id,author_id,title,body,mood,visibility,identity,is_sensitive,created_at,group_id,author_label,neighborhood,paper_color,pin_seed,location_lat,location_lng';
const isWebRuntime =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { document?: unknown }).document !== 'undefined';

type PrayerPostFetchOptions = {
  radiusKm?: number;
  viewerLocation?: PrayerLocation | null;
};

export function getPrayerPostsCacheKey() {
  return prayerPostsCacheKey;
}

export function mapPrayerPostRowToCard(row: PrayerPostRow): PrayerCard {
  return {
    id: row.id,
    authorId: row.author_id ?? undefined,
    title: row.title,
    body: row.body,
    mood: row.mood,
    visibility: row.visibility,
    identity: row.identity,
    authorLabel: row.author_label ?? defaultAuthorLabel(row.identity),
    neighborhood: row.neighborhood ?? defaultNeighborhoodLabel(row.visibility),
    groupName: row.visibility === 'group' ? 'Friday House Church' : undefined,
    postedAgo: formatRelativeTime(row.created_at),
    isSensitive: row.is_sensitive ?? false,
    paperColor: row.paper_color ?? undefined,
    pinSeed: row.pin_seed ?? undefined,
    location:
      typeof row.location_lat === 'number' && typeof row.location_lng === 'number'
        ? { latitude: row.location_lat, longitude: row.location_lng }
        : undefined,
  };
}

export function buildPrayerPostInsert(
  draft: PrayerDraft,
  authorId: string,
  groupId?: string,
  location?: PrayerLocation | null,
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
    author_label: defaultAuthorLabel(draft.identity),
    neighborhood: null,
    paper_color: draft.paperColor ?? null,
    pin_seed: draft.pinSeed ?? null,
    location_lat: draft.visibility === 'public' ? location?.latitude ?? null : null,
    location_lng: draft.visibility === 'public' ? location?.longitude ?? null : null,
  };
}

export function formatRelativeTime(value?: string | null, now = new Date()) {
  if (!value) {
    return 'recently';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  const elapsedMs = Math.max(0, now.getTime() - date.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes < 1) {
    return 'now';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays < 30) {
    return `${elapsedDays}d`;
  }

  const elapsedMonths = Math.floor(elapsedDays / 30);

  if (elapsedMonths < 12) {
    return `${elapsedMonths}mo`;
  }

  return `${Math.floor(elapsedMonths / 12)}y`;
}

function defaultAuthorLabel(identity: PrayerIdentity) {
  return identity === 'anonymous' ? 'A neighbor' : 'A Blessie neighbor';
}

function defaultNeighborhoodLabel(visibility: PrayerVisibility) {
  return visibility === 'public' ? 'Nearby' : undefined;
}

export async function fetchPersistedPrayerCards(
  scope: PrayerVisibility,
  groupId?: string,
  options: PrayerPostFetchOptions = {},
): Promise<PrayerCard[]> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return readCachedPrayerCards(scope, groupId);
  }

  try {
    await ensureSupabaseProfile();

    if (scope === 'public') {
      if (!options.viewerLocation || !options.radiusKm) {
        return [];
      }

      const { data, error } = await supabase.rpc('fetch_public_prayer_posts_near', {
        limit_count: 50,
        radius_km: options.radiusKm,
        viewer_lat: options.viewerLocation.latitude,
        viewer_lng: options.viewerLocation.longitude,
      });

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as PrayerPostRow[];

      await writeCachedPrayerRows(scope, rows, groupId);

      const safetyControls = await fetchPrayerSafetyControls();

      return applyPrayerVisibilityControls(rows.map(mapPrayerPostRowToCard), safetyControls);
    }

    let query = supabase
      .from('prayer_posts')
      .select(prayerPostSelect)
      .eq('visibility', scope)
      .order('created_at', { ascending: false })
      .limit(50);

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as PrayerPostRow[];

    await writeCachedPrayerRows(scope, rows, groupId);

    const safetyControls = await fetchPrayerSafetyControls();
    const cards = rows
      .map(mapPrayerPostRowToCard)
      .filter((card) => prayerCardMatchesLocation(card, scope, options));

    return applyPrayerVisibilityControls(cards, safetyControls);
  } catch (error) {
    warnServerFallback('load prayers from Supabase', error);
    const cards = await readCachedPrayerCards(scope, groupId);
    const safetyControls = await fetchPrayerSafetyControls();

    return applyPrayerVisibilityControls(
      cards.filter((card) => prayerCardMatchesLocation(card, scope, options)),
      safetyControls,
    );
  }
}

export async function createPersistedPrayerCard(
  draft: PrayerDraft,
  location?: PrayerLocation | null,
): Promise<PrayerCard> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key before posting.');
  }

  const userId = await ensureSupabaseProfile();
  const insert = buildPrayerPostInsert(draft, userId, draft.groupId, location);
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

async function readCachedPrayerCards(
  scope: PrayerVisibility,
  groupId?: string,
): Promise<PrayerCard[]> {
  const rows = await readCachedPrayerRows();

  return rows
    .filter((row) => prayerRowMatchesScope(row, scope, groupId))
    .map(mapPrayerPostRowToCard);
}

async function writeCachedPrayerRows(
  scope: PrayerVisibility,
  nextRows: PrayerPostRow[],
  groupId?: string,
) {
  const currentRows = await readCachedPrayerRows();
  const rows = [
    ...nextRows,
    ...currentRows.filter((row) => !prayerRowMatchesScope(row, scope, groupId)),
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
    warnServerFallback('read cached prayers', error);
    return [];
  }
}

function prayerRowMatchesScope(
  row: PrayerPostRow,
  scope: PrayerVisibility,
  groupId?: string,
) {
  if (row.visibility !== scope) {
    return false;
  }

  if (scope === 'public') {
    return !row.group_id;
  }

  return groupId ? row.group_id === groupId : true;
}

function prayerCardMatchesLocation(
  card: PrayerCard,
  scope: PrayerVisibility,
  options: PrayerPostFetchOptions,
) {
  if (scope !== 'public' || !options.viewerLocation || !options.radiusKm) {
    return true;
  }

  if (!card.location) {
    return isWebRuntime;
  }

  return distanceKmBetween(options.viewerLocation, card.location) <= options.radiusKm;
}
