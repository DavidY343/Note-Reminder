import * as Notifications from 'expo-notifications';
import { Note } from '../types/note';
import { SpeechService } from './SpeechService';
import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationService = {
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Normal Reminder',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
      });

      await Notifications.setNotificationChannelAsync('alarm-channel', {
        name: 'Alarm Reminder (Loud)',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500],
        lightColor: '#ef4444',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }
    return true;
  },

  async scheduleNoteAlarm(note: Note) {
    if (!note.alarmDate) return;

    const triggerDate = new Date(note.alarmDate);

    if (triggerDate.getTime() < Date.now()) {
      return; // In the past
    }

    // Cancel old notification for this note if any
    await this.cancelNoteAlarm(note.id);

    // 1. App Notification (Always handled by expo-notifications)
    const secondsUntilAlarm = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000));
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${note.title || 'Note'}`,
        body: 'Tap to listen to the concept details.',
        data: { noteId: note.id, concept: note.concept },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilAlarm,
        channelId: Platform.OS === 'android' ? 'alarm-channel' : undefined,
      } as any,
      identifier: note.id,
    });

    // 2. EXTRA: Native System Alarm (Only if explicitly requested and on Android)
    if (note.useSystemAlarm && Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
          extra: {
            'android.intent.extra.alarm.HOUR': triggerDate.getHours(),
            'android.intent.extra.alarm.MINUTES': triggerDate.getMinutes(),
            'android.intent.extra.alarm.MESSAGE': note.title || 'Note Reminder',
            'android.intent.extra.alarm.SKIP_UI': true,
          }
        });
        console.log('System Alarm scheduled successfully');
      } catch (e) {
        console.warn('Failed to set system alarm', e);
      }
    }
  },

  async cancelNoteAlarm(noteId: string) {
    await Notifications.cancelScheduledNotificationAsync(noteId);
  },

  setupNotificationListeners() {
    // When a user taps on the notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.concept) {
        SpeechService.speak(data.concept as string);
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }
};
