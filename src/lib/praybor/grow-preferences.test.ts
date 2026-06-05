import { describe, expect, it } from 'vitest';

import { parseGrowPreferences } from './grow-preferences';

describe('grow preferences', () => {
  it('parses saved map and animal selections', () => {
    expect(
      parseGrowPreferences(
        JSON.stringify({
          animalSelectionTouched: true,
          selectedDioramaThemeId: 'moon',
          selectedMapSceneId: 'nightSky',
          selectedRoamingCompanionIds: ['desert_fox', 'baby_rabbit'],
        }),
      ),
    ).toEqual({
      animalSelectionTouched: true,
      selectedDioramaThemeId: 'moon',
      selectedMapSceneId: 'nightSky',
      selectedRoamingCompanionIds: ['desert_fox', 'baby_rabbit'],
    });
  });

  it('drops invalid values and caps saved animals at two', () => {
    expect(
      parseGrowPreferences(
        JSON.stringify({
          animalSelectionTouched: false,
          selectedDioramaThemeId: 9,
          selectedMapSceneId: 42,
          selectedRoamingCompanionIds: ['desert_fox', 'desert_fox', 3, 'lion'],
        }),
      ),
    ).toEqual({
      animalSelectionTouched: false,
      selectedDioramaThemeId: null,
      selectedMapSceneId: null,
      selectedRoamingCompanionIds: ['desert_fox', 'lion'],
    });
  });

  it('ignores corrupted saved preferences', () => {
    expect(parseGrowPreferences('{')).toBeNull();
    expect(parseGrowPreferences(null)).toBeNull();
  });
});
