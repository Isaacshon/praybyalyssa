import { afterEach, describe, expect, it } from 'vitest';

import {
  getSupabaseRuntime,
  setSupabaseRuntimeLoaderForTesting,
} from './session';

describe('Supabase runtime loading', () => {
  afterEach(() => {
    setSupabaseRuntimeLoaderForTesting();
  });

  it('falls back to disabled Supabase when the web runtime chunk cannot be fetched', async () => {
    setSupabaseRuntimeLoaderForTesting(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(getSupabaseRuntime()).resolves.toEqual({
      isSupabaseConfigured: false,
      supabase: null,
    });
  });
});
