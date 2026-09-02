import { GoogleGenAI, Type, Schema } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import type {
  Student,
  Lesson,
  Question,
  Answer,
  Evaluation,
  Misconception,
  AssessmentResult,
  LearningReport,
  LearningPath,
  TeachingSessionState,
  UploadedDocument,
  TeachingVideo,
  DashboardStats,
  ProgressEntry,
  Concept,
  LessonSegment,
  QuestionOption,
  AssessmentQuestion,
  SubjectType,
} from '@/models';
import { processDocument } from './documentService';
import { storeDocumentInSupabase } from './ragService';
import { getStudentMemoryContext, getStudentProgress } from './studentService';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
if (!apiKey) console.warn('VITE_GEMINI_API_KEY is missing from environment variables.');
const ai = new GoogleGenAI({ apiKey });

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment variables.');
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

// ---------- Subject detection ----------
export function detectSubject(topic: string): SubjectType {
  const t = topic.toLowerCase();
  if (/(python|java|code|program|algorithm|javascript|react|api|function)/.test(t)) return 'Programming';
  if (/(force|motion|energy|gravity|velocity|acceleration|thermodynam|quantum|electric|wave)/.test(t)) return 'Physics';
  if (/(cell|biology|organ|dna|gene|photosynthesi|ecosystem|evolution|protein)/.test(t)) return 'Biology';
  if (/(history|war|revolution|empire|civilization|ancient|medieval|dynasty)/.test(t)) return 'History';
  if (/(algebra|calculus|geometry|equation|matrix|integral|derivative|probability|statistics|math)/.test(t)) return 'Mathematics';
  return 'General';
}

// ---------- Gemini Schema Definition for Phase 1 ----------
const geminiLessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    learningObjectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    concepts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          explanation: { type: Type.STRING },
          example: { type: Type.STRING },
          estimatedMinutes: { type: Type.NUMBER },
          difficulty: { type: Type.NUMBER },
          visualType: {
            type: Type.STRING,
            enum: ['equation', 'diagram', 'timeline', 'code', 'flowchart', 'none']
          },
          visualContent: { type: Type.STRING },
          checkQuestionPrompt: { type: Type.STRING },
          checkQuestionOptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          correctAnswer: { type: Type.STRING },
          questionExplanation: { type: Type.STRING }
        },
        required: [
          'name',
          'explanation',
          'example',
          'estimatedMinutes',
          'difficulty',
          'visualType',
          'visualContent',
          'checkQuestionPrompt',
          'checkQuestionOptions',
          'correctAnswer',
          'questionExplanation'
        ]
      }
    },
    estimatedDuration: { type: Type.NUMBER }
  },
  required: ['title', 'learningObjectives', 'concepts', 'estimatedDuration']
};

export interface GenerateLessonParams {
  topic: string;
  studentLevel: string;
  language: string;
  learningGoal: string;
  teachingStyle: string;
  availableTime: string;
  desiredDepth: string;
}

export async function saveLessonToDatabase(lesson: Lesson): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseAnonKey || !apiKey) {
      console.warn('Skipping lesson save because Supabase or Gemini credentials are missing.');
      return true;
    }

    const { error } = await supabase.from('lessons').upsert({
      id: lesson.id,
      student_id: lesson.studentId,
      title: lesson.title,
      subject: lesson.subject,
      topic: lesson.topic,
      content: JSON.stringify({
        concepts: lesson.concepts,
        segments: lesson.segments,
        estimatedMinutes: lesson.estimatedMinutes,
        status: lesson.status,
      }),
      created_at: lesson.createdAt,
    });

    if (error) {
      console.warn('Unable to save lesson to Supabase:', error.message || error);
      return true;
    }

    return true;
  } catch (error) {
    console.warn('Lesson save failed:', error instanceof Error ? error.message : error);
    return true;
  }
}

// ---------- Lesson generation (Real Gemini Integration) ----------
export async function generateLesson(
  student: Student,
  topic: string,
  document?: UploadedDocument,
  extraParams?: Partial<GenerateLessonParams>
): Promise<Lesson> {
  const subject = detectSubject(topic);
  const studentLevel = extraParams?.studentLevel || student.level || 'Intermediate';
  const language = extraParams?.language || student.language || 'English';
  const learningGoal = extraParams?.learningGoal || 'Master core concepts';
  const teachingStyle = extraParams?.teachingStyle || student.teachingStyle || 'Visual';
  const availableTime = extraParams?.availableTime || '30 minutes';
  const desiredDepth = extraParams?.desiredDepth || 'Intermediate';

  const documentContext = document?.extractedText
    ? `\nBase the lesson on the following uploaded document content:\n"""\n${document.extractedText}\n"""`
    : '';
  const memory = await getStudentMemoryContext(student.id);
  const memoryContext = `\nStudent learning memory:\n- Mastered concepts: ${memory.masteredConcepts.join(', ') || 'None recorded'}\n- Concepts needing reinforcement: ${memory.weakConcepts.join(', ') || 'None recorded'}`;

  const prompt = `Act as an expert Socratic AI Teacher. Generate a complete, structured interactive lesson plan based on these parameters:
- Topic: ${topic}
- Subject: ${subject}
- Target Student Level: ${studentLevel}
- Language: ${language}
- Learning Goal: ${learningGoal}
- Teaching Style: ${teachingStyle}
- Available Time: ${availableTime}
- Desired Depth: ${desiredDepth}${documentContext}${memoryContext}

Provide 3 to 5 core concepts. For each concept, include a teaching explanation, an illustrative example, visual content suggestions, and a multiple-choice check question with 4 options.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: geminiLessonSchema,
        temperature: 0.3,
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    const concepts: Concept[] = (parsed.concepts || []).map((c: any, index: number) => ({
      id: `c${index + 1}`,
      name: c.name,
      description: c.explanation,
      difficulty: c.difficulty || 3,
      estimatedMinutes: c.estimatedMinutes || 5,
    }));

    const segments: LessonSegment[] = [];
    (parsed.concepts || []).forEach((c: any, index: number) => {
      const cId = `c${index + 1}`;
      segments.push({
        id: uid('seg'),
        title: `Teach: ${c.name}`,
        type: 'teach',
        conceptId: cId,
        durationMin: c.estimatedMinutes || 4,
        description: c.explanation,
        completed: false
      });
      segments.push({
        id: uid('seg'),
        title: `Example: ${c.name}`,
        type: 'example',
        conceptId: cId,
        durationMin: 2,
        description: c.example,
        completed: false
      });
      segments.push({
        id: uid('seg'),
        title: `Check: ${c.name}`,
        type: 'question',
        conceptId: cId,
        durationMin: 2,
        description: `Assess understanding of ${c.name}`,
        completed: false
      });
    });

    segments.push({
      id: uid('seg'),
      title: 'Lesson Summary',
      type: 'summary',
      conceptId: 'summary',
      durationMin: 3,
      description: `Recap of ${parsed.title || topic}`,
      completed: false
    });

    return {
      id: uid('lesson'),
      title: parsed.title || topic,
      subject,
      topic,
      studentId: student.id,
      concepts,
      segments,
      estimatedMinutes: parsed.estimatedDuration || segments.reduce((s, seg) => s + seg.durationMin, 0),
      createdAt: new Date().toISOString(),
      status: 'planned',
    };
  } catch (error) {
    console.error('Gemini Lesson Generation failed, using fallback:', error);
    return fallbackGenerateLesson(student, topic);
  }
}

// Fallback generator in case of API failure or missing network
function fallbackGenerateLesson(student: Student, topic: string): Lesson {
  const subject = detectSubject(topic);
  const concepts: Concept[] = [
    { id: 'c1', name: `${topic} - Core Basics`, description: `Fundamental principles of ${topic}.`, difficulty: 2, estimatedMinutes: 5 },
    { id: 'c2', name: `${topic} - Key Mechanics`, description: `Understanding how ${topic} operates.`, difficulty: 3, estimatedMinutes: 6 },
    { id: 'c3', name: `${topic} - Practical Application`, description: `Real-world examples of ${topic}.`, difficulty: 4, estimatedMinutes: 5 },
  ];
  const segments: LessonSegment[] = [];
  for (const c of concepts) {
    segments.push({ id: uid('seg'), title: `Teach: ${c.name}`, type: 'teach', conceptId: c.id, durationMin: c.estimatedMinutes, description: c.description, completed: false });
    segments.push({ id: uid('seg'), title: `Example: ${c.name}`, type: 'example', conceptId: c.id, durationMin: 2, description: `Worked example for ${c.name}.`, completed: false });
    segments.push({ id: uid('seg'), title: `Check: ${c.name}`, type: 'question', conceptId: c.id, durationMin: 2, description: `Assess understanding of ${c.name}.`, completed: false });
  }
  segments.push({ id: uid('seg'), title: 'Lesson Summary', type: 'summary', conceptId: 'summary', durationMin: 3, description: 'Recap of all concepts covered.', completed: false });

  return {
    id: uid('lesson'),
    title: topic,
    subject,
    topic,
    studentId: student.id,
    concepts,
    segments,
    estimatedMinutes: segments.reduce((s, seg) => s + seg.durationMin, 0),
    createdAt: new Date().toISOString(),
    status: 'planned',
  };
}

// ---------- Question generation ----------
const questionTemplates: Record<SubjectType, Question[]> = {
  Physics: [
    { id: 'q1', type: 'MCQ', prompt: 'A 2 kg object accelerates at 3 m/s². What is the net force?', options: [
      { id: 'a', label: '3 N', isCorrect: false },
      { id: 'b', label: '6 N', isCorrect: true },
      { id: 'c', label: '5 N', isCorrect: false },
      { id: 'd', label: '1.5 N', isCorrect: false },
    ], correctAnswer: '6 N', explanation: 'F = m × a = 2 × 3 = 6 N', conceptId: 'c2', difficulty: 2, hint: 'Use Newton\'s second law.' },
    { id: 'q2', type: 'Conceptual', prompt: 'Why does a heavier object require more force to achieve the same acceleration?', correctAnswer: 'Because F = ma — acceleration is inversely proportional to mass for a given force.', explanation: 'Mass is a measure of inertia; more mass means more resistance to changes in motion.', conceptId: 'c2', difficulty: 3 },
    { id: 'q3', type: 'Problem Solving', prompt: 'A car goes from 0 to 20 m/s in 5 seconds. What is its acceleration?', correctAnswer: '4 m/s²', explanation: 'a = Δv / Δt = 20 / 5 = 4 m/s²', conceptId: 'c3', difficulty: 3 },
    { id: 'q4', type: 'Application Based', prompt: 'A spaceship in deep space fires its thrusters. If there\'s no friction, what happens to its motion after the thrusters stop?', correctAnswer: 'It continues moving at constant velocity (Newton\'s First Law).', explanation: 'With no external force, the object maintains its state of motion.', conceptId: 'c1', difficulty: 4 },
  ],
  Mathematics: [
    { id: 'q1', type: 'MCQ', prompt: 'Solve for x: 2x + 3 = 11', options: [
      { id: 'a', label: 'x = 3', isCorrect: false },
      { id: 'b', label: 'x = 4', isCorrect: true },
      { id: 'c', label: 'x = 5', isCorrect: false },
      { id: 'd', label: 'x = 7', isCorrect: false },
    ], correctAnswer: 'x = 4', explanation: '2x = 11 - 3 = 8, so x = 4', conceptId: 'c2', difficulty: 2 },
    { id: 'q2', type: 'Conceptual', prompt: 'What does the slope of a linear equation represent?', correctAnswer: 'The rate of change — how much y changes for each unit increase in x.', explanation: 'In y = mx + b, m is the slope representing the rate of change.', conceptId: 'c2', difficulty: 3 },
    { id: 'q3', type: 'Problem Solving', prompt: 'Find the roots of x² - 5x + 6 = 0', correctAnswer: 'x = 2 and x = 3', explanation: '(x-2)(x-3) = 0, so x = 2 or x = 3', conceptId: 'c3', difficulty: 4 },
    { id: 'q4', type: 'Application Based', prompt: 'A phone plan costs $20/month plus $0.10 per text. Write an equation for the total monthly cost C with t texts.', correctAnswer: 'C = 20 + 0.10t', explanation: 'Fixed cost plus variable cost per text.', conceptId: 'c2', difficulty: 3 },
  ],
  Biology: [
    { id: 'q1', type: 'MCQ', prompt: 'Which organelle is the "powerhouse" of the cell?', options: [
      { id: 'a', label: 'Nucleus', isCorrect: false },
      { id: 'b', label: 'Mitochondria', isCorrect: true },
      { id: 'c', label: 'Ribosome', isCorrect: false },
      { id: 'd', label: 'Golgi apparatus', isCorrect: false },
    ], correctAnswer: 'Mitochondria', explanation: 'Mitochondria produce ATP, the cell\'s energy currency.', conceptId: 'c1', difficulty: 1 },
    { id: 'q2', type: 'Conceptual', prompt: 'Why is photosynthesis important for life on Earth?', correctAnswer: 'It converts solar energy into chemical energy (glucose) and releases oxygen, sustaining most ecosystems.', explanation: 'Photosynthesis is the foundation of most food chains.', conceptId: 'c2', difficulty: 3 },
    { id: 'q3', type: 'Short Answer', prompt: 'What are the four bases found in DNA?', correctAnswer: 'Adenine, Thymine, Guanine, Cytosine', explanation: 'A pairs with T, G pairs with C.', conceptId: 'c3', difficulty: 2 },
    { id: 'q4', type: 'Application Based', prompt: 'If a trait is dominant, does it always appear in every generation? Explain.', correctAnswer: 'Not necessarily — it depends on whether the parent is homozygous or heterozygous.', explanation: 'A heterozygous parent can pass on the recessive allele.', conceptId: 'c3', difficulty: 4 },
  ],
  History: [
    { id: 'q1', type: 'MCQ', prompt: 'Which event triggered World War I?', options: [
      { id: 'a', label: 'The assassination of Archduke Franz Ferdinand', isCorrect: true },
      { id: 'b', label: 'The Russian Revolution', isCorrect: false },
      { id: 'c', label: 'The Treaty of Versailles', isCorrect: false },
      { id: 'd', label: 'The Great Depression', isCorrect: false },
    ], correctAnswer: 'The assassination of Archduke Franz Ferdinand', explanation: 'On June 28, 1914 in Sarajevo.', conceptId: 'c2', difficulty: 2 },
    { id: 'q2', type: 'Conceptual', prompt: 'How do economic conditions contribute to revolutions?', correctAnswer: 'Economic hardship creates discontent that can drive political upheaval when people feel the system is unjust.', explanation: 'Poverty and inequality are common catalysts for revolution.', conceptId: 'c1', difficulty: 3 },
    { id: 'q3', type: 'Short Answer', prompt: 'Name one long-term consequence of the Industrial Revolution.', correctAnswer: 'Urbanization, rise of capitalism, or labor movements.', explanation: 'Multiple valid answers — it transformed society economically and socially.', conceptId: 'c4', difficulty: 3 },
    { id: 'q4', type: 'Application Based', prompt: 'How might history have changed if the printing press was never invented?', correctAnswer: 'Knowledge would have spread much slower, delaying the Renaissance, Reformation, and scientific revolution.', explanation: 'The printing press democratized information access.', conceptId: 'c4', difficulty: 4 },
  ],
  Programming: [
    { id: 'q1', type: 'MCQ', prompt: 'What does `len("hello")` return in Python?', options: [
      { id: 'a', label: '4', isCorrect: false },
      { id: 'b', label: '5', isCorrect: true },
      { id: 'c', label: '6', isCorrect: false },
      { id: 'd', label: 'hello', isCorrect: false },
    ], correctAnswer: '5', explanation: 'The string "hello" has 5 characters.', conceptId: 'c1', difficulty: 1 },
    { id: 'q2', type: 'Conceptual', prompt: 'Why do we use functions in programming?', correctAnswer: 'To avoid repeating code, improve readability, and make programs easier to maintain.', explanation: 'Functions enable reusability and abstraction.', conceptId: 'c3', difficulty: 2 },
    { id: 'q3', type: 'Problem Solving', prompt: 'Write a Python function that returns the sum of a list of numbers.', correctAnswer: 'def sum_list(nums): return sum(nums)', explanation: 'Or iterate manually: total = 0; for n in nums: total += n; return total', conceptId: 'c3', difficulty: 3 },
    { id: 'q4', type: 'Application Based', prompt: 'You need to store student grades by name and look them up quickly. Which data structure would you use and why?', correctAnswer: 'A dictionary (hash map) — O(1) lookup by key (name).', explanation: 'Dictionaries map keys to values for fast retrieval.', conceptId: 'c4', difficulty: 4 },
  ],
  General: [
    { id: 'q1', type: 'MCQ', prompt: 'Which best describes the main idea of this topic?', options: [
      { id: 'a', label: 'A historical detail', isCorrect: false },
      { id: 'b', label: 'The central concept', isCorrect: true },
      { id: 'c', label: 'An unrelated fact', isCorrect: false },
      { id: 'd', label: 'A personal opinion', isCorrect: false },
    ], correctAnswer: 'The central concept', explanation: 'The main idea is the core message.', conceptId: 'c1', difficulty: 1 },
    { id: 'q2', type: 'Conceptual', prompt: 'How does this topic connect to everyday life?', correctAnswer: 'It appears in common situations and decision-making.', explanation: 'Most concepts have practical applications.', conceptId: 'c3', difficulty: 2 },
    { id: 'q3', type: 'Short Answer', prompt: 'Name one key component of this topic.', correctAnswer: 'Any major sub-part of the topic.', explanation: 'Topics break down into components.', conceptId: 'c2', difficulty: 2 },
    { id: 'q4', type: 'Application Based', prompt: 'How could you apply this topic to solve a real problem?', correctAnswer: 'By identifying the relevant concept and applying it to the specific situation.', explanation: 'Application requires understanding + context.', conceptId: 'c3', difficulty: 4 },
  ],
};

export async function generateQuestion(conceptId: string, subject: SubjectType, difficulty: number): Promise<Question> {
  await delay(600);
  const templates = questionTemplates[subject] || questionTemplates.General;
  const pool = templates.filter((q) => Math.abs(q.difficulty - difficulty) <= 1);
  const chosen = (pool.length > 0 ? pool : templates)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : templates.length))];
  return { ...chosen, id: uid('q'), conceptId };
}

async function generateGeminiJson<T>(prompt: string, responseSchema: Schema): Promise<T> {
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not configured');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema, temperature: 0.3 },
  });

  const text = response.text?.trim();
  if (!text) throw new Error('Gemini returned an empty response');
  return JSON.parse(text) as T;
}

// ---------- Answer evaluation ----------
export async function evaluateAnswer(question: Question, answer: Answer): Promise<Evaluation> {
  const fallbackCorrect = answer.response.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  const fallback: Evaluation = fallbackCorrect
    ? { isCorrect: true, feedback: 'Good work. Let\'s deepen your understanding with a harder question.', newDifficulty: Math.min(5, question.difficulty + 1), understandingDelta: 8, shouldReExplain: false }
    : { isCorrect: false, feedback: 'Let\'s revisit the idea from another angle.', newDifficulty: Math.max(1, question.difficulty - 1), understandingDelta: -5, shouldReExplain: true, misconception: { id: uid('mis'), conceptId: question.conceptId, conceptName: question.conceptId, description: `The response "${answer.response}" does not match the expected concept.`, alternativeExplanation: question.explanation, analogy: `Think of the concept as a connected set of ideas: ${question.explanation}`, simplerExample: question.hint || `What is the simplest example of ${question.conceptId}?` } };

  try {
    const parsed = await generateGeminiJson<Partial<Evaluation>>(`Evaluate this student's answer as a Socratic teacher.
Question: ${question.prompt}
Expected answer: ${question.correctAnswer}
Explanation: ${question.explanation}
Student answer: ${answer.response}
Return JSON with isCorrect, feedback, newDifficulty (1-5), understandingDelta (-20 to 20), shouldReExplain, and misconception when incorrect.`, {
      type: Type.OBJECT,
      properties: {
        isCorrect: { type: Type.BOOLEAN }, feedback: { type: Type.STRING }, newDifficulty: { type: Type.NUMBER }, understandingDelta: { type: Type.NUMBER }, shouldReExplain: { type: Type.BOOLEAN },
        misconception: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, alternativeExplanation: { type: Type.STRING }, analogy: { type: Type.STRING }, simplerExample: { type: Type.STRING } } },
      }, required: ['isCorrect', 'feedback', 'newDifficulty', 'understandingDelta', 'shouldReExplain'],
    });
    const isCorrect = Boolean(parsed.isCorrect);
    const misconception = !isCorrect ? { id: uid('mis'), conceptId: question.conceptId, conceptName: question.conceptId, description: parsed.misconception?.description || fallback.misconception?.description || 'A misconception was detected.', alternativeExplanation: parsed.misconception?.alternativeExplanation || fallback.misconception?.alternativeExplanation || question.explanation, analogy: parsed.misconception?.analogy || fallback.misconception?.analogy || question.explanation, simplerExample: parsed.misconception?.simplerExample || fallback.misconception?.simplerExample || question.hint || question.explanation } : undefined;
    return { isCorrect, feedback: parsed.feedback || fallback.feedback, newDifficulty: isCorrect ? Math.min(5, question.difficulty + 1) : Math.max(1, question.difficulty - 1), understandingDelta: Number(parsed.understandingDelta) || 0, shouldReExplain: !isCorrect, ...(misconception ? { misconception } : {}) };
  } catch (error) {
    console.error('Gemini evaluation error:', error);
    return fallback;
  }
}

export async function detectMisconception(question: Question, answer: Answer): Promise<Misconception | null> {
  await delay(400);
  const ev = await evaluateAnswer(question, answer);
  return ev.misconception || null;
}

// ---------- Assessment ----------
export async function generateAssessment(lesson: Lesson): Promise<AssessmentQuestion[]> {
  const templates = questionTemplates[lesson.subject] || questionTemplates.General;
  const fallback = Array.from({ length: 5 }, (_, index) => {
    const q = templates[index % templates.length];
    return { ...q, id: uid('a'), maxScore: 20 };
  });
  try {
    const parsed = await generateGeminiJson<{ questions?: Partial<AssessmentQuestion>[] }>(`Create exactly 5 personalized assessment questions for this lesson. Mix MCQ, Short Answer, and Application Based questions, covering different concepts. Lesson: ${lesson.title}; Topic: ${lesson.topic}; Subject: ${lesson.subject}; Concepts: ${lesson.concepts.map((c) => `${c.id}: ${c.name} - ${c.description}`).join('; ')}`, {
      type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: ['MCQ', 'Conceptual', 'Short Answer', 'Problem Solving', 'Application Based'] }, prompt: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING }, isCorrect: { type: Type.BOOLEAN } }, required: ['id', 'label', 'isCorrect'] } }, correctAnswer: { type: Type.STRING }, explanation: { type: Type.STRING }, conceptId: { type: Type.STRING }, maxScore: { type: Type.NUMBER } }, required: ['type', 'prompt', 'correctAnswer', 'explanation', 'conceptId'] } } }, required: ['questions']
    });
    if (!parsed.questions || parsed.questions.length < 5) return fallback;
    return parsed.questions.slice(0, 5).map((q) => ({ id: uid('a'), type: q.type || 'Short Answer', prompt: q.prompt || 'Explain this concept.', options: q.options, correctAnswer: q.correctAnswer || '', explanation: q.explanation || '', conceptId: lesson.concepts.some((c) => c.id === q.conceptId) ? q.conceptId! : lesson.concepts[0]?.id || 'unknown', maxScore: Number(q.maxScore) || 20 }));
  } catch (error) {
    console.error('Gemini assessment generation error:', error);
    return fallback;
  }
}

export async function gradeAssessment(
  assessmentId: string,
  lessonId: string,
  questions: AssessmentQuestion[],
  responses: Record<string, string>
): Promise<AssessmentResult> {
  await delay(800);
  const answers = questions.map((q) => {
    const response = responses[q.id] || '';
    const isCorrect = response.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase() ||
      (q.options?.some((o) => o.label === response && o.isCorrect) ?? false);
    return { questionId: q.id, response, score: isCorrect ? q.maxScore : 0, isCorrect, conceptId: q.conceptId };
  });
  const totalScore = answers.reduce((s, a) => s + a.score, 0);
  const maxScore = questions.reduce((s, q) => s + q.maxScore, 0);
  return { assessmentId, lessonId, answers, totalScore, maxScore, percentage: Math.round((totalScore / maxScore) * 100) };
}

// ---------- Learning report ----------
export async function generateLearningReport(lesson: Lesson, result: AssessmentResult): Promise<LearningReport> {
  const fallback = buildFallbackLearningReport(lesson, result);
  try {
    const parsed = await generateGeminiJson<Partial<LearningReport>>(`Analyze this learner assessment and produce a concise personalized report. Lesson concepts: ${lesson.concepts.map((c) => `${c.id}: ${c.name}`).join(', ')}. Assessment result: ${JSON.stringify(result)}. Include score, conceptsUnderstood, strongAreas, weakAreas, misconceptions with descriptions and alternativeExplanation, analogy, simplerExample, recommendedRevision, suggestedNextTopic, and summary.`, {
      type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, conceptsUnderstood: { type: Type.ARRAY, items: { type: Type.STRING } }, strongAreas: { type: Type.ARRAY, items: { type: Type.STRING } }, weakAreas: { type: Type.ARRAY, items: { type: Type.STRING } }, misconceptions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { conceptId: { type: Type.STRING }, conceptName: { type: Type.STRING }, description: { type: Type.STRING }, alternativeExplanation: { type: Type.STRING }, analogy: { type: Type.STRING }, simplerExample: { type: Type.STRING } } } }, recommendedRevision: { type: Type.ARRAY, items: { type: Type.STRING } }, suggestedNextTopic: { type: Type.STRING }, summary: { type: Type.STRING } }, required: ['score', 'conceptsUnderstood', 'strongAreas', 'weakAreas', 'misconceptions', 'recommendedRevision', 'suggestedNextTopic', 'summary']
    });
    return {
      ...fallback,
      ...parsed,
      lessonId: lesson.id,
      score: Number(parsed.score) || fallback.score,
      conceptsUnderstood: Array.isArray(parsed.conceptsUnderstood) ? parsed.conceptsUnderstood : fallback.conceptsUnderstood,
      strongAreas: Array.isArray(parsed.strongAreas) ? parsed.strongAreas : fallback.strongAreas,
      weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas : fallback.weakAreas,
      recommendedRevision: Array.isArray(parsed.recommendedRevision) ? parsed.recommendedRevision : fallback.recommendedRevision,
      suggestedNextTopic: parsed.suggestedNextTopic || fallback.suggestedNextTopic,
      summary: parsed.summary || fallback.summary,
      misconceptions: Array.isArray(parsed.misconceptions)
        ? parsed.misconceptions.map((m) => ({ ...m, id: uid('mis'), conceptId: m.conceptId || 'unknown', conceptName: m.conceptName || 'Unknown concept', description: m.description || '', alternativeExplanation: m.alternativeExplanation || '', analogy: m.analogy || '', simplerExample: m.simplerExample || '' })) as Misconception[]
        : fallback.misconceptions,
    };
  } catch (error) {
    console.error('Gemini learning report error:', error);
    return fallback;
  }
}

function buildFallbackLearningReport(lesson: Lesson, result: AssessmentResult): LearningReport {
  const concepts = lesson.concepts;
  const correctConceptIds = new Set(
    result.answers.filter((a) => a.isCorrect).map((a) => (a as any).conceptId || a.questionId)
  );
  const strongAreas = concepts.filter((c) => correctConceptIds.has(c.id)).map((c) => c.name);
  const weakAreas = concepts.filter((c) => !correctConceptIds.has(c.id)).map((c) => c.name);
  const misconceptions: Misconception[] = weakAreas.map((name, i) => {
    const concept = concepts.find((c) => c.name === name) || concepts[i];
    return {
      id: uid('mis'),
      conceptId: concept?.id || 'unknown',
      conceptName: name,
      description: `Difficulty with ${name}.`,
      alternativeExplanation: `Review the fundamentals of ${name}.`,
      analogy: `Think of ${name} as a building block — master it before moving on.`,
      simplerExample: `Start with a basic example of ${name}.`,
    };
  });
  const nextTopics: Record<SubjectType, string> = {
    Physics: 'Momentum and Collisions',
    Mathematics: 'Systems of Equations',
    Biology: 'Cellular Respiration',
    History: 'The Cold War',
    Programming: 'Object-Oriented Programming',
    General: 'Advanced Applications',
  };
  return {
    lessonId: lesson.id,
    score: result.percentage,
    conceptsUnderstood: strongAreas,
    strongAreas,
    weakAreas,
    misconceptions,
    recommendedRevision: weakAreas.length > 0 ? [`Practice 3 problems on ${weakAreas[0]}`, `Review ${weakAreas[0]} with a visual example`] : ['You\'re ready for the next topic!'],
    suggestedNextTopic: nextTopics[lesson.subject] || 'Advanced Concepts',
    summary: `You scored ${result.percentage}%. ${strongAreas.length > 0 ? `Strong in ${strongAreas.join(', ')}.` : ''} ${weakAreas.length > 0 ? `Focus on ${weakAreas.join(', ')}.` : ''}`,
  };
}

// ---------- Learning path ----------
export async function generateLearningPath(student: Student): Promise<LearningPath> {
  const progress = await getStudentProgress(student.id);
  const nodes = progress.entries.map((entry, index) => ({
    id: entry.lessonId || `completed-session-${index + 1}`,
    title: entry.lessonTitle || `${entry.subject} lesson`,
    description: `Completed assessment with a ${entry.score}% score`,
    subject: entry.subject,
    status: 'completed' as const,
    order: index + 1,
    estimatedMinutes: entry.learningMinutes,
    prerequisites: [] as string[],
  }));

  return { id: uid('path'), title: `${student.name}'s Learning Path`, studentId: student.id, nodes };
}

// ---------- Document upload (Phase 2 - Real implementation) ----------
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  try {
    // Process the document: extract text, chunk, and generate embeddings
    const processedDoc = await processDocument(file);

    // Store the processed document in Supabase with vector embeddings
    const stored = await storeDocumentInSupabase(processedDoc);

    if (!stored) {
      console.warn('Document stored locally but Supabase storage failed');
    }

    // Return the UploadedDocument object with proper structure
    return {
      id: uid('doc'),
      fileName: processedDoc.fileName,
      fileType: processedDoc.fileType,
      sizeBytes: processedDoc.sizeBytes,
      extractedText: processedDoc.extractedText,
      chunks: processedDoc.chunks.map((chunk) => ({
        id: chunk.id,
        text: chunk.text,
        embedding: chunk.embedding,
      })),
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ---------- Teaching video (mock) ----------
export async function generateTeachingVideo(conceptName: string, language: string): Promise<TeachingVideo> {
  await delay(2000);
  return {
    id: uid('vid'),
    url: '',
    durationSeconds: 45,
    status: 'ready',
    transcript: `Hello! I'm your AI teacher. Today we'll explore ${conceptName}. Let me break this down step by step... [Teaching in ${language}]`,
  };
}

// ---------- Speech (mock) ----------
export async function generateSpeech(text: string, language: string): Promise<string> {
  await delay(300);
  return `data:audio/mock;base64,${Buffer.from(text).toString('base64').slice(0, 50)}`;
}

// ---------- Dashboard stats (mock) ----------
export async function getDashboardStats(student: Student): Promise<DashboardStats> {
  await delay(500);
  return {
    lessonsCompleted: 7,
    totalLearningMinutes: 340,
    averageScore: 82,
    streak: 5,
    strongConcepts: ['Variables & Types', 'Newton\'s First Law', 'Linear Equations'],
    weakConcepts: ['Quadratic Equations', 'Acceleration', 'DNA & Genetics'],
    recommendedLessons: [
      { id: 'rec1', title: 'Quadratic Equations Deep Dive', subject: 'Mathematics', reason: 'Weak area detected' },
      { id: 'rec2', title: 'Understanding Acceleration', subject: 'Physics', reason: 'Needs reinforcement' },
      { id: 'rec3', title: 'Intro to Neural Networks', subject: 'General', reason: 'Next on your path' },
    ],
    continueLearning: { lessonId: 'lesson_current', title: 'Data Processing with Pandas', progress: 45, subject: 'Programming' },
  };
}

// ---------- Progress entries (mock) ----------
export async function getProgressEntries(student: Student): Promise<ProgressEntry[]> {
  await delay(500);
  const subjects: SubjectType[] = ['Programming', 'Mathematics', 'Physics', 'Biology'];
  return Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    return {
      date: d.toISOString(),
      score: 65 + Math.round(Math.random() * 30),
      conceptsMastered: i + 2,
      learningMinutes: 20 + Math.round(Math.random() * 40),
      subject: subjects[i % subjects.length],
    };
  });
}