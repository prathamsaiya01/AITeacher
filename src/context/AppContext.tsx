import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Student, Lesson, UploadedDocument, LearningReport, AssessmentResult, ProgressEntry, DashboardStats, LearningPath } from '@/models';
import { getDashboardStats, getProgressEntries, generateLearningPath, generateLesson as generateGeminiLesson, type GenerateLessonParams } from '@/services/aiService';

interface AppContextValue {
  student: Student | null;
  setStudent: (s: Student | null) => void;
  uploadedDoc: UploadedDocument | null;
  setUploadedDoc: (d: UploadedDocument | null) => void;
  topic: string;
  setTopic: (t: string) => void;
  lesson: Lesson | null;
  setLesson: (l: Lesson | null) => void;
  assessmentResult: AssessmentResult | null;
  setAssessmentResult: (r: AssessmentResult | null) => void;
  learningReport: LearningReport | null;
  setLearningReport: (r: LearningReport | null) => void;
  dashboardStats: DashboardStats | null;
  progressEntries: ProgressEntry[];
  learningPath: LearningPath | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  generateLesson: (params?: Partial<GenerateLessonParams>) => Promise<Lesson | null>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);
  const [topic, setTopic] = useState('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [learningReport, setLearningReport] = useState<LearningReport | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshData = useCallback(async () => {
    if (!student) return;
    const [stats, entries, path] = await Promise.all([
      getDashboardStats(student),
      getProgressEntries(student),
      generateLearningPath(student),
    ]);
    setDashboardStats(stats);
    setProgressEntries(entries);
    setLearningPath(path);
  }, [student]);

  const handleGenerateLesson = useCallback(
    async (params?: Partial<GenerateLessonParams>): Promise<Lesson | null> => {
      const activeStudent = student || {
        id: 'default_student',
        name: 'Student',
        gradeLevel: params?.studentLevel || 'High School',
        preferredLanguage: params?.language || 'English',
        learningStyle: params?.teachingStyle || 'Visual',
        interests: [],
        createdAt: new Date().toISOString(),
      };

      const currentTopic = topic || params?.topic || 'General Science';
      setIsLoading(true);
      try {
        const generatedLesson = await generateGeminiLesson(
          activeStudent,
          currentTopic,
          uploadedDoc || undefined,
          params
        );
        setLesson(generatedLesson);
        return generatedLesson;
      } catch (err) {
        console.error('Failed to generate lesson:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [student, topic, uploadedDoc]
  );

  return (
    <AppContext.Provider
      value={{
        student,
        setStudent,
        uploadedDoc,
        setUploadedDoc,
        topic,
        setTopic,
        lesson,
        setLesson,
        assessmentResult,
        setAssessmentResult,
        learningReport,
        setLearningReport,
        dashboardStats,
        progressEntries,
        learningPath,
        isLoading,
        setIsLoading,
        generateLesson: handleGenerateLesson,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}