// Plan: the week at a glance — one card per day, a slot per meal.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeRow } from '@/components/RecipeCard';
import { Sheet } from '@/components/Sheet';
import { Button, Card, CheckRow, IconButton, Press, Stepper, T } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { RECIPE_BY_ID } from '@/lib/recipes';
import { DAY_KEYS, type DayKey, type SlotKey } from '@/lib/types';
import { DAY_LONG, SLOT_LABELS, dayDate, mealsOf, shiftWeek, todayKey, weekIdFor, weekRangeLabel, weekRelativeLabel } from '@/lib/week';
import { useGroceryList } from '@/store/selectors';
import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';

export default function PlanScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const weekId = useStore((s) => s.currentWeekId);
  const week = useStore((s) => s.weeks[weekId]);
  const weeks = useStore((s) => s.weeks);
  const slots = useStore((s) => s.profile.settings.slots);
  const { selectWeek, setMeal, setMealServings, repeatMeal, copyWeek, clearWeek, showToast } = useStore();
  const [menu, setMenu] = useState<{ day: DayKey; slot: SlotKey } | null>(null);
  const [repeatDays, setRepeatDays] = useState<DayKey[]>([]);
  const [more, setMore] = useState(false);

  const meals = mealsOf(week);
  const grocery = useGroceryList(weekId);
  const today = todayKey();
  const isCurrent = weekId === weekIdFor();
  const stats = useMemo(() => {
    const perDay: Record<string, number> = {};
    let servings = 0;
    for (const m of meals) {
      const r = RECIPE_BY_ID[m.recipeId];
      servings += m.servings;
      if (r?.macros.calories) perDay[m.day] = (perDay[m.day] || 0) + r.macros.calories * m.servings;
    }
    const days = Object.keys(perDay).length;
    const avg = days ? Math.round(Object.values(perDay).reduce((a, b) => a + b, 0) / days) : 0;
    return { servings, avg, toBuy: grocery.toBuy.length, have: grocery.have.length };
  }, [meals, grocery]);
  const lastWeekId = shiftWeek(weekId, -1);
  const canCopyLast = !meals.length && mealsOf(weeks[lastWeekId]).length > 0;
  const menuMeal = menu ? week?.days[menu.day]?.[menu.slot] : undefined;
  const menuRecipe = menuMeal ? RECIPE_BY_ID[menuMeal.recipeId] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* week switcher */}
        <View style={styles.weekRow}>
          <IconButton icon="chevron-back" onPress={() => selectWeek(shiftWeek(weekId, -1))} accessibilityLabel="Previous week" />
          <Press haptic="select" onPress={() => selectWeek(weekIdFor())} style={{ flex: 1, alignItems: 'center' }}>
            <T v="display" style={{ fontSize: 28, lineHeight: 32 }}>
              {weekRelativeLabel(weekId)}
            </T>
            <T v="small" color="muted">
              {weekRangeLabel(weekId)}
              {!isCurrent ? ' · tap for this week' : ''}
            </T>
          </Press>
          <IconButton icon="chevron-forward" onPress={() => selectWeek(shiftWeek(weekId, 1))} accessibilityLabel="Next week" />
        </View>

        {/* summary */}
        {meals.length ? (
          <Press haptic="none" onPress={() => router.push('/groceries')} style={[styles.summary, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={{ flex: 1 }}>
              <T v="bodySemi">
                {meals.length} meal{meals.length === 1 ? '' : 's'} · {stats.servings} serving{stats.servings === 1 ? '' : 's'}
              </T>
              <T v="small" color="muted">
                {stats.avg ? `≈ ${stats.avg.toLocaleString()} kcal per planned day · ` : ''}
                {stats.toBuy} to buy{stats.have ? `, ${stats.have} already in pantry` : ''}
              </T>
            </View>
            <Ionicons name="cart-outline" size={22} color={c.basil} />
          </Press>
        ) : (
          <Card style={{ marginBottom: 14 }}>
            <T v="h3">Nothing planned yet</T>
            <T v="small" color="muted" style={{ marginTop: 2 }}>
              Tap a meal below to pick a recipe. After the first one, the picker sorts recipes by how many ingredients they share with your plan, so one shop covers the week.
            </T>
            {canCopyLast ? (
              <Button
                label="Copy last week"
                icon="copy-outline"
                kind="soft"
                size="sm"
                style={{ alignSelf: 'flex-start', marginTop: 12 }}
                onPress={() => {
                  copyWeek(lastWeekId, weekId);
                  haptics.success();
                  showToast('Copied last week');
                }}
              />
            ) : null}
          </Card>
        )}

        {/* days */}
        {DAY_KEYS.map((day) => {
          const d = dayDate(weekId, day);
          const isToday = isCurrent && day === today;
          const plan = week?.days[day] || {};
          const shown = [...slots, ...(Object.keys(plan) as SlotKey[]).filter((s) => !slots.includes(s))];
          return (
            <Animated.View key={day} layout={LinearTransition} style={[styles.day, { backgroundColor: c.surface, borderColor: isToday ? c.yolk : c.line, borderWidth: isToday ? 2 : StyleSheet.hairlineWidth }]}>
              <View style={styles.dayHead}>
                <T v="h2">{DAY_LONG[day]}</T>
                <T v="small" color="muted">
                  {d.getDate()}
                </T>
                {isToday ? (
                  <View style={[styles.todayPill, { backgroundColor: c.yolk }]}>
                    <T v="tiny" color="yolkInk" style={{ fontFamily: fonts.bodyBold }}>
                      Today
                    </T>
                  </View>
                ) : null}
              </View>
              {shown
                .filter((slot) => plan[slot] && RECIPE_BY_ID[plan[slot]!.recipeId])
                .map((slot) => {
                  const meal = plan[slot]!;
                  const r = RECIPE_BY_ID[meal.recipeId];
                  return (
                    <View key={slot} style={{ marginBottom: 8 }}>
                      <T v="tiny" color="muted" style={{ marginBottom: 4, marginLeft: 2 }}>
                        {SLOT_LABELS[slot]}
                      </T>
                      <RecipeRow
                        recipe={r}
                        onPress={() => router.push(`/recipe/${r.id}`)}
                        sub={
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Stepper compact value={meal.servings} onChange={(n) => setMealServings(weekId, day, slot, n)} format={(n) => `${n} serving${n === 1 ? '' : 's'}`} />
                          </View>
                        }
                        right={<IconButton icon="ellipsis-horizontal" size={34} onPress={() => { setRepeatDays([]); setMenu({ day, slot }); }} accessibilityLabel="Meal options" />}
                      />
                    </View>
                  );
                })}
              {shown.some((slot) => !plan[slot]) ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                  {shown
                    .filter((slot) => !plan[slot])
                    .map((slot) => (
                      <Press key={slot} haptic="select" onPress={() => router.push({ pathname: '/pick', params: { week: weekId, day, slot } })} style={[styles.emptySlot, { borderColor: c.line }]}>
                        <Ionicons name="add" size={16} color={c.basil} />
                        <T v="smallSemi" color="basil">
                          {SLOT_LABELS[slot]}
                        </T>
                      </Press>
                    ))}
                </View>
              ) : null}
            </Animated.View>
          );
        })}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <Button label="Week options" icon="options-outline" kind="secondary" size="sm" onPress={() => setMore(true)} />
          <Button label="Grocery list" icon="cart-outline" kind="primary" size="sm" onPress={() => router.push('/groceries')} />
        </View>
      </ScrollView>

      {/* meal menu */}
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menuRecipe?.title}>
        {menu && menuMeal && menuRecipe ? (
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <T v="small" color="muted">
              {DAY_LONG[menu.day]} {SLOT_LABELS[menu.slot].toLowerCase()} · {menuMeal.servings} serving{menuMeal.servings === 1 ? '' : 's'}
            </T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button label="Open recipe" icon="book-outline" size="sm" onPress={() => { setMenu(null); router.push(`/recipe/${menuRecipe.id}`); }} />
              <Button label="Swap recipe" icon="swap-horizontal" size="sm" onPress={() => { setMenu(null); router.push({ pathname: '/pick', params: { week: weekId, day: menu.day, slot: menu.slot } }); }} />
              <Button label="Remove" icon="trash-outline" kind="danger" size="sm" onPress={() => { setMeal(weekId, menu.day, menu.slot, null); setMenu(null); }} />
            </View>
            <View>
              <T v="h3" style={{ marginBottom: 2 }}>
                Repeat for {SLOT_LABELS[menu.slot].toLowerCase()} on
              </T>
              <T v="small" color="muted" style={{ marginBottom: 6 }}>
                Meal-prep style: cook once, eat on several days. Servings add up on the grocery list.
              </T>
              {DAY_KEYS.filter((d) => d !== menu.day).map((d) => (
                <CheckRow key={d} checked={repeatDays.includes(d)} onToggle={() => setRepeatDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))}>
                  <T v="body">
                    {DAY_LONG[d]}
                    {week?.days[d]?.[menu.slot] ? (
                      <T v="small" color="muted">
                        {' '}
                        · replaces {RECIPE_BY_ID[week.days[d][menu.slot]!.recipeId]?.title}
                      </T>
                    ) : null}
                  </T>
                </CheckRow>
              ))}
              <Button
                label={repeatDays.length ? `Repeat on ${repeatDays.length} day${repeatDays.length === 1 ? '' : 's'}` : 'Pick days above'}
                kind="primary"
                disabled={!repeatDays.length}
                style={{ marginTop: 12 }}
                onPress={() => {
                  repeatMeal(weekId, menu, repeatDays);
                  haptics.success();
                  setMenu(null);
                  showToast(`Added to ${repeatDays.length} more day${repeatDays.length === 1 ? '' : 's'}`);
                }}
              />
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* week options */}
      <Sheet open={more} onClose={() => setMore(false)} title="Week options">
        <View style={{ gap: 10, paddingBottom: 8 }}>
          <Button
            label="Copy last week into this one"
            icon="copy-outline"
            onPress={() => {
              if (!mealsOf(weeks[lastWeekId]).length) return showToast('Last week is empty');
              copyWeek(lastWeekId, weekId);
              setMore(false);
              showToast('Copied last week');
            }}
          />
          <Button label="Copy this week to next week" icon="arrow-redo-outline" onPress={() => { copyWeek(weekId, shiftWeek(weekId, 1)); setMore(false); showToast('Next week planned'); }} />
          <Button label="Past weeks" icon="time-outline" onPress={() => { setMore(false); router.push('/history'); }} />
          <Button label="Clear this week" icon="trash-outline" kind="danger" onPress={() => { clearWeek(weekId); setMore(false); haptics.warn(); showToast('Week cleared'); }} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, marginBottom: 14 },
  day: { borderRadius: radius.md, padding: 12, marginBottom: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  todayPill: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  emptySlot: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.pill, paddingVertical: 7, paddingLeft: 10, paddingRight: 14 },
});
