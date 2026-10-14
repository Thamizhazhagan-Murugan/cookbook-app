// The step's scene on a card. When a timer belongs to this step, the card's background fills
// from left to right as the timer runs down — a progress bar behind the animation.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { StepKind } from '@/lib/steps';
import { clockText } from '@/lib/timers';
import type { Timer } from '@/lib/types';
import { fonts, radius, useTheme } from '@/theme';
import { StepArt } from './StepArt';
import { T } from './ui';

const PAD = 8;
const LABEL = 18;

/** Timers started from this step (labels look like "Step 3 · 5 min"), soonest to finish first. */
export function timersForStep(timers: Timer[], stepNo: number, recipeTitle: string): Timer[] {
  const prefix = `Step ${stepNo} ·`;
  return timers
    .filter((t) => t.sub === recipeTitle && t.label.startsWith(prefix))
    .sort((a, b) => {
      const ra = a.done ? -1 : a.running ? a.endAt - Date.now() : a.remaining * 1000;
      const rb = b.done ? -1 : b.running ? b.endAt - Date.now() : b.remaining * 1000;
      return ra - rb;
    });
}

function progressOf(t: Timer): number {
  const remainingMs = t.done ? 0 : t.running ? Math.max(0, t.endAt - Date.now()) : t.remaining * 1000;
  const totalMs = Math.max(t.total * 1000, remainingMs, 1);
  return Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
}

export function StepArtCard({ kind, size = 100, timer }: { kind: StepKind; size?: number; timer?: Timer }) {
  const { c, dark } = useTheme();
  const width = size + PAD * 2;
  const fill = useSharedValue(0);
  const [, bump] = useState(0);

  // Animate the fill: one linear run to 100% that lands exactly when the timer ends.
  useEffect(() => {
    cancelAnimation(fill);
    if (!timer) {
      fill.value = withTiming(0, { duration: 250 });
      return;
    }
    const p = progressOf(timer);
    fill.value = p * width;
    if (timer.running && !timer.done) {
      const ms = Math.max(0, timer.endAt - Date.now());
      fill.value = withTiming(width, { duration: ms, easing: Easing.linear });
    } else if (timer.done) {
      fill.value = withTiming(width, { duration: 300 });
    }
  }, [fill, width, timer?.id, timer?.running, timer?.done, timer?.endAt, timer?.remaining, timer?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render the countdown label once a second while running.
  useEffect(() => {
    if (!timer?.running) return;
    const h = setInterval(() => bump((n) => n + 1), 1000);
    return () => clearInterval(h);
  }, [timer?.running]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.value }));
  const remaining = !timer ? 0 : timer.done ? 0 : timer.running ? Math.max(0, Math.round((timer.endAt - Date.now()) / 1000)) : timer.remaining;
  const tone = timer?.done ? c.danger : c.highlight;

  return (
    <View style={[styles.card, { width, height: size + PAD * 2 + (timer ? LABEL : 0), backgroundColor: timer ? c.surface2 : 'transparent', borderColor: timer ? c.line : 'transparent' }]}>
      {timer ? <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: tone, opacity: dark ? 0.42 : 0.32 }, fillStyle]} /> : null}
      <StepArt kind={kind} size={size} style={{ margin: PAD }} />
      {timer ? (
        <View style={styles.label}>
          <T style={{ fontFamily: fonts.display, fontSize: 15, color: timer.done ? c.danger : c.ink }}>{timer.done ? 'Done!' : clockText(remaining)}</T>
          {!timer.running && !timer.done ? (
            <T v="tiny" color="muted">
              paused
            </T>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  label: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: -PAD + 2, height: LABEL },
});
