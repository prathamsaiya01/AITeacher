import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { analyzeUploadedMaterial, type MaterialAnalysisResult } from '@/services/multimodalService';
import { saveUploadedMaterial } from '@/services/studentService';
import {
  BookOpen,
  Camera,
  Check,
  FileText,
  Lightbulb,
  MessageCircle,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { Concept, Lesson, SubjectType } from '@/models';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LoadingStatus = 'reading' | 'concepts' | 'lesson';

const acceptedFileTypes = 'image/jpeg,image/png,image/webp,application/pdf';
const statusLabels: Record<LoadingStatus, string> = {
  reading: '🔍 Reading your material...',
  concepts: '🧠 Identifying concepts...',
  lesson: '📚 Building your lesson...',
};

const conceptActions = [
  { label: 'Teach Me', icon: BookOpen },
  { label: 'Explain Simply', icon: Lightbulb },
  { label: 'Give Example', icon: MessageCircle },
  { label: 'Quiz Me', icon: Check },
];

function createLesson(analysis: MaterialAnalysisResult, studentId: string): Lesson {
  const concepts: Concept[] = analysis.concepts.map((concept, index) => ({
    id: concept.id || `material-concept-${index + 1}`,
    name: concept.name,
    type: concept.type,
    description: concept.description,
    difficulty: 2,
    estimatedMinutes: 8,
  }));

  return {
    id: `uploaded-lesson-${Date.now()}`,
    title: analysis.topic,
    subject: (analysis.subject in {
      Mathematics: true,
      Physics: true,
      Biology: true,
      History: true,
      Programming: true,
      General: true,
    } ? analysis.subject : 'General') as SubjectType,
    topic: analysis.topic,
    studentId,
    concepts,
    segments: concepts.map((concept, index) => ({
      id: `material-segment-${index + 1}`,
      title: concept.name,
      type: 'teach',
      conceptId: concept.id,
      durationMin: concept.estimatedMinutes,
      description: concept.description,
      completed: false,
    })),
    estimatedMinutes: Math.max(10, concepts.length * 8),
    createdAt: new Date().toISOString(),
    status: 'planned',
  };
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const navigate = useNavigate();
  const { student, setLesson, setTopic } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus | null>(null);
  const [analysis, setAnalysis] = useState<MaterialAnalysisResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeConceptId, setActiveConceptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setAnalysis(null);
    setUploadedFile(null);
    setLoadingStatus(null);
    setError(null);
    setActiveConceptId(null);
  };

  const handleFile = async (file: File) => {
    const validType = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type);
    if (!validType) {
      setError('Please choose a JPG, PNG, WEBP, or PDF file.');
      return;
    }

    setError(null);
    setAnalysis(null);
    setUploadedFile(file);
    setLoadingStatus('reading');
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setLoadingStatus('concepts');
      const result = await analyzeUploadedMaterial(file);
      setLoadingStatus('lesson');
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      setAnalysis(result);
      setLoadingStatus(null);
    } catch (analysisError) {
      console.error('Upload analysis failed:', analysisError);
      setError('We could not read that material. Please try a clearer image or PDF.');
      setLoadingStatus(null);
    }
  };

  const startLesson = async () => {
    if (!analysis || !student) {
      setError('Set up your student profile before starting a lesson.');
      return;
    }
    if (!uploadedFile) {
      setError('Please upload your study material before starting the lesson.');
      return;
    }

    const lesson = createLesson(analysis, student.id);

    setLoadingStatus('lesson');
    setLesson(lesson);
    setTopic(lesson.topic);
    await saveUploadedMaterial(student.id, uploadedFile, analysis);
    onClose();
    reset();
    navigate('/classroom');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Upload and learn">
      <div className="glass-card relative max-h-[calc(100vh-4rem)] w-full max-w-3xl overflow-y-auto p-6 sm:p-8 scrollbar-thin">
        <button type="button" onClick={() => { onClose(); reset(); }} className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close upload modal">
          <X className="h-5 w-5" />
        </button>

        {!analysis && !loadingStatus && (
          <>
            <div className="mb-6 pr-8">
              <div className="mb-2 flex items-center gap-2 text-violet-300"><Sparkles className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-[0.18em]">Upload & Learn</span></div>
              <h2 className="font-display text-2xl font-bold text-white">Turn your study material into a lesson</h2>
              <p className="mt-2 text-sm text-slate-400">Drop a page, choose a file, or take a photo. Prof. Nova will find the important ideas.</p>
            </div>

            <div
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) void handleFile(file); }}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${isDragging ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-white/[0.02] hover:border-violet-400/40'}`}
            >
              <Upload className="mx-auto mb-4 h-10 w-10 text-violet-300" />
              <p className="font-semibold text-white">Drop your material here</p>
              <p className="mt-1 text-sm text-slate-400">JPG, PNG, WEBP, or PDF</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-primary flex items-center gap-2"><FileText className="h-4 w-4" />Choose File</button>
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-secondary flex items-center gap-2"><Camera className="h-4 w-4" />Use Camera</button>
              </div>
              <input ref={fileInputRef} type="file" accept={acceptedFileTypes} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.currentTarget.value = ''; }} />
              <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.currentTarget.value = ''; }} />
            </div>
          </>
        )}

        {loadingStatus && !analysis && (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
            <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-300" />
            <p className="text-lg font-semibold text-white">{statusLabels[loadingStatus]}</p>
            <p className="mt-2 text-sm text-slate-400">Prof. Nova is preparing your personalized learning path.</p>
          </div>
        )}

        {analysis && (
          <div>
            <div className="mb-6 pr-8">
              <div className="mb-2 text-sm uppercase tracking-[0.18em] text-cyan-300">Material understood</div>
              <h2 className="font-display text-3xl font-bold text-white">{analysis.topic}</h2>
              <p className="mt-2 text-slate-400">Subject: <span className="text-slate-200">{analysis.subject}</span></p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {analysis.concepts.map((concept) => <span key={concept.id} className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200">{concept.name}</span>)}
            </div>

            <div className="space-y-3">
              {analysis.concepts.map((concept) => (
                <article key={concept.id} className="rounded-2xl border border-white/5 bg-ink-900/40 p-4">
                  <h3 className="font-semibold text-white">{concept.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{concept.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {conceptActions.map(({ label, icon: Icon }) => (
                      <button key={label} type="button" onClick={() => { setActiveConceptId(concept.id); void startLesson(); }} className="btn-ghost flex items-center gap-1.5 border border-white/5 text-xs">
                        <Icon className="h-3.5 w-3.5" />{label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <button type="button" onClick={() => void startLesson()} disabled={loadingStatus === 'lesson'} className="btn-primary mt-6 flex w-full items-center justify-center gap-2 disabled:opacity-50">
              <Sparkles className="h-5 w-5" />
              {activeConceptId ? 'Starting concept lesson...' : '🧑‍🏫 Teach Me Everything'}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-center text-sm text-error-300">{error}</p>}
      </div>
    </div>
  );
}
