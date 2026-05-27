import type { ActiveTree } from './domain';

const GROW_PREVIEW_PARAM = 'blessieGrowPreview';

export function isBlessieGrowPreviewEnabled({
  nodeEnv = process.env.NODE_ENV,
  search = getWindowLocationSearch(),
}: {
  nodeEnv?: string;
  search?: string;
} = {}) {
  if (nodeEnv === 'production') {
    return false;
  }

  return new URLSearchParams(search).get(GROW_PREVIEW_PARAM) === 'animal';
}

export function getBlessieGrowPreviewTree(options?: {
  nodeEnv?: string;
  search?: string;
}): ActiveTree | null {
  if (!isBlessieGrowPreviewEnabled(options)) {
    return null;
  }

  return {
    id: 'preview-fruiting-tree',
    speciesId: 'apple',
    growthPoints: 6,
    startedAt: '2026-05-19T12:00:00.000Z',
    growthEvents: [
      { type: 'prayer_posted', visibility: 'public', occurredOn: '2026-05-19' },
      { type: 'reaction_given', visibility: 'public', occurredOn: '2026-05-20' },
      { type: 'reaction_given', visibility: 'public', occurredOn: '2026-05-21' },
      { type: 'prayer_posted', visibility: 'public', occurredOn: '2026-05-22' },
      { type: 'reaction_given', visibility: 'public', occurredOn: '2026-05-23' },
      { type: 'prayer_posted', visibility: 'public', occurredOn: '2026-05-24' },
    ],
  };
}

export function getBlessieGrowPreviewCompletedTreeCount(options?: {
  nodeEnv?: string;
  search?: string;
}) {
  return isBlessieGrowPreviewEnabled(options) ? 1 : 0;
}

function getWindowLocationSearch() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.search;
}
