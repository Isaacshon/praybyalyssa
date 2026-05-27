import type { PrayerReaction, ReactionType } from './domain';
import { ensureSupabaseProfile, getSupabaseRuntime, warnServerFallback } from './session';

export type PrayerReactionRow = {
  prayer_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string | null;
  updated_at?: string | null;
};

export type PrayerReactionUpsert = {
  prayer_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
  updated_at: string;
};

export type PrayerReactionCounts = Record<ReactionType, number>;

const prayerReactionSelect = 'prayer_id,user_id,reaction,created_at,updated_at';

export function mapPrayerReactionRowToReaction(row: PrayerReactionRow): PrayerReaction {
  return {
    prayerId: row.prayer_id,
    userId: row.user_id,
    type: row.reaction,
    reactedAt: row.updated_at ?? row.created_at ?? undefined,
  };
}

export function buildPrayerReactionUpsert(
  prayerId: string,
  userId: string,
  type: ReactionType,
  reactedAt = new Date().toISOString(),
): PrayerReactionUpsert {
  return {
    prayer_id: prayerId,
    user_id: userId,
    reaction: type,
    created_at: reactedAt,
    updated_at: reactedAt,
  };
}

export function countPrayerReactions(
  prayerId: string,
  reactions: PrayerReaction[],
): PrayerReactionCounts {
  return reactions
    .filter((reaction) => reaction.prayerId === prayerId)
    .reduce<PrayerReactionCounts>(
      (counts, reaction) => ({ ...counts, [reaction.type]: counts[reaction.type] + 1 }),
      { prayer: 0, amen: 0, comfort: 0, love: 0 },
    );
}

export async function fetchPersistedPrayerReactions(
  prayerIds: string[],
): Promise<PrayerReaction[]> {
  const uniquePrayerIds = Array.from(new Set(prayerIds)).filter(Boolean);

  if (uniquePrayerIds.length === 0) {
    return [];
  }

  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return [];
  }

  try {
    await ensureSupabaseProfile();

    const { data, error } = await supabase
      .from('prayer_reactions')
      .select(prayerReactionSelect)
      .in('prayer_id', uniquePrayerIds);

    if (error) {
      throw error;
    }

    return ((data ?? []) as PrayerReactionRow[]).map(mapPrayerReactionRowToReaction);
  } catch (error) {
    warnServerFallback('load prayer reactions from Supabase', error);
    return [];
  }
}

export async function upsertPersistedPrayerReaction(
  prayerId: string,
  type: ReactionType,
): Promise<PrayerReaction> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add the project URL and publishable key before reacting.');
  }

  const userId = await ensureSupabaseProfile();
  const upsert = buildPrayerReactionUpsert(prayerId, userId, type);
  const { data, error } = await supabase
    .from('prayer_reactions')
    .upsert(upsert, { onConflict: 'prayer_id,user_id' })
    .select(prayerReactionSelect)
    .single();

  if (error) {
    throw error;
  }

  return mapPrayerReactionRowToReaction(data as PrayerReactionRow);
}
