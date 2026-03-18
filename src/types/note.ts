export interface Note {
  id: string;
  title: string;
  concept: string;
  alarmDate?: string; // ISO string 
  useLocalAlarm?: boolean;
  useSystemAlarm?: boolean;
  syncToCalendar?: boolean;
  calendarEventId?: string;
  durationMinutes?: number;
  alarmOffset?: number; // minutes before
}
