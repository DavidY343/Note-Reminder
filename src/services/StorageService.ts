import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../types/note';

const NOTES_KEY = '@notes_data';

export const StorageService = {
  async getNotes(): Promise<Note[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Failed to load notes', e);
      return [];
    }
  },

  async getNote(id: string): Promise<Note | undefined> {
    const notes = await this.getNotes();
    return notes.find(n => n.id === id);
  },

  async saveNote(note: Note): Promise<void> {
    try {
      const notes = await this.getNotes();
      const existingIndex = notes.findIndex(n => n.id === note.id);
      
      if (existingIndex >= 0) {
        notes[existingIndex] = note;
      } else {
        notes.push(note);
      }
      
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save note', e);
    }
  },

  async deleteNote(id: string): Promise<void> {
    try {
      const notes = await this.getNotes();
      const newNotes = notes.filter(n => n.id !== id);
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
    } catch (e) {
      console.error('Failed to delete note', e);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }
};
