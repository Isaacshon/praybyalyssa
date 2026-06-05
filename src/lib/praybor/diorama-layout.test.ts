import { describe, expect, it } from 'vitest';

import {
  FOREST_DIORAMA_BOARD_HEIGHT,
  FOREST_DIORAMA_BOARD_WIDTH,
  FOREST_DIORAMA_SLOTS,
  getForestDioramaAnimalLayerZIndex,
  getForestDioramaSlotAnchor,
  getForestDioramaSlotMetrics,
  getForestDioramaScaledSlotMetrics,
} from './diorama-layout';

describe('forest diorama layout', () => {
  it('keeps every tree root anchor inside the central grid planting area', () => {
    for (const slot of FOREST_DIORAMA_SLOTS) {
      const anchor = getForestDioramaSlotAnchor(slot);

      expect(anchor.x).toBeGreaterThanOrEqual(45);
      expect(anchor.x).toBeLessThanOrEqual(321);
      expect(anchor.y).toBeGreaterThanOrEqual(280);
      expect(anchor.y).toBeLessThanOrEqual(485);
    }
  });

  it('uses more than a manually divided twenty-cell layout without reaching the image edge', () => {
    expect(FOREST_DIORAMA_SLOTS.length).toBeGreaterThan(20);
    expect(FOREST_DIORAMA_SLOTS.length).toBe(31);
  });

  it('plants one tree per generated grid cell', () => {
    const columns = FOREST_DIORAMA_SLOTS.map((slot) => slot.column);
    const rows = FOREST_DIORAMA_SLOTS.map((slot) => slot.row);
    const occupied = new Set(FOREST_DIORAMA_SLOTS.map((slot) => `${slot.column},${slot.row}`));
    const minColumn = Math.min(...columns);
    const maxColumn = Math.max(...columns);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);

    expect(occupied.size).toBe(FOREST_DIORAMA_SLOTS.length);
    expect(minColumn).toBeLessThan(0);
    expect(maxColumn).toBeGreaterThan(0);
    expect(minRow).toBeLessThan(0);
    expect(maxRow).toBeGreaterThan(0);

    for (const slot of FOREST_DIORAMA_SLOTS) {
      expect(Math.abs(slot.column - slot.row)).toBeLessThanOrEqual(3);
      expect(Math.abs(slot.column + slot.row)).toBeLessThanOrEqual(4);
    }
  });

  it('starts new forests from the exact center grid cell', () => {
    expect(FOREST_DIORAMA_SLOTS[0]).toMatchObject({ column: 0, row: 0 });

    const firstAnchors = FOREST_DIORAMA_SLOTS.slice(0, 7).map(getForestDioramaSlotAnchor);
    const averageX =
      firstAnchors.reduce((total, anchor) => total + anchor.x, 0) / firstAnchors.length;
    const averageY =
      firstAnchors.reduce((total, anchor) => total + anchor.y, 0) / firstAnchors.length;

    expect(averageX).toBeGreaterThanOrEqual(168);
    expect(averageX).toBeLessThanOrEqual(192);
    expect(averageY).toBeGreaterThanOrEqual(360);
    expect(averageY).toBeLessThanOrEqual(396);
  });

  it('plants tree boxes from their root point instead of from the image top edge', () => {
    for (const slot of FOREST_DIORAMA_SLOTS) {
      const anchor = getForestDioramaSlotAnchor(slot);
      const metrics = getForestDioramaSlotMetrics(slot);
      const renderedRootY =
        anchor.y + metrics.translateY + metrics.height - metrics.treeRootOffsetY;

      expect(metrics.left).toBeCloseTo((anchor.x / FOREST_DIORAMA_BOARD_WIDTH) * 100, 3);
      expect(metrics.top).toBeCloseTo((anchor.y / FOREST_DIORAMA_BOARD_HEIGHT) * 100, 3);
      expect(metrics.translateX).toBeCloseTo(-metrics.width / 2, 3);
      expect(renderedRootY).toBeCloseTo(anchor.y + slot.yOffset, 1);
    }
  });

  it('nudges trees down to compensate for transparent root padding in tree art', () => {
    const metrics = getForestDioramaSlotMetrics(FOREST_DIORAMA_SLOTS[0]);

    expect(metrics.treeRootOffsetY).toBeCloseTo(18 * FOREST_DIORAMA_SLOTS[0].scale, 3);
  });

  it('keeps roaming animals below every planted tree layer', () => {
    const minTreeZIndex = Math.min(
      ...FOREST_DIORAMA_SLOTS.map((slot) => getForestDioramaSlotMetrics(slot).zIndex),
    );

    for (let index = 0; index < 6; index += 1) {
      expect(getForestDioramaAnimalLayerZIndex({ index })).toBeLessThan(minTreeZIndex);
    }
  });

  it('scales tree boxes and root offsets with the rendered board cover scale', () => {
    const baseMetrics = getForestDioramaScaledSlotMetrics({
      renderedBoardHeight: FOREST_DIORAMA_BOARD_HEIGHT,
      renderedBoardWidth: FOREST_DIORAMA_BOARD_WIDTH,
      slot: FOREST_DIORAMA_SLOTS[4],
    });
    const largeMetrics = getForestDioramaScaledSlotMetrics({
      renderedBoardHeight: 1018,
      renderedBoardWidth: 470,
      slot: FOREST_DIORAMA_SLOTS[4],
    });
    const expectedScale = Math.max(
      470 / FOREST_DIORAMA_BOARD_WIDTH,
      1018 / FOREST_DIORAMA_BOARD_HEIGHT,
    );

    expect(largeMetrics.width).toBeCloseTo(baseMetrics.width * expectedScale, 3);
    expect(largeMetrics.height).toBeCloseTo(baseMetrics.height * expectedScale, 3);
    expect(largeMetrics.treeRootOffsetY).toBeCloseTo(
      baseMetrics.treeRootOffsetY * expectedScale,
      3,
    );
    expect(largeMetrics.left).toBe(baseMetrics.left);
    expect(largeMetrics.top).not.toBe(baseMetrics.top);
  });

  it('keeps slot roots on the platform and trees within board bounds after scaling', () => {
    const sizes = [
      { width: 170, height: 368 },
      { width: 240, height: 520 },
      { width: 360, height: 780 },
      { width: 470, height: 1018 },
      { width: 860, height: 900 },
    ];

    for (const { width: renderedBoardWidth, height: renderedBoardHeight } of sizes) {
      const boardScale = Math.max(
        renderedBoardWidth / FOREST_DIORAMA_BOARD_WIDTH,
        renderedBoardHeight / FOREST_DIORAMA_BOARD_HEIGHT,
      );
      const drawnBoardWidth = FOREST_DIORAMA_BOARD_WIDTH * Math.max(0.1, boardScale);
      const drawnBoardHeight = FOREST_DIORAMA_BOARD_HEIGHT * Math.max(0.1, boardScale);
      const coverOffsetX = (renderedBoardWidth - drawnBoardWidth) / 2;
      const coverOffsetY = (renderedBoardHeight - drawnBoardHeight) / 2;

      for (const slot of FOREST_DIORAMA_SLOTS) {
        const anchor = getForestDioramaSlotAnchor(slot);
        const metrics = getForestDioramaScaledSlotMetrics({
          renderedBoardHeight,
          renderedBoardWidth,
          slot,
        });

        const slotOriginX = (metrics.left / 100) * renderedBoardWidth;
        const slotOriginY = (metrics.top / 100) * renderedBoardHeight;
        const slotLeftPx = slotOriginX + metrics.translateX;
        const slotTopPx = slotOriginY + metrics.translateY;
        const slotRightPx = slotLeftPx + metrics.width;
        const slotBottomPx = slotTopPx + metrics.height;
        const rootX = slotOriginX;
        const rootY = slotTopPx + metrics.height - metrics.treeRootOffsetY;

        expect(slotLeftPx).toBeGreaterThanOrEqual(0);
        expect(slotRightPx).toBeLessThanOrEqual(renderedBoardWidth);
        expect(slotTopPx).toBeGreaterThanOrEqual(0);
        expect(slotBottomPx).toBeLessThanOrEqual(renderedBoardHeight);
        expect(rootX).toBeCloseTo(coverOffsetX + anchor.x * Math.max(0.1, boardScale), 3);
        expect(rootY).toBeCloseTo(
          coverOffsetY + anchor.y * Math.max(0.1, boardScale) + slot.yOffset * Math.max(0.1, boardScale),
          3,
        );
        expect(rootX).toBeGreaterThanOrEqual(0);
        expect(rootX).toBeLessThanOrEqual(renderedBoardWidth);
        expect(rootY).toBeGreaterThanOrEqual(0);
        expect(rootY).toBeLessThanOrEqual(renderedBoardHeight);
      }
    }
  });
});
