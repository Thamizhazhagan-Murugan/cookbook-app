// Smart picker: choose a recipe for a day/slot, ranked by how little new shopping it needs.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeRow } from '@/components/RecipeCard';
import { Chip, IconButton, SearchBar, T } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { CATEGORIES, RECIPES, filterRecipes, type Category } from '@/lib/recipes';
import { coverage, explain, rankSuggestions, type Suggestion } from '@/lib/suggest';
import type { DayKey, SlotKey } from '@/lib/types';
import { DAY_LONG, SLOT_LABELS, servingsByRecipe } from '@/lib/week';
import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';

type Mode = 'smart' | 'all' | 'fav';

export default function PickScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ week: string; day: DayKey; slot: SlotKey }>();
  const weekId = params.week;
  const day = params.day;
  const slot = params.slot;
  const week = useStore((s) => s.weeks[weekId]);
  const pantry = useStore((s) => s.profile.pantry);
  const favorites = useStore((s) => s.profile.favorites);
  const setMeal = useStore((s) => s.setMeal);
  const showToast = useStore((s) => s.showToast);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category>('All');
  const planned = Object.keys(servingsByRecipe(week));
  const [mode, setMode] = useState<Mode>(planned.length || Object.keys(pantry).length ? 'smart' : 'all');

  const cov = useMemo(() => coverage(week, pantry), [week, pantry]);
  const list: Suggestion[] = useMemo(() => {
    const base = filterRecipes({ query: q, category: cat, onlyIds: mode === 'fav' ? new Set(favorites) : null, sort: mode === 'all' ? 'book' : 'book' });
    if (mode === 'smart') return rankSuggestions(cov, { candidates: base });
    return base.map((r) => ({ recipe: r, newItems: [], reusedKeys: [], newCost: 0, reuseRatio: 0, score: 0 }));
  }, [q, cat, mode, favorites, cov]);

  const choose = (s: Suggestion) => {
    const current = week?.days[day]?.[slot];
    setMeal(weekId, day, slot, { recipeId: s.recipe.id, servings: current?.servings ?? 1 });
    haptics.success();
    const ex = mode === 'smart' ? explain(s) : null;
    showToast(ex ? `${s.recipe.title} · ${ex.headline.toLowerCase()}` : `Added ${s.recipe.title}`);
    router.back();
  };

  const toneColor = (tone: ReturnType<typeof explain>['tone']) => (tone === 'great' ? c.basil : tone === 'good' ? c.basil : tone === 'ok' ? c.muted : c.muted);

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: insets.top + 8 }}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T v="h1">Pick {SLOT_LABELS[slot]?.toLowerCase() ?? 'a meal'}</T>
          <T v="small" color="muted">
            for {DAY_LONG[day] ?? 'this day'}
          </T>
        </View>
        <IconButton icon="close" onPress={() => router.back()} accessibilityLabel="Close" />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search recipes or ingredients" />
        <View style={[styles.seg, { backgroundColor: c.surface2 }]}>
          {(
            [
              ['smart', 'Least to buy'],
              ['all', 'All'],
              ['fav', 'Favourites'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <Chip key={m} label={label} on={mode === m} onPress={() => setMode(m)} tone="ink" />
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((x) => (
            <Chip key={x} label={x} on={cat === x} onPress={() => setCat(x)} />
          ))}
        </ScrollView>
        {mode === 'smart' ? (
          <T v="small" color="muted">
            {planned.length || Object.keys(pantry).length
              ? `Sorted by how many ingredients each recipe shares with ${planned.length ? "this week's plan" : 'your pantry'}${planned.length && Object.keys(pantry).length ? ' and pantry' : ''}.`
              : 'Nothing planned yet, so every recipe needs a full shop — sorted by fewest ingredients.'}
          </T>
        ) : null}
      </View>
      <FlatList
        data={list}
        keyExtractor={(s) => s.recipe.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        renderItem={({ item: s }) => {
          const already = planned.includes(s.recipe.id);
          const ex = mode === 'smart' ? (already ? { ...explain(s), headline: 'Already planned — repeat it', tone: 'great' as const } : explain(s)) : null;
          return (
            <RecipeRow
              recipe={s.recipe}
              onPress={() => choose(s)}
              badge={
                ex ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={[styles.dot, { backgroundColor: ex.tone === 'none' ? c.line : toneColor(ex.tone) }]} />
                    <T v="tiny" numberOfLines={2} style={{ flex: 1, color: ex.tone === 'none' ? c.muted : c.ink, fontFamily: ex.tone === 'great' ? fonts.bodyBold : fonts.bodyMedium }}>
                      {ex.headline}
                      <T v="tiny" color="muted">
                        {' '}
                        · {ex.detail}
                      </T>
                    </T>
                  </View>
                ) : already ? (
                  <T v="tiny" color="basil" style={{ marginTop: 2 }}>
                    Already in this week
                  </T>
                ) : undefined
              }
              right={<Ionicons name="add-circle" size={28} color={c.basil} />}
            />
          );
        }}
        ListEmptyComponent={
          <T v="small" color="muted" style={{ textAlign: 'center', marginTop: 30 }}>
            No recipes match.
          </T>
        }
      />
      <T v="tiny" color="muted" style={{ textAlign: 'center', paddingBottom: insets.bottom + 6 }}>
        {RECIPES.length} recipes
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  seg: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
