
export interface TranscriptEntry {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: Date;
  sourceLang: string;
  targetLang: string;
  speaker: 'provider' | 'patient';
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'zh-CN', name: 'Mandarin', flag: '🇨🇳' },
  { code: 'vi-VN', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' }
];
