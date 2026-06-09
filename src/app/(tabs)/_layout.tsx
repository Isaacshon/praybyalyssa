import AppTabs from '@/components/app-tabs';
import { FirstRunGate } from '@/components/praybor/FirstRunGate';

export default function TabsLayout() {
  return (
    <FirstRunGate>
      <AppTabs />
    </FirstRunGate>
  );
}
