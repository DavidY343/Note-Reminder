import { Note } from '../types/note';
import { StorageService } from './StorageService';

/**
 * AgentAPIService
 * This service provides a programmatic interface for external AI agents
 * to interact with the Personal Archives. It is the foundation for 
 * future local API or WebSocket connectors.
 */
export const AgentAPIService = {
  /**
   * Retrieves all archives in a format optimized for AI context
   */
  async getArchivesForAgent(): Promise<string> {
    const notes = await StorageService.getNotes();
    if (notes.length === 0) return "The archive is currently empty.";
    
    return notes.map(note => {
      return `[ID: ${note.id}]
Title: ${note.title || 'Untitled'}
Content: ${note.concept || 'Empty'}
Reminder: ${note.alarmDate ? new Date(note.alarmDate).toLocaleString() : 'No alarm'}
---`;
    }).join('\n');
  },

  /**
   * Programmatic creation of a note from an agent
   */
  async createNoteFromAgent(data: { title: string; concept: string; alarmDate?: string }): Promise<Note> {
    const newNote: Note = {
      id: Date.now().toString(),
      title: data.title,
      concept: data.concept,
      alarmDate: data.alarmDate,
    };
    
    await StorageService.saveNote(newNote);
    return newNote;
  },

  /**
   * Search archives by keywords (useful for agents narrowing down context)
   */
  async searchArchives(query: string): Promise<Note[]> {
    const notes = await StorageService.getNotes();
    const q = query.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(q) || 
      n.concept.toLowerCase().includes(q)
    );
  }
};
