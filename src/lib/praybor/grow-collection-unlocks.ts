export function isTreeSpeciesUnlocked({
  activeSpeciesId,
  hasFruitingTree,
  isAdmin = false,
  speciesId,
}: {
  activeSpeciesId: string;
  hasFruitingTree: boolean;
  isAdmin?: boolean;
  speciesId: string;
}) {
  return isAdmin || (hasFruitingTree && speciesId === activeSpeciesId);
}
