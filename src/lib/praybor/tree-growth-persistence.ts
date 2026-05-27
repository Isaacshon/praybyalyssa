import {
  COMPLETE_GROWTH_POINTS,
  GROWTH_EVENT_POINTS,
  getGrowthStage,
  type ActiveTree,
  type PrayerVisibility,
  type TreeGrowthEventType,
  type TreeGrowthStage,
} from './domain';
import { ensureSupabaseProfile, getSupabaseRuntime, warnServerFallback } from './session';

export type UserTreeRow = {
  id: string;
  owner_id: string;
  species_id: string;
  stage: TreeGrowthStage;
  growth_points: number;
  planted_at: string | null;
  completed_at: string | null;
};

export type TreeGrowthEventInsert = {
  owner_id: string;
  tree_id: string;
  event_type: TreeGrowthEventType;
  visibility: PrayerVisibility;
  occurred_on: string;
  points: number;
  source_prayer_id: string | null;
};

export type AdminTreeGrowthPatch = {
  growth_points: number;
  stage: TreeGrowthStage;
};

export type TreeGrowthActionRpcArgs = {
  growth_event_type: TreeGrowthEventType;
  growth_occurred_on: string;
  growth_visibility: PrayerVisibility;
  source_prayer_id: string | null;
};

const userTreeSelect =
  'id,owner_id,species_id,stage,growth_points,planted_at,completed_at';

export function mapUserTreeRowToActiveTree(row: UserTreeRow): ActiveTree {
  return {
    id: row.id,
    speciesId: row.species_id,
    growthPoints: row.growth_points,
    startedAt: row.planted_at ?? new Date().toISOString(),
  };
}

export function shouldPersistGrowthEvent(
  type: TreeGrowthEventType,
  visibility: PrayerVisibility,
) {
  return (visibility === 'public' || visibility === 'group') && type !== 'recap_completed';
}

export function buildTreeGrowthEventInsert({
  occurredOn,
  ownerId,
  sourcePrayerId,
  treeId,
  type,
  visibility,
}: {
  occurredOn: string;
  ownerId: string;
  sourcePrayerId?: string;
  treeId: string;
  type: TreeGrowthEventType;
  visibility: PrayerVisibility;
}): TreeGrowthEventInsert {
  return {
    owner_id: ownerId,
    tree_id: treeId,
    event_type: type,
    visibility,
    occurred_on: occurredOn.slice(0, 10),
    points: GROWTH_EVENT_POINTS[type],
    source_prayer_id: sourcePrayerId ?? null,
  };
}

export function buildTreeGrowthActionRpcArgs({
  occurredOn,
  sourcePrayerId,
  type,
  visibility,
}: {
  occurredOn: string;
  sourcePrayerId?: string;
  type: TreeGrowthEventType;
  visibility: PrayerVisibility;
}): TreeGrowthActionRpcArgs {
  return {
    growth_event_type: type,
    growth_occurred_on: occurredOn.slice(0, 10),
    growth_visibility: visibility,
    source_prayer_id: sourcePrayerId ?? null,
  };
}

export function buildAdminTreeGrowthPatch(growthPoints: number): AdminTreeGrowthPatch {
  const clampedGrowthPoints = Math.min(
    COMPLETE_GROWTH_POINTS,
    Math.max(0, Math.round(growthPoints)),
  );

  return {
    growth_points: clampedGrowthPoints,
    stage: getGrowthStage(clampedGrowthPoints),
  };
}

export function buildAdminTreeGrowthTargets() {
  return Array.from({ length: COMPLETE_GROWTH_POINTS + 1 }, (_, index) => index);
}

export async function fetchCurrentUserAdminStatus(): Promise<boolean> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const ownerId = await ensureSupabaseProfile();
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', ownerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as { role?: string | null } | null)?.role === 'admin';
  } catch (error) {
    warnServerFallback('check admin tree controls', error);
    return false;
  }
}

export async function subscribeToCurrentUserAdminStatus(
  listener: (isAdmin: boolean) => void,
) {
  const { supabase } = await getSupabaseRuntime();
  let active = true;

  async function refreshAdminStatus() {
    const nextAdminStatus = await fetchCurrentUserAdminStatus();

    if (active) {
      listener(nextAdminStatus);
    }
  }

  void refreshAdminStatus();

  const subscription = supabase?.auth.onAuthStateChange(() => {
    void refreshAdminStatus();
  });

  return () => {
    active = false;
    subscription?.data.subscription.unsubscribe();
  };
}

export async function updatePersistedTreeGrowthAsAdmin({
  growthPoints,
  treeId,
}: {
  growthPoints: number;
  treeId: string;
}): Promise<ActiveTree | null> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const patch = buildAdminTreeGrowthPatch(growthPoints);
    const { data, error } = await supabase.rpc('admin_update_tree_growth', {
      next_growth_points: patch.growth_points,
      target_tree_id: treeId,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      throw new Error('Admin tree growth update did not return a tree.');
    }

    return mapUserTreeRowToActiveTree(row as UserTreeRow);
  } catch (error) {
    warnServerFallback('update tree growth as admin', error);
    throw error;
  }
}

export async function fetchPersistedActiveTree(): Promise<ActiveTree | null> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const ownerId = await ensureSupabaseProfile();
    const row = await findActiveTreeRow(ownerId);

    return row ? mapUserTreeRowToActiveTree(row) : null;
  } catch (error) {
    warnServerFallback('load active tree from Supabase', error);
    return null;
  }
}

export async function fetchPersistedCompletedTreeCount(): Promise<number> {
  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return 0;
  }

  try {
    const ownerId = await ensureSupabaseProfile();
    const { count, error } = await supabase
      .from('user_trees')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .not('completed_at', 'is', null);

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    warnServerFallback('count completed trees from Supabase', error);
    return 0;
  }
}

export async function recordPersistedTreeGrowthAction({
  occurredOn = new Date().toISOString().slice(0, 10),
  sourcePrayerId,
  type,
  visibility,
}: {
  occurredOn?: string;
  sourcePrayerId?: string;
  type: TreeGrowthEventType;
  visibility: PrayerVisibility;
}): Promise<ActiveTree | null> {
  if (!shouldPersistGrowthEvent(type, visibility)) {
    return fetchPersistedActiveTree();
  }

  const { isSupabaseConfigured, supabase } = await getSupabaseRuntime();

  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    return await recordTreeGrowthActionWithRpc({
      occurredOn,
      sourcePrayerId,
      type,
      visibility,
    });
  } catch (error) {
    warnServerFallback('record tree growth in Supabase', error);
    return null;
  }
}

async function recordTreeGrowthActionWithRpc({
  occurredOn,
  sourcePrayerId,
  type,
  visibility,
}: {
  occurredOn: string;
  sourcePrayerId?: string;
  type: TreeGrowthEventType;
  visibility: PrayerVisibility;
}) {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase || !sourcePrayerId) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    'record_tree_growth_action',
    buildTreeGrowthActionRpcArgs({
      occurredOn,
      sourcePrayerId,
      type,
      visibility,
    }),
  );

  if (error) {
    warnServerFallback('record tree growth through Supabase RPC', error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return row ? mapUserTreeRowToActiveTree(row as UserTreeRow) : null;
}

async function findActiveTreeRow(ownerId: string): Promise<UserTreeRow | null> {
  const { supabase } = await getSupabaseRuntime();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_trees')
    .select(userTreeSelect)
    .eq('owner_id', ownerId)
    .is('completed_at', null)
    .order('planted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as UserTreeRow;
  }

  return null;
}
