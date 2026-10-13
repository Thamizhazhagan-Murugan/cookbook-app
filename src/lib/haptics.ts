import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const can = Platform.OS === 'ios' || Platform.OS === 'android';

export const tap = () => {
  if (can) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
export const select = () => {
  if (can) Haptics.selectionAsync().catch(() => {});
};
export const success = () => {
  if (can) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export const warn = () => {
  if (can) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
