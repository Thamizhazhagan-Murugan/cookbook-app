// Pantry: ingredients you already have. Anything here is skipped on the grocery list.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, Empty, IconButton, Press, T } from '@/components/ui';
import { AISLE_ORDER, ingKey, pantryItemFrom, pantryQty } from '@/lib/grocery';
import { fmtStock, packFor, packLabel } from '@/lib/packs';
import * as haptics from '@/lib/haptics';
import { RECIPES, STAPLES } from '@/lib/recipes';
import type { PantryItem } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';

// aisle lookup for typed items, borrowed from the recipe data
const AISLE_BY_KEY: Record<string, string> = {};
for (const r of RECIPES) for (const g of r.ingredients) for (const i of g.items) AISLE_BY_KEY[i.key] = i.aisle;

export default function PantryScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const pantry = useStore((s) => s.profile.pantry);
  const { pantryAdd, pantryRemove, pantryClear, pantryAdjust, showToast } = useStore();
  const [text, setText] = useState('');
  const [showStaples, setShowStaples] = useState(false);
  const items = useMemo(() => Object.values(pantry).sort((a, b) => AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle) || a.name.localeCompare(b.name)), [pantry]);
  const groups = useMemo(() => {
    const by = new Map<string, PantryItem[]>();
    for (const i of items) by.set(i.aisle, [...(by.get(i.aisle) || []), i]);
    return [...by.entries()];
  }, [items]);

  const add = (name: string) => {
    const key = ingKey(name);
    if (!key) return;
    const aisle = AISLE_BY_KEY[key] || 'Other';
    const existing = pantry[key];
    if (existing) {
      pantryAdjust(key, 1);
    } else {
      pantryAdd(pantryItemFrom({ key, name: name.trim(), aisle }, 'manual'));
    }
    const pack = packFor(key, name, aisle);
    showToast(`${name.trim()}: ${packLabel(1, pack, name.trim())} added`);
    haptics.select();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <IconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
          <T v="h1" style={{ flex: 1 }}>
            Pantry
          </T>
          {items.length ? <Button label="Clear all" kind="ghost" size="sm" onPress={() => { pantryClear(); haptics.warn(); showToast('Pantry cleared'); }} /> : null}
        </View>
        <T v="small" color="muted" style={{ marginBottom: 12 }}>
          What you have at home, with roughly how much. Grocery lists only ask for an item when there isn&apos;t enough left. Everything you tick off while shopping lands here with the amount bought, and each week&apos;s cooking is taken off once the week is over.
        </T>

        <View style={[styles.addRow, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Ionicons name="add" size={20} color={c.muted} />
          <TextInput value={text} onChangeText={setText} placeholder="Add an ingredient you have — e.g. paprika" placeholderTextColor={c.muted} returnKeyType="done" onSubmitEditing={() => { if (text.trim()) { add(text); setText(''); } }} style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.ink, height: 44, paddingVertical: 0 }} />
          {text.trim() ? <Button label="Add" kind="primary" size="sm" onPress={() => { add(text); setText(''); }} /> : null}
        </View>

        {!items.length ? <Empty icon="file-tray-outline" title="Pantry is empty" body="Tick items as bought on the grocery list and press Finish shopping — they land here with the amount. Or add what you already keep at home." /> : null}

        {groups.map(([aisle, list]) => (
          <Animated.View key={aisle} layout={LinearTransition} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <T v="smallSemi" color="muted">
                {aisle}
              </T>

            </View>
            <Card pad={false} style={{ paddingHorizontal: 12 }}>
              {list.map((i, idx) => {
                const pack = packFor(i.key, i.name, i.aisle);
                const qty = pantryQty(i, pack);
                return (
                  <View key={i.key} style={[styles.row, { borderBottomColor: c.line, borderBottomWidth: idx === list.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                    <View style={{ flex: 1 }}>
                      <T v="body" style={{ fontSize: 15.5 }}>
                        {i.name}
                      </T>
                      <T v="tiny" color="muted">
                        <T v="tiny" color="basil" style={{ fontFamily: fonts.bodySemi }}>
                          {fmtStock(qty, pack, i.name)}
                        </T>
                        {' · '}
                        {i.source === 'bought' ? 'bought' : 'added'} {new Date(i.updatedAt || i.addedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </T>
                    </View>
                    <IconButton icon="remove" size={30} onPress={() => { pantryAdjust(i.key, -1); haptics.select(); }} accessibilityLabel={`One ${pack.label || 'pack'} less of ${i.name}`} />
                    <IconButton icon="add" size={30} onPress={() => { pantryAdjust(i.key, 1); haptics.select(); }} accessibilityLabel={`Add one ${pack.label || 'pack'} of ${i.name}`} />
                    <IconButton icon="close" size={30} onPress={() => { pantryRemove(i.key); haptics.select(); }} accessibilityLabel={`Used up ${i.name}`} />
                  </View>
                );
              })}
            </Card>
          </Animated.View>
        ))}

        <Press haptic="select" onPress={() => setShowStaples((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 6 }}>
          <Ionicons name={showStaples ? 'chevron-down' : 'chevron-forward'} size={18} color={c.muted} />
          <T v="h3">Jalal&apos;s most-used staples</T>
        </Press>
        {showStaples ? (
          <View style={{ gap: 10 }}>
            <T v="small" color="muted">
              From the Meal Prep Cookbook&apos;s master grocery list. Tap what you keep at home.
            </T>
            {STAPLES.map((s) => (
              <View key={s.section}>
                <T v="smallSemi" color="muted" style={{ marginBottom: 6 }}>
                  {s.section}
                </T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {s.items.map((name) => {
                    const key = ingKey(name.split('/')[0]);
                    const on = !!pantry[key];
                    return <Chip key={name} label={name} on={on} tone="basil" icon={on ? 'checkmark' : undefined} onPress={() => (on ? pantryRemove(key) : add(name.split('/')[0].trim()))} />;
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.pill, paddingLeft: 12, paddingRight: 6, height: 48, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});
