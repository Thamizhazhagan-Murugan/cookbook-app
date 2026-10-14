// A little stove-top pot, drawn from plain views and animated with Reanimated.
// running → lid rattles, steam rises, flames flicker · paused → stove off, still
// done → lid pops off and steam pours out.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

import { useTheme } from '@/theme';

export type PotState = 'running' | 'paused' | 'done';

const POT = '#2B3A55';
const POT_LIGHT = '#3F5274';
const FLAME = '#FF6A3D';
const FLAME_CORE = '#FFC06A';

export function Steam({ p, x, s, color, i }: { p: SharedValue<number>; x: number; s: number; color: string; i: number }) {
  const st = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: Math.sin(t * Math.PI) * 0.85,
      transform: [{ translateY: -t * 26 * s }, { translateX: Math.sin(t * Math.PI * 2 + i * 1.7) * 3 * s }, { scale: 0.5 + t * 0.7 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: (x - 4) * s, top: 24 * s, width: 8 * s, height: 15 * s, borderRadius: 99, backgroundColor: color }, st]} />;
}

export function Flame({ f, x, s }: { f: SharedValue<number>; x: number; s: number }) {
  const st = useAnimatedStyle(() => ({ opacity: f.value === 0 ? 0 : 0.75 + f.value * 0.25, transform: [{ translateY: (1 - f.value) * 4 * s }, { rotate: '45deg' }, { scale: f.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: (x - 5) * s, top: 84 * s, width: 10 * s, height: 10 * s, borderRadius: 5 * s, borderTopLeftRadius: 0, backgroundColor: FLAME, alignItems: 'center', justifyContent: 'center' }, st]}>
      <View style={{ width: 5 * s, height: 5 * s, borderRadius: 2.5 * s, borderTopLeftRadius: 0, backgroundColor: FLAME_CORE, marginTop: 2 * s, marginLeft: 2 * s }} />
    </Animated.View>
  );
}

export function CookingPot({ size = 64, state = 'running', style }: { size?: number; state?: PotState; style?: object }) {
  const { c, dark } = useTheme();
  const s = size / 100;
  const lidY = useSharedValue(0);
  const lidR = useSharedValue(0);
  const f0 = useSharedValue(0);
  const f1 = useSharedValue(0);
  const f2 = useSharedValue(0);
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);

  useEffect(() => {
    const flames = [f0, f1, f2];
    const steam = [s0, s1, s2];
    [lidY, lidR, ...flames, ...steam].forEach((v) => cancelAnimation(v));
    if (state === 'running') {
      lidY.value = withRepeat(withSequence(withTiming(-2.5, { duration: 130, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 170, easing: Easing.bounce }), withTiming(0, { duration: 760 })), -1, false);
      lidR.value = withRepeat(withSequence(withTiming(2.5, { duration: 140 }), withTiming(-1.5, { duration: 160 }), withTiming(0, { duration: 760 })), -1, false);
      flames.forEach((f, i) => {
        f.value = withTiming(1, { duration: 200 }, () => {
          f.value = withDelay(i * 90, withRepeat(withSequence(withTiming(1.15, { duration: 210 + i * 40 }), withTiming(0.82, { duration: 250 + i * 30 })), -1, true));
        });
      });
      steam.forEach((v, i) => {
        v.value = 0;
        v.value = withDelay(i * 620, withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false));
      });
    } else if (state === 'done') {
      lidY.value = withSequence(withTiming(-14, { duration: 220, easing: Easing.out(Easing.quad) }), withTiming(-9, { duration: 260, easing: Easing.bounce }));
      lidR.value = withTiming(-14, { duration: 260 });
      flames.forEach((f) => (f.value = withTiming(0, { duration: 200 })));
      steam.forEach((v, i) => {
        v.value = 0;
        v.value = withDelay(i * 300, withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false));
      });
    } else {
      lidY.value = withTiming(0, { duration: 260 });
      lidR.value = withTiming(0, { duration: 260 });
      flames.forEach((f) => (f.value = withTiming(0, { duration: 200 })));
      steam.forEach((v) => (v.value = withTiming(0, { duration: 250 })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const lid = useAnimatedStyle(() => ({ transform: [{ translateY: lidY.value * s }, { rotate: `${lidR.value}deg` }] }));
  const steamColor = dark ? 'rgba(255,255,255,0.9)' : 'rgba(20,33,61,0.42)';

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Steam p={s0} x={34} s={s} color={steamColor} i={0} />
      <Steam p={s1} x={50} s={s} color={steamColor} i={1} />
      <Steam p={s2} x={66} s={s} color={steamColor} i={2} />

      {/* lid + knob */}
      <Animated.View style={[{ position: 'absolute', left: 20 * s, top: 29 * s, width: 60 * s, height: 19 * s, alignItems: 'center' }, lid]}>
        <View style={{ width: 10 * s, height: 10 * s, borderRadius: 5 * s, backgroundColor: c.accent }} />
        <View style={{ position: 'absolute', top: 7 * s, width: 60 * s, height: 12 * s, borderRadius: 99, backgroundColor: POT_LIGHT }} />
      </Animated.View>

      {/* rim, body, handles */}
      <View style={{ position: 'absolute', left: 15 * s, top: 45 * s, width: 70 * s, height: 6 * s, borderRadius: 3 * s, backgroundColor: POT_LIGHT }} />
      <View style={{ position: 'absolute', left: 19 * s, top: 49 * s, width: 62 * s, height: 33 * s, borderTopLeftRadius: 4 * s, borderTopRightRadius: 4 * s, borderBottomLeftRadius: 16 * s, borderBottomRightRadius: 16 * s, backgroundColor: POT }}>
        <View style={{ position: 'absolute', left: 8 * s, top: 6 * s, width: 5 * s, height: 16 * s, borderRadius: 3 * s, backgroundColor: 'rgba(255,255,255,0.12)' }} />
      </View>
      <View style={{ position: 'absolute', left: 7 * s, top: 55 * s, width: 14 * s, height: 7 * s, borderRadius: 4 * s, backgroundColor: POT }} />
      <View style={{ position: 'absolute', left: 79 * s, top: 55 * s, width: 14 * s, height: 7 * s, borderRadius: 4 * s, backgroundColor: POT }} />

      {/* burner */}
      <Flame f={f0} x={38} s={s} />
      <Flame f={f1} x={50} s={s} />
      <Flame f={f2} x={62} s={s} />
      <View style={[styles.ring, { left: 16 * s, top: 95 * s, width: 68 * s, height: 3.5 * s, borderRadius: 2 * s, backgroundColor: c.muted, opacity: 0.45 }]} />
    </View>
  );
}

const styles = StyleSheet.create({ ring: { position: 'absolute' } });
