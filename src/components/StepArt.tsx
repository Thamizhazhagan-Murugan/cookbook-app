// Looping scenes for each kind of recipe step (see lib/steps.ts). Everything is drawn from
// plain views in a 100×100 design space and animated from a single 0→1 progress value, so
// each scene stays cheap: one shared value, a handful of derived styles.
import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

import type { StepKind } from '@/lib/steps';
import { fonts, useTheme } from '@/theme';
import { CookingPot, Flame } from './CookingPot';

type Scene = { p: SharedValue<number>; s: number; dark: boolean; accent: string; muted: string };

const NAVY = '#2B3A55';
const NAVY_LIGHT = '#3F5274';
const STEEL = '#DCE3EC';
const WOOD = '#D9A066';
const WOOD_DARK = '#B8803F';
const CREAM = '#F6D7A8';
const ORANGE = '#FF8C42';
const GREEN = '#5BC98C';
const AMBER = '#FFC06A';
const MEAT = '#9B4F2B';
const MEAT_DARK = '#5C2E17';

const box = (s: number, x: number, y: number, w: number, h: number, extra?: ViewStyle): ViewStyle => ({ position: 'absolute', left: x * s, top: y * s, width: w * s, height: h * s, ...extra });

/* ---------- Prep: knife chopping a carrot on a board ---------- */
function Chop({ p, s }: Scene) {
  const knife = useAnimatedStyle(() => {
    const t = p.value;
    const down = t < 0.18 ? t / 0.18 : t < 0.5 ? 1 - (t - 0.18) / 0.32 : 0;
    return { transform: [{ translateY: down * 13 * s }, { rotate: `${-down * 5}deg` }] };
  });
  const slice = useAnimatedStyle(() => {
    const t = p.value;
    const u = t < 0.16 || t > 0.62 ? 0 : (t - 0.16) / 0.46;
    return { opacity: u === 0 ? 0 : 1 - u * 0.9, transform: [{ translateX: u * 16 * s }, { translateY: -Math.sin(u * Math.PI) * 10 * s }, { rotate: `${u * 90}deg` }] };
  });
  return (
    <>
      <View style={box(s, 8, 66, 84, 16, { borderRadius: 4 * s, backgroundColor: WOOD })} />
      <View style={box(s, 8, 78, 84, 5, { borderBottomLeftRadius: 4 * s, borderBottomRightRadius: 4 * s, backgroundColor: WOOD_DARK })} />
      {/* carrot + leaves */}
      <View style={box(s, 20, 57, 30, 9, { borderRadius: 5 * s, backgroundColor: ORANGE })} />
      <View style={box(s, 13, 55, 10, 5, { borderRadius: 3 * s, backgroundColor: GREEN, transform: [{ rotate: '-25deg' }] })} />
      <View style={box(s, 13, 61, 10, 5, { borderRadius: 3 * s, backgroundColor: GREEN, transform: [{ rotate: '15deg' }] })} />
      {/* slices already cut */}
      {[58, 68, 78].map((x, i) => (
        <View key={i} style={box(s, x, 57 + (i % 2) * 1.5, 8, 8, { borderRadius: 4 * s, backgroundColor: ORANGE, borderWidth: 1.5 * s, borderColor: '#FFB07A' })} />
      ))}
      <Animated.View style={[box(s, 50, 58, 8, 8, { borderRadius: 4 * s, backgroundColor: ORANGE, borderWidth: 1.5 * s, borderColor: '#FFB07A' }), slice]} />
      {/* knife */}
      <Animated.View style={[box(s, 22, 30, 76, 20), knife]}>
        <View style={box(s, 0, 7, 48, 13, { backgroundColor: STEEL, borderBottomLeftRadius: 13 * s, borderTopRightRadius: 2 * s })} />
        <View style={box(s, 0, 7, 48, 13, { borderBottomLeftRadius: 13 * s, borderWidth: 1 * s, borderColor: 'rgba(20,33,61,0.15)' })} />
        <View style={box(s, 46, 5, 30, 10, { backgroundColor: NAVY, borderRadius: 5 * s })} />
      </Animated.View>
    </>
  );
}

/* ---------- Mix: spoon stirring a bowl ---------- */
function Mix({ p, s }: Scene) {
  const spoon = useAnimatedStyle(() => {
    const t = p.value * Math.PI * 2;
    return { transform: [{ translateX: Math.sin(t) * 14 * s }, { rotate: `${-Math.sin(t) * 22}deg` }] };
  });
  const batter = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + Math.sin(p.value * Math.PI * 4) * 0.04 }, { translateY: Math.sin(p.value * Math.PI * 2) * 1.2 * s }] }));
  const drop = (phase: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const u = (p.value + phase) % 1;
      const v = u < 0.35 ? u / 0.35 : 0;
      return { opacity: v === 0 ? 0 : 1 - v, transform: [{ translateY: -Math.sin(v * Math.PI) * 14 * s }, { translateX: (phase > 0.4 ? -1 : 1) * v * 8 * s }] };
    });
  const d1 = drop(0);
  const d2 = drop(0.5);
  return (
    <>
      <Animated.View style={[box(s, 40, 38, 6, 6, { borderRadius: 3 * s, backgroundColor: CREAM }), d1]} />
      <Animated.View style={[box(s, 56, 40, 5, 5, { borderRadius: 3 * s, backgroundColor: CREAM }), d2]} />
      <View style={box(s, 18, 52, 64, 34, { borderBottomLeftRadius: 32 * s, borderBottomRightRadius: 32 * s, backgroundColor: '#E8EDF4' })} />
      <Animated.View style={[box(s, 22, 48, 56, 10, { borderRadius: 99, backgroundColor: CREAM }), batter]} />
      <View style={box(s, 14, 47, 72, 7, { borderRadius: 99, backgroundColor: '#C9D3DF' })} />
      <Animated.View style={[box(s, 46, 6, 8, 48, { borderRadius: 4 * s, backgroundColor: WOOD_DARK, transformOrigin: '50% 100%' }), spoon]} />
    </>
  );
}

/* ---------- Sauté: bits tossed in a pan over a flame ---------- */
function Saute({ p, s }: Scene) {
  const pan = useAnimatedStyle(() => {
    const t = p.value;
    const j = t < 0.14 ? Math.sin((t / 0.14) * Math.PI) : 0;
    return { transform: [{ translateY: -j * 4 * s }, { rotate: `${-j * 5}deg` }] };
  });
  const bit = (phase: number, height: number, spin: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const u = Math.max(0, Math.min(1, (p.value - phase) / 0.55));
      return { transform: [{ translateY: -Math.sin(u * Math.PI) * height * s }, { rotate: `${u * spin}deg` }] };
    });
  const b1 = bit(0.02, 14, 180);
  const b2 = bit(0.08, 18, -220);
  const b3 = bit(0.05, 11, 140);
  const spark = (phase: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const u = (p.value + phase) % 1;
      const v = u < 0.5 ? u / 0.5 : 0;
      return { opacity: v === 0 ? 0 : Math.sin(v * Math.PI) * 0.9, transform: [{ translateY: -v * 10 * s }] };
    });
  const sp1 = spark(0.2);
  const sp2 = spark(0.6);
  return (
    <>
      <Animated.View style={[box(s, 0, 20, 100, 60), pan]}>
        <View style={box(s, 72, 36, 26, 7, { borderRadius: 4 * s, backgroundColor: NAVY, transform: [{ rotate: '-6deg' }] })} />
        <View style={box(s, 12, 32, 62, 16, { borderRadius: 99, backgroundColor: NAVY })} />
        <View style={box(s, 17, 34, 52, 9, { borderRadius: 99, backgroundColor: NAVY_LIGHT })} />
        <Animated.View style={[box(s, 25, 27, 8, 8, { borderRadius: 2 * s, backgroundColor: ORANGE }), b1]} />
        <Animated.View style={[box(s, 38, 28, 12, 6, { borderRadius: 3 * s, backgroundColor: GREEN }), b2]} />
        <Animated.View style={[box(s, 54, 28, 7, 7, { borderRadius: 4 * s, backgroundColor: CREAM }), b3]} />
        <Animated.View style={[box(s, 20, 22, 3, 3, { borderRadius: 2 * s, backgroundColor: AMBER }), sp1]} />
        <Animated.View style={[box(s, 62, 24, 3, 3, { borderRadius: 2 * s, backgroundColor: AMBER }), sp2]} />
      </Animated.View>
      <FlameRow s={s} y={70} xs={[36, 46, 56]} />
      <View style={box(s, 20, 84, 52, 3.5, { borderRadius: 2 * s, backgroundColor: '#9AA7BA', opacity: 0.5 })} />
    </>
  );
}

/** Three flickering flames, each on its own little loop. */
function FlameRow({ s, y, xs }: { s: number; y: number; xs: number[] }) {
  return (
    <View style={box(s, 0, y - 84, 100, 100)}>
      {xs.map((x, i) => (
        <LoopFlame key={i} x={x} s={s} i={i} />
      ))}
    </View>
  );
}
function LoopFlame({ x, s, i }: { x: number; s: number; i: number }) {
  const f = useSharedValue(1);
  useEffect(() => {
    f.value = withRepeat(withTiming(0.82, { duration: 230 + i * 50, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(f);
  }, [f, i]);
  return <Flame f={f} x={x} s={s} />;
}

/* ---------- Oven: something rising behind a glowing door ---------- */
function Oven({ p, s }: Scene) {
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + Math.sin(p.value * Math.PI * 2) * 0.2 }));
  const light = useAnimatedStyle(() => ({ opacity: 0.5 + Math.sin(p.value * Math.PI * 2) * 0.5 }));
  const bun = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.82 + Math.sin(p.value * Math.PI) * 0.18 }, { scaleX: 1 + Math.sin(p.value * Math.PI) * 0.06 }] }));
  return (
    <>
      <View style={box(s, 12, 20, 76, 68, { borderRadius: 8 * s, backgroundColor: NAVY_LIGHT })} />
      <View style={box(s, 12, 20, 76, 14, { borderTopLeftRadius: 8 * s, borderTopRightRadius: 8 * s, backgroundColor: NAVY })} />
      {[22, 32, 42].map((x) => (
        <View key={x} style={box(s, x, 24, 6, 6, { borderRadius: 3 * s, backgroundColor: '#9AA7BA' })} />
      ))}
      <Animated.View style={[box(s, 74, 24, 6, 6, { borderRadius: 3 * s, backgroundColor: ORANGE }), light]} />
      <View style={box(s, 22, 37, 56, 3, { borderRadius: 2 * s, backgroundColor: STEEL })} />
      <View style={box(s, 20, 43, 60, 38, { borderRadius: 5 * s, backgroundColor: '#14213D', overflow: 'hidden' })}>
        <Animated.View style={[box(s, 0, 0, 60, 38, { backgroundColor: ORANGE }), glow]} />
        <View style={box(s, 10, 27, 40, 3, { borderRadius: 2 * s, backgroundColor: '#9AA7BA' })} />
        <Animated.View style={[box(s, 18, 15, 24, 12, { borderRadius: 8 * s, backgroundColor: CREAM, transformOrigin: '50% 100%' }), bun]}>
          <View style={box(s, 4, 1.5, 16, 5, { borderRadius: 4 * s, backgroundColor: '#E9B870', opacity: 0.8 })} />
        </Animated.View>
        <View style={box(s, 6, 33, 48, 2.5, { borderRadius: 2 * s, backgroundColor: ORANGE })} />
      </View>
    </>
  );
}

/* ---------- Grill: a steak flipping on the grate, smoke rising ---------- */
function Grill({ p, s, dark }: Scene) {
  const steak = useAnimatedStyle(() => {
    const t = p.value;
    const u = t < 0.55 ? 0 : Math.min(1, (t - 0.55) / 0.3);
    return { transform: [{ perspective: 300 }, { translateY: -Math.sin(u * Math.PI) * 14 * s }, { rotateX: `${u * 180}deg` }] };
  });
  const smokeColor = dark ? 'rgba(255,255,255,0.7)' : 'rgba(95,107,128,0.45)';
  return (
    <>
      <Smoke p={p} s={s} x={40} phase={0} color={smokeColor} />
      <Smoke p={p} s={s} x={58} phase={0.45} color={smokeColor} />
      <FlameRow s={s} y={62} xs={[30, 50, 70]} />
      {[58, 65, 72, 79].map((y) => (
        <View key={y} style={box(s, 10, y, 80, 3.5, { borderRadius: 2 * s, backgroundColor: dark ? '#55668A' : NAVY })} />
      ))}
      <Animated.View style={[box(s, 28, 42, 44, 18, { borderRadius: 9 * s, backgroundColor: MEAT }), steak]}>
        <View style={box(s, 10, -2, 4, 22, { backgroundColor: MEAT_DARK, transform: [{ rotate: '28deg' }], opacity: 0.8 })} />
        <View style={box(s, 24, -2, 4, 22, { backgroundColor: MEAT_DARK, transform: [{ rotate: '28deg' }], opacity: 0.8 })} />
        <View style={box(s, 2, 3, 40, 5, { borderRadius: 3 * s, backgroundColor: 'rgba(255,255,255,0.12)' })} />
      </Animated.View>
      <View style={box(s, 10, 82, 80, 4, { borderRadius: 2 * s, backgroundColor: dark ? '#55668A' : NAVY_LIGHT })} />
    </>
  );
}

function Smoke({ p, s, x, phase, color }: { p: SharedValue<number>; s: number; x: number; phase: number; color: string }) {
  const st = useAnimatedStyle(() => {
    const t = (p.value + phase) % 1;
    return { opacity: Math.sin(t * Math.PI) * 0.8, transform: [{ translateY: -t * 26 * s }, { translateX: Math.sin(t * Math.PI * 2) * 3 * s }, { scale: 0.5 + t * 0.8 }] };
  });
  return <Animated.View style={[box(s, x - 4, 30, 8, 14, { borderRadius: 99, backgroundColor: color }), st]} />;
}

/* ---------- Blend: blades spinning, jug shaking ---------- */
function Blend({ p, s }: Scene) {
  const jug = useAnimatedStyle(() => ({ transform: [{ translateX: Math.sin(p.value * Math.PI * 24) * 1.3 * s }] }));
  const blade = useAnimatedStyle(() => ({ transform: [{ rotate: `${p.value * 1080}deg` }] }));
  const surface = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + Math.sin(p.value * Math.PI * 8) * 0.06 }] }));
  const bubble = (x: number, phase: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const t = (p.value * 2 + phase) % 1;
      return { opacity: 0.8 - t * 0.8, transform: [{ translateY: -t * 20 * s }, { translateX: Math.sin(t * Math.PI * 3) * 2 * s }] };
    });
  const u1 = bubble(40, 0);
  const u2 = bubble(52, 0.4);
  const u3 = bubble(60, 0.7);
  return (
    <>
      <View style={box(s, 28, 72, 44, 20, { borderRadius: 6 * s, backgroundColor: NAVY })} />
      <View style={box(s, 44, 78, 12, 5, { borderRadius: 3 * s, backgroundColor: '#FF6A3D' })} />
      <Animated.View style={[box(s, 30, 12, 40, 62), jug]}>
        <View style={box(s, 0, 8, 40, 54, { borderBottomLeftRadius: 8 * s, borderBottomRightRadius: 8 * s, borderTopLeftRadius: 3 * s, borderTopRightRadius: 3 * s, backgroundColor: 'rgba(220,227,236,0.45)', borderWidth: 2 * s, borderColor: '#C9D3DF', overflow: 'hidden' })}>
          <View style={box(s, 0, 24, 40, 30, { backgroundColor: '#FF8FA3' })} />
          <Animated.View style={[box(s, 4, 21, 32, 7, { borderRadius: 99, backgroundColor: '#FFB3C0' }), surface]} />
          <Animated.View style={[box(s, 10, 46, 4, 4, { borderRadius: 2 * s, backgroundColor: '#FFE1E7' }), u1]} />
          <Animated.View style={[box(s, 20, 48, 3, 3, { borderRadius: 2 * s, backgroundColor: '#FFE1E7' }), u2]} />
          <Animated.View style={[box(s, 28, 44, 3.5, 3.5, { borderRadius: 2 * s, backgroundColor: '#FFE1E7' }), u3]} />
          <Animated.View style={[box(s, 12, 40, 16, 16), blade]}>
            <View style={box(s, 0, 6.5, 16, 3, { borderRadius: 2 * s, backgroundColor: STEEL })} />
            <View style={box(s, 6.5, 0, 3, 16, { borderRadius: 2 * s, backgroundColor: STEEL })} />
          </Animated.View>
        </View>
        <View style={box(s, 2, 2, 36, 8, { borderRadius: 3 * s, backgroundColor: NAVY })} />
        <View style={box(s, 15, 0, 10, 5, { borderRadius: 2 * s, backgroundColor: NAVY_LIGHT })} />
      </Animated.View>
    </>
  );
}

/* ---------- Rest / chill: a clock ticking ---------- */
function Wait({ p, s, accent, muted }: Scene) {
  const minute = useAnimatedStyle(() => ({ transform: [{ rotate: `${p.value * 360}deg` }] }));
  const hour = useAnimatedStyle(() => ({ transform: [{ rotate: `${120 + p.value * 30}deg` }] }));
  const zz = (phase: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const t = (p.value + phase) % 1;
      return { opacity: Math.sin(t * Math.PI) * 0.9, transform: [{ translateY: -t * 14 * s }, { translateX: t * 6 * s }, { scale: 0.7 + t * 0.5 }] };
    });
  const z1 = zz(0);
  const z2 = zz(0.5);
  return (
    <>
      <View style={box(s, 20, 22, 60, 60, { borderRadius: 30 * s, backgroundColor: '#FFFFFF', borderWidth: 5 * s, borderColor: NAVY })} />
      {[
        [48.5, 29, 3, 6],
        [48.5, 69, 3, 6],
        [27, 50.5, 6, 3],
        [67, 50.5, 6, 3],
      ].map(([x, y, w, h]) => (
        <View key={`${x}-${y}`} style={box(s, x, y, w, h, { borderRadius: 1.5 * s, backgroundColor: '#9AA7BA' })} />
      ))}
      <Animated.View style={[box(s, 48.25, 34, 3.5, 18, { borderRadius: 2 * s, backgroundColor: NAVY, transformOrigin: '50% 100%' }), hour]} />
      <Animated.View style={[box(s, 48.75, 29, 2.5, 23, { borderRadius: 2 * s, backgroundColor: accent, transformOrigin: '50% 100%' }), minute]} />
      <View style={box(s, 47, 49, 6, 6, { borderRadius: 3 * s, backgroundColor: accent })} />
      <Animated.Text style={[box(s, 74, 12, 16, 16), { fontSize: 14 * s, lineHeight: 16 * s, fontFamily: fonts.display, color: muted, textAlign: 'center' }, z1]}>z</Animated.Text>
      <Animated.Text style={[box(s, 84, 6, 12, 12), { fontSize: 10 * s, lineHeight: 12 * s, fontFamily: fonts.display, color: muted, textAlign: 'center' }, z2]}>z</Animated.Text>
    </>
  );
}

/* ---------- Serve: a plated dish with sparkles ---------- */
function Serve({ p, s, dark }: Scene) {
  const spark = (phase: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const t = (p.value + phase) % 1;
      const v = t < 0.5 ? Math.sin((t / 0.5) * Math.PI) : 0;
      return { opacity: v, transform: [{ scale: 0.3 + v * 0.9 }, { rotate: `${t * 90}deg` }] };
    });
  const k1 = spark(0);
  const k2 = spark(0.33);
  const k3 = spark(0.66);
  const steamColor = dark ? 'rgba(255,255,255,0.8)' : 'rgba(95,107,128,0.4)';
  return (
    <>
      <Smoke p={p} s={s} x={44} phase={0.1} color={steamColor} />
      <Smoke p={p} s={s} x={58} phase={0.6} color={steamColor} />
      {/* cutlery */}
      <View style={box(s, 6, 44, 4, 40, { borderRadius: 2 * s, backgroundColor: NAVY })} />
      {[2, 6, 10].map((x) => (
        <View key={x} style={box(s, x, 38, 2.5, 12, { borderRadius: 1 * s, backgroundColor: NAVY })} />
      ))}
      <View style={box(s, 91, 38, 4, 46, { borderRadius: 2 * s, backgroundColor: NAVY })} />
      <View style={box(s, 88, 38, 7, 22, { borderTopLeftRadius: 6 * s, borderBottomLeftRadius: 3 * s, backgroundColor: STEEL })} />
      {/* plate */}
      <View style={box(s, 14, 56, 72, 30, { borderRadius: 99, backgroundColor: '#FFFFFF', borderWidth: 3 * s, borderColor: '#C9D3DF' })} />
      <View style={box(s, 26, 63, 48, 16, { borderRadius: 99, backgroundColor: '#EDF1F6' })} />
      {/* food */}
      <View style={box(s, 34, 50, 32, 20, { borderRadius: 12 * s, backgroundColor: '#FF6A3D' })} />
      <View style={box(s, 40, 46, 10, 6, { borderRadius: 3 * s, backgroundColor: GREEN, transform: [{ rotate: '-20deg' }] })} />
      <View style={box(s, 52, 48, 9, 5, { borderRadius: 3 * s, backgroundColor: GREEN, transform: [{ rotate: '25deg' }] })} />
      <View style={box(s, 44, 56, 6, 6, { borderRadius: 3 * s, backgroundColor: CREAM })} />
      <Spark s={s} x={22} y={30} st={k1} size={10} />
      <Spark s={s} x={70} y={24} st={k2} size={12} />
      <Spark s={s} x={48} y={18} st={k3} size={8} />
    </>
  );
}

function Spark({ s, x, y, st, size }: { s: number; x: number; y: number; st: object; size: number }) {
  return (
    <Animated.View style={[box(s, x, y, size, size), st]}>
      <View style={box(s, size / 2 - 1, 0, 2, size, { borderRadius: 1 * s, backgroundColor: AMBER })} />
      <View style={box(s, 0, size / 2 - 1, size, 2, { borderRadius: 1 * s, backgroundColor: AMBER })} />
    </Animated.View>
  );
}

const SCENES: Record<Exclude<StepKind, 'boil'>, { Comp: (sc: Scene) => React.JSX.Element; ms: number }> = {
  chop: { Comp: Chop, ms: 760 },
  mix: { Comp: Mix, ms: 1500 },
  saute: { Comp: Saute, ms: 1300 },
  oven: { Comp: Oven, ms: 2400 },
  grill: { Comp: Grill, ms: 2600 },
  blend: { Comp: Blend, ms: 900 },
  wait: { Comp: Wait, ms: 2400 },
  serve: { Comp: Serve, ms: 2100 },
};

export function StepArt({ kind, size = 96, style }: { kind: StepKind; size?: number; style?: ViewStyle }) {
  const { c, dark } = useTheme();
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  const s = size / 100;
  const ms = kind === 'boil' ? 0 : SCENES[kind].ms;

  useEffect(() => {
    cancelAnimation(p);
    p.value = 0;
    if (!reduced && ms) p.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [p, ms, reduced, kind]);

  if (kind === 'boil') return <CookingPot size={size} state={reduced ? 'paused' : 'running'} style={style} />;
  const { Comp } = SCENES[kind];
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Comp key={kind} p={p} s={s} dark={dark} accent={c.accent} muted={c.muted} />
    </View>
  );
}
