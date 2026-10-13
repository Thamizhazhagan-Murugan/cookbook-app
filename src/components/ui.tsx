// Small, consistent building blocks used across every screen.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import * as haptics from '@/lib/haptics';
import { fonts, radius, space, useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ---------- Text ---------- */
type TVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyMedium' | 'bodySemi' | 'small' | 'smallSemi' | 'tiny' | 'num';
const variants: Record<TVariant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 25, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 23 },
  bodySemi: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 18 },
  smallSemi: { fontFamily: fonts.bodySemi, fontSize: 13.5, lineHeight: 18 },
  tiny: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 15 },
  num: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
};

export function T({ v = 'body', color, style, children, ...rest }: { v?: TVariant; color?: 'ink' | 'muted' | 'basil' | 'chili' | 'yolkInk' | 'basilInk' | string; style?: StyleProp<TextStyle>; children?: React.ReactNode } & React.ComponentProps<typeof Text>) {
  const { c } = useTheme();
  const col = color ? ((c as Record<string, string>)[color] ?? color) : c.ink;
  return (
    <Text {...rest} style={[variants[v], { color: col }, style]}>
      {children}
    </Text>
  );
}

/* ---------- Pressable with feedback ---------- */
export function Press({ onPress, haptic = 'tap', style, children, ...rest }: PressableProps & { haptic?: 'tap' | 'select' | 'none'; style?: StyleProp<ViewStyle> | ((p: { pressed: boolean }) => StyleProp<ViewStyle>) }) {
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (haptic === 'tap') haptics.tap();
        else if (haptic === 'select') haptics.select();
        onPress?.(e);
      }}
      style={(p) => [{ opacity: p.pressed ? 0.75 : 1 }, typeof style === 'function' ? style(p) : style]}>
      {children}
    </Pressable>
  );
}

/* ---------- Button ---------- */
export function Button({ label, icon, kind = 'secondary', size = 'md', onPress, disabled, style, haptic }: { label: string; icon?: IconName; kind?: 'primary' | 'secondary' | 'yolk' | 'ghost' | 'danger' | 'soft'; size?: 'sm' | 'md' | 'lg'; onPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; haptic?: 'tap' | 'select' | 'none' }) {
  const { c } = useTheme();
  const bg = { primary: c.basil, secondary: c.surface, yolk: c.yolk, ghost: 'transparent', danger: c.chiliSoft, soft: c.basilSoft }[kind];
  const fg = { primary: c.basilInk, secondary: c.ink, yolk: c.yolkInk, ghost: c.muted, danger: c.chili, soft: c.basil }[kind];
  const border = kind === 'secondary' ? c.line : 'transparent';
  const h = { sm: 36, md: 46, lg: 54 }[size];
  const fs = { sm: 14, md: 15, lg: 17 }[size];
  return (
    <Press onPress={onPress} disabled={disabled} haptic={haptic} style={[styles.btn, { backgroundColor: bg, borderColor: border, height: h, paddingHorizontal: size === 'sm' ? 13 : 18, opacity: disabled ? 0.45 : 1 }, style]}>
      {icon ? <Ionicons name={icon} size={fs + 3} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: fs, color: fg }}>{label}</Text>
    </Press>
  );
}

export function IconButton({ icon, onPress, size = 40, color, bg, style, accessibilityLabel }: { icon: IconName; onPress?: () => void; size?: number; color?: string; bg?: string; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={accessibilityLabel} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? c.surface2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color ?? c.ink} />
    </Press>
  );
}

/* ---------- Chip ---------- */
export function Chip({ label, on, onPress, icon, tone = 'ink' }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName; tone?: 'ink' | 'chili' | 'basil' }) {
  const { c } = useTheme();
  const onBg = tone === 'chili' ? c.chili : tone === 'basil' ? c.basil : c.ink;
  const onFg = tone === 'basil' ? c.basilInk : c.canvas;
  return (
    <Press haptic="select" onPress={onPress} style={[styles.chip, { backgroundColor: on ? onBg : c.surface, borderColor: on ? onBg : c.line }]}>
      {icon ? <Ionicons name={icon} size={14} color={on ? onFg : c.muted} /> : null}
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: on ? onFg : c.ink }}>{label}</Text>
    </Press>
  );
}

/* ---------- Stepper ---------- */
export function Stepper({ value, onChange, min = 1, max = 40, format, compact }: { value: number; onChange: (n: number) => void; min?: number; max?: number; format?: (n: number) => string; compact?: boolean }) {
  const { c } = useTheme();
  const h = compact ? 32 : 44;
  return (
    <View style={[styles.stepper, { borderColor: c.line, backgroundColor: c.surface, height: h }]}>
      <Press haptic="select" onPress={() => onChange(Math.max(min, value - 1))} style={{ width: h, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Fewer">
        <Ionicons name="remove" size={18} color={c.muted} />
      </Press>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: compact ? 13 : 14, color: c.ink, minWidth: compact ? 64 : 86, textAlign: 'center' }}>{format ? format(value) : value}</Text>
      <Press haptic="select" onPress={() => onChange(Math.min(max, value + 1))} style={{ width: h, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="More">
        <Ionicons name="add" size={18} color={c.muted} />
      </Press>
    </View>
  );
}

/* ---------- Checkbox row ---------- */
export function CheckRow({ checked, onToggle, children, round, style }: { checked: boolean; onToggle: () => void; children: React.ReactNode; round?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Press haptic="select" onPress={onToggle} style={[styles.checkRow, { borderBottomColor: c.line }, style]} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, { borderRadius: round ? 11 : 6, borderColor: checked ? c.basil : c.line, backgroundColor: checked ? c.basil : c.surface }]}>{checked ? <Ionicons name="checkmark" size={15} color={c.basilInk} /> : null}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </Press>
  );
}

/* ---------- Card / surfaces ---------- */
export function Card({ children, style, pad = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean }) {
  const { c, dark } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.shadow, shadowOpacity: dark ? 0 : 0.08, padding: pad ? space.lg : 0 }, style]}>{children}</View>;
}

export function Badge({ label, tone = 'yolk', icon }: { label: string; tone?: 'yolk' | 'basil' | 'chili' | 'muted' | 'soft'; icon?: IconName }) {
  const { c } = useTheme();
  const bg = { yolk: c.yolk, basil: c.basil, chili: c.chili, muted: c.surface2, soft: c.basilSoft }[tone];
  const fg = { yolk: c.yolkInk, basil: c.basilInk, chili: '#fff', muted: c.muted, soft: c.basil }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: fg }}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, sub, right, style }: { title: string; sub?: string; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 }, style]}>
      <T v="h2">{title}</T>
      {sub ? (
        <T v="small" color="muted" style={{ flex: 1, paddingBottom: 2 }}>
          {sub}
        </T>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 6 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Ionicons name={icon} size={26} color={c.muted} />
      </View>
      <T v="h3" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {body ? (
        <T v="small" color="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
          {body}
        </T>
      ) : null}
      {action ? <View style={{ marginTop: 12 }}>{action}</View> : null}
    </View>
  );
}

export function SearchBar({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (s: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Ionicons name="search" size={18} color={c.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.muted} autoFocus={autoFocus} autoCorrect={false} returnKeyType="search" style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.ink, paddingVertical: 0, height: 44 }} />
      {value ? <IconButton icon="close" size={28} onPress={() => onChange('')} accessibilityLabel="Clear search" /> : null}
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />;
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.pill, borderWidth: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, height: 36, borderRadius: radius.pill, borderWidth: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.pill, overflow: 'hidden' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  box: { width: 22, height: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 2, overflow: 'hidden' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.pill, paddingLeft: 14, paddingRight: 8, height: 46 },
});
