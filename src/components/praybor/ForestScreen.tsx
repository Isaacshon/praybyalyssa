import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlessiLogo } from '@/components/praybor/BlessiLogo';
import { ForestTree, ReactionIcon } from '@/components/praybor/PrayborArtwork';
import { Colors } from '@/constants/theme';
import { forestCollection, treeSpeciesById } from '@/lib/praybor/sample-data';

const positions = [
  { left: '40%', top: '10%' },
  { left: '13%', top: '37%' },
  { left: '62%', top: '39%' },
] as const;

export function ForestScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [selectedId, setSelectedId] = useState(forestCollection[0]?.id);
  const selectedTree = forestCollection.find((tree) => tree.id === selectedId) ?? forestCollection[0];
  const selectedSpecies = treeSpeciesById[selectedTree.speciesId];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <BlessiLogo imageStyle={styles.logoImage} />
          <Text style={[styles.title, { color: colors.text }]}>Fruit from prayers already carried</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Every prayer you post and carry leaves a visible trace in this garden.
          </Text>
        </View>

        <View style={[styles.forestSky, { backgroundColor: colors.softGreen }]}>
          <View style={styles.cloudWide} />
          <View style={styles.cloudSmall} />
          <View style={styles.islandShadow} />
          <View style={styles.island}>
            <View style={styles.gridLineOne} />
            <View style={styles.gridLineTwo} />
            {forestCollection.map((tree, index) => {
              const species = treeSpeciesById[tree.speciesId];
              const selected = tree.id === selectedId;
              return (
                <Pressable
                  key={tree.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${species.label}, completed tree`}
                  onPress={() => setSelectedId(tree.id)}
                  style={[styles.treeSpot, positions[index % positions.length], selected && styles.selectedTree]}>
                  <ForestTree species={tree.speciesId} selected={selected} size={selected ? 92 : 82} />
                  <View style={styles.heartBubble}>
                    <ReactionIcon type="love" size={18} />
                  </View>
                </Pressable>
              );
            })}
            <Seedling left="28%" top="68%" />
            <Seedling left="74%" top="69%" />
            <Seedling left="48%" top="59%" />
          </View>
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedSpecies.label}</Text>
          <Text style={[styles.detailBody, { color: colors.textSecondary }]}>
            Completed on {new Date(selectedTree.completedAt).toLocaleDateString()}. This tree grew
            through prayers you shared and prayers you carried for others.
          </Text>
          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: colors.softBlue }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>24</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>prayers carried</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: colors.softBlue }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>Love</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>top reaction</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Seedling({ left, top }: { left: DimensionValue; top: DimensionValue }) {
  return (
    <View style={[styles.seedling, { left, top }]}>
      <View style={styles.seedlingLeafLeft} />
      <View style={styles.seedlingLeafRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 132,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 124,
    height: 38,
  },
  title: {
    width: '100%',
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  forestSky: {
    minHeight: 420,
    borderRadius: 32,
    overflow: 'hidden',
    padding: 22,
    justifyContent: 'flex-end',
  },
  cloudWide: {
    position: 'absolute',
    top: 66,
    right: 54,
    width: 132,
    height: 38,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  cloudSmall: {
    position: 'absolute',
    top: 88,
    right: 132,
    width: 50,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  islandShadow: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 30,
    height: 170,
    borderRadius: 34,
    backgroundColor: '#78A77D',
    opacity: 0.36,
    transform: [{ translateY: 18 }],
  },
  island: {
    minHeight: 224,
    borderRadius: 36,
    backgroundColor: '#E4F1DD',
    overflow: 'hidden',
  },
  gridLineOne: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 86,
    height: 1,
    backgroundColor: 'rgba(82, 128, 90, 0.16)',
    transform: [{ rotate: '-14deg' }],
  },
  gridLineTwo: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 138,
    height: 1,
    backgroundColor: 'rgba(82, 128, 90, 0.16)',
    transform: [{ rotate: '14deg' }],
  },
  treeSpot: {
    position: 'absolute',
    minWidth: 78,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTree: {
    transform: [{ scale: 1.08 }],
  },
  heartBubble: {
    position: 'absolute',
    top: 6,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedling: {
    position: 'absolute',
    width: 24,
    height: 42,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  seedlingLeafLeft: {
    position: 'absolute',
    bottom: 20,
    left: 1,
    width: 18,
    height: 12,
    borderRadius: 9,
    backgroundColor: '#8FB860',
    transform: [{ rotate: '28deg' }],
  },
  seedlingLeafRight: {
    position: 'absolute',
    bottom: 18,
    right: 1,
    width: 18,
    height: 12,
    borderRadius: 9,
    backgroundColor: '#6F9A58',
    transform: [{ rotate: '-28deg' }],
  },
  detailCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  detailBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 76,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },
});
