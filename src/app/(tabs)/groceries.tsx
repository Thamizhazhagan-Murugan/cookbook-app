// Groceries: one list for the week, grouped by aisle, minus what's already in the pantry.
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/Sheet';
import { Button, Card, CheckRow, Chip, Empty, IconButton, Press, T } from '@/components/ui';
import { groupByAisle, listAsText } from '@/lib/grocery';
import * as haptics from '@/lib/haptics';
import type { GroceryItem } from '@/lib/types';
import { countMeals, weekRangeLabel, weekRelativeLabel } from '@/lib/week';
import { useGroceryList } from '@/store/selectors';
import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';

export default function GroceriesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const weekId = useStore((s) => s.currentWeekId);
  const week = useStore((s) => s.weeks[weekId]);
  const { toggleChecked, setHave, addExtra, removeExtra, resetChecked, finishShopping, showToast, pantryRemove } = useStore();
  const [text, setText] = useState('');
  const [showHave, setShowHave] = useState(false);
  const [showBought, setShowBought] = useState(true);
  const [item, setItem] = useState<GroceryItem | null>(null);

  const { list, toBuy, bought, have } = useGroceryList(weekId);
  const groups = useMemo(() => groupByAisle(toBuy), [toBuy]);
  const meals = countMeals(week);

  const copy = async () => {
    const txt = listAsText(list, `Groceries · ${weekRangeLabel(weekId)}`);
    try {
      await Clipboard.setStringAsync(txt);
      showToast('List copied');
    } catch {
      showToast('Could not copy');
    }
  };
  const share = async () => {
    try {
      await Share.share({ message: listAsText(list, `Groceries · ${weekRangeLabel(weekId)}`) });
    } catch {}
  };
  const finish = () => {
    const go = () => {
      const n = finishShopping(weekId);
      haptics.success();
      showToast(n ? `${n} item${n === 1 ? '' : 's'} added to your pantry` : 'Shopping finished', n ? { label: 'See pantry', href: '/pantry' } : undefined);
    };
    if (Platform.OS === 'web') go();
    else Alert.alert('Finish shopping?', `${bought.length} ticked item${bought.length === 1 ? '' : 's'} will be added to your pantry with the amount bought. The app takes off what this week's recipes use once the week is over.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Finish', onPress: go }]);
  };

  const Row = ({ i }: { i: GroceryItem }) => {
    const lead = i.buy ? i.buy.label : i.qtyStr;
    const detail = [i.buy && i.qtyStr ? `need ${i.qtyStr}` : '', i.haveText ? `have ${i.haveText}` : ''].filter(Boolean).join(' · ');
    return (
      <CheckRow round checked={i.checked} onToggle={() => toggleChecked(weekId, i.key)}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T v="body" style={{ fontSize: 15.5, lineHeight: 20, textDecorationLine: i.checked ? 'line-through' : 'none', color: i.checked ? c.muted : c.ink }}>
              {lead ? <T v="body" style={{ fontFamily: fonts.bodyBold, fontSize: 15.5, color: i.checked ? c.muted : c.ink }}>{lead} </T> : null}
              {i.name}
              {i.notes.length ? (
                <T v="small" color="muted">
                  {' '}
                  · {i.notes.join('; ')}
                </T>
              ) : null}
            </T>
            {detail || i.sources.length ? (
              <T v="tiny" color="muted" numberOfLines={1}>
                {detail}
                {detail && i.sources.length ? ' · ' : ''}
                {i.sources
                  .slice(0, 2)
                  .map((s) => s.title)
                  .join(', ')}
                {i.sources.length > 2 ? ` +${i.sources.length - 2} more` : ''}
              </T>
            ) : null}
          </View>
          <IconButton icon="ellipsis-horizontal" size={28} onPress={() => setItem(i)} accessibilityLabel={`Options for ${i.name}`} style={{ marginTop: -2 }} />
        </View>
      </CheckRow>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <T v="display">Groceries</T>
        <T v="small" color="muted" style={{ marginBottom: 12 }}>
          {weekRelativeLabel(weekId)} · {weekRangeLabel(weekId)} · {meals} meal{meals === 1 ? '' : 's'}
        </T>

        {list.length ? (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <T v="bodySemi">
              {toBuy.length} to buy
              {bought.length ? ` · ${bought.length} in basket` : ''}
              {have.length ? ` · ${have.length} already have` : ''}
            </T>
            <View style={{ flex: 1 }} />
            <IconButton icon="copy-outline" onPress={copy} accessibilityLabel="Copy list" size={36} />
            <IconButton icon="share-outline" onPress={share} accessibilityLabel="Share list" size={36} />
          </View>
        ) : null}

        <View style={[styles.addRow, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Ionicons name="add" size={20} color={c.muted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add something else — e.g. dish soap"
            placeholderTextColor={c.muted}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (text.trim()) {
                addExtra(weekId, text);
                setText('');
                haptics.select();
              }
            }}
            style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.ink, height: 44, paddingVertical: 0 }}
          />
          {text.trim() ? <Button label="Add" kind="primary" size="sm" onPress={() => { addExtra(weekId, text); setText(''); haptics.select(); }} /> : null}
        </View>

        {bought.length ? (
          <Card style={{ marginBottom: 14, backgroundColor: c.accentSoft, borderColor: 'transparent' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <T v="bodySemi">
                  {bought.length} item{bought.length === 1 ? '' : 's'} in the basket
                </T>
                <T v="small" color="muted">
                  Done shopping? They go into your pantry with the amount bought, so next week&apos;s list skips what you still have.
                </T>
              </View>
              <Button label="Finish shopping" icon="bag-check-outline" kind="primary" size="sm" onPress={finish} />
            </View>
          </Card>
        ) : null}
        {!list.length ? (
          <Empty icon="cart-outline" title="Your list is empty" body="Plan some meals and the ingredients land here, merged and sorted by aisle." action={<Button label="Plan the week" kind="primary" icon="calendar-outline" onPress={() => router.push('/')} />} />
        ) : !toBuy.length ? (
          <Empty icon="checkmark-done" title="All bought" body={bought.length ? 'Everything is in the basket. Finish shopping to add it all to your pantry.' : 'Everything you need is already in your pantry.'} />
        ) : null}

        {groups.map((g) => (
          <Animated.View key={g.aisle} layout={LinearTransition} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <T v="smallSemi" color="muted">
                {g.aisle}
              </T>
              <T v="tiny" color="muted">
                {g.items.length}
              </T>
            </View>
            <Card pad={false} style={{ paddingHorizontal: 12 }}>
              {g.items.map((i) => (
                <Row key={i.key} i={i} />
              ))}
            </Card>
          </Animated.View>
        ))}

        {bought.length ? (
          <View style={{ marginBottom: 14 }}>
            <Press haptic="select" onPress={() => setShowBought((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Ionicons name={showBought ? 'chevron-down' : 'chevron-forward'} size={16} color={c.muted} />
              <T v="smallSemi" color="muted">
                In the basket · {bought.length}
              </T>
            </Press>
            {showBought ? (
              <Card pad={false} style={{ paddingHorizontal: 12 }}>
                {bought.map((i) => (
                  <Row key={i.key} i={i} />
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}

        {have.length ? (
          <View style={{ marginBottom: 14 }}>
            <Press haptic="select" onPress={() => setShowHave((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Ionicons name={showHave ? 'chevron-down' : 'chevron-forward'} size={16} color={c.muted} />
              <T v="smallSemi" color="muted">
                Already have · {have.length}
              </T>
              <T v="tiny" color="muted">
                — skipped, tap to check
              </T>
            </Press>
            {showHave ? (
              <Card pad={false} style={{ paddingHorizontal: 12 }}>
                {have.map((i) => (
                  <Press key={i.key} haptic="none" onPress={() => setItem(i)} style={[styles.haveRow, { borderBottomColor: c.line }]}>
                    <Ionicons name="checkmark-circle" size={20} color={c.accent} />
                    <T v="body" color="muted" style={{ flex: 1, fontSize: 15 }}>
                      {i.name}
                      {i.qtyStr ? ` · needs ${i.qtyStr}` : ''}
                    </T>
                    <T v="tiny" color="accent">
                      {i.haveText || 'have'}
                    </T>
                  </Press>
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}

        {list.length ? (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <Button label="Finish shopping" icon="bag-check-outline" kind="primary" size="sm" onPress={finish} disabled={!bought.length} />
            <Button label="Reset ticks" size="sm" onPress={() => resetChecked(weekId)} disabled={!bought.length} />
            <Button label="Pantry" icon="file-tray-full-outline" size="sm" onPress={() => router.push('/pantry')} />
          </View>
        ) : null}
        <T v="tiny" color="muted" style={{ marginTop: 16 }}>
          Quantities are summed across recipes and scaled to the servings you planned. Spices, sauces and other staples you tick as bought are remembered in the pantry, so the next week&apos;s list skips them.
        </T>
      </ScrollView>

      {/* item sheet */}
      <Sheet open={!!item} onClose={() => setItem(null)} title={item?.name}>
        {item ? (
          <View style={{ gap: 10, paddingBottom: 8 }}>
            {item.buy ? (
              <T v="body">
                Buy <T v="bodySemi">{item.buy.label}</T>
                {item.qtyStr ? ` · recipes need ${item.qtyStr}` : ''}
              </T>
            ) : item.qtyStr ? (
              <T v="body">Recipes need {item.qtyStr}</T>
            ) : null}
            {item.haveText ? (
              <T v="small" color="muted">
                In your pantry: {item.haveText}
              </T>
            ) : null}
            {item.sources.length ? (
              <View>
                <T v="smallSemi" color="muted">
                  Used in
                </T>
                {item.sources.map((s) => (
                  <Press key={s.recipeId} haptic="none" onPress={() => { setItem(null); router.push(`/recipe/${s.recipeId}`); }}>
                    <T v="body" color="accent">
                      {s.title}
                    </T>
                  </Press>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {!item.custom ? (
                item.have ? (
                  <Chip label="I need to buy this" icon="cart-outline" onPress={() => { setHave(weekId, item.key, false); if (item.inPantry) pantryRemove(item.key); setItem(null); }} />
                ) : (
                  <Chip label="I already have this" icon="checkmark" tone="accent" on onPress={() => { setHave(weekId, item.key, true); setItem(null); }} />
                )
              ) : (
                <Chip label="Remove" icon="trash-outline" tone="danger" on onPress={() => { removeExtra(weekId, item.custom!.id); setItem(null); }} />
              )}
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.pill, paddingLeft: 12, paddingRight: 6, height: 48, marginBottom: 14 },
  haveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
});
