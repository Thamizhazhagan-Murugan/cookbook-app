import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimerDock } from '@/components/TimerDock';
import { useGroceryList } from '@/store/selectors';
import { useStore } from '@/store/useStore';
import { fonts, useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
function icon(on: IconName, off: IconName) {
  const TabIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => <Ionicons name={focused ? on : off} size={24} color={color as string} />;
  TabIcon.displayName = 'TabIcon';
  return TabIcon;
}

export default function TabLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const weekId = useStore((s) => s.currentWeekId);
  const toBuy = useGroceryList(weekId).toBuy.length;
  const barHeight = 58 + (Platform.OS === 'web' ? 0 : insets.bottom);
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.basil,
          tabBarInactiveTintColor: c.muted,
          tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, height: barHeight, paddingTop: 6 },
          tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11.5 },
          sceneStyle: { backgroundColor: c.canvas },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Plan', tabBarIcon: icon('calendar', 'calendar-outline') }} />
        <Tabs.Screen name="recipes" options={{ title: 'Recipes', tabBarIcon: icon('book', 'book-outline') }} />
        <Tabs.Screen name="groceries" options={{ title: 'Groceries', tabBarIcon: icon('cart', 'cart-outline'), tabBarBadge: toBuy || undefined, tabBarBadgeStyle: { backgroundColor: c.basil, color: c.basilInk, fontFamily: fonts.bodyBold, fontSize: 11 } }} />
        <Tabs.Screen name="more" options={{ title: 'Pantry & more', tabBarIcon: icon('file-tray-full', 'file-tray-full-outline') }} />
      </Tabs>
      <TimerDock bottom={barHeight} />
    </View>
  );
}
