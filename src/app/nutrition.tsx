// Nutrition: what a planned day gives you (one serving of each meal) against your daily targets,
// with the gaps explained — what to eat from the books and which supplement would cover it.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/Sheet';
import { Button, Card, Chip, Empty, IconButton, Press, SectionTitle, Stepper, T } from '@/components/ui';
import { PHOTOS } from '@/data/photos';
import * as haptics from '@/lib/haptics';
import { ACTIVITY, ADVICE, DEFAULT_BODY, GOALS, NUTRIENTS, NUTRIENT_BY_ID, addTo, assess, dayNutrition, fmtAmount, gaps, recipeNutrition, richRecipes, targetsFor, zero, type Assessment, type NutrientId } from '@/lib/nutrition';
import { RECIPE_BY_ID } from '@/lib/recipes';
import { DAY_KEYS, type BodyProfile, type DayKey } from '@/lib/types';
import { DAY_LABELS, DAY_LONG, dayDate, todayKey, weekIdFor, weekRangeLabel } from '@/lib/week';
import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';

type Pick = DayKey | 'avg';

export default function NutritionScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const weekId = useStore((s) => s.currentWeekId);
  const week = useStore((s) => s.weeks[weekId]);
  const body = useStore((s) => s.profile.settings.body);
  const setBody = useStore((s) => s.setBody);
  const [pick, setPick] = useState<Pick>(weekId === weekIdFor() ? todayKey() : 'mon');
  const [sheet, setSheet] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const targets = useMemo(() => targetsFor(body ?? DEFAULT_BODY), [body]);
  const days = useMemo(() => Object.fromEntries(DAY_KEYS.map((d) => [d, dayNutrition(week, d, RECIPE_BY_ID)])) as Record<DayKey, ReturnType<typeof dayNutrition>>, [week]);
  const current = useMemo(() => {
    if (pick !== 'avg') return days[pick];
    const planned = DAY_KEYS.filter((d) => days[d].meals > 0);
    const totals = zero();
    let matched = 0;
    let lines = 0;
    for (const d of planned) {
      addTo(totals, days[d].totals, 1 / Math.max(1, planned.length));
      matched += days[d].matched;
      lines += days[d].lines;
    }
    return { totals, meals: planned.length, matched, lines };
  }, [days, pick]);
  const result = useMemo(() => assess(current.totals, targets), [current, targets]);
  const missing = useMemo(() => gaps(result), [result]);
  const byId = Object.fromEntries(result.map((r) => [r.id, r])) as Record<NutrientId, Assessment>;
  const coverage = current.lines ? current.matched / current.lines : 1;

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
          <View style={{ flex: 1 }}>
            <T v="h1">Nutrition</T>
            <T v="small" color="muted">
              {weekRangeLabel(weekId)} · one serving of each planned meal
            </T>
          </View>
          <IconButton icon="body-outline" onPress={() => setSheet(true)} accessibilityLabel="Your targets" />
        </View>

        {/* day picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
          {DAY_KEYS.map((d) => (
            <Chip key={d} label={`${DAY_LABELS[d]} ${dayDate(weekId, d).getDate()}${days[d].meals ? '' : ' ·'}`} on={pick === d} onPress={() => setPick(d)} />
          ))}
          <Chip label="Week average" on={pick === 'avg'} onPress={() => setPick('avg')} />
        </ScrollView>

        {!body ? (
          <Card style={{ backgroundColor: c.accentSoft, borderColor: 'transparent' }}>
            <T v="h3">Set your targets</T>
            <T v="small" color="muted" style={{ marginTop: 2 }}>
              Right now this compares against an average adult. Add your sex, age, weight and activity for targets that fit you.
            </T>
            <Button label="Set up" icon="body-outline" kind="primary" size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => setSheet(true)} />
          </Card>
        ) : null}

        {current.meals === 0 ? (
          <Empty icon="nutrition-outline" title={pick === 'avg' ? 'Nothing planned this week' : `Nothing planned on ${DAY_LONG[pick as DayKey]}`} body="Add meals on the Plan tab and this screen fills in." action={<Button label="Go to plan" kind="primary" size="sm" onPress={() => router.replace('/')} />} />
        ) : (
          <>
            {/* macros */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['kcal', 'protein', 'carbs', 'fat'] as NutrientId[]).map((id) => (
                <MacroTile key={id} a={byId[id]} />
              ))}
            </View>
            <Card pad={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
              <NutrientRow a={byId.fibre} />
            </Card>

            {/* gaps */}
            <SectionTitle title={missing.length ? `${missing.length} thing${missing.length === 1 ? '' : 's'} to fix` : 'All targets covered'} sub={missing.length ? 'Under 80 % of your target, or over a limit' : 'Nice — this day covers everything tracked here.'} style={{ marginTop: 6 }} />
            {missing.map((a) => (
              <GapCard key={a.id} a={a} />
            ))}

            {/* everything */}
            <SectionTitle title="All nutrients" right={<Button label={showAll ? 'Hide' : 'Show'} kind="ghost" size="sm" onPress={() => setShowAll((v) => !v)} />} style={{ marginTop: 6 }} />
            {showAll ? (
              <>
                {(['vitamin', 'mineral', 'limit'] as const).map((group) => (
                  <Card key={group} pad={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
                    <T v="smallSemi" color="muted" style={{ marginTop: 10, marginBottom: 2 }}>
                      {group === 'vitamin' ? 'Vitamins' : group === 'mineral' ? 'Minerals' : 'Keep under'}
                    </T>
                    {NUTRIENTS.filter((n) => n.group === group).map((n) => (
                      <NutrientRow key={n.id} a={byId[n.id]} />
                    ))}
                  </Card>
                ))}
              </>
            ) : null}

            <T v="tiny" color="muted" style={{ marginTop: 8, lineHeight: 16 }}>
              Calories, protein, carbs and fat are the books&apos; figures. Vitamins and minerals are estimates from standard reference values for each ingredient
              {coverage < 0.95 ? ` (${Math.round(coverage * 100)} % of ingredient lines had an amount to work from)` : ''}. Targets follow Canadian/US dietary reference intakes.
              Supplement notes are general information, not medical advice — check with a pharmacist or doctor before starting anything, especially iron or vitamin A.
            </T>
          </>
        )}
      </ScrollView>

      <BodySheet open={sheet} onClose={() => setSheet(false)} body={body ?? DEFAULT_BODY} onSave={(b) => { setBody(b); setSheet(false); haptics.success(); }} />
    </View>
  );
}

/* ---------- pieces ---------- */

function tone(a: Assessment, c: ReturnType<typeof useTheme>['c']) {
  if (a.target.kind === 'max') return a.status === 'over' ? c.danger : c.highlight;
  return a.status === 'met' ? c.highlight : a.status === 'close' ? c.accent : c.danger;
}

function Bar({ a }: { a: Assessment }) {
  const { c } = useTheme();
  const w = Math.max(0, Math.min(1, a.pct));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${w * 100}%`, height: 6, backgroundColor: tone(a, c) }} />
    </View>
  );
}

function MacroTile({ a }: { a: Assessment }) {
  const { c } = useTheme();
  const m = NUTRIENT_BY_ID[a.id];
  return (
    <Card style={{ width: '48%', flexGrow: 1, padding: 12 }}>
      <T v="tiny" color="muted">
        {m.label}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <T style={{ fontFamily: fonts.display, fontSize: 24, color: c.ink }}>{Math.round(a.value).toLocaleString()}</T>
        <T v="tiny" color="muted">
          / {a.target.value.toLocaleString()} {m.unit}
        </T>
      </View>
      <View style={{ marginTop: 8 }}>
        <Bar a={a} />
      </View>
      <T v="tiny" style={{ marginTop: 5, color: tone(a, c), fontFamily: fonts.bodySemi }}>
        {Math.round(a.pct * 100)} %{a.status === 'met' ? ' · covered' : a.status === 'close' ? ' · close' : ' · low'}
      </T>
    </Card>
  );
}

function NutrientRow({ a }: { a: Assessment }) {
  const { c } = useTheme();
  const m = NUTRIENT_BY_ID[a.id];
  const over = a.target.kind === 'max';
  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T v="bodyMedium" style={{ flex: 1 }}>
          {m.label}
        </T>
        <T v="small" color="muted">
          {fmtAmount(a.id, a.value)} {over ? 'of max' : 'of'} {fmtAmount(a.id, a.target.value)}
        </T>
        <T v="smallSemi" style={{ color: tone(a, c), minWidth: 44, textAlign: 'right' }}>
          {Math.round(a.pct * 100)} %
        </T>
      </View>
      <View style={{ marginTop: 6 }}>
        <Bar a={a} />
      </View>
    </View>
  );
}

function GapCard({ a }: { a: Assessment }) {
  const { c } = useTheme();
  const m = NUTRIENT_BY_ID[a.id];
  const adv = ADVICE[a.id];
  const over = a.target.kind === 'max';
  const rich = over ? [] : richRecipes(a.id, 3);
  const short = over ? a.value - a.target.value : a.target.value - a.value;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: over ? c.dangerSoft : c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={over ? 'arrow-up' : 'arrow-down'} size={20} color={over ? c.danger : c.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="h3">{m.label}</T>
          <T v="small" color="muted">
            {fmtAmount(a.id, a.value)} {over ? 'vs a limit of' : 'of'} {fmtAmount(a.id, a.target.value)} · {over ? `${fmtAmount(a.id, short)} over` : `${fmtAmount(a.id, short)} short`}
          </T>
        </View>
        <T v="h2" style={{ color: tone(a, c) }}>
          {Math.round(a.pct * 100)}%
        </T>
      </View>
      <View style={{ marginTop: 10 }}>
        <Bar a={a} />
      </View>

      <T v="smallSemi" style={{ marginTop: 12 }}>
        {over ? 'Ease off' : 'Eat'}
      </T>
      <T v="small" color="muted">
        {adv.foods}
      </T>
      {rich.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
          {rich.map((r) => (
            <Press key={r.id} haptic="select" onPress={() => router.push(`/recipe/${r.id}`)} style={[styles.rich, { backgroundColor: c.surface2 }]}>
              <Image source={PHOTOS[r.id]} style={styles.richImg} contentFit="cover" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="tiny" numberOfLines={2} style={{ fontFamily: fonts.bodySemi }}>
                  {r.title}
                </T>
                <T v="tiny" color="muted">
                  {fmtAmount(a.id, recipeNutrition(r).perServing[a.id])} / serving
                </T>
              </View>
            </Press>
          ))}
        </ScrollView>
      ) : null}

      {!over ? (
        <>
          <T v="smallSemi" style={{ marginTop: 12 }}>
            Supplement
          </T>
          <T v="small" color="muted">
            {adv.supplement}
          </T>
        </>
      ) : null}
      {adv.caution ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'flex-start' }}>
          <Ionicons name="alert-circle-outline" size={16} color={c.danger} style={{ marginTop: 1 }} />
          <T v="tiny" style={{ flex: 1, color: c.danger }}>
            {adv.caution}
          </T>
        </View>
      ) : null}
    </Card>
  );
}

/* ---------- targets sheet ---------- */

function NumField({ label, value, unit, onChange, min, max }: { label: string; value: number; unit: string; onChange: (n: number) => void; min: number; max: number }) {
  const { c } = useTheme();
  const [text, setText] = useState(String(value));
  return (
    <View style={{ flex: 1 }}>
      <T v="tiny" color="muted" style={{ marginBottom: 4 }}>
        {label}
      </T>
      <View style={[styles.field, { borderColor: c.line, backgroundColor: c.surface }]}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            const n = parseFloat(t.replace(',', '.'));
            if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          keyboardType="numeric"
          style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: c.ink, paddingVertical: 0 }}
        />
        <T v="small" color="muted">
          {unit}
        </T>
      </View>
    </View>
  );
}

function BodySheet({ open, onClose, body, onSave }: { open: boolean; onClose: () => void; body: BodyProfile; onSave: (b: BodyProfile) => void }) {
  const { c } = useTheme();
  const [b, setB] = useState<BodyProfile>(body);
  const t = targetsFor(b);
  const upd = (p: Partial<BodyProfile>) => setB((x) => ({ ...x, ...p }));
  return (
    <Sheet open={open} onClose={onClose} title="Your daily targets">
      <T v="small" color="muted" style={{ marginBottom: 12 }}>
        Used only to size your targets. Stays on this device (and your account if you sign in).
      </T>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
        <Chip label="Male" on={b.sex === 'male'} onPress={() => upd({ sex: 'male' })} />
        <Chip label="Female" on={b.sex === 'female'} onPress={() => upd({ sex: 'female' })} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <NumField label="Age" value={b.age} unit="yrs" min={16} max={100} onChange={(age) => upd({ age })} />
        <NumField label="Height" value={b.heightCm} unit="cm" min={120} max={230} onChange={(heightCm) => upd({ heightCm })} />
        <NumField label="Weight" value={b.weightKg} unit="kg" min={30} max={250} onChange={(weightKg) => upd({ weightKg })} />
      </View>
      <T v="tiny" color="muted" style={{ marginBottom: 4 }}>
        Activity
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
        {ACTIVITY.map((a) => (
          <Chip key={a.key} label={a.label} on={b.activity === a.key} onPress={() => upd({ activity: a.key })} />
        ))}
      </View>
      <T v="tiny" color="muted" style={{ marginBottom: 12 }}>
        {ACTIVITY.find((a) => a.key === b.activity)?.hint}
      </T>
      <T v="tiny" color="muted" style={{ marginBottom: 4 }}>
        Goal
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {GOALS.map((g) => (
          <Chip key={g.key} label={g.label} on={b.goal === g.key} onPress={() => upd({ goal: g.key })} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <T v="bodyMedium">Protein per kg</T>
          <T v="tiny" color="muted">
            1.6 g/kg is a good default; 2.0–2.2 when cutting or building muscle.
          </T>
        </View>
        <Stepper compact value={Math.round(b.proteinPerKg * 10)} min={10} max={26} onChange={(n) => upd({ proteinPerKg: n / 10 })} format={(n) => `${(n / 10).toFixed(1)} g`} />
      </View>
      <Card style={{ backgroundColor: c.surface2, borderColor: 'transparent', marginBottom: 12 }}>
        <T v="smallSemi">Your targets</T>
        <T v="small" color="muted">
          {t.kcal.value.toLocaleString()} kcal · {t.protein.value} g protein · {t.carbs.value} g carbs · {t.fat.value} g fat · {t.fibre.value} g fibre
        </T>
      </Card>
      <Button label="Save targets" icon="checkmark" kind="primary" size="lg" onPress={() => onSave(b)} />
      <View style={{ height: 8 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  rich: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingRight: 10, borderRadius: radius.md, width: 200 },
  richImg: { width: 44, height: 40, borderRadius: radius.sm, backgroundColor: '#ddd' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12, borderRadius: radius.sm, borderWidth: 1 },
});
