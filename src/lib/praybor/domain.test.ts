import { describe, expect, it } from 'vitest';

import {
  COMPLETE_GROWTH_POINTS,
  GROWTH_EVENT_POINTS,
  MOODS,
  TREE_SPECIES,
  addGrowthEvent,
  completeActiveTree,
  createPrayerDraft,
  getGrowthStage,
  setPrayerReaction,
  type PrayerReaction,
  type TreeSpecies,
} from './domain';
import { lottieAssetRegistry } from './lottie-assets';

describe('PrayBor domain contract', () => {
  it('defines the required 10 posting moods with accessible labels', () => {
    expect(MOODS.map((mood) => mood.id)).toEqual([
      'joy',
      'excitement',
      'gratitude',
      'ordinary',
      'surprised',
      'uncomfortable',
      'exhausted',
      'afraid',
      'sad',
      'angry',
    ]);

    for (const mood of MOODS) {
      expect(mood.label.length).toBeGreaterThan(0);
      expect(mood.accessibilityLabel).toContain(mood.label);
      expect(mood.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('exposes the full 17 tree species catalog for the grow collection', () => {
    expect(TREE_SPECIES).toHaveLength(17);
    expect(TREE_SPECIES.map((species) => species.id)).toEqual([
      'plum',
      'cherry',
      'olive',
      'orange',
      'palm',
      'avocado',
      'almond',
      'pomegranate',
      'apricot',
      'apple',
      'loquat',
      'peach',
      'pear',
      'chestnut',
      'mango',
      'guava',
      'persimmon',
    ]);
  });

  it('requires mood selection before creating a prayer draft', () => {
    expect(() =>
      createPrayerDraft({
        title: 'A hard week',
        body: 'Please pray for patience.',
        visibility: 'public',
        identity: 'anonymous',
      }),
    ).toThrow('Choose a mood before posting a prayer.');

    expect(
      createPrayerDraft({
        title: 'A hard week',
        body: 'Please pray for patience.',
        mood: 'exhausted',
        visibility: 'public',
        identity: 'anonymous',
      }),
    ).toMatchObject({
      mood: 'exhausted',
      visibility: 'public',
      identity: 'anonymous',
    });
  });

  it('preserves composer visual choices on prayer drafts', () => {
    expect(
      createPrayerDraft({
        title: 'Prayer for peace',
        body: 'Please pray for peace today.',
        mood: 'joy',
        visibility: 'public',
        identity: 'real_name',
        paperColor: '#FFD84D',
        pinSeed: 42,
      }),
    ).toMatchObject({
      identity: 'real_name',
      paperColor: '#FFD84D',
      pinSeed: 42,
    });
  });

  it('keeps one reaction per user per prayer and replaces the previous reaction', () => {
    const first = setPrayerReaction([], {
      prayerId: 'prayer-1',
      userId: 'user-1',
      type: 'prayer',
    });
    const second = setPrayerReaction(first, {
      prayerId: 'prayer-1',
      userId: 'user-1',
      type: 'love',
    });
    const otherUser = setPrayerReaction(second, {
      prayerId: 'prayer-1',
      userId: 'user-2',
      type: 'comfort',
    });

    expect(otherUser).toHaveLength(2);
    expect(otherUser.find((reaction) => reaction.userId === 'user-1')?.type).toBe('love');
    expect(countReactions(otherUser)).toEqual({ prayer: 0, amen: 0, comfort: 1, love: 1 });
  });

  it('grows trees through one public or group prayer action per day over a 7 day cycle', () => {
    expect(COMPLETE_GROWTH_POINTS).toBe(7);
    expect(GROWTH_EVENT_POINTS.reaction_given).toBe(1);
    expect(GROWTH_EVENT_POINTS.prayer_posted).toBe(1);
    expect(GROWTH_EVENT_POINTS.recap_completed).toBe(0);

    let tree = {
      id: 'active-tree',
      speciesId: 'apple',
      growthPoints: 0,
      startedAt: '2026-05-19T12:00:00.000Z',
    };

    tree = addGrowthEvent(tree, { type: 'reaction_given', visibility: 'public', occurredOn: '2026-05-19' });
    tree = addGrowthEvent(tree, { type: 'prayer_posted', visibility: 'public', occurredOn: '2026-05-19' });
    expect(tree.growthPoints).toBe(1);
    expect(getGrowthStage(tree.growthPoints)).toBe('sprout');

    tree = addGrowthEvent(tree, { type: 'reaction_given', visibility: 'group', occurredOn: '2026-05-20' });
    tree = addGrowthEvent(tree, { type: 'recap_completed', visibility: 'public', occurredOn: '2026-05-21' });
    expect(tree.growthPoints).toBe(2);

    for (const occurredOn of [
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
      '2026-05-25',
    ]) {
      tree = addGrowthEvent(tree, { type: 'reaction_given', visibility: 'public', occurredOn });
    }

    expect(tree.growthPoints).toBe(7);
    expect(getGrowthStage(tree.growthPoints)).toBe('completed');
  });

  it('turns a completed fruiting tree into a forest tree and the next seed', () => {
    const species: TreeSpecies[] = [
      { id: 'apple', label: 'Apple Tree', fruitLabel: 'apple', rarity: 'common' },
      { id: 'cedar', label: 'Cedar', fruitLabel: 'cone', rarity: 'rare' },
    ];
    const completed = completeActiveTree(
      {
        id: 'active-tree',
        speciesId: 'apple',
        growthPoints: 7,
        startedAt: '2026-05-01T12:00:00.000Z',
      },
      species,
      1,
    );

    expect(completed.collectionEntry).toMatchObject({
      speciesId: 'apple',
      growthPoints: 7,
    });
    expect(completed.nextActiveTree.speciesId).toBe('cedar');
    expect(completed.nextActiveTree.growthPoints).toBe(0);
  });

  it('registers all planned local Lottie animation keys with fallbacks', () => {
    expect(Object.keys(lottieAssetRegistry)).toEqual(
      expect.arrayContaining([
        'onboarding_welcome',
        'onboarding_board',
        'onboarding_groups',
        'onboarding_grow',
        'onboarding_recap',
        'mood_gratitude',
        'reaction_prayer',
        'reaction_amen',
        'reaction_comfort',
        'reaction_love',
        'tree_stage_seed',
        'tree_stage_fruiting_tree',
        'fruit_to_seed',
        'forest_highlight',
      ]),
    );

    for (const asset of Object.values(lottieAssetRegistry)) {
      expect(asset.fallback).toBeTruthy();
      expect(asset.accessibilityLabel).toBeTruthy();
    }
  });
});

function countReactions(reactions: PrayerReaction[]) {
  return reactions.reduce(
    (counts, reaction) => ({ ...counts, [reaction.type]: counts[reaction.type] + 1 }),
    { prayer: 0, amen: 0, comfort: 0, love: 0 },
  );
}
