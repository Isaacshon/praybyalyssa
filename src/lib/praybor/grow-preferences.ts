import { getAsyncStorage } from './session';

const GROW_PREFERENCES_STORAGE_KEY = 'blessie:grow-preferences:v1';
const MAX_SELECTED_ROAMING_COMPANIONS = 2;

export type GrowPreferences = {
  animalSelectionTouched: boolean;
  selectedDioramaThemeId: string | null;
  selectedMapSceneId: string | null;
  selectedRoamingCompanionIds: string[];
};

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedValues: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string' || normalizedValues.includes(entry)) {
      continue;
    }

    normalizedValues.push(entry);

    if (normalizedValues.length >= MAX_SELECTED_ROAMING_COMPANIONS) {
      break;
    }
  }

  return normalizedValues;
}

export function parseGrowPreferences(rawPreferences: string | null): GrowPreferences | null {
  if (!rawPreferences) {
    return null;
  }

  try {
    const parsedPreferences = JSON.parse(rawPreferences) as Partial<GrowPreferences>;
    const selectedMapSceneId =
      typeof parsedPreferences.selectedMapSceneId === 'string'
        ? parsedPreferences.selectedMapSceneId
        : null;
    const selectedDioramaThemeId =
      typeof parsedPreferences.selectedDioramaThemeId === 'string'
        ? parsedPreferences.selectedDioramaThemeId
        : null;

    return {
      animalSelectionTouched: parsedPreferences.animalSelectionTouched === true,
      selectedDioramaThemeId,
      selectedMapSceneId,
      selectedRoamingCompanionIds: normalizeStringList(
        parsedPreferences.selectedRoamingCompanionIds,
      ),
    };
  } catch {
    return null;
  }
}

export async function loadGrowPreferences() {
  const AsyncStorage = await getAsyncStorage();

  return parseGrowPreferences(await AsyncStorage.getItem(GROW_PREFERENCES_STORAGE_KEY));
}

export async function persistGrowPreferences(preferences: GrowPreferences) {
  const AsyncStorage = await getAsyncStorage();

  await AsyncStorage.setItem(
    GROW_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      animalSelectionTouched: preferences.animalSelectionTouched,
      selectedDioramaThemeId: preferences.selectedDioramaThemeId,
      selectedMapSceneId: preferences.selectedMapSceneId,
      selectedRoamingCompanionIds: normalizeStringList(
        preferences.selectedRoamingCompanionIds,
      ),
    }),
  );
}
