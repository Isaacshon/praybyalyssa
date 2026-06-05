export type ForestDioramaSlot = {
  column: number;
  row: number;
  scale: number;
  yOffset: number;
};

export const FOREST_DIORAMA_BOARD_WIDTH = 360;
export const FOREST_DIORAMA_BOARD_HEIGHT = 780;

const FOREST_DIORAMA_GRID_COLUMNS = 4;
const FOREST_DIORAMA_GRID_ROWS = 5;
const FOREST_DIORAMA_GRID_ORIGIN_X = 182.6;
const FOREST_DIORAMA_GRID_ORIGIN_Y = 382.2;
const FOREST_DIORAMA_GRID_HALF_WIDTH = 45.6;
const FOREST_DIORAMA_GRID_HALF_HEIGHT = 25.5;
const FOREST_DIORAMA_GRID_RADIUS = 3;
const FOREST_DIORAMA_SLOT_BASE_WIDTH = 88;
const FOREST_DIORAMA_SLOT_BASE_HEIGHT = 122;
const FOREST_DIORAMA_TREE_BASE_WIDTH = 120;
const FOREST_DIORAMA_TREE_BASE_HEIGHT = 136;
const FOREST_DIORAMA_TREE_ROOT_OFFSET_Y = 18;
const FOREST_DIORAMA_ANIMAL_LAYER_BASE_Z_INDEX = 70;

function clampDioramaValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getForestDioramaSlotScale({ column, row }: { column: number; row: number }) {
  const depth = column + row;
  const centerDistance = Math.hypot(column, row);

  return Number(
    clampDioramaValue(0.42 + depth * 0.012 - centerDistance * 0.006, 0.34, 0.52).toFixed(3),
  );
}

function createForestDioramaSlots() {
  const slots: ForestDioramaSlot[] = [];

  for (
    let column = -FOREST_DIORAMA_GRID_RADIUS;
    column <= FOREST_DIORAMA_GRID_RADIUS;
    column += 1
  ) {
    for (let row = -FOREST_DIORAMA_GRID_RADIUS; row <= FOREST_DIORAMA_GRID_RADIUS; row += 1) {
      const horizontalGridDistance = Math.abs(column - row);
      const verticalGridDistance = Math.abs(column + row);

      if (
        horizontalGridDistance > FOREST_DIORAMA_GRID_COLUMNS - 1 ||
        verticalGridDistance > FOREST_DIORAMA_GRID_ROWS - 1
      ) {
        continue;
      }

      slots.push({
        column,
        row,
        scale: getForestDioramaSlotScale({ column, row }),
        yOffset: 0,
      });
    }
  }

  return slots.sort((left, right) => {
    const leftDistance = Math.hypot(left.column, left.row);
    const rightDistance = Math.hypot(right.column, right.row);
    const leftDepth = left.column + left.row;
    const rightDepth = right.column + right.row;
    const leftHorizontalSpread = Math.abs(Math.abs(left.column - left.row) - 2);
    const rightHorizontalSpread = Math.abs(Math.abs(right.column - right.row) - 2);
    const leftIsCenter = left.column === 0 && left.row === 0;
    const rightIsCenter = right.column === 0 && right.row === 0;

    if (leftIsCenter || rightIsCenter) {
      return leftIsCenter === rightIsCenter ? 0 : leftIsCenter ? -1 : 1;
    }

    return (
      leftHorizontalSpread - rightHorizontalSpread ||
      Math.abs(leftDepth) - Math.abs(rightDepth) ||
      leftDistance - rightDistance ||
      leftDepth - rightDepth ||
      left.column - right.column
    );
  });
}

export const FOREST_DIORAMA_SLOTS = createForestDioramaSlots();

export function getForestDioramaSlotAnchor({
  column,
  row,
}: {
  column: number;
  row: number;
}) {
  return {
    x:
      FOREST_DIORAMA_GRID_ORIGIN_X +
      (column - row) * FOREST_DIORAMA_GRID_HALF_WIDTH,
    y:
      FOREST_DIORAMA_GRID_ORIGIN_Y +
      (column + row) * FOREST_DIORAMA_GRID_HALF_HEIGHT,
  };
}

export function getForestDioramaSlotMetrics(slot: ForestDioramaSlot) {
  const anchor = getForestDioramaSlotAnchor(slot);
  const width = FOREST_DIORAMA_SLOT_BASE_WIDTH * slot.scale;
  const height = FOREST_DIORAMA_SLOT_BASE_HEIGHT * slot.scale;
  const treeRootOffsetY = FOREST_DIORAMA_TREE_ROOT_OFFSET_Y * slot.scale;

  return {
    anchor,
    height,
    left: (anchor.x / FOREST_DIORAMA_BOARD_WIDTH) * 100,
    top: (anchor.y / FOREST_DIORAMA_BOARD_HEIGHT) * 100,
    translateX: -width / 2,
    translateY: -height + treeRootOffsetY + slot.yOffset,
    treeHeight: FOREST_DIORAMA_TREE_BASE_HEIGHT * slot.scale,
    treeRootOffsetY,
    treeWidth: FOREST_DIORAMA_TREE_BASE_WIDTH * slot.scale,
    width,
    zIndex: 100 + Math.round(anchor.y),
  };
}

export function getForestDioramaAnimalLayerZIndex({ index }: { index: number }) {
  return FOREST_DIORAMA_ANIMAL_LAYER_BASE_Z_INDEX + index;
}

export function getForestDioramaScaledSlotMetrics({
  renderedBoardHeight,
  renderedBoardWidth,
  slot,
}: {
  renderedBoardHeight: number;
  renderedBoardWidth: number;
  slot: ForestDioramaSlot;
}) {
  const metrics = getForestDioramaSlotMetrics(slot);
  const boardScale = Math.max(
    0.1,
    renderedBoardWidth / FOREST_DIORAMA_BOARD_WIDTH,
    renderedBoardHeight / FOREST_DIORAMA_BOARD_HEIGHT,
  );
  const drawnBoardWidth = FOREST_DIORAMA_BOARD_WIDTH * boardScale;
  const drawnBoardHeight = FOREST_DIORAMA_BOARD_HEIGHT * boardScale;
  const coverOffsetX = (renderedBoardWidth - drawnBoardWidth) / 2;
  const coverOffsetY = (renderedBoardHeight - drawnBoardHeight) / 2;
  const rootX = coverOffsetX + metrics.anchor.x * boardScale;
  const rootY = coverOffsetY + metrics.anchor.y * boardScale;

  return {
    ...metrics,
    height: metrics.height * boardScale,
    left: (rootX / renderedBoardWidth) * 100,
    top: (rootY / renderedBoardHeight) * 100,
    translateX: metrics.translateX * boardScale,
    translateY: metrics.translateY * boardScale,
    treeHeight: metrics.treeHeight * boardScale,
    treeRootOffsetY: metrics.treeRootOffsetY * boardScale,
    treeWidth: metrics.treeWidth * boardScale,
    width: metrics.width * boardScale,
  };
}
