// Domain models for the AI Teacher app

export type Language = 'English' | 'Hindi' | 'Hinglish';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type TeachingStyle = 'Socratic' | 'Direct' | 'Storytelling' | 'Visual';
export type Depth = 'Overview' | 'Standard' | 'Deep Dive';
export type TimeOption = 5 | 10 | 20 | 30 | 60 | 1 | 3 | 7; // minutes, day values are interpreted as multi-day plans
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

export interface TeacherPersona {
  id: string;
  name: string;
  title: string;
  style: string;
  avatarUrl: string;
  promptStyle: string;
}

export const DEFAULT_TEACHER_PERSONAS: TeacherPersona[] = [
  {
    id: 'prof-hardik',
    name: 'Prof. Hardik',
    title: 'The Rigorous Socratic Checker',
    style: 'Strict, rigorous, and precise',
    avatarUrl: '',
    promptStyle: 'Focus on edge cases, precise terminology, deep conceptual proofs, and challenging assumptions. Do not reward a lucky guess without sound reasoning.',
  },
  {
    id: 'prof-nova',
    name: 'Prof. Nova',
    title: 'The Empathetic Concept Guide',
    style: 'Clear, empathetic, and analogy-driven',
    avatarUrl: '',
    promptStyle: 'Reward conceptual intuition, explain ideas with approachable analogies and visual examples, and make difficult ideas feel manageable without losing accuracy.',
  },
  {
    id: 'captain-code',
    name: 'Captain Code',
    title: 'The Practical Application Mentor',
    style: 'Fast-paced, practical, and real-world focused',
    avatarUrl: '',
    promptStyle: 'Move quickly toward practical application, use real-world scenarios and hands-on challenges, and prioritize useful implementation over abstract exposition.',
  },
];

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

export interface LessonSectionPlan {
  title: string;
  importance: 'essential' | 'important' | 'supporting';
  allocatedMinutes: number;
  concepts: string[];
  explanationDepth: 'brief' | 'medium' | 'deep';
  examples: string[];
  questions: string[];
}

export interface LessonDayPlan {
  day: number;
  objective: string;
  topics: string[];
  activities: string[];
  estimatedMinutes: number;
  status: 'completed' | 'current' | 'locked' | 'upcoming';
}

export interface LessonTimePlan {
  totalMinutes: number;
  durationUnit: 'minutes' | 'days';
  totalSections: number;
  sections: LessonSectionPlan[];
  assessmentMinutes: number;
  remainingTimeStrategy: string;
  completionCriteria: string[];
  days?: LessonDayPlan[];
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
  durationMinutes?: number;
  durationUnit?: 'minutes' | 'days';
  timePlan?: LessonTimePlan;
  days?: LessonDayPlan[];
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
  lessonId?: string;
  lessonTitle?: string;
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
