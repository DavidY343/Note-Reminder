import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { Note } from '../types/note';

class VoiceAssistantService {
  private currentResolve?: (text: string) => void;

  constructor() {
    ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
      if (event.results && event.results.length > 0 && this.currentResolve) {
        const transcript = event.results[0].transcript;
        if (event.isFinal) {
          this.currentResolve(transcript);
          this.currentResolve = undefined;
          this.stopListening();
        }
      }
    });

    ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
      console.error('Speech Error:', event.error, event.message);
      if (this.currentResolve) {
        this.currentResolve('');
        this.currentResolve = undefined;
      }
      this.stopListening();
    });
  }

  private async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: 'es-ES',
        onDone: () => resolve(),
      });
    });
  }

  private async listen(): Promise<string> {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn('Speech permissions not granted');
      return '';
    }

    return new Promise(async (resolve) => {
      this.currentResolve = resolve;
      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'es-ES',
          interimResults: true,
        });
      } catch (e) {
        console.error(e);
        resolve('');
      }
    });
  }

  private stopListening() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Main flow to create a note via voice
   */
  public async startCreationFlow(): Promise<Partial<Note> | null> {
    try {
      // 1. Title
      await this.speak('¿Cuál es el título de la nota?');
      const title = await this.listen();
      if (!title) return null;

      // 2. Concept
      await this.speak('Dime el recordatorio.');
      const concept = await this.listen();
      if (!concept) return null;

      // 3. Date/Time
      await this.speak('¿Para cuándo la alarma? Di por ejemplo: hoy a las diez y media.');
      const timeStr = await this.listen();
      
      const alarmDate = this.parseVoiceDate(timeStr);

      await this.speak('Entendido, guardo la nota.');

      return {
        title,
        concept,
        alarmDate: alarmDate ? alarmDate.toISOString() : undefined
      };

    } catch (error) {
      console.error('Assistant Flow Error:', error);
      return null;
    }
  }

  private parseVoiceDate(text: string): Date | null {
    if (!text) return null;
    const now = new Date();
    const date = new Date();
    
    text = text.toLowerCase();

    // Basic day parsing
    if (text.includes('mañana')) {
      date.setDate(now.getDate() + 1);
    } else if (text.includes('pasado mañana')) {
      date.setDate(now.getDate() + 2);
    }

    // Numbers map
    const numbers: {[key: string]: number} = {
      'una': 1, 'un': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10, 
      'once': 11, 'doce': 12, 'media': 30, 'cuarto': 15
    };

    // Basic time parsing (e.g., "a las 5", "a las cinco", "17:00")
    const timeMatches = text.match(/(\d{1,2})(:(\d{2}))?/);
    let hours = -1;
    let minutes = 0;

    if (timeMatches) {
      hours = parseInt(timeMatches[1]);
      minutes = timeMatches[3] ? parseInt(timeMatches[3]) : 0;
    } else {
      // Try word parsing
      for (const [word, num] of Object.entries(numbers)) {
        if (text.includes(word)) {
          if (word === 'media') minutes = 30;
          else if (word === 'cuarto') minutes = 15;
          else if (hours === -1) hours = num;
        }
      }
    }

    if (hours === -1) {
      if (text.includes('luego')) {
        date.setHours(now.getHours() + 1);
        return date;
      }
      return null;
    }

    if ((text.includes('tarde') || text.includes('noche')) && hours < 12) {
      hours += 12;
    }
    
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}

export const VoiceService = new VoiceAssistantService();
