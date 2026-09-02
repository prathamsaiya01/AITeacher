import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Student, Lesson, UploadedDocument, LearningReport, AssessmentResult, ProgressEntry, DashboardStats, LearningPath } from '@/models';
import type { StudentProgress } from '@/services/studentService';
import { generateLearningPath, generateLesson as generateGeminiLesson, type GenerateLessonParams } from '@/services/aiService';
import { getStudentProgress } from '@/services/studentService';

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
  progress: StudentProgress | null;
  learningPath: LearningPath | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  generateLesson: (params?: Partial<GenerateLessonParams>) => Promise<Lesson | null>;
  refreshData: () => Promise<void>;
  refreshProgress: () => Promise<void>;
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
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshProgress = useCallback(async () => {
    if (!student) return;
    const nextProgress = await getStudentProgress(student.id);
    setProgress(nextProgress);
    setProgressEntries(nextProgress.entries);
    setDashboardStats({
      lessonsCompleted: nextProgress.lessonsCompleted,
      totalLearningMinutes: nextProgress.totalLearningMinutes,
      averageScore: nextProgress.averageScore,
      streak: nextProgress.streak,
      strongConcepts: nextProgress.strongConcepts,
      weakConcepts: nextProgress.weakConcepts,
      recommendedLessons: [],
      continueLearning: null,
    });
  }, [student]);

  const refreshData = useCallback(async () => {
    if (!student) return;
    await Promise.all([
      refreshProgress(),
      generateLearningPath(student).then(setLearningPath),
    ]);
  }, [refreshProgress, student]);

  const handleGenerateLesson = useCallback(
    async (params?: Partial<GenerateLessonParams>): Promise<Lesson | null> => {
      const activeStudent = student || {
        id: 'default_student',
        name: 'Student',
        level: (params?.studentLevel || 'Intermediate') as Student['level'],
        language: (params?.language || 'English') as Student['language'],
        goal: params?.learningGoal || 'Master core concepts',
        teachingStyle: (params?.teachingStyle || 'Visual') as Student['teachingStyle'],
        depth: 'Standard',
        availableTime: 30,
        createdAt: new Date().toISOString(),
      };

      const currentTopic = topic || params?.topic || 'General Science';
      const requestedTime = params?.availableTime ?? `${activeStudent.availableTime} ${activeStudent.availableTime === 1 || activeStudent.availableTime === 3 || activeStudent.availableTime === 7 ? 'days' : 'minutes'}`;
      setIsLoading(true);
      try {
        const generatedLesson = await generateGeminiLesson(
          activeStudent,
          currentTopic,
          uploadedDoc || undefined,
          { ...params, availableTime: requestedTime }
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
        progress,
        learningPath,
        isLoading,
        setIsLoading,
        generateLesson: handleGenerateLesson,
        refreshData,
        refreshProgress,
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