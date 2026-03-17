import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Platform, Modal, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Note } from '../types/note';
import { StorageService } from '../services/StorageService';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { NotificationService } from '../services/NotificationService';
import { CalendarService } from '../services/CalendarService';
import * as Calendar from 'expo-calendar';
import { VoiceService } from '../services/VoiceService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<Calendar.Calendar[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await StorageService.getItem('@dark_mode');
    if (saved !== null) setDarkMode(saved === 'true');
  };

  const toggleDarkMode = async () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    await StorageService.setItem('@dark_mode', newValue.toString());
  };

  const theme = {
    bg: darkMode ? '#1a1a1a' : '#f5f2ed',
    card: darkMode ? '#262626' : '#ffffff',
    text: darkMode ? '#e0e0e0' : '#4e342e',
    subText: darkMode ? '#a0a0a0' : '#6d4c41',
    accent: darkMode ? '#d4a373' : '#5d4037',
    border: darkMode ? '#404040' : '#d7ccc8',
    cardBorder: darkMode ? '#333333' : '#e0e0e0',
  };

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const loadNotes = async () => {
    const loaded = await StorageService.getNotes();
    setNotes(loaded);
  };

  const deleteNote = async (id: string) => {
    const note = await StorageService.getNote(id);
    if (note?.calendarEventId) {
      await CalendarService.deleteCalendarEvent(note.calendarEventId);
    }
    await NotificationService.cancelNoteAlarm(id);
    await StorageService.deleteNote(id);
    loadNotes();
  };

  const showAccountSelector = async () => {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const googleCalendars = calendars.filter((c: Calendar.Calendar) => c.isPrimary && (c.source.type === 'com.google' || Platform.OS === 'ios'));
    setAvailableCalendars(googleCalendars);
    setIsModalVisible(true);
  };

  const handleSelectCalendar = async (cal: Calendar.Calendar) => {
    await CalendarService.setPreferredCalendarId(cal.id);
    setIsModalVisible(false);
    Alert.alert('Configurado', `Ahora usaremos: ${cal.title}`);
  };

  const handleVoiceAssistant = async () => {
    const results = await VoiceService.startCreationFlow();
    if (results) {
      // Navigate to CreateNote with the partial data
      navigation.navigate('CreateNote', { 
        initialTitle: results.title,
        initialConcept: results.concept,
        initialAlarmDate: results.alarmDate
      });
    }
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity 
        style={[styles.deleteAction, { backgroundColor: darkMode ? '#3d1a1a' : '#efebe9' }]} 
        onPress={() => deleteNote(id)}
      >
        <Ionicons name="archive-outline" size={28} color="#b71c1c" />
      </TouchableOpacity>
    );
  };

  const renderNote = ({ item }: { item: Note }) => {
    const hasAlarm = !!item.alarmDate;
    const formattedDate = item.alarmDate ? new Date(item.alarmDate).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '';

    return (
      <View style={styles.noteWrapper}>
        <Swipeable
          renderRightActions={() => renderRightActions(item.id)}
          friction={2}
          rightThreshold={40}
        >
          <TouchableOpacity 
            style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            onPress={() => navigation.navigate('CreateNote', { noteId: item.id })}
            activeOpacity={1}
          >
            <View style={styles.noteHeader}>
              <Text style={[styles.noteTitle, { color: theme.text }]} numberOfLines={1}>{item.title || 'Untitled Note'}</Text>
              {hasAlarm && (
                <View style={[styles.alarmBadge, { backgroundColor: darkMode ? 'rgba(212, 163, 115, 0.1)' : '#faf9f6', borderColor: theme.accent }]}>
                  <Ionicons name="alarm-outline" size={14} color={theme.accent} />
                  <Text style={[styles.alarmBadgeText, { color: theme.accent }]}>{formattedDate}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.noteConcept, { color: theme.subText }]} numberOfLines={2}>
              {item.concept || 'No concept available'}
            </Text>
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.vintageHeader}>
        <View>
          <Text style={[styles.vintageSub, { color: theme.subText }]}>THE COLLECTION OF</Text>
          <Text style={[styles.title, { color: theme.text }]}>Mementos</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: darkMode ? '#333' : '#efebe9', borderColor: theme.border }]} 
            onPress={() => setIsInfoVisible(true)}
          >
            <Ionicons name="help-circle-outline" size={24} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: darkMode ? '#333' : '#efebe9', borderColor: theme.border }]} 
            onPress={toggleDarkMode}
          >
            <Ionicons name={darkMode ? "sunny-outline" : "moon-outline"} size={24} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: darkMode ? '#333' : '#efebe9', borderColor: theme.border }]} 
            onPress={showAccountSelector}
          >
            <Ionicons name="journal-outline" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="note-add" size={80} color="#334155" />
            <Text style={styles.emptyText}>No notes yet. Create one!</Text>
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.micButton, { backgroundColor: theme.card, borderColor: theme.accent }]} 
          onPress={handleVoiceAssistant}
        >
          <Ionicons name="mic" size={28} color={theme.accent} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: theme.accent }]} 
          onPress={() => navigation.navigate('CreateNote', {})}
        >
          <Ionicons name="add" size={36} color={darkMode ? theme.bg : '#fff'} />
        </TouchableOpacity>
      </View>
      <Modal
        visible={isInfoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsInfoVisible(false)}
      >
        <View style={styles.infoOverlay}>
          <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Manual de Mementos</Text>
            <ScrollView style={styles.infoContent}>
              <InfoItem icon="add-circle" title="Crear Notas" desc="Usa el botón '+' para añadir una nueva nota. Puedes dictarla con el micrófono." theme={theme} />
              <InfoItem icon="alarm" title="Alarmas" desc="Activa 'Enable Alarm' para recibir una notificación en la hora elegida." theme={theme} />
              <InfoItem icon="calendar" title="Google Calendar" desc="Las notas con alarma se sincronizan automáticamente con tu cuenta elegida." theme={theme} />
              <InfoItem icon="time" title="Duración" desc="Elige cuánto tiempo ocupará la nota en tu calendario (30m, 1h, etc)." theme={theme} />
              <InfoItem icon="settings" title="Cuentas" desc="Cambia tu cuenta de Google pulsando el icono del cuaderno." theme={theme} />
              <InfoItem icon="swap-horizontal" title="Borrar" desc="Desliza una nota a la izquierda para eliminarla del sistema y del calendario." theme={theme} />
            </ScrollView>
            <TouchableOpacity 
              style={[styles.closeFab, { backgroundColor: theme.accent }]} 
              onPress={() => setIsInfoVisible(false)}
            >
              <Text style={styles.closeFabText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Configurar Calendario</Text>
            <Text style={[styles.modalSubtitle, { color: theme.subText }]}>Elige la cuenta de Google para guardar tus notas:</Text>
            
            <FlatList
              data={availableCalendars}
              keyExtractor={(item) => item.id}
              style={styles.accountList}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.accountItem, { backgroundColor: theme.card, borderColor: theme.border }]} 
                  onPress={() => handleSelectCalendar(item)}
                >
                  <Ionicons name="mail-outline" size={20} color={theme.accent} />
                  <Text style={[styles.accountText, { color: theme.text }]}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={[styles.closeButtonText, { color: theme.subText }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function InfoItem({ icon, title, desc, theme }: any) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={24} color={theme.accent} />
      <View style={styles.infoText}>
        <Text style={[styles.infoTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.infoDesc, { color: theme.subText }]}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f2ed', // Old paper / Cream
    paddingTop: 60,
  },
  vintageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  actionBtn: {
    padding: 8,
    borderRadius: 50,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  noteWrapper: {
    marginBottom: 16,
  },
  noteCard: {
    backgroundColor: '#ffffff', 
    borderRadius: 2, // Slight sharp edges for paper feel
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderBottomWidth: 3,
    borderRightWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteTitle: {
    color: '#3e2723',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    flex: 1,
    marginRight: 10,
  },
  noteConcept: {
    color: '#6d4c41',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  alarmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf9f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8d6e63',
  },
  alarmBadgeText: {
    color: '#5d4037',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    marginTop: 16,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    alignItems: 'center',
    gap: 16,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#8d6e63',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#5d4037', // Deep wooden brown
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#d7ccc8',
    borderStyle: 'dashed',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f5f2ed',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#d7ccc8',
  },
  modalTitle: {
    color: '#4e342e',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  modalSubtitle: {
    color: '#8d6e63',
    fontSize: 15,
    marginBottom: 20,
  },
  accountList: {
    marginBottom: 20,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#d7ccc8',
    marginBottom: 12,
  },
  accountText: {
    color: '#5d4037',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  closeButton: {
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  infoCard: {
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  infoContent: {
    marginTop: 20,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeFab: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeFabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  vintageSub: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 'bold',
    opacity: 0.8,
  },
});
