// Past weeks: everything you planned before, with one-tap reuse.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Empty, IconButton, Press, T } from '@/components/ui';
import { PHOTOS } from '@/data/photos';
import * as haptics from '@/lib/haptics';
import { RECIPE_BY_ID } from '@/lib/recipes';
import { countMeals, mealsOf, weekIdFor, weekRangeLabel, weekRelativeLabel } from '@/lib/week';
import { useStore } from '@/store/useStore';
import { radius, useTheme } from '@/theme';

export default function HistoryScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const weeks = useStore((s) => s.weeks);
  const { selectWeek, copyWeek, showToast } = useStore();
  const list = useMemo(() => Object.values(weeks).filter((w) => countMeals(w) > 0).sort((a, b) => (a.id < b.id ? 1 : -1)), [weeks]);
  const current = weekIdFor();

  return (
    <ScrollView style={{ backgroundColor: c.canvas }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
        <T v="h1" style={{ flex: 1 }}>
          Past weeks
        </T>
      </View>
      {!list.length ? <Empty icon="time-outline" title="No weeks yet" body="Every week you plan is kept here, so you can reuse one that worked." /> : null}
      {list.map((w) => {
        const meals = mealsOf(w);
        const ids = [...new Set(meals.map((m) => m.recipeId))];
        const kcal = meals.reduce((a, m) => a + (RECIPE_BY_ID[m.recipeId]?.macros.calories || 0) * m.servings, 0);
        return (
          <Card key={w.id}>
            <Press haptic="select" onPress={() => { selectWeek(w.id); router.replace('/'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <T v="h3">
                  {weekRelativeLabel(w.id)} {weekRangeLabel(w.id)}
                </T>
                <T v="small" color="muted">
                  {meals.length} meal{meals.length === 1 ? '' : 's'} · {ids.length} recipe{ids.length === 1 ? '' : 's'}
                  {kcal ? ` · ${kcal.toLocaleString()} kcal total` : ''}
                  {w.finishedAt ? ' · shopped' : ''}
                </T>
              </View>
              <Ionicons name="open-outline" size={18} color={c.muted} />
            </Press>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {ids.slice(0, 7).map((id) => (
                <Press key={id} haptic="none" onPress={() => router.push(`/recipe/${id}`)}>
                  <Image source={PHOTOS[id]} style={styles.thumb} contentFit="cover" />
                </Press>
              ))}
              {ids.length > 7 ? (
                <View style={[styles.thumb, { backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                  <T v="tiny" color="muted">
                    +{ids.length - 7}
                  </T>
                </View>
              ) : null}
            </View>
            {w.id !== current ? (
              <Button
                label="Use for this week"
                icon="copy-outline"
                kind="soft"
                size="sm"
                style={{ alignSelf: 'flex-start', marginTop: 12 }}
                onPress={() => {
                  copyWeek(w.id, current);
                  selectWeek(current);
                  haptics.success();
                  showToast('Copied into this week', { label: 'See plan', href: '/' });
                }}
              />
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ thumb: { width: 52, height: 44, borderRadius: radius.sm, backgroundColor: '#ddd' } });
