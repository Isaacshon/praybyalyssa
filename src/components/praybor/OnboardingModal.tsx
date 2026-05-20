import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAsset } from '@/components/praybor/AnimatedAsset';
import { Colors } from '@/constants/theme';
import type { LottieAssetKey } from '@/lib/praybor/lottie-assets';

type OnboardingSlide = {
  key: LottieAssetKey;
  title: string;
  body: string;
};

const slides: OnboardingSlide[] = [
  {
    key: 'onboarding_welcome',
    title: 'Pray with your neighborhood',
    body: 'Share what you are carrying and let nearby believers quietly pray with you.',
  },
  {
    key: 'onboarding_board',
    title: 'Post to a gentle prayer board',
    body: 'Each card begins with a feeling, so people can understand the heart before the details.',
  },
  {
    key: 'onboarding_groups',
    title: 'Invite private groups',
    body: 'Create an invite code for house churches, friends, and teams with no distance limit.',
  },
  {
    key: 'onboarding_grow',
    title: 'See fruit already growing',
    body: 'Every prayer you post and every prayer you carry becomes growth in your tree.',
  },
  {
    key: 'onboarding_recap',
    title: 'Look back with hope',
    body: 'The next day, review reactions and mark how the prayer is unfolding.',
  },
];

export function OnboardingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  function next() {
    if (isLast) {
      onClose();
      return;
    }
    setIndex((current) => current + 1);
  }

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={onClose}
            style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <AnimatedAsset assetKey={slide.key} size={190} loop />
          <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{slide.body}</Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((item, itemIndex) => (
              <View
                key={item.key}
                style={[
                  styles.dot,
                  {
                    backgroundColor: itemIndex === index ? colors.tint : colors.backgroundSelected,
                    width: itemIndex === index ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Start using PrayBor' : 'Next onboarding slide'}
            onPress={next}
            style={[styles.nextButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.nextText, { color: colors.backgroundElement }]}>{isLast ? 'Start' : 'Next'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipButton: {
    minHeight: 44,
    minWidth: 64,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 24,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 22,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    minHeight: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 18,
    fontWeight: '900',
  },
});
