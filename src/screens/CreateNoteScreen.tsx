import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Switch, 
  TouchableOpacity, ScrollView, Platform, Alert 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { CalendarService } from '../services/CalendarService';
import * as Calendar from 'expo-calendar';
import { Note } from '../types/note';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateNote'>;

export default function CreateNoteScreen({ route, navigation }: Props) {
  const noteId = route.params?.noteId;
  const initialTitle = route.params?.initialTitle;
  const initialConcept = route.params?.initialConcept;
  const initialAlarmDate = route.params?.initialAlarmDate;

  const [title, setTitle] = useState('');
  const [concept, setConcept] = useState('');
  const [hasAlarm, setHasAlarm] = useState(false);
  const [useSystemAlarm, setUseSystemAlarm] = useState(false);
  const [alarmDate, setAlarmDate] = useState(new Date());
  const [calendarEventId, setCalendarEventId] = useState<string | undefined>(undefined);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationValue, setCustomDurationValue] = useState('15');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await StorageService.getItem('@dark_mode');
    if (saved !== null) setDarkMode(saved === 'true');
  };

  const theme = {
    bg: darkMode ? '#1a1a1a' : '#f5f2ed',
    card: darkMode ? '#262626' : '#ffffff',
    text: darkMode ? '#e0e0e0' : '#4e342e',
    subText: darkMode ? '#a0a0a0' : '#6d4c41',
    accent: darkMode ? '#d4a373' : '#5d4037',
    border: darkMode ? '#404040' : '#d7ccc8',
    inputBg: darkMode ? '#2d2d2d' : '#fff',
  };
  
  // For Android since it only shows Date OR Time per picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (noteId) {
      loadNote();
    } else if (initialTitle || initialConcept || initialAlarmDate) {
      // Pre-fill from voice assistant
      if (initialTitle) setTitle(initialTitle);
      if (initialConcept) setConcept(initialConcept);
      if (initialAlarmDate) {
        setAlarmDate(new Date(initialAlarmDate));
        setHasAlarm(true);
      }
    }
  }, [noteId, initialTitle, initialConcept, initialAlarmDate]);

  const loadNote = async () => {
    const note = await StorageService.getNote(noteId!);
    if (note) {
      setTitle(note.title);
      setConcept(note.concept);
      if (note.alarmDate) {
        setHasAlarm(true);
        setAlarmDate(new Date(note.alarmDate));
        setUseSystemAlarm(!!note.useSystemAlarm);
        setCalendarEventId(note.calendarEventId);
        const dur = note.durationMinutes || 30;
        setDurationMinutes(dur);
        if (![30, 60, 120].includes(dur)) {
          setIsCustomDuration(true);
          setCustomDurationValue(dur.toString());
        }
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim() && !concept.trim()) {
      alert('Please add a title or context');
      return;
    }

    const newNote: Note = {
      id: noteId || Date.now().toString(),
      title: title.trim(),
      concept: concept.trim(),
      alarmDate: hasAlarm ? alarmDate.toISOString() : undefined,
      useSystemAlarm: hasAlarm ? useSystemAlarm : false,
      calendarEventId,
      durationMinutes: hasAlarm ? (isCustomDuration ? parseInt(customDurationValue) || 30 : durationMinutes) : undefined,
    };

    // Sync to Calendar
    if (hasAlarm) {
      const eventId = await CalendarService.syncNoteToCalendar(newNote);
      newNote.calendarEventId = eventId;
      setCalendarEventId(eventId);
    } else if (calendarEventId) {
      await CalendarService.deleteCalendarEvent(calendarEventId);
      newNote.calendarEventId = undefined;
      setCalendarEventId(undefined);
    }

    await StorageService.saveNote(newNote);
    
    // Schedule or cancel notification
    if (hasAlarm) {
      await NotificationService.scheduleNoteAlarm(newNote);
    } else {
      await NotificationService.cancelNoteAlarm(newNote.id);
    }
    
    navigation.goBack();
  };

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentDate = alarmDate || new Date();
      currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setAlarmDate(new Date(currentDate));
    }
  };

  const onChangeTime = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const currentDate = alarmDate || new Date();
      currentDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setAlarmDate(new Date(currentDate));
    }
  };

  const handleDelete = async () => {
    if (noteId) {
      if (calendarEventId) {
        await CalendarService.deleteCalendarEvent(calendarEventId);
      }
      await NotificationService.cancelNoteAlarm(noteId);
      await StorageService.deleteNote(noteId);
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {noteId ? 'Edit Record' : 'New Entry'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: theme.subText }]}>SUBJECT</Text>
        <TextInput
          style={[styles.titleInput, { color: theme.text, borderBottomColor: theme.border }]}
          placeholder="What's on your mind?"
          placeholderTextColor={darkMode ? '#555' : '#8d6e63'}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={[styles.label, { color: theme.subText }]}>DETAILED LOG</Text>
        <TextInput
          style={[styles.conceptInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
          placeholder="Write down your thoughts here..."
          placeholderTextColor={darkMode ? '#555' : '#8d6e63'}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={concept}
          onChangeText={setConcept}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.switchRow}>
          <View style={styles.rowLabelGroup}>
            <Ionicons name="notifications-outline" size={22} color={theme.accent} />
            <Text style={[styles.switchLabel, { color: theme.text }]}>Schedule Reminder</Text>
          </View>
          <Switch
            value={hasAlarm}
            onValueChange={setHasAlarm}
            trackColor={{ false: darkMode ? '#333' : '#d1d5db', true: theme.accent }}
            thumbColor="#fff"
          />
        </View>

        {hasAlarm && (
          <View style={styles.alarmContent}>
            <TouchableOpacity 
              style={[styles.dateTimeBtn, { backgroundColor: theme.bg, borderColor: theme.border }]} 
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.accent} />
              <Text style={[styles.dateTimeText, { color: theme.text }]}>
                {alarmDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dateTimeBtn, { backgroundColor: theme.bg, borderColor: theme.border }]} 
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={theme.accent} />
              <Text style={[styles.dateTimeText, { color: theme.text }]}>
                {alarmDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
            
            {Platform.OS === 'android' && (
              <View style={styles.systemAlarmRow}>
                <Text style={[styles.systemAlarmLabel, { color: theme.subText }]}>Create Android Clock Alarm</Text>
                <Switch
                  value={useSystemAlarm}
                  onValueChange={setUseSystemAlarm}
                  trackColor={{ false: darkMode ? '#333' : '#d1d5db', true: theme.accent }}
                  thumbColor="#fff"
                />
              </View>
            )}

            <View style={[styles.durationSection, { borderTopColor: theme.border }]}>
              <Text style={[styles.durationLabel, { color: theme.subText }]}>Session Duration</Text>
              <View style={styles.durationRow}>
                {[30, 60, 120].map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.durationBtn,
                      { backgroundColor: theme.bg, borderColor: theme.border },
                      (!isCustomDuration && durationMinutes === min) && [styles.durationBtnActive, { backgroundColor: theme.accent, borderColor: theme.accent }]
                    ]}
                    onPress={() => {
                      setDurationMinutes(min);
                      setIsCustomDuration(false);
                    }}
                  >
                    <Text style={[
                      styles.durationBtnText,
                      { color: theme.subText },
                      (!isCustomDuration && durationMinutes === min) && styles.durationBtnTextActive
                    ]}>
                      {min < 60 ? `${min}m` : `${min / 60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity
                  style={[
                    styles.durationBtn,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                    isCustomDuration && [styles.durationBtnActive, { backgroundColor: theme.accent, borderColor: theme.accent }]
                  ]}
                  onPress={() => setIsCustomDuration(true)}
                >
                  <Text style={[
                    styles.durationBtnText,
                    { color: theme.subText },
                    isCustomDuration && styles.durationBtnTextActive
                  ]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomDuration && (
                <View style={styles.customDurationInputRow}>
                  <TextInput
                    style={[styles.customDurationInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
                    keyboardType="number-pad"
                    value={customDurationValue}
                    onChangeText={setCustomDurationValue}
                    placeholder="Mins"
                    placeholderTextColor={darkMode ? '#555' : '#ccc'}
                  />
                  <Text style={[styles.minutesLabel, { color: theme.subText }]}>minutes</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleSave}>
        <Ionicons name="checkmark-done" size={24} color="#fff" />
        <Text style={styles.saveButtonText}>Store Record</Text>
      </TouchableOpacity>

      {noteId && (
        <TouchableOpacity style={styles.discardAction} onPress={handleDelete}>
          <Ionicons name="trash-bin-outline" size={20} color="#b71c1c" />
          <Text style={styles.discardText}>Discard this record</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 60 }} />

      {showDatePicker && (
        <DateTimePicker
          value={alarmDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={alarmDate}
          mode="time"
          display="default"
          onChange={onChangeTime}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    marginTop: 20,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.8,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingVertical: 12,
    borderBottomWidth: 1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  conceptInput: {
    fontSize: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 150,
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    lineHeight: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  alarmContent: {
    marginTop: 20,
    gap: 16,
  },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  dateTimeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  systemAlarmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  systemAlarmLabel: {
    fontSize: 14,
  },
  durationSection: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  durationBtnActive: {
    // Colors handled via style prop
  },
  durationBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  durationBtnTextActive: {
    color: '#fff',
  },
  customDurationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  customDurationInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
  },
  minutesLabel: {
    fontSize: 14,
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    gap: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  discardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
    opacity: 0.8,
  },
  discardText: {
    color: '#b71c1c',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    textDecorationLine: 'underline',
    fontStyle: 'italic',
  },
});
