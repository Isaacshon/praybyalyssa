import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type TapeScrollTextProps = {
  contentContainerStyle?: StyleProp<ViewStyle>;
  maxHeight: number;
  style?: StyleProp<ViewStyle>;
  text: string;
  textStyle?: StyleProp<TextStyle>;
};

const tapeShadow = Platform.select({
  web: { boxShadow: '0 2px 5px rgba(10, 6, 0, 0.16)' },
  default: {
    shadowColor: '#0A0600',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

export function TapeScrollText({
  contentContainerStyle,
  maxHeight,
  style,
  text,
  textStyle,
}: TapeScrollTextProps) {
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const canScroll = layoutHeight > 0 && contentHeight > layoutHeight + 4;

  const thumbMetrics = useMemo(() => {
    if (!canScroll) {
      return { height: 0, top: 0 };
    }

    const trackHeight = Math.max(34, layoutHeight - 12);
    const thumbHeight = Math.max(28, Math.min(trackHeight, (layoutHeight / contentHeight) * trackHeight));
    const maxScrollY = Math.max(1, contentHeight - layoutHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const top = Math.max(0, Math.min(maxThumbTop, (scrollY / maxScrollY) * maxThumbTop));

    return { height: thumbHeight, top };
  }, [canScroll, contentHeight, layoutHeight, scrollY]);

  function handleLayout(event: LayoutChangeEvent) {
    setLayoutHeight(event.nativeEvent.layout.height);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollY(event.nativeEvent.contentOffset.y);
  }

  return (
    <View style={[styles.frame, { maxHeight }, style]}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        onLayout={handleLayout}
        onScroll={handleScroll}
        style={[styles.scroll, { maxHeight }]}
        contentContainerStyle={[styles.content, canScroll && styles.contentWithTape, contentContainerStyle]}>
        <Text style={textStyle}>{text}</Text>
      </ScrollView>
      {canScroll ? (
        <View pointerEvents="none" style={styles.tapeTrack}>
          <View
            style={[
              styles.tapeThumb,
              {
                height: thumbMetrics.height,
                transform: [{ translateY: thumbMetrics.top }, { rotate: '-2deg' }],
              },
            ]}>
            <View style={styles.tapeHighlight} />
            <View style={styles.tapeCrease} />
            <View style={styles.tapeTornTop} />
            <View style={styles.tapeTornBottom} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    width: '100%',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingRight: 1,
  },
  contentWithTape: {
    paddingRight: 18,
  },
  tapeTrack: {
    position: 'absolute',
    top: 6,
    right: 1,
    bottom: 6,
    width: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  tapeThumb: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    minHeight: 28,
    overflow: 'hidden',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 138, 91, 0.58)',
    ...tapeShadow,
  },
  tapeHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 3,
    bottom: 2,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  tapeCrease: {
    position: 'absolute',
    top: '42%',
    left: -1,
    right: -1,
    height: 1,
    backgroundColor: 'rgba(10, 6, 0, 0.1)',
    transform: [{ rotate: '-8deg' }],
  },
  tapeTornTop: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 7,
    height: 7,
    backgroundColor: 'rgba(255, 245, 236, 0.45)',
    transform: [{ rotate: '24deg' }],
  },
  tapeTornBottom: {
    position: 'absolute',
    bottom: -2,
    left: -4,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 245, 236, 0.38)',
    transform: [{ rotate: '-18deg' }],
  },
});
