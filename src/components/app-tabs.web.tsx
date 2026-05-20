import { TabList, TabListProps, TabSlot, Tabs, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type TabButtonProps = TabTriggerSlotProps & {
  icon: SymbolViewProps['name'];
  label: string;
};

const tabs = [
  { name: 'board', href: '/', label: 'Board', icon: { ios: 'square.grid.2x2', web: 'dashboard' } },
  { name: 'groups', href: '/groups', label: 'Groups', icon: { ios: 'person.3', web: 'groups' } },
  { name: 'grow', href: '/grow', label: 'Grow', icon: { ios: 'leaf', web: 'eco' } },
  { name: 'me', href: '/me', label: 'Me', icon: { ios: 'tree', web: 'forest' } },
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
      <SymbolView name={icon} size={20} tintColor={tintColor} />
      <Text style={[styles.tabLabel, { color: tintColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
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
