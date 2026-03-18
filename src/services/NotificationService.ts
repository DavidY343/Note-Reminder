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
      console.log('[NOTIF] Setting up Android channels...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mementos Reminder',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
      });

      await Notifications.setNotificationChannelAsync('alarm-channel', {
        name: 'Mementos Alarms',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#ef4444',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      } as any);
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
    const baseDate = new Date(note.alarmDate);
    const now = Date.now();
    const eventTime = baseDate.getTime();

    // Cancel old notification for this note if any
    await this.cancelNoteAlarm(note.id);

    // 1. Local App Notification Logic
    const oneHourMillis = 60 * 60 * 1000;
    const triggerTime = eventTime - oneHourMillis;
    let secondsToWait = Math.floor((triggerTime - now) / 1000);
    
    let shouldSchedule = false;
    let notificationText = `Starting soon! at ${baseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    if (secondsToWait > 0) {
      // More than 1 hour left. Schedule for the 1-hour-before mark.
      shouldSchedule = true;
      console.log(`[NOTIF] Scheduled for 1h-before: ${new Date(triggerTime).toLocaleTimeString()}`);
    } else if (eventTime > now) {
      // Less than 1 hour left. Fire almost immediately (5s).
      secondsToWait = 5;
      shouldSchedule = true;
      console.log(`[NOTIF] Less than 1h left. Firing immediate "Starting soon" alert.`);
    } else {
      console.log(`[NOTIF] Event is in the past. Skipping.`);
    }

    console.log(`[NOTIF_DEBUG] Original Event: ${baseDate.toLocaleTimeString()}`);
    console.log(`[NOTIF_DEBUG] Calculated Seconds to Wait: ${secondsToWait}s`);

    if (shouldSchedule) {
      console.log(`[NOTIF_DEBUG] EXECUTION: Scheduling "${note.title}" for ${secondsToWait} seconds from now.`);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Mementos: ${note.title || 'Mementos'}`,
            body: `${notificationText}: ${note.concept || 'Tap to view'}`,
            data: { noteId: note.id, concept: note.concept },
            sound: true,
            channelId: Platform.OS === 'android' ? 'alarm-channel' : undefined,
          } as any,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsToWait,
            channelId: Platform.OS === 'android' ? 'alarm-channel' : undefined,
            repeats: false,
          } as any,
          identifier: note.id,
        });
      } catch (error) {
        console.error('[NOTIF_ERROR] Failed to schedule notification:', error);
      }
    }

    // 2. EXTRA: Native System Alarm (Uses user-defined offset)
    const isNearFuture = (baseDate.getTime() - Date.now()) < (24 * 60 * 60 * 1000);
    if (note.useSystemAlarm && Platform.OS === 'android' && isNearFuture) {
      const alarmOffsetMillis = (note.alarmOffset || 0) * 60 * 1000;
      const alarmTriggerTime = baseDate.getTime() - alarmOffsetMillis;
      
      if (alarmTriggerTime > Date.now()) {
        const alarmTriggerDate = new Date(alarmTriggerTime);
        const timeStr = baseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
            extra: {
              'android.intent.extra.alarm.HOUR': alarmTriggerDate.getHours(),
              'android.intent.extra.alarm.MINUTES': alarmTriggerDate.getMinutes(),
              'android.intent.extra.alarm.MESSAGE': `${note.title || 'Mementos'} - ${timeStr}`,
              'android.intent.extra.alarm.SKIP_UI': true,
            }
          });
          console.log('[SYSTEM ALARM] Scheduled with offset:', note.alarmOffset);
        } catch (e) {
          console.warn('Failed to set system alarm', e);
        }
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
