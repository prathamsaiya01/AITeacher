// Domain models for the AI Teacher app

export type Language = 'English' | 'Hindi' | 'Hinglish';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type TeachingStyle = 'Socratic' | 'Direct' | 'Storytelling' | 'Visual';
export type Depth = 'Overview' | 'Standard' | 'Deep Dive';
export type TimeOption = 5 | 20 | 30 | 60 | 7; // minutes, 7 = 7 days
export type SubjectType =
  | 'Mathematics'
  | 'Physics'
  | 'Biology'
  | 'History'
  | 'Programming'
  | 'General';

export interface Student {
  id: string;
  name: string;
  level: Level;
  language: Language;
  goal: string;
  teachingStyle: TeachingStyle;
  depth: Depth;
  availableTime: TimeOption;
  createdAt: string;
}

export type QuestionType =
  | 'MCQ'
  | 'Conceptual'
  | 'Short Answer'
  | 'Problem Solving'
  | 'Application Based';

export interface QuestionOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  conceptId: string;
  difficulty: number; // 1-5
  hint?: string;
}

export interface Answer {
  questionId: string;
  response: string;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  estimatedMinutes: number;
  isStrong?: boolean;
  isWeak?: boolean;
}

export interface Misconception {
  id: string;
  conceptId: string;
  conceptName: string;
  description: string;
  alternativeExplanation: string;
  analogy: string;
  simplerExample: string;
}

export interface Evaluation {
  isCorrect: boolean;
  feedback: string;
  misconception?: Misconception;
  newDifficulty: number;
  understandingDelta: number; // +/- percentage
  shouldReExplain: boolean;
}

export interface LessonSegment {
  id: string;
  title: string;
  type: 'teach' | 'question' | 'example' | 'visual' | 'summary';
  conceptId: string;
  durationMin: number;
  description: string;
  completed: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  subject: SubjectType;
  topic: string;
  studentId: string;
  concepts: Concept[];
  segments: LessonSegment[];
  estimatedMinutes: number;
  createdAt: string;
  status: 'planned' | 'in-progress' | 'completed';
}

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  conceptId: string;
  maxScore: number;
}

export interface AssessmentResult {
  assessmentId: string;
  lessonId: string;
  answers: { questionId: string; response: string; score: number; isCorrect: boolean; conceptId?: string }[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

export interface LearningReport {
  lessonId: string;
  score: number;
  conceptsUnderstood: string[];
  strongAreas: string[];
  weakAreas: string[];
  misconceptions: Misconception[];
  recommendedRevision: string[];
  suggestedNextTopic: string;
  summary: string;
}

export interface ProgressEntry {
  date: string;
  score: number;
  conceptsMastered: number;
  learningMinutes: number;
  subject: SubjectType;
}

export interface LearningPathNode {
  id: string;
  title: string;
  description: string;
  subject: SubjectType;
  status: 'completed' | 'current' | 'available' | 'locked';
  order: number;
  estimatedMinutes: number;
  prerequisites: string[];
  recommended?: boolean;
}

export interface LearningPath {
  id: string;
  title: string;
  studentId: string;
  nodes: LearningPathNode[];
}

export interface TeachingSessionState {
  lessonId: string;
  currentSegmentIndex: number;
  currentConceptId: string;
  understandingPercentage: number;
  strongConcepts: string[];
  weakConcepts: string[];
  lessonProgress: number; // 0-100
  currentQuestion: Question | null;
  awaitingAnswer: boolean;
  teacherMessage: string;
  teacherStatus: string;
  difficulty: number;
  history: { role: 'teacher' | 'student'; content: string; timestamp: string }[];
}

export interface UploadedDocument {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  extractedText: string;
  chunks: { id: string; text: string; embedding: number[] }[];
  uploadedAt: string;
}

export interface DashboardStats {
  lessonsCompleted: number;
  totalLearningMinutes: number;
  averageScore: number;
  streak: number;
  strongConcepts: string[];
  weakConcepts: string[];
  recommendedLessons: { id: string; title: string; subject: SubjectType; reason: string }[];
  continueLearning: { lessonId: string; title: string; progress: number; subject: SubjectType } | null;
}

export interface TeachingVideo {
  id: string;
  url: string;
  durationSeconds: number;
  status: 'generating' | 'ready' | 'error';
  transcript: string;
}

export interface ChatMessage {
  role: 'teacher' | 'student';
  content: string;
  timestamp: string;
  conceptId?: string;
}
