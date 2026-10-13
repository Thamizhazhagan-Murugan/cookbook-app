import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTimerTicker } from '@/components/TimerDock';
import { Toast } from '@/components/Toast';
import { startSync } from '@/lib/sync';
import { useStore } from '@/store/useStore';
import { palettes, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  useTimerTicker();
  useEffect(() => startSync(), []);
  const navTheme = dark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.canvas, card: c.surface, text: c.ink, border: c.line, primary: c.basil } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.canvas, card: c.surface, text: c.ink, border: c.line, primary: c.basil } };
  return (
    <ThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="cook/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="pick" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pantry" />
          <Stack.Screen name="history" />
        </Stack>
        <Toast bottom={insets.bottom + 90} />
      </View>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_800ExtraBold, BricolageGrotesque_700Bold, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold });
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    if (fontsLoaded && hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, hydrated]);
  // Fonts failing to load (offline web) must not block the app for ever.
  const [timedOut, setTimedOut] = React.useState(false);
  useEffect(() => {
    const h = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(h);
  }, []);
  if ((!fontsLoaded && !timedOut) || !hydrated) return <View style={{ flex: 1, backgroundColor: palettes.light.canvas }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Shell />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
