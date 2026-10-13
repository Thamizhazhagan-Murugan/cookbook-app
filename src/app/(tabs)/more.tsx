// Pantry & more: pantry, past weeks, favourites, cook history, meal slots, cloud sync status.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeRow } from '@/components/RecipeCard';
import { AccountCard } from '@/components/AccountCard';
import { Card, Chip, Press, T } from '@/components/ui';
import { RECIPE_BY_ID } from '@/lib/recipes';
import { SLOT_KEYS, type SlotKey } from '@/lib/types';
import { SLOT_LABELS, countMeals } from '@/lib/week';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function RowLink({ icon, title, sub, onPress, last }: { icon: IconName; title: string; sub?: string; onPress: () => void; last?: boolean }) {
  const { c } = useTheme();
  return (
    <Press haptic="select" onPress={onPress} style={[styles.row, { borderBottomColor: c.line, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      <View style={[styles.icon, { backgroundColor: c.basilSoft }]}>
        <Ionicons name={icon} size={20} color={c.basil} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="bodySemi">{title}</T>
        {sub ? (
          <T v="small" color="muted">
            {sub}
          </T>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Press>
  );
}

export default function MoreScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const pantry = useStore((s) => s.profile.pantry);
  const favorites = useStore((s) => s.profile.favorites);
  const cookLog = useStore((s) => s.profile.cookLog);
  const cooking = useStore((s) => s.profile.cooking);
  const weeks = useStore((s) => s.weeks);
  const slots = useStore((s) => s.profile.settings.slots);
  const setSlots = useStore((s) => s.setSlots);
  const pastWeeks = Object.values(weeks).filter((w) => countMeals(w) > 0).length;
  const inProgress = Object.values(cooking).sort((a, b) => b.updatedAt - a.updatedAt);
  const recent = cookLog.slice(0, 5);

  return (
    <ScrollView style={{ backgroundColor: c.canvas }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 120, gap: 16 }}>
      <T v="display">Pantry & more</T>

      <Card pad={false} style={{ paddingHorizontal: 14 }}>
        <RowLink icon="file-tray-full-outline" title="Pantry" sub={`${Object.keys(pantry).length} item${Object.keys(pantry).length === 1 ? '' : 's'} you already have — skipped on grocery lists`} onPress={() => router.push('/pantry')} />
        <RowLink icon="time-outline" title="Past weeks" sub={`${pastWeeks} planned week${pastWeeks === 1 ? '' : 's'} saved`} onPress={() => router.push('/history')} />
        <RowLink icon="heart-outline" title="Favourites" sub={`${favorites.length} recipe${favorites.length === 1 ? '' : 's'}`} onPress={() => router.push('/recipes')} last />
      </Card>

      {inProgress.length ? (
        <View>
          <T v="h2" style={{ marginBottom: 8 }}>
            Cooking in progress
          </T>
          <View style={{ gap: 8 }}>
            {inProgress.map((p) => {
              const r = RECIPE_BY_ID[p.recipeId];
              if (!r) return null;
              return <RecipeRow key={p.recipeId} recipe={r} onPress={() => router.push(`/cook/${r.id}`)} sub={<T v="tiny" color="basil">Resume at step {Math.min(p.step + 1, r.steps.length)} of {r.steps.length}</T>} right={<Ionicons name="play-circle" size={28} color={c.yolk} />} />;
            })}
          </View>
        </View>
      ) : null}

      {recent.length ? (
        <View>
          <T v="h2" style={{ marginBottom: 8 }}>
            Recently cooked
          </T>
          <View style={{ gap: 8 }}>
            {recent.map((e, i) => {
              const r = RECIPE_BY_ID[e.recipeId];
              if (!r) return null;
              return <RecipeRow key={`${e.recipeId}-${i}`} recipe={r} onPress={() => router.push(`/recipe/${r.id}`)} sub={<T v="tiny" color="muted">{new Date(e.cookedAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</T>} />;
            })}
          </View>
        </View>
      ) : null}

      <View>
        <T v="h2" style={{ marginBottom: 4 }}>
          Meals shown per day
        </T>
        <T v="small" color="muted" style={{ marginBottom: 8 }}>
          Pick which slots appear on the plan.
        </T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {SLOT_KEYS.map((s: SlotKey) => (
            <Chip key={s} label={SLOT_LABELS[s]} on={slots.includes(s)} tone="basil" onPress={() => setSlots(slots.includes(s) ? (slots.length > 1 ? slots.filter((x) => x !== s) : slots) : SLOT_KEYS.filter((x) => slots.includes(x) || x === s))} />
          ))}
        </View>
      </View>

      <AccountCard />

      <T v="tiny" color="muted">
        Recipes from The Meal Prep Cookbook and Jalal&apos;s Cookbook by Jalal Sameja, for personal use. Cooking times are estimated from the steps.
      </T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
