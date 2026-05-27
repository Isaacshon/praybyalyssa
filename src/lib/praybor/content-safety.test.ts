import { describe, expect, it } from 'vitest';

import {
  applyPrayerVisibilityControls,
  buildPrayerReportInsert,
  maskProfanityInText,
} from './content-safety';
import type { PrayerCard } from './sample-data';

const baseCard: PrayerCard = {
  id: 'post-1',
  authorId: 'author-1',
  title: 'Prayer for peace',
  body: 'Please pray for peace at home. Thank you.',
  mood: 'joy',
  visibility: 'public',
  identity: 'anonymous',
  authorLabel: 'A neighbor',
  neighborhood: 'Midtown',
  postedAgo: 'now',
};

describe('content safety helpers', () => {
  it('masks profanity while preserving the first visible character', () => {
    expect(maskProfanityInText('This badword should not show.')).toBe(
      'This b****** should not show.',
    );
  });

  it('hides prayers that the viewer reported or whose author is blocked', () => {
    const cards: PrayerCard[] = [
      baseCard,
      { ...baseCard, id: 'post-2', authorId: 'author-2' },
      { ...baseCard, id: 'post-3', authorId: 'author-3' },
    ];

    expect(
      applyPrayerVisibilityControls(cards, {
        hiddenPrayerIds: new Set(['post-2']),
        blockedAuthorIds: new Set(['author-3']),
      }).map((card) => card.id),
    ).toEqual(['post-1']);
  });

  it('builds a report payload that can also hide and block the author', () => {
    expect(
      buildPrayerReportInsert({
        prayerId: 'post-1',
        reporterId: 'viewer-1',
        reportedAuthorId: 'author-1',
        reason: 'harassment',
        details: 'This prayer targets someone by name.',
      }),
    ).toMatchObject({
      prayer_id: 'post-1',
      reporter_id: 'viewer-1',
      reported_author_id: 'author-1',
      reason: 'harassment',
      details: 'This prayer targets someone by name.',
    });
  });
});