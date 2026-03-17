import * as Speech from 'expo-speech';

export const SpeechService = {
  speak: (text: string) => {
    Speech.speak(text, {
      language: 'es-ES', // or dynamically get device locale
      pitch: 1.0,
      rate: 0.9,
    });
  },

  stop: () => {
    Speech.stop();
  }
};
