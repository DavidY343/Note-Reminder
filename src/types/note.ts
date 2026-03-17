export interface Note {
  id: string;
  title: string;
  concept: string;
  alarmDate?: string; // ISO string 
  useSystemAlarm?: boolean;
  calendarEventId?: string;
  durationMinutes?: number;
}
