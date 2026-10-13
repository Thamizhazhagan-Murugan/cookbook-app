import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PHOTOS } from '@/data/photos';
import { timeLabel } from '@/lib/recipes';
import type { Recipe } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { fonts, radius, useTheme } from '@/theme';
import { Press, T } from './ui';

/** Grid tile used in the recipe browser. */
export const RecipeTile = memo(function RecipeTile({ recipe, onPress }: { recipe: Recipe; onPress?: () => void }) {
  const { c, dark } = useTheme();
  const fav = useStore((s) => s.profile.favorites.includes(recipe.id));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  return (
    <Press haptic="none" onPress={onPress ?? (() => router.push(`/recipe/${recipe.id}`))} style={[styles.tile, { backgroundColor: c.surface, shadowColor: c.shadow, shadowOpacity: dark ? 0 : 0.1 }]}>
      <View style={styles.photoWrap}>
        <Image source={PHOTOS[recipe.id]} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <View style={[styles.time, { backgroundColor: c.highlight }]}>
          <T v="tiny" color="highlightInk" style={{ fontFamily: fonts.bodyBold }}>
            {timeLabel(recipe)}
          </T>
        </View>
        <Press haptic="select" onPress={() => toggleFavorite(recipe.id)} style={styles.heart} accessibilityLabel={fav ? 'Remove from favourites' : 'Add to favourites'}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={17} color={fav ? c.danger : '#555'} />
        </Press>
      </View>
      <View style={{ padding: 10, gap: 4, flex: 1 }}>
        <T v="h3" numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>
          {recipe.title}
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' }}>
          {recipe.macros.calories != null ? (
            <>
              <T v="tiny" color="muted">
                <T v="tiny" style={{ fontFamily: fonts.bodyBold }}>
                  {recipe.macros.calories}
                </T>{' '}
                kcal
              </T>
              <T v="tiny" color="muted">
                <T v="tiny" style={{ fontFamily: fonts.bodyBold }}>
                  {Math.round(recipe.macros.protein ?? 0)}g
                </T>{' '}
                protein
              </T>
            </>
          ) : (
            <T v="tiny" color="muted">
              {recipe.category}
            </T>
          )}
        </View>
      </View>
    </Press>
  );
});

/** Horizontal row used in lists (plan slots, picker, history). */
export function RecipeRow({ recipe, right, sub, onPress, badge }: { recipe: Recipe; right?: React.ReactNode; sub?: React.ReactNode; onPress?: () => void; badge?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Press haptic="none" onPress={onPress} style={[styles.row, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Image source={PHOTOS[recipe.id]} style={styles.thumb} contentFit="cover" transition={120} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T v="h3" numberOfLines={1} style={{ fontSize: 15, lineHeight: 19 }}>
          {recipe.title}
        </T>
        {sub ?? (
          <T v="tiny" color="muted">
            {timeLabel(recipe)}
            {recipe.macros.calories ? ` · ${recipe.macros.calories} kcal · ${Math.round(recipe.macros.protein ?? 0)}g protein` : ''}
          </T>
        )}
        {badge}
      </View>
      {right}
    </Press>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: radius.md, overflow: 'hidden', shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 2 },
  photoWrap: { aspectRatio: 4 / 3, backgroundColor: '#ddd' },
  time: { position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  heart: { position: 'absolute', right: 6, top: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 64, height: 56, borderRadius: radius.sm, backgroundColor: '#ddd' },
});
