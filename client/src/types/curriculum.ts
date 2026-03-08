export type CurriculumPayload = {
  curriculum: Curriculum;
};

export type Curriculum = {
  sourceLanguage: LanguageInfo;
  targetLanguage: LanguageInfo;
  proficiencyLevels: ProficiencyLevel[];
  metadata: CurriculumMetadata;
};

export type LanguageInfo = {
  code: string;
  name: string;
  nativeName: string;
};

export type LanguagePair = {
  source_code: string;
  target_code: string;
  source_name: string;
  source_native_name: string;
  target_name: string;
  target_native_name: string;
  created_at: string;
  updated_at: string;
};

export type CurriculumRecord = {
  source_code: string;
  target_code: string;
  data: CurriculumPayload;
  schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CurriculumMetadata = {
  version: string;
  lastUpdated: string;
  author: string;
};

export type ProficiencyLevel = {
  id: string;
  name: string;
  cefrLevel: string;
  order: number;
  description: string;
  sections: Section[];
};

export type Section = {
  id: string;
  title: string;
  description: string;
  order: number;
  topicsCovered: string[];
  units: Unit[];
  checkpoint?: Checkpoint;
};

export type Checkpoint = {
  title: string;
  estimatedMinutes?: number;
  exercises: Exercise[];
};

export type Unit = {
  id: string;
  title: string;
  order: number;
  topic: string;
  objectives: string[];
  newVocabulary: VocabularyEntry[];
  grammarFocus: string;
  culturalNote?: string;
  estimatedMinutes: number;
  pointsValue: number;
  passThreshold: number;
  exercises: Exercise[];
};

export type VocabularyEntry = {
  term: string;
  definition: string;
  phonetic: string;
  partOfSpeech: string;
  gender?: string | null;
  exampleSentence?: string;
  exampleTranslation?: string;
};

export type ExerciseType =
  | "pronunciation"
  | "complete_chat"
  | "listen_select"
  | "matching_pairs"
  | "select_translation"
  | "reorder_words"
  | "fill_blank"
  | "multiple_choice"
  | "grammar"
  | "write_response";

export type ExerciseOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type PronunciationWord = {
  word: string;
  meaning: string;
  phonetic: string;
  isNew: boolean;
};

export type DialogueLine = {
  speaker: "app" | "user";
  text: string | null;
  translation?: string;
};

export type MatchingPair = {
  source: string;
  target: string;
};

export type FillBlank = {
  position: number;
  acceptedAnswers: string[];
  caseSensitive?: boolean;
};

export type PronunciationContent = {
  sentence: string;
  translation: string;
  audioUrl?: string;
  words: PronunciationWord[];
};

export type CompleteChatContent = {
  dialogue: DialogueLine[];
  options: ExerciseOption[];
};

export type ListenSelectContent = {
  audioUrl?: string;
  transcript: string;
  options: ExerciseOption[];
};

export type MatchingPairsContent = {
  pairs: MatchingPair[];
};

export type SelectTranslationContent = {
  prompt: string;
  promptLanguage: "source" | "target";
  options: ExerciseOption[];
};

export type ReorderWordsContent = {
  shuffledWords: string[];
  correctOrder: string[];
  translation: string;
};

export type FillBlankContent = {
  text: string;
  context?: string;
  blanks: FillBlank[];
};

export type MultipleChoiceContent = {
  question: string;
  options: ExerciseOption[];
};

export type GrammarContent = {
  rule: string;
  question: string;
  options: ExerciseOption[];
  explanation: string;
};

export type WriteResponseContent = {
  prompt: string;
  text: string;
  audioUrl?: string;
  acceptedKeywords: string[];
  sampleAnswer: string;
  minWords?: number;
  maxWords?: number;
};

export type Exercise = {
  exerciseId: string;
  type: ExerciseType;
  instruction: string;
  points: number;
  timeLimit?: number;
  explanation?: string;
  hint?: string;
  content: Record<string, any>;
};

/** @deprecated Use ProficiencyLevel instead */
export type Category = ProficiencyLevel;

/** @deprecated Use Unit instead */
export type Level = Unit;
