import { TabList, TabListProps, TabSlot, Tabs, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

type TabButtonProps = TabTriggerSlotProps & {
  icon: TabIconName;
  label: string;
};

type TabIconName = 'board' | 'groups' | 'grow' | 'me';

const tabs = [
  { name: 'board', href: '/', label: 'Board', icon: 'board' },
  { name: 'groups', href: '/groups', label: 'Groups', icon: 'groups' },
  { name: 'grow', href: '/grow', label: 'Grow', icon: 'grow' },
  { name: 'me', href: '/me', label: 'Me', icon: 'me' },
] as const;

const menuBarColor = '#FF6628';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon} label={tab.label} />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ icon, isFocused, label, ...props }: TabButtonProps) {
  const tintColor = '#FFFFFF';

  return (
    <Pressable
      {...props}
      accessibilityLabel={`${label} tab`}
      style={({ pressed }) => [styles.tabButton, isFocused && styles.tabButtonActive, pressed && styles.pressed]}>
      <TabIcon name={icon} color={tintColor} />
      <Text style={[styles.tabLabel, { color: tintColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function TabIcon({ color, name }: { color: string; name: TabIconName }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4">
        {name === 'board' ? (
          <>
            <Rect x="10" y="10" width="11" height="11" rx="2" />
            <Rect x="27" y="10" width="11" height="11" rx="2" />
            <Rect x="10" y="27" width="11" height="11" rx="2" />
            <Rect x="27" y="27" width="11" height="11" rx="2" />
          </>
        ) : null}
        {name === 'groups' ? (
          <>
            <Circle cx="24" cy="16" r="6" />
            <Circle cx="13" cy="22" r="5" />
            <Circle cx="35" cy="22" r="5" />
            <Path d="M14 38 C16 30 32 30 34 38" />
            <Path d="M5 38 C6 32 15 31 18 35" />
            <Path d="M43 38 C42 32 33 31 30 35" />
          </>
        ) : null}
        {name === 'grow' ? (
          <>
            <Path d="M24 39 V22" />
            <Path d="M24 24 C15 24 11 18 11 10 C20 10 24 16 24 24 Z" />
            <Path d="M24 27 C34 27 39 20 39 11 C29 11 24 18 24 27 Z" />
          </>
        ) : null}
        {name === 'me' ? (
          <>
            <Path d="M24 40 V24" />
            <Path d="M24 9 L12 27 H19 L10 39 H38 L29 27 H36 Z" />
          </>
        ) : null}
      </G>
    </Svg>
  );
}

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={[styles.tabListContainer, { pointerEvents: 'box-none' }, props.style]}>
      <View
        style={[
          styles.innerContainer,
          {
            backgroundColor: menuBarColor,
            borderColor: 'rgba(255, 255, 255, 0.26)',
          },
        ]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  tabListContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    paddingHorizontal: 18,
    paddingBottom: 14,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 430,
    minHeight: 66,
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 14px 32px rgba(255, 138, 91, 0.20)',
  },
  tabButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
});
