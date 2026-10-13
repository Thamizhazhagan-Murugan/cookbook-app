import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { timersIn } from '@/lib/timers';
import { fonts, radius, useTheme } from '@/theme';
import { Press, T } from './ui';

/** One-tap timer buttons for every duration mentioned in a step. */
export function TimerChips({ text, onStart, big }: { text: string; onStart: (secs: number, label: string) => void; big?: boolean }) {
  const { c } = useTheme();
  const hints = timersIn(text);
  if (!hints.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {hints.map((h, i) => (
        <Press key={i} haptic="select" onPress={() => onStart(h.secs, h.label)} style={[styles.chip, { backgroundColor: c.highlightSoft, borderColor: c.highlight, height: big ? 40 : 32, paddingHorizontal: big ? 14 : 10 }]} accessibilityLabel={`Start a ${h.label} timer`}>
          <Ionicons name="timer-outline" size={big ? 18 : 15} color={c.ink} />
          <T v="tiny" style={{ fontFamily: fonts.bodyBold, fontSize: big ? 15 : 13 }}>
            {h.label}
          </T>
        </Press>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, borderWidth: 1 },
});
