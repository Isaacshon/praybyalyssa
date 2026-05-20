import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAsset } from '@/components/praybor/AnimatedAsset';
import { ReactionIcon } from '@/components/praybor/PrayborArtwork';
import { Colors } from '@/constants/theme';
import {
  COMPLETE_GROWTH_POINTS,
  TREE_SPECIES,
  addGrowthEvent,
  completeActiveTree,
  getGrowthStage,
  type ActiveTree,
  type TreeGrowthEventType,
} from '@/lib/praybor/domain';
import { activeTree, treeSpeciesById } from '@/lib/praybor/sample-data';

const missionCards: {
  type: TreeGrowthEventType;
  title: string;
  body: string;
  icon: 'prayer' | 'share' | 'review';
}[] = [
  {
    type: 'reaction_given',
    title: 'Pray for someone',
    body: '+10 growth',
    icon: 'prayer',
  },
  {
    type: 'prayer_posted',
    title: 'Share a prayer',
    body: '+5 growth',
    icon: 'share',
  },
  {
    type: 'recap_completed',
    title: 'Review yesterday',
    body: '+5 growth',
    icon: 'review',
  },
];

const missionBubbleShadow = Platform.select({
  web: { boxShadow: '0 8px 14px rgba(10, 6, 0, 0.12)' },
  default: {
    shadowColor: '#0A0600',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

const progressCardShadow = Platform.select({
  web: { boxShadow: '0 8px 18px rgba(10, 6, 0, 0.12)' },
  default: {
    shadowColor: '#0A0600',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

export function GrowScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [tree, setTree] = useState<ActiveTree>(activeTree);
  const [completedMessage, setCompletedMessage] = useState('');
  const stage = getGrowthStage(tree.growthPoints);
  const progress = Math.min(100, Math.round((tree.growthPoints / COMPLETE_GROWTH_POINTS) * 100));
  const species = treeSpeciesById[tree.speciesId] ?? TREE_SPECIES[0];
  const stageAsset = useMemo(
    () =>
      stage === 'completed'
        ? 'tree_stage_fruiting_tree'
        : (`tree_stage_${stage}` as const),
    [stage],
  );

  function grow(type: TreeGrowthEventType) {
    setCompletedMessage('');
    setTree((current) => {
      const next = addGrowthEvent(current, { type, occurredOn: new Date().toISOString().slice(0, 10) });
      if (next.growthPoints >= COMPLETE_GROWTH_POINTS) {
        const completed = completeActiveTree(next, TREE_SPECIES, 1);
        setCompletedMessage(
          `${species.label} bore fruit and was planted in your forest. A new seed is ready.`,
        );
        return completed.nextActiveTree;
      }
      return next;
    });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            God is already at work.
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your prayer and the prayers you carry are becoming fruit.
          </Text>
        </View>

        <View style={styles.stageArea}>
          <View style={[styles.missionBubble, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.missionBubbleText, { color: colors.text }]}>Missions</Text>
          </View>
          <View style={[styles.soilPlate, { backgroundColor: colors.accent }]}>
            <AnimatedAsset assetKey={stageAsset} size={190} loop />
          </View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.progressTop}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              {stage === 'seed' ? 'Seed' : species.label}
            </Text>
            <Text style={[styles.progressPercent, { color: colors.tint }]}>{progress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.tint, width: `${progress}%` }]} />
          </View>
          {completedMessage ? (
            <View style={[styles.messageBox, { backgroundColor: colors.softGreen }]}>
              <AnimatedAsset assetKey="fruit_to_seed" size={38} />
              <Text style={[styles.messageText, { color: colors.text }]}>{completedMessage}</Text>
            </View>
          ) : null}
          <View style={styles.missionsGrid}>
            {missionCards.map((mission) => (
              <Pressable
                key={mission.type}
                accessibilityRole="button"
                accessibilityLabel={`${mission.title}. ${mission.body}`}
                onPress={() => grow(mission.type)}
                style={[styles.missionCard, { backgroundColor: colors.softBlue }]}>
                <View style={styles.missionIcon}>
                  <ReactionIcon type={mission.icon === 'prayer' ? 'prayer' : mission.icon} size={34} />
                </View>
                <View style={styles.missionTextBlock}>
                  <Text style={[styles.missionTitle, { color: colors.text }]}>{mission.title}</Text>
                  <Text style={[styles.missionBody, { color: colors.textSecondary }]}>{mission.body}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 132,
  },
  header: {
    gap: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
  },
  stageArea: {
    minHeight: 348,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  missionBubble: {
    position: 'absolute',
    top: 22,
    right: 8,
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...missionBubbleShadow,
  },
  missionBubbleText: {
    fontWeight: '900',
  },
  soilPlate: {
    width: 282,
    height: 118,
    borderRadius: 141,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    marginTop: 18,
    borderRadius: 24,
    padding: 18,
    gap: 16,
    ...progressCardShadow,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '900',
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  messageBox: {
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  missionsGrid: {
    gap: 10,
  },
  missionCard: {
    minHeight: 68,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTextBlock: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  missionBody: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
});
