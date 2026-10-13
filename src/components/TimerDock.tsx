// Floating kitchen timers. Lives above the tab bar on every screen and inside cook mode.
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, Vibration } from 'react-native';

import { clockText } from '@/lib/timers';
import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';
import { CookingPot, type PotState } from './CookingPot';
import { Press, T } from './ui';

/** Ticks all timers once a second; vibrates when one finishes. Mount once at the root. */
export function useTimerTicker() {
  const tick = useStore((s) => s.tickTimers);
  useEffect(() => {
    const h = setInterval(() => {
      if (tick()) {
        if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400, 200, 800]);
      }
    }, 500);
    return () => clearInterval(h);
  }, [tick]);
}

function useNow(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const h = setInterval(() => setN((n) => n + 1), 500);
    return () => clearInterval(h);
  }, [active]);
}

const potState = (t: { running: boolean; done: boolean }): PotState => (t.done ? 'done' : t.running ? 'running' : 'paused');

/**
 * `stove` (cook mode): one big animated pot sits beside the timer pills.
 * Otherwise each pill carries its own mini pot.
 */
export function TimerDock({ bottom = 0, stove = false }: { bottom?: number; stove?: boolean }) {
  const timers = useStore((s) => s.timers);
  const toggle = useStore((s) => s.toggleTimer);
  const plus = useStore((s) => s.addMinute);
  const remove = useStore((s) => s.removeTimer);
  const { c } = useTheme();
  useNow(timers.length > 0);
  if (!timers.length) return null;
  const overall: PotState = timers.some((t) => t.running) ? 'running' : timers.some((t) => t.done) ? 'done' : 'paused';
  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center' }}>
        {stove ? <CookingPot size={84} state={overall} style={{ marginLeft: 8, marginRight: -4 }} /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }} style={{ flex: 1 }}>
          {timers.map((t) => {
            const rem = t.done ? 0 : t.running ? Math.max(0, Math.round((t.endAt - Date.now()) / 1000)) : t.remaining;
            return (
              <View
                key={t.id}
                style={[
                  styles.pill,
                  {
                    backgroundColor: t.done ? c.danger : c.highlight,
                    shadowColor: c.shadow,
                    paddingLeft: stove ? 14 : 8,
                  },
                ]}
              >
                {!stove ? <CookingPot size={38} state={potState(t)} style={{ marginRight: -2 }} /> : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T
                    v="tiny"
                    numberOfLines={1}
                    style={{
                      color: t.done ? '#fff' : c.highlightInk,
                      fontFamily: fonts.bodySemi,
                    }}
                  >
                    {t.done ? 'Done!' : t.label}
                  </T>
                  <T
                    v="tiny"
                    numberOfLines={1}
                    style={{
                      color: t.done ? 'rgba(255,255,255,0.8)' : c.highlightInk,
                      opacity: 0.7,
                    }}
                  >
                    {t.sub}
                  </T>
                </View>
                <T
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 22,
                    color: t.done ? '#fff' : c.highlightInk,
                    opacity: !t.running && !t.done ? 0.55 : 1,
                    minWidth: 60,
                    textAlign: 'right',
                  }}
                >
                  {clockText(rem)}
                </T>
                {!t.done ? (
                  <Press onPress={() => toggle(t.id)} style={styles.rb} accessibilityLabel={t.running ? 'Pause' : 'Resume'}>
                    <Ionicons name={t.running ? 'pause' : 'play'} size={16} color={c.highlightInk} />
                  </Press>
                ) : null}
                <Press onPress={() => plus(t.id)} style={styles.rb} accessibilityLabel="Add one minute">
                  <Ionicons name="add" size={18} color={t.done ? '#fff' : c.highlightInk} />
                </Press>
                <Press onPress={() => remove(t.id)} style={styles.rb} accessibilityLabel="Dismiss timer">
                  <Ionicons name="close" size={18} color={t.done ? '#fff' : c.highlightInk} />
                </Press>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingVertical: 8,
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minWidth: 230,
    maxWidth: 340,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  rb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
