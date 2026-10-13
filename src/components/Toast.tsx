import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';
import { Press, T } from './ui';

export function Toast({ bottom = 24 }: { bottom?: number }) {
  const toast = useStore((s) => s.toast);
  const hide = useStore((s) => s.hideToast);
  const { c } = useTheme();
  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(hide, toast.action ? 3800 : 2200);
    return () => clearTimeout(h);
  }, [toast, hide]);
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View key={toast.id} entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(150)} style={[styles.pill, { backgroundColor: c.ink }]}>
        <T v="smallSemi" style={{ color: c.canvas }}>
          {toast.text}
        </T>
        {toast.action ? (
          <Press
            onPress={() => {
              hide();
              router.push(toast.action!.href as never);
            }}>
            <T v="smallSemi" style={{ color: c.yolk, fontFamily: fonts.bodyBold }}>
              {toast.action.label}
            </T>
          </Press>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 60 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, maxWidth: '90%' },
});
