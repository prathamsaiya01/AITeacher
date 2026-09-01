import { createClient } from '@supabase/supabase-js';
import type { AssessmentResult, Lesson, ProgressEntry, SubjectType } from '@/models';
import type { MaterialAnalysisResult } from '@/services/multimodalService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface StudentProgress {
  entries: ProgressEntry[];
  averageScore: number;
  totalLearningMinutes: number;
  lessonsCompleted: number;
  masteredConcepts: string[];
  strongConcepts: string[];
  weakConcepts: string[];
  subjectDistribution: Partial<Record<SubjectType, number>>;
  streak: number;
  scoreHistoryDates: string[];
  scoreHistoryValues: number[];
}

export interface StudentMemoryContext {
  masteredConcepts: string[];
  strongConcepts: string[];
  weakConcepts: string[];
}

export interface UploadedMaterial {
  id: string;
  studentId: string;
  filePath: string;
  subject: string;
  topic: string;
  concepts: MaterialAnalysisResult['concepts'];
  createdAt: string;
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase configuration is missing');
  return supabase;
}

function emptyProgress(): StudentProgress {
  return {
    entries: [],
    averageScore: 0,
    totalLearningMinutes: 0,
    lessonsCompleted: 0,
    masteredConcepts: [],
    strongConcepts: [],
    weakConcepts: [],
    subjectDistribution: {},
    streak: 0,
    scoreHistoryDates: [],
    scoreHistoryValues: [],
  };
}

export async function saveCompletedLesson(studentId: string, lessonData: Lesson): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('lessons').insert({
    student_id: studentId,
    title: lessonData.title,
    subject: lessonData.subject,
    topic: lessonData.topic,
    status: 'completed',
    duration_minutes: lessonData.estimatedMinutes || 0,
    created_at: lessonData.createdAt,
  });
  if (error) throw new Error(`Failed to save completed lesson: ${error.message}`);
}

export async function getStudentMemoryContext(studentId: string): Promise<StudentMemoryContext> {
  try {
    const client = requireSupabase();
    const { data, error } = await client
      .from('assessment_results')
      .select('strong_concepts, weak_concepts')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const strongConcepts = [...new Set(rows.flatMap((row) => row.strong_concepts || []))];
    const weakConcepts = [...new Set(rows.flatMap((row) => row.weak_concepts || []))];
    return {
      masteredConcepts: strongConcepts,
      strongConcepts,
      weakConcepts,
    };
  } catch (error) {
    console.error('Failed to load student memory:', error);
    return { masteredConcepts: [], strongConcepts: [], weakConcepts: [] };
  }
}

export async function saveAssessmentResult(
  studentId: string,
  assessmentResult: AssessmentResult & { strongConcepts?: string[]; weakConcepts?: string[] }
): Promise<void> {
  const client = requireSupabase();
  const strongConcepts = Array.from(new Set(
    (assessmentResult.strongConcepts || assessmentResult.answers.filter((answer) => answer.isCorrect).map((answer) => answer.conceptId).filter(Boolean)) as string[]
  ));
  const weakConcepts = Array.from(new Set(
    (assessmentResult.weakConcepts || assessmentResult.answers.filter((answer) => !answer.isCorrect).map((answer) => answer.conceptId).filter(Boolean)) as string[]
  ));
  const { error } = await client.from('assessment_results').insert({
    student_id: studentId,
    lesson_id: assessmentResult.lessonId,
    score: assessmentResult.totalScore,
    max_score: assessmentResult.maxScore,
    percentage: assessmentResult.percentage,
    strong_concepts: strongConcepts,
    weak_concepts: weakConcepts,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to save assessment result: ${error.message}`);
}

export async function saveUploadedMaterial(
  studentId: string,
  file: File,
  analysis: MaterialAnalysisResult
): Promise<void> {
  if (!supabase) {
    console.error('Uploaded material storage error: Supabase configuration is missing');
    return;
  }

  try {
    const fileName = `${studentId}/${Date.now()}_${file.name}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('uploaded_materials')
      .upload(fileName, file);

    if (storageError) console.warn('Storage upload warn:', storageError);

    const { error: dbError } = await supabase.from('uploaded_materials').insert({
      student_id: studentId,
      file_path: storageData?.path || fileName,
      subject: analysis.subject,
      topic: analysis.topic,
      concepts: analysis.concepts,
    });

    if (dbError) console.error('Database insert error:', dbError);
  } catch (error) {
    console.error('Failed to save uploaded material:', error);
  }
}

export async function getUploadedMaterials(studentId: string): Promise<UploadedMaterial[]> {
  if (!supabase) {
    console.error('Uploaded material history error: Supabase configuration is missing');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('uploaded_materials')
      .select('id, student_id, file_path, subject, topic, concepts, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load uploaded materials:', error);
      return [];
    }

    return (data || []).map((material) => ({
      id: material.id,
      studentId: material.student_id,
      filePath: material.file_path,
      subject: material.subject,
      topic: material.topic,
      concepts: material.concepts || [],
      createdAt: material.created_at,
    }));
  } catch (error) {
    console.error('Failed to load uploaded materials:', error);
    return [];
  }
}

export async function getStudentProgress(studentId: string): Promise<StudentProgress> {
  try {
    const client = requireSupabase();
    const [{ data: lessons, error: lessonsError }, { data: results, error: resultsError }] = await Promise.all([
      client.from('lessons').select('id, title, subject, topic, duration_minutes, created_at').eq('student_id', studentId).eq('status', 'completed').order('created_at', { ascending: true }),
      client.from('assessment_results').select('lesson_id, percentage, strong_concepts, weak_concepts, created_at').eq('student_id', studentId).order('created_at', { ascending: true }),
    ]);
    if (lessonsError) throw lessonsError;
    if (resultsError) throw resultsError;

    const completedLessons = lessons || [];
    const assessmentRows = results || [];
    if (completedLessons.length === 0 && assessmentRows.length === 0) return emptyProgress();

    const lessonsById = new Map(completedLessons.map((lesson) => [lesson.id, lesson]));
    const entries: ProgressEntry[] = assessmentRows.map((result) => {
      const lesson = lessonsById.get(result.lesson_id);
      return {
        date: result.created_at,
        score: Number(result.percentage) || 0,
        conceptsMastered: new Set((result.strong_concepts || []).filter(Boolean)).size,
        learningMinutes: Number(lesson?.duration_minutes) || 0,
        subject: (lesson?.subject || 'General') as SubjectType,
        lessonId: result.lesson_id,
        lessonTitle: lesson?.title,
      };
    });

    const strongConcepts = [...new Set(assessmentRows.flatMap((result) => result.strong_concepts || []))];
    const weakConcepts = [...new Set(assessmentRows.flatMap((result) => result.weak_concepts || []))];

    const orderedScores = assessmentRows
      .map((result) => ({
        date: result.created_at ? new Date(result.created_at).toISOString() : null,
        score: Number(result.percentage) || 0,
      }))
      .filter((result) => result.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    const scoreHistoryDates = orderedScores.map(({ date }) =>
      date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    );
    const scoreHistoryValues = orderedScores.map(({ score }) => score);

    const subjectDistribution: Partial<Record<SubjectType, number>> = {};
    completedLessons.forEach((lesson) => {
      const subject = lesson.subject as SubjectType;
      subjectDistribution[subject] = (subjectDistribution[subject] || 0) + 1;
    });
    const scores = entries.map((entry) => entry.score);
    const activityDates = [...new Set([...completedLessons.map((lesson) => lesson.created_at), ...assessmentRows.map((result) => result.created_at)].map((date) => date.slice(0, 10)))].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let index = 0; index < activityDates.length; index += 1) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - index);
      if (activityDates[index] !== expected.toISOString().slice(0, 10)) break;
      streak += 1;
    }

    return {
      entries,
      averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      totalLearningMinutes: completedLessons.reduce((sum, lesson) => sum + (Number(lesson.duration_minutes) || 0), 0),
      lessonsCompleted: completedLessons.length,
      masteredConcepts: strongConcepts,
      strongConcepts,
      weakConcepts,
      subjectDistribution,
      streak,
      scoreHistoryDates,
      scoreHistoryValues,
    };
  } catch (error) {
    console.error('Failed to load student progress:', error);
    return emptyProgress();
  }
}
