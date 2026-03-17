import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { Note } from '../types/note';

import AsyncStorage from '@react-native-async-storage/async-storage';

const CALENDAR_PREFERENCE_KEY = '@preferred_calendar_id';

export const CalendarService = {
  async requestPermissions() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  },

  async setPreferredCalendarId(id: string) {
    await AsyncStorage.setItem(CALENDAR_PREFERENCE_KEY, id);
  },

  async getPreferredCalendarId() {
    return await AsyncStorage.getItem(CALENDAR_PREFERENCE_KEY);
  },

  async getAppCalendarId(): Promise<string | null> {
    const preferredId = await this.getPreferredCalendarId();
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    if (preferredId) {
      const exists = calendars.find(c => c.id === preferredId);
      if (exists) {
        console.log(`[CALENDAR] Using preferred account: ${exists.title} (ID: ${exists.id})`);
        return preferredId;
      }
    }

    if (Platform.OS === 'ios') {
      const existing = calendars.find((c) => c.title === 'Note-Reminder');
      if (existing) return existing.id;

      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      return await Calendar.createCalendarAsync({
        title: 'Note-Reminder',
        color: '#8b5cf6',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendar.source.id,
        source: defaultCalendar.source,
        name: 'Note-Reminder',
        ownerAccount: 'personal',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
    } else {
      const primaryCalendar = calendars.find(c => c.isPrimary) || calendars.find(c => c.source.type === 'com.google') || calendars[0];
      console.log(`[CALENDAR] Using default primary account: ${primaryCalendar?.title} (ID: ${primaryCalendar?.id})`);
      return primaryCalendar?.id || null;
    }
  },

  async syncNoteToCalendar(note: Note): Promise<string | undefined> {
    if (!note.alarmDate) return undefined;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return undefined;

    const calendarId = await this.getAppCalendarId();
    if (!calendarId) {
      console.error('[SYNC] No calendar ID found!');
      return undefined;
    }
    
    console.log(`[SYNC] Syncing note to calendar ID: ${calendarId}`);

    const startDate = new Date(note.alarmDate);
    const duration = note.durationMinutes || 30;
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const eventDetails: Partial<Calendar.Event> = {
      title: note.title || 'Note Reminder',
      notes: note.concept,
      startDate,
      endDate,
      timeZone: 'GMT', // Using GMT or let system decide
      alarms: [{ relativeOffset: 0 }], // Alarm at the time of the event
    };

    try {
      if (note.calendarEventId) {
        // Update existing
        try {
          await Calendar.updateEventAsync(note.calendarEventId, eventDetails);
          return note.calendarEventId;
        } catch (e) {
          // If it fails (e.g. event was deleted manually), create a new one
        }
      }

      // Create new
      const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
      return eventId;
    } catch (e) {
      console.error('Error syncing to calendar', e);
      return undefined;
    }
  },

  async deleteCalendarEvent(calendarEventId: string) {
    if (!calendarEventId) return;
    
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    try {
      await Calendar.deleteEventAsync(calendarEventId);
    } catch (e) {
      console.warn('Failed to delete calendar event', e);
    }
  }
};
