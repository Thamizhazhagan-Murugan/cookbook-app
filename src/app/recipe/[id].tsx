// Recipe guide: ingredients (scalable, tickable), method with one-tap timers, resume/clear cooking.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/Sheet';
import { TimerChips } from '@/components/TimerChips';
import { Button, Card, CheckRow, Chip, IconButton, Stepper, T } from '@/components/ui';
import { PHOTOS } from '@/data/photos';
import * as haptics from '@/lib/haptics';
import { ingredientLine } from '@/lib/quantities';
import { RECIPE_BY_ID, minsText } from '@/lib/recipes';
import { DAY_KEYS, SLOT_KEYS, type DayKey, type Macros, type SlotKey } from '@/lib/types';
import { DAY_LABELS, SLOT_LABELS, dayDate, todayKey, weekIdFor, weekRangeLabel } from '@/lib/week';
import { useStore } from '@/store/useStore';
import { radius, useTheme } from '@/theme';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = RECIPE_BY_ID[id];
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fav = useStore((s) => s.profile.favorites.includes(id));
  const progress = useStore((s) => s.profile.cooking[id]);
  const cookLog = useStore((s) => s.profile.cookLog);
  const weekId = useStore((s) => s.currentWeekId);
  const { toggleFavorite, saveCooking, clearCooking, addTimer, setMeal, showToast } = useStore();
  const [servings, setServings] = useState<number>(progress?.servings ?? r?.servings ?? 1);
  const [plan, setPlan] = useState(false);
  const [pDay, setPDay] = useState<DayKey>(todayKey());
  const [pSlot, setPSlot] = useState<SlotKey>('dinner');
  const [pWeek, setPWeek] = useState<string>(weekId);

  const cooked = useMemo(() => cookLog.filter((e) => e.recipeId === id), [cookLog, id]);
  if (!r) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <T>Recipe not found.</T>
      </View>
    );
  }
  const base = r.servings || 0;
  const f = base ? servings / base : 1;
  const ticks = progress?.ticks || {};
  const tick = (k: string) => {
    saveCooking({ recipeId: r.id, step: progress?.step ?? 0, servings, startedAt: progress?.startedAt ?? Date.now(), updatedAt: Date.now(), ticks: { ...ticks, [k]: !ticks[k] } });
  };
  const photoH = r.book === 'cookbook' ? Math.round(width * 0.56) : Math.round(width * 0.75);
  const macroRow = (m: Macros) => (
    <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
      {(
        [
          ['calories', 'kcal'],
          ['protein', 'g protein'],
          ['carbs', 'g carbs'],
          ['fat', 'g fat'],
        ] as const
      ).map(([k, label]) =>
        m[k] != null ? (
          <T key={k} v="small" color="muted">
            <T v="num" style={{ fontSize: 18 }}>
              {Math.round(m[k]!)}
            </T>
            {label}
          </T>
        ) : null
      )}
      {m.variant ? (
        <T v="small" color="muted">
          {m.variant}
        </T>
      ) : null}
    </View>
  );
  const t = r.time;

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: photoH, backgroundColor: c.surface2 }}>
          <Image source={PHOTOS[r.id]} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <View style={[styles.topBar, { top: insets.top + 6 }]}>
            <IconButton icon="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/recipes'))} bg="rgba(255,255,255,0.9)" color="#111" accessibilityLabel="Back" />
            <View style={{ flex: 1 }} />
            <IconButton icon={fav ? 'heart' : 'heart-outline'} onPress={() => toggleFavorite(r.id)} bg="rgba(255,255,255,0.9)" color={fav ? '#C2362B' : '#111'} accessibilityLabel="Favourite" />
          </View>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          <View>
            <T v="h1">{r.title}</T>
            <T v="small" color="muted" style={{ marginTop: 4 }}>
              {r.book_name}, page {r.page}
              {r.is_protein_prep ? ' · meal-prep protein' : ''}
              {cooked.length ? ` · cooked ${cooked.length}×` : ''}
            </T>
            {r.description ? (
              <T v="body" style={{ marginTop: 8 }}>
                {r.description}
              </T>
            ) : null}
          </View>

          {/* facts */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.fact, { backgroundColor: c.yolkSoft, flex: 1.4 }]}>
              <T v="num">{minsText(t.total_min)}</T>
              <T v="tiny" style={{ opacity: 0.75 }}>
                {t.prep_min} prep · {t.cook_min} cook{t.passive_min ? ` · +${minsText(t.passive_min)} rest` : ''}
              </T>
            </View>
            <View style={[styles.fact, { backgroundColor: c.surface, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
              <T v="num">{base || '—'}</T>
              <T v="tiny" color="muted">
                {base ? 'servings' : 'servings n/a'}
              </T>
            </View>
            <View style={[styles.fact, { backgroundColor: c.surface, borderColor: c.line, borderWidth: StyleSheet.hairlineWidth }]}>
              <T v="num">{r.nIngredients}</T>
              <T v="tiny" color="muted">
                ingredients
              </T>
            </View>
          </View>
          {r.macro_variants?.length ? r.macro_variants.map((m, i) => <View key={i}>{macroRow(m)}</View>) : r.macros.calories != null ? macroRow(r.macros) : null}
          {r.macros.calories != null ? (
            <T v="tiny" color="muted" style={{ marginTop: -8 }}>
              per serving
            </T>
          ) : null}

          {/* actions */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button label="Add to plan" icon="calendar-outline" kind="primary" onPress={() => setPlan(true)} />
            {r.steps.length ? (
              progress ? (
                <>
                  <Button label={`Resume · step ${Math.min(progress.step + 1, r.steps.length)} of ${r.steps.length}`} icon="play" kind="yolk" onPress={() => router.push(`/cook/${r.id}`)} />
                  <Button
                    label="Clear"
                    icon="refresh"
                    kind="ghost"
                    onPress={() => {
                      clearCooking(r.id);
                      haptics.warn();
                      showToast('Progress cleared');
                    }}
                  />
                </>
              ) : (
                <Button label="Start cooking" icon="flame" kind="yolk" onPress={() => router.push(`/cook/${r.id}`)} />
              )
            ) : null}
          </View>

          {/* ingredients */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <T v="h2" style={{ flex: 1 }}>
                Ingredients
              </T>
              {base ? <Stepper compact value={servings} onChange={setServings} format={(n) => `${n} serving${n === 1 ? '' : 's'}`} /> : null}
            </View>
            {f !== 1 ? (
              <T v="tiny" color="basil" style={{ marginBottom: 6 }}>
                Scaled to {servings} servings — the book makes {base}.
              </T>
            ) : r.servings_text ? (
              <T v="tiny" color="muted" style={{ marginBottom: 6 }}>
                {r.servings_text}
              </T>
            ) : null}
            {r.ingredients.map((g, gi) => (
              <View key={gi} style={{ marginTop: gi ? 10 : 0 }}>
                {g.name ? (
                  <T v="smallSemi" color="muted" style={{ marginBottom: 2 }}>
                    {g.name}
                  </T>
                ) : null}
                {g.items.map((ing, ii) => {
                  const k = `${gi}.${ii}`;
                  return (
                    <CheckRow key={k} checked={!!ticks[k]} onToggle={() => tick(k)}>
                      <T v="body" style={{ textDecorationLine: ticks[k] ? 'line-through' : 'none', color: ticks[k] ? c.muted : c.ink, fontSize: 15, lineHeight: 20 }}>
                        {ingredientLine(ing, f)}
                      </T>
                    </CheckRow>
                  );
                })}
              </View>
            ))}
            {Object.values(ticks).some(Boolean) ? (
              <T v="tiny" color="muted" style={{ marginTop: 8 }}>
                Ticks are saved — they come back when you resume. Clear with the button above.
              </T>
            ) : null}
          </Card>

          {/* method */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <T v="h2">Method</T>
              {r.steps.length ? (
                <T v="small" color="muted">
                  {r.steps.length} steps · tap a time to start a timer
                </T>
              ) : null}
            </View>
            {r.steps.length ? (
              r.steps.map((s, i) => (
                <View key={s.n} style={[styles.step, { borderTopColor: c.line, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, opacity: progress && i < progress.step ? 0.55 : 1 }]}>
                  <T v="num" color="basil" style={{ width: 34 }}>
                    {s.n}
                  </T>
                  <View style={{ flex: 1 }}>
                    {s.title ? (
                      <T v="h3" style={{ marginBottom: 2 }}>
                        {s.title}
                      </T>
                    ) : null}
                    <T v="body">{s.text}</T>
                    <TimerChips text={s.text} onStart={(secs, label) => { addTimer(secs, `Step ${s.n} · ${label}`, r.title); haptics.success(); showToast('Timer started'); }} />
                  </View>
                </View>
              ))
            ) : (
              <T v="body" color="muted">
                The book lists only the ingredients for this one — blend or combine them and you&apos;re done.
              </T>
            )}
          </View>

          {r.notes.length ? (
            <Card>
              <T v="h3" style={{ marginBottom: 4 }}>
                Notes from the book
              </T>
              {r.notes.map((n, i) => (
                <T key={i} v="small" style={{ marginTop: 4 }}>
                  {n}
                </T>
              ))}
            </Card>
          ) : null}
          {r.extra_sections.map((s) => (
            <Card key={s.title}>
              <T v="h3" style={{ marginBottom: 4 }}>
                {s.title}
              </T>
              {s.items.map((n, i) => (
                <T key={i} v="small" style={{ marginTop: 4 }}>
                  {i ? '• ' : ''}
                  {n}
                </T>
              ))}
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* add to plan sheet */}
      <Sheet open={plan} onClose={() => setPlan(false)} title="Add to plan">
        <View style={{ gap: 12, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T v="h3" style={{ flex: 1 }}>
              {pWeek === weekIdFor() ? 'This week' : pWeek === weekId ? 'Selected week' : 'Week'} · {weekRangeLabel(pWeek)}
            </T>
            <Chip label={pWeek === weekIdFor() ? 'Next week' : 'This week'} onPress={() => setPWeek(pWeek === weekIdFor() ? (() => { const d = new Date(); d.setDate(d.getDate() + 7); return weekIdFor(d); })() : weekIdFor())} />
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {DAY_KEYS.map((d) => (
              <Chip key={d} label={`${DAY_LABELS[d]} ${dayDate(pWeek, d).getDate()}`} on={pDay === d} onPress={() => setPDay(d)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {SLOT_KEYS.map((s) => (
              <Chip key={s} label={SLOT_LABELS[s]} on={pSlot === s} onPress={() => setPSlot(s)} tone="basil" />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T v="body" style={{ flex: 1 }}>
              Servings for that meal
            </T>
            <Stepper compact value={Math.max(1, Math.min(servings, 40))} onChange={setServings} />
          </View>
          <Button
            label={`Add to ${DAY_LABELS[pDay]} ${SLOT_LABELS[pSlot].toLowerCase()}`}
            kind="primary"
            onPress={() => {
              setMeal(pWeek, pDay, pSlot, { recipeId: r.id, servings: Math.max(1, servings) });
              setPlan(false);
              haptics.success();
              showToast(`Added to ${DAY_LABELS[pDay]} ${SLOT_LABELS[pSlot].toLowerCase()}`, { label: 'See plan', href: '/' });
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center' },
  fact: { flex: 1, padding: 10, borderRadius: radius.sm, gap: 2 },
  step: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
});
