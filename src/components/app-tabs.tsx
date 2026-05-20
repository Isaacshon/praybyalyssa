import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

export default function AppTabs() {
  const menuBarColor = '#FF6628';

  return (
    <NativeTabs
      backgroundColor={menuBarColor}
      iconColor={{ default: '#FFFFFF', selected: '#FFFFFF' }}
      indicatorColor="rgba(255, 255, 255, 0.18)"
      labelStyle={{ default: { color: '#FFFFFF' }, selected: { color: '#FFFFFF' } }}
      tintColor="#FFFFFF">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
          md="dashboard"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="groups">
        <NativeTabs.Trigger.Label>Groups</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.3', selected: 'person.3.fill' }}
          md="groups"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="grow">
        <NativeTabs.Trigger.Label>Grow</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'leaf', selected: 'leaf.fill' }}
          md="eco"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'tree', selected: 'tree.fill' }}
          md="forest"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
