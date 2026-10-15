import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, useTheme } from '@/theme';
import { IconButton, T } from './ui';

/** Bottom sheet built on the native Modal — works in Expo Go, iOS, Android and web. */
export function Sheet({ open, onClose, title, children, scroll = true }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; scroll?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.panel, { backgroundColor: c.surface, paddingBottom: Math.max(insets.bottom, 16), width: '100%', maxWidth: 760, alignSelf: 'center' }]}>
          <View style={[styles.grip, { backgroundColor: c.line }]} />
          {title ? (
            <View style={styles.head}>
              <T v="h2" style={{ flex: 1 }}>
                {title}
              </T>
              <IconButton icon="close" onPress={onClose} size={34} accessibilityLabel="Close" />
            </View>
          ) : null}
          <Body style={{ maxHeight: 560 }} contentContainerStyle={scroll ? { paddingHorizontal: 20, paddingBottom: 8 } : undefined} keyboardShouldPersistTaps="handled">
            {scroll ? children : <View style={{ paddingHorizontal: 20 }}>{children}</View>}
          </Body>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: 8, maxHeight: '88%' },
  grip: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
});
