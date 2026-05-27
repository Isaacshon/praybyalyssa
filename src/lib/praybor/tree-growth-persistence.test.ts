import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildAdminTreeGrowthPatch,
  buildAdminTreeGrowthTargets,
  buildTreeGrowthActionRpcArgs,
  buildTreeGrowthEventInsert,
  fetchPersistedCompletedTreeCount,
  subscribeToCurrentUserAdminStatus,
  mapUserTreeRowToActiveTree,
  shouldPersistGrowthEvent,
  type UserTreeRow,
} from './tree-growth-persistence';
import { fetchPersistedActiveTree } from './tree-growth-persistence';
import { setSupabaseRuntimeLoaderForTesting } from './session';

afterEach(() => {
  setSupabaseRuntimeLoaderForTesting();
  vi.restoreAllMocks();
});

describe('tree growth persistence mapping', () => {
  it('maps an active tree row into the domain shape', () => {
    const row: UserTreeRow = {
      id: 'tree-1',
      owner_id: 'user-1',
      species_id: 'apple',
      stage: 'small_plant',
      growth_points: 3,
      planted_at: '2026-05-20T05:00:00.000Z',
      completed_at: null,
    };

    expect(mapUserTreeRowToActiveTree(row)).toEqual({
      id: 'tree-1',
      speciesId: 'apple',
      growthPoints: 3,
      startedAt: '2026-05-20T05:00:00.000Z',
    });
  });

  it('persists public and group post and reaction growth actions', () => {
    expect(shouldPersistGrowthEvent('prayer_posted', 'public')).toBe(true);
    expect(shouldPersistGrowthEvent('reaction_given', 'public')).toBe(true);
    expect(shouldPersistGrowthEvent('recap_completed', 'public')).toBe(false);
    expect(shouldPersistGrowthEvent('prayer_posted', 'group')).toBe(true);
    expect(shouldPersistGrowthEvent('reaction_given', 'group')).toBe(true);
  });

  it('builds a one-day growth event insert payload', () => {
    expect(
      buildTreeGrowthEventInsert({
        ownerId: 'user-1',
        treeId: 'tree-1',
        type: 'reaction_given',
        visibility: 'public',
        occurredOn: '2026-05-20',
        sourcePrayerId: 'post-1',
      }),
    ).toMatchObject({
      owner_id: 'user-1',
      tree_id: 'tree-1',
      event_type: 'reaction_given',
      visibility: 'public',
      occurred_on: '2026-05-20',
      points: 1,
      source_prayer_id: 'post-1',
    });
  });

  it('passes the requested growth date to the server RPC', () => {
    expect(
      buildTreeGrowthActionRpcArgs({
        occurredOn: '2026-05-20T05:00:00.000Z',
        sourcePrayerId: 'post-1',
        type: 'reaction_given',
        visibility: 'group',
      }),
    ).toEqual({
      growth_event_type: 'reaction_given',
      growth_occurred_on: '2026-05-20',
      growth_visibility: 'group',
      source_prayer_id: 'post-1',
    });
  });

  it('clamps admin tree growth updates to the seven day cycle', () => {
    expect(buildAdminTreeGrowthPatch(-4)).toMatchObject({
      growth_points: 0,
      stage: 'seed',
    });
    expect(buildAdminTreeGrowthPatch(6)).toMatchObject({
      growth_points: 6,
      stage: 'fruiting_tree',
    });
    expect(buildAdminTreeGrowthPatch(40)).toMatchObject({
      growth_points: 7,
      stage: 'completed',
    });
  });

  it('builds every admin tree growth target in the complete cycle', () => {
    expect(buildAdminTreeGrowthTargets()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('does not create a tree while reading the active tree snapshot', async () => {
    const insert = vi.fn();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const query = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle,
      order: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
    };
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      return {
        ...query,
        insert,
      };
    });

    setSupabaseRuntimeLoaderForTesting(async () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'user-1', is_anonymous: false } } },
            error: null,
          }),
        },
        from,
      } as never,
    }));

    await expect(fetchPersistedActiveTree()).resolves.toBeNull();
    expect(from).toHaveBeenCalledWith('user_trees');
    expect(insert).not.toHaveBeenCalled();
  });

  it('counts completed tree rows for persisted animal unlocks', async () => {
    const not = vi.fn().mockResolvedValue({ count: 2, error: null });
    const query = {
      eq: vi.fn().mockReturnThis(),
      not,
      select: vi.fn().mockReturnThis(),
    };
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      return query;
    });

    setSupabaseRuntimeLoaderForTesting(async () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'user-1', is_anonymous: false } } },
            error: null,
          }),
        },
        from,
      } as never,
    }));

    await expect(fetchPersistedCompletedTreeCount()).resolves.toBe(2);
    expect(from).toHaveBeenCalledWith('user_trees');
    expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(query.eq).toHaveBeenCalledWith('owner_id', 'user-1');
    expect(not).toHaveBeenCalledWith('completed_at', 'is', null);
  });

  it('refreshes admin status when auth state changes after the Grow screen mounts', async () => {
    let currentSession: { user: { id: string; is_anonymous: boolean } } | null = null;
    let authStateListener: (() => void) | null = null;
    const unsubscribe = vi.fn();
    const profileQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    setSupabaseRuntimeLoaderForTesting(async () => ({
      isSupabaseConfigured: true,
      supabase: {
        auth: {
          getSession: vi.fn().mockImplementation(async () => ({
            data: { session: currentSession },
            error: null,
          })),
          onAuthStateChange: vi.fn((listener: () => void) => {
            authStateListener = listener;

            return {
              data: {
                subscription: { unsubscribe },
              },
            };
          }),
        },
        from: vi.fn(() => profileQuery),
      } as never,
    }));

    const statuses: boolean[] = [];
    const stop = await subscribeToCurrentUserAdminStatus((isAdmin) => {
      statuses.push(isAdmin);
    });

    await flushPromises();
    expect(statuses).toEqual([false]);

    currentSession = { user: { id: 'admin-user', is_anonymous: false } };
    const emitAuthStateChange = authStateListener as (() => void) | null;
    expect(emitAuthStateChange).toBeTruthy();
    emitAuthStateChange?.();
    await flushPromises();

    expect(statuses).toEqual([false, true]);

    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

async function flushPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}
