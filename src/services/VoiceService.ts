import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { HapticService } from './HapticService';
import { Note } from '../types/note';

class VoiceAssistantService {
  private currentResolve?: (text: string) => void;

  constructor() {
    ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
      if (event.results && event.results.length > 0 && this.currentResolve) {
        const transcript = event.results[0].transcript;
        console.log(`[VOICE] Transcript: "${transcript}" (Final: ${event.isFinal})`);
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
        await HapticService.impactLight();
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
      console.log(`[VOICE] Time request raw string: "${timeStr}"`);
      
      const alarmDate = this.parseVoiceDate(timeStr);
      console.log(`[VOICE] Parsed Date Result: ${alarmDate ? alarmDate.toLocaleString() : 'NULL'}`);

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
    
    // Cleanup and normalize
    text = text.toLowerCase().trim();

    // Map of text numbers to digits for day parsing
    const textToDigits: {[key: string]: string} = {
      'primero': '1', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4', 'cinco': '5',
      'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9', 'diez': '10',
      'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14', 'quince': '15',
      'dieciséis': '16', 'dieciseis': '16', 'diecisiete': '17', 'dieciocho': '18',
      'diecinueve': '19', 'veinte': '20', 'veintiuno': '21', 'veintidós': '22',
      'veintidos': '22', 'veintitrés': '23', 'veintitres': '23', 'veinticuatro': '24',
      'veinticinco': '25', 'veintiséis': '26', 'veintiseis': '26', 'veintisiete': '27',
      'veintiocho': '28', 'veintinueve': '29', 'treinta': '30', 'treinta y uno': '31'
    };

    // Replace text numbers with digits ONLY if followed by " de " or at the start of day patterns
    // to avoid messing up the "a las cuatro" time parsing later
    let processedText = text;
    for (const [word, digit] of Object.entries(textToDigits)) {
      const regex = new RegExp(`\\b${word}\\b(?= de |$|\\s| a las)`, 'g');
      processedText = processedText.replace(regex, digit);
    }

    console.log(`[VOICE] Processed text for parsing: "${processedText}"`);

    // Reset seconds/milliseconds for cleaner triggers
    date.setSeconds(0, 0);

    let dayIdentified = false;
    let specificWeekday = false;
    let specificDayOfMonth = false;

    // 1. Weekday indicators
    const daysOfWeek: {[key: string]: number} = {
      'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3, 
      'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6
    };

    let daysToAdd = 0;
    const nextWeekKeywords = [
      'semana que viene', 'próxima semana', 'proxima semana', 
      'semana siguiente', 'siguiente semana', 'dentro de una semana',
      'dentro de 1 semana', 'próximo', 'proximo'
    ];
    let nextWeekRequested = nextWeekKeywords.some(kw => processedText.includes(kw));

    // Support for "dentro de X días/semanas"
    const withinDaysMatch = processedText.match(/dentro de (\d{1,2}) d[íi]as/);
    const withinWeeksMatch = processedText.match(/dentro de (\d{1,2}) semanas/);

    if (withinDaysMatch) {
      date.setDate(now.getDate() + parseInt(withinDaysMatch[1]));
      dayIdentified = true;
    } else if (withinWeeksMatch) {
      date.setDate(now.getDate() + (parseInt(withinWeeksMatch[1]) * 7));
      dayIdentified = true;
    } else if (processedText.includes('hoy')) {
      dayIdentified = true;
    } else if (processedText.includes('mañana') && !processedText.includes('pasado mañana')) {
      date.setDate(now.getDate() + 1);
      dayIdentified = true;
    } else if (processedText.includes('pasado mañana')) {
      date.setDate(now.getDate() + 2);
      dayIdentified = true;
    } else {
      for (const [day, dayNum] of Object.entries(daysOfWeek)) {
        if (processedText.includes(day)) {
          const currentDay = now.getDay();
          daysToAdd = (dayNum - currentDay + 7) % 7;
          
          // If the day is today, but we are setting a reminder, we probably mean next week 
          // unless specifically stated "hoy" (already handled)
          if (daysToAdd === 0 && !processedText.includes('hoy')) daysToAdd = 7;
          
          // If "next week" is used, ensure we actually move to the next week
          if (nextWeekRequested && daysToAdd < 7) daysToAdd += 7;

          date.setDate(now.getDate() + daysToAdd);
          dayIdentified = true;
          specificWeekday = true;
          break;
        }
      }
      
      // If "next week" was said but NO specific day was found, default to Monday of next week
      if (nextWeekRequested && !dayIdentified) {
        const currentDay = now.getDay();
        // Days till next Monday: (1 - currentDay + 7) % 7. If today is Monday, add 7.
        let toMonday = (1 - currentDay + 7) % 7;
        if (toMonday === 0) toMonday = 7;
        date.setDate(now.getDate() + toMonday);
        dayIdentified = true;
      }
    }

    // 2. Specific day and month (e.g., "26 de marzo", "veinte de marzo")
    const months: {[key: string]: number} = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    const dayMonthMatch = processedText.match(/(\d{1,2}) de (\w+)/);
    if (dayMonthMatch) {
      const dayNum = parseInt(dayMonthMatch[1]);
      const monthName = dayMonthMatch[2];
      if (dayNum >= 1 && dayNum <= 31 && months[monthName] !== undefined) {
        date.setMonth(months[monthName]);
        date.setDate(dayNum);
        if (date.getTime() < (now.getTime() - 86400000)) {
          date.setFullYear(now.getFullYear() + 1);
        }
        dayIdentified = true;
        specificDayOfMonth = true;
      }
    } else {
      // 3. Just "el 26" or "el dia 10"
      const dayOfMonthMatch = processedText.match(/(el día |el |para el )(\d{1,2})/);
      if (dayOfMonthMatch) {
        const dayNum = parseInt(dayOfMonthMatch[2]);
        if (dayNum >= 1 && dayNum <= 31) {
          date.setDate(dayNum);
          if (date.getTime() < (now.getTime() - 3600000) && !dayIdentified) {
            date.setMonth(date.getMonth() + 1);
          }
          dayIdentified = true;
          specificDayOfMonth = true;
        }
      }
    }

    // 4. Time Parsing
    let hours = -1;
    let minutes = 0;

    // First try digits: "10:30", "10 y 30", "a las 4"
    const timeDigitPattern = processedText.match(/(?:a las |las )?(\d{1,2})(?::| y | )(\d{2})|(?::|las |a las )(\d{1,2})/);
    if (timeDigitPattern) {
      if (timeDigitPattern[1] && timeDigitPattern[2]) {
        hours = parseInt(timeDigitPattern[1]);
        minutes = parseInt(timeDigitPattern[2]);
      } else if (timeDigitPattern[3]) {
        hours = parseInt(timeDigitPattern[3]);
      }
    }

    // If still no hours, or we need to check words again (like "veinte")
    const words: {[key: string]: number} = {
      'una': 1, 'un': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10, 
      'once': 11, 'doce': 12, 'mediodía': 12, 'mediodia': 12
    };

    if (hours === -1) {
      for (const [word, num] of Object.entries(words)) {
        if (text.includes(word)) { // Use original text to avoid processed digit confusion
          hours = num;
          break;
        }
      }
    }

    // Minutes in words (original text)
    if (text.includes('media')) minutes = 30;
    else if (text.includes('cuarto')) minutes = 15;
    else if (text.includes(' y veinte')) minutes = 20;
    else if (text.includes(' y diez')) minutes = 10;

    // Handle the "12 AM" default if a day was found but no time
    if (hours === -1) {
      if (text.includes('luego')) {
        date.setHours(now.getHours() + 1);
        return date;
      }
      if (dayIdentified) {
        // PER USER REQUEST: Default to 12 AM (00:00) if only a day is mentioned
        hours = 0;
        minutes = 0;
      } else {
        return null;
      }
    }

    // AM/PM Correction
    if ((text.includes('tarde') || text.includes('noche') || text.includes('pm')) && hours < 12) {
      hours += 12;
    } else if (text.includes('mañana') && !dayIdentified && hours >= 1 && hours <= 12) {
      // If "at 8 in the morning" and we didn't use "mañana" for the day
      hours = hours === 12 ? 0 : hours;
    } else if (text.includes('media noche') || text.includes('medianoche')) {
      hours = 0;
      minutes = 0;
    }
    
    date.setHours(hours, minutes, 0, 0);

    // 5. Logical Jump to Future
    if (date.getTime() < now.getTime()) {
      if (specificWeekday) {
        date.setDate(date.getDate() + 7);
      } else if (specificDayOfMonth) {
        date.setMonth(date.getMonth() + 1);
      } else if (text.includes('hoy') || hours !== -1) {
        // If hour is past today, push to tomorrow
        date.setDate(date.getDate() + 1);
      }
    }

    return date;
  }
}

export const VoiceService = new VoiceAssistantService();
