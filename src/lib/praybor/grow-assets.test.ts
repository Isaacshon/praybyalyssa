import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');
const growAssetsPath = path.join(repoRoot, 'src/lib/praybor/grow-assets.ts');
const growAssetsSource = readFileSync(growAssetsPath, 'utf8');

const mapPreviewIds = ['forest', 'wilderness', 'highland', 'garden', 'flowerGarden', 'nightSky'];
const animalPreviewIds = ['baby_rabbit', 'desert_fox', 'rock_hyrax', 'lion', 'sheep', 'dog'];
const dioramaPreviewIds = ['forest', 'desert', 'moon'];

describe('grow lightweight preview assets', () => {
  it('declares and ships lightweight map previews', () => {
    expect(growAssetsSource).toContain('export const GROW_MAP_PREVIEW_IMAGES');

    for (const id of mapPreviewIds) {
      expect(growAssetsSource).toContain(`${id}: require('../../../assets/images/praybor/previews/maps/${id}.webp')`);
      expect(existsSync(path.join(repoRoot, `assets/images/praybor/previews/maps/${id}.webp`))).toBe(true);
    }
  });

  it('declares and ships static animal previews', () => {
    expect(growAssetsSource).toContain('export const ANIMAL_COMPANION_PREVIEW_IMAGES');

    for (const id of animalPreviewIds) {
      expect(growAssetsSource).toContain(`${id}: require('../../../assets/images/praybor/previews/animals/${id}.webp')`);
      expect(existsSync(path.join(repoRoot, `assets/images/praybor/previews/animals/${id}.webp`))).toBe(true);
    }
  });

  it('declares and ships lightweight diorama platform previews', () => {
    expect(growAssetsSource).toContain('export const FOREST_DIORAMA_PLATFORM_PREVIEW_IMAGES');

    for (const id of dioramaPreviewIds) {
      expect(growAssetsSource).toContain(`${id}: require('../../../assets/images/praybor/previews/diorama/${id}.webp')`);
      expect(existsSync(path.join(repoRoot, `assets/images/praybor/previews/diorama/${id}.webp`))).toBe(true);
    }
  });

  it('declares and ships tree stage previews for every tree species', () => {
    expect(growAssetsSource).toContain('export const TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES');

    const treeSpeciesBlock = growAssetsSource.match(
      /export const TREE_STAGE_IMAGES_BY_SPECIES:[\s\S]*?= \{([\s\S]*?)\n\};/,
    )?.[1];
    const previewSpeciesBlock = growAssetsSource.match(
      /export const TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES:[\s\S]*?= \{([\s\S]*?)\n\};/,
    )?.[1];

    expect(treeSpeciesBlock).toBeTruthy();
    expect(previewSpeciesBlock).toBeTruthy();

    const speciesIds = Array.from(
      treeSpeciesBlock?.matchAll(/^\s{2}([a-z_]+): \[/gm) ?? [],
      (match) => match[1],
    );
    const previewSpeciesIds = Array.from(
      previewSpeciesBlock?.matchAll(/^\s{2}([a-z_]+): \[/gm) ?? [],
      (match) => match[1],
    );

    expect(previewSpeciesIds.sort()).toEqual(speciesIds.sort());

    for (const speciesId of speciesIds) {
      for (let stageIndex = 1; stageIndex <= 5; stageIndex += 1) {
        const fileName = `${speciesId}-stage-${String(stageIndex).padStart(2, '0')}.webp`;
        expect(growAssetsSource).toContain(`previews/trees/${fileName}`);
        expect(existsSync(path.join(repoRoot, `assets/images/praybor/previews/trees/${fileName}`))).toBe(true);
      }
    }
  });

  it('keeps first grow render critical preload limited to preview assets', () => {
    const criticalPreloadBlock = growAssetsSource.match(
      /export function getGrowScreenCriticalImageAssets\(\) \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(criticalPreloadBlock).toBeTruthy();
    expect(criticalPreloadBlock).toContain('GROW_MAP_PREVIEW_IMAGES.forest');
    expect(criticalPreloadBlock).toContain('TREE_STAGE_PREVIEW_IMAGES_BY_SPECIES.apple');
    expect(criticalPreloadBlock).not.toContain('fieldImage');
    expect(criticalPreloadBlock).not.toContain('forestTreeLayerImage');
    expect(criticalPreloadBlock).not.toContain('forestLeafLayerImage');
    expect(criticalPreloadBlock).not.toContain('TREE_STAGE_IMAGES_BY_SPECIES.apple');
  });
});
