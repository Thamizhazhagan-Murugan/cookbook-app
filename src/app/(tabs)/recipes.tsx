import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeTile } from '@/components/RecipeCard';
import { Sheet } from '@/components/Sheet';
import { Button, CheckRow, Chip, SearchBar, T } from '@/components/ui';
import { CATEGORIES, RECIPES, SORTS, filterRecipes, type Category, type SortKey } from '@/lib/recipes';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme';

export default function RecipesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const favorites = useStore((s) => s.profile.favorites);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category>('All');
  const [book, setBook] = useState<'all' | 'mealprep' | 'cookbook'>('all');
  const [sort, setSort] = useState<SortKey>('book');
  const [quick, setQuick] = useState(false);
  const [fav, setFav] = useState(false);
  const [sheet, setSheet] = useState(false);

  const list = useMemo(() => filterRecipes({ query: q, category: cat, book, sort, quick, onlyIds: fav ? new Set(favorites) : null }), [q, cat, book, sort, quick, fav, favorites]);

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <FlatList
        data={list}
        key="grid"
        numColumns={2}
        keyExtractor={(r) => r.id}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 110, gap: 12 }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <T v="display">What are we cooking?</T>
            <SearchBar value={q} onChange={setQ} placeholder="Search recipes or ingredients" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((x) => (
                <Chip key={x} label={x} on={cat === x} onPress={() => setCat(x)} />
              ))}
              <Chip label="Favourites" icon={fav ? 'heart' : 'heart-outline'} on={fav} tone="danger" onPress={() => setFav((v) => !v)} />
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Chip label={`Sort: ${SORTS.find((s) => s.key === sort)?.label}`} icon="swap-vertical" onPress={() => setSheet(true)} />
              <Chip label="Under 30 min" on={quick} onPress={() => setQuick((v) => !v)} />
              <T v="small" color="muted" style={{ marginLeft: 'auto' }}>
                {list.length} of {RECIPES.length}
              </T>
            </View>
          </View>
        }
        renderItem={({ item }) => <RecipeTile recipe={item} />}
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <T v="h3">Nothing matches</T>
            <T v="small" color="muted">
              Try another word or clear the filters.
            </T>
          </View>
        }
      />
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Sort and filter">
        <T v="h3" style={{ marginBottom: 4 }}>
          Sort by
        </T>
        {SORTS.map((s) => (
          <CheckRow key={s.key} round checked={sort === s.key} onToggle={() => setSort(s.key)}>
            <T v="body">{s.label}</T>
          </CheckRow>
        ))}
        <T v="h3" style={{ marginTop: 16, marginBottom: 4 }}>
          Book
        </T>
        {(
          [
            ['all', 'Both books'],
            ['mealprep', 'The Meal Prep Cookbook'],
            ['cookbook', "Jalal's Cookbook"],
          ] as const
        ).map(([k, label]) => (
          <CheckRow key={k} round checked={book === k} onToggle={() => setBook(k)}>
            <T v="body">{label}</T>
          </CheckRow>
        ))}
        <Button label="Done" kind="primary" style={{ marginTop: 16 }} onPress={() => setSheet(false)} />
      </Sheet>
    </View>
  );
}
