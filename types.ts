
export enum Difficulty {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced'
}

export enum QuestionType {
  TranslateToEnglish = 'translate_to_eng',
  TranslateToBengali = 'translate_to_bng',
  FillBlank = 'fill_blank',
  Pronunciation = 'pronunciation',
  WordBuilder = 'word_builder'
}

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string; // Explanation in Bengali
}

export interface LessonData {
  topic: string;
  title: string; // Title in Bengali
  questions: Question[];
}

export interface UserState {
  username: string; // User's display name
  xp: number;
  hearts: number;
  level: Difficulty;
  completedLessons: string[]; // IDs of completed topics
  streak: number;
  lastLessonDate?: string; // ISO Date string or Date string to track daily activity
  avatar?: string;
  themeColor?: string;
}

export interface DictionaryResult {
  word: string;
  phonetic: string;
  meaning: string; // Bengali
  definition: string; // English
  examples: string[]; // Changed from single example string to array
  synonyms: string[];
  pronunciationTip?: string; // Bengali pronunciation guide
}