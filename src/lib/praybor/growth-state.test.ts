import { describe, expect, it } from 'vitest';

import { getActiveTreeSnapshot } from './growth-state';

describe('growth state', () => {
  it('does not expose sample tree growth before the server returns a tree', () => {
    expect(getActiveTreeSnapshot()).toBeNull();
  });
});
