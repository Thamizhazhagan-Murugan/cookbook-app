// Cook mode: one step at a time, big type, timers, screen stays awake. Progress is saved on
// every step so you can leave and resume later.
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/Sheet';
import { StepArt } from '@/components/StepArt';
import { TimerChips } from '@/components/TimerChips';
import { TimerDock } from '@/components/TimerDock';
import { Button, CheckRow, IconButton, T } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { ingredientLine } from '@/lib/quantities';
import { RECIPE_BY_ID } from '@/lib/recipes';
import { STEP_KIND_LABEL, stepKind } from '@/lib/steps';
import { useStore } from '@/store/useStore';
import { fonts, useTheme } from '@/theme';

function useKeepScreenOn() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync('cook').catch(() => {});
    return () => {
      deactivateKeepAwake('cook').catch(() => {});
    };
  }, []);
}

export default function CookScreen() {
  useKeepScreenOn();
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = RECIPE_BY_ID[id];
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useStore((s) => s.profile.cooking[id]);
  const { saveCooking, logCook, addTimer, showToast } = useStore();
  const [idx, setIdx] = useState(progress?.step ?? 0);
  const [sheet, setSheet] = useState(false);
  const servings = progress?.servings ?? r?.servings ?? 1;

  useEffect(() => {
    if (!r) return;
    saveCooking({ recipeId: r.id, step: idx, servings, startedAt: progress?.startedAt ?? Date.now(), updatedAt: Date.now(), ticks: progress?.ticks ?? {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!r || !r.steps.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <T>No steps for this recipe.</T>
        <Button label="Close" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </View>
    );
  }
  const n = r.steps.length;
  const s = r.steps[Math.min(idx, n - 1)];
  const last = idx >= n - 1;
  const kind = stepKind(s, idx, n);
  const f = r.servings ? servings / r.servings : 1;
  const ticks = progress?.ticks ?? {};
  const tick = (k: string) => saveCooking({ recipeId: r.id, step: idx, servings, startedAt: progress?.startedAt ?? Date.now(), updatedAt: Date.now(), ticks: { ...ticks, [k]: !ticks[k] } });

  const finish = () => {
    logCook(r.id);
    haptics.success();
    showToast('Logged — enjoy!');
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: insets.top }}>
      <View style={[styles.head, { backgroundColor: c.surface, borderBottomColor: c.line }]}>
        <T v="h3" numberOfLines={1} style={{ flex: 1 }}>
          {r.title}
        </T>
        <IconButton icon="list" onPress={() => setSheet(true)} accessibilityLabel="Ingredients" />
        <IconButton icon="close" onPress={() => router.back()} accessibilityLabel="Leave cook mode (progress is saved)" />
      </View>
      <View style={{ height: 4, backgroundColor: c.line }}>
        <View style={{ height: 4, width: `${((idx + 1) / n) * 100}%`, backgroundColor: c.accent }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 160, gap: 10 }}>
        <Animated.View key={idx} entering={FadeIn.duration(160)} exiting={FadeOut.duration(100)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <StepArt kind={kind} size={108} style={{ marginLeft: -6 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="smallSemi" color="accent">
                Step {s.n} of {n}
              </T>
              <T v="h1" style={{ marginTop: 2 }} numberOfLines={3}>
                {s.title || STEP_KIND_LABEL[kind]}
              </T>
              {s.title ? (
                <T v="small" color="muted" style={{ marginTop: 2 }}>
                  {STEP_KIND_LABEL[kind]}
                </T>
              ) : null}
            </View>
          </View>
          <T style={{ fontFamily: fonts.body, fontSize: 22, lineHeight: 32, marginTop: 10, color: c.ink }}>{s.text}</T>
          <TimerChips big text={s.text} onStart={(secs, label) => { addTimer(secs, `Step ${s.n} · ${label}`, r.title); haptics.success(); }} />
          {last && r.notes.length ? (
            <View style={{ marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: c.surface }}>
              <T v="h3">Notes from the book</T>
              {r.notes.map((x, i) => (
                <T key={i} v="small" style={{ marginTop: 6 }}>
                  {x}
                </T>
              ))}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <TimerDock bottom={insets.bottom + 78} stove />

      <View style={[styles.foot, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: insets.bottom + 12 }]}>
        <IconButton icon="chevron-back" size={52} onPress={() => { haptics.select(); setIdx((i) => Math.max(0, i - 1)); }} accessibilityLabel="Previous step" style={{ opacity: idx === 0 ? 0.35 : 1 }} />
        {last ? (
          <Button label="Done — enjoy" icon="checkmark" kind="primary" size="lg" style={{ flex: 1 }} onPress={finish} />
        ) : (
          <Button label="Next step" icon="chevron-forward" kind="primary" size="lg" style={{ flex: 1 }} onPress={() => { haptics.select(); setIdx((i) => Math.min(n - 1, i + 1)); }} />
        )}
      </View>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Ingredients">
        {r.ingredients.map((g, gi) => (
          <View key={gi} style={{ marginBottom: 10 }}>
            {g.name ? (
              <T v="smallSemi" color="muted" style={{ marginBottom: 2 }}>
                {g.name}
              </T>
            ) : null}
            {g.items.map((ing, ii) => {
              const k = `${gi}.${ii}`;
              return (
                <CheckRow key={k} checked={!!ticks[k]} onToggle={() => tick(k)}>
                  <T v="body" style={{ color: ticks[k] ? c.muted : c.ink, textDecorationLine: ticks[k] ? 'line-through' : 'none' }}>
                    {ingredientLine(ing, f)}
                  </T>
                </CheckRow>
              );
            })}
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8 }}>
          <Ionicons name="information-circle-outline" size={16} color={c.muted} />
          <T v="tiny" color="muted">
            Scaled to {servings} serving{servings === 1 ? '' : 's'}.
          </T>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
