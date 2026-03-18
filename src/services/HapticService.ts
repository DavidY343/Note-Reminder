import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const HapticService = {
  async impactLight() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Ignore if not available
    }
  },
  
  async impactMedium() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Ignore if not available
    }
  },

  async notificationSuccess() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // Ignore if not available
    }
  }
};
