import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { uploadDocument } from '@/services/aiService';
import { Upload, FileText, Sparkles, X, File, ArrowRight, BookOpen, Type } from 'lucide-react';
import type { UploadedDocument } from '@/models';

const acceptedTypes = '.pdf,.doc,.docx,.ppt,.pptx,.txt';

export default function LearnPage() {
  const navigate = useNavigate();
  const { student, setUploadedDoc, uploadedDoc, setTopic, topic, setLesson } = useApp();
  const [mode, setMode] = useState<'upload' | 'topic'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localDoc, setLocalDoc] = useState<UploadedDocument | null>(uploadedDoc);
  const [localTopic, setLocalTopic] = useState(topic);
  const [chapter, setChapter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const doc = await uploadDocument(file);
      setLocalDoc(doc);
      setUploadedDoc(doc);
      setLocalTopic(file.name.replace(/\.[^/.]+$/, ''));
      setTopic(file.name.replace(/\.[^/.]+$/, ''));
    } finally {
      setUploading(false);
    }
  }, [setUploadedDoc, setTopic]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleCreateLesson = () => {
    if (!student) {
      navigate('/setup');
      return;
    }
    const finalTopic = localTopic.trim() || localDoc?.fileName || 'General Topic';
    setTopic(finalTopic);
    setUploadedDoc(localDoc);
    setLesson(null);
    navigate('/planner');
  };

  const canCreate = mode === 'upload' ? !!localDoc : localTopic.trim().length > 0;

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            What do you want to <span className="gradient-text">learn</span>?
          </h1>
          <p className="text-slate-400">
            Upload your material or enter a topic — your AI Teacher will build a personalized lesson.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setMode('upload')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              mode === 'upload' ? 'bg-violet-500/20 text-violet-200 border border-violet-400/40' : 'bg-ink-800/40 text-slate-400 border border-white/5'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Material
          </button>
          <button
            onClick={() => setMode('topic')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              mode === 'topic' ? 'bg-violet-500/20 text-violet-200 border border-violet-400/40' : 'bg-ink-800/40 text-slate-400 border border border-white/5'
            }`}
          >
            <Type className="w-4 h-4" />
            Enter Topic
          </button>
        </div>

        <div className="glass-card p-8">
          {mode === 'upload' ? (
            <div>
              {!localDoc ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-violet-400 bg-violet-500/10 scale-[1.02]' : 'border-white/10 hover:border-violet-500/30 hover:bg-white/5'
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-400 animate-spin" />
                      <p className="text-slate-400">Extracting content...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-violet-300" />
                      </div>
                      <div>
                        <p className="text-white font-semibold mb-1">Drop your file here</p>
                        <p className="text-sm text-slate-400">or click to browse</p>
                      </div>
                      <p className="text-xs text-slate-500">PDF, DOC, DOCX, PPT, PPTX, TXT</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedTypes}
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="animate-scale-in">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-ink-900/40 border border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <File className="w-6 h-6 text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{localDoc.fileName}</div>
                      <div className="text-sm text-slate-400">
                        {(localDoc.sizeBytes / 1024).toFixed(1)} KB · {localDoc.chunks.length} chunks extracted
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success-500/15 text-success-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Ready for RAG
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setLocalDoc(null); setUploadedDoc(null); }}
                      className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Chapter selection */}
                  <div className="mt-6">
                    <label className="text-sm text-slate-400 mb-2 block">Focus on a specific chapter? (optional)</label>
                    <select
                      className="input-field"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                    >
                      <option value="">Entire document</option>
                      {localDoc.chunks.map((c, i) => (
                        <option key={c.id} value={c.id}>Section {i + 1}: {c.text.slice(0, 40)}...</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-5 h-5 text-violet-300" />
                <label className="text-sm text-slate-300">Enter a topic or concept you want to learn</label>
              </div>
              <input
                className="input-field text-lg"
                placeholder="e.g. Newton's Laws of Motion, Python Functions, Photosynthesis..."
                value={localTopic}
                onChange={(e) => setLocalTopic(e.target.value)}
                autoFocus
              />
              <div className="mt-4">
                <p className="text-sm text-slate-400 mb-2">Popular topics:</p>
                <div className="flex flex-wrap gap-2">
                  {['Newton\'s Laws', 'Python Basics', 'Linear Equations', 'Cell Biology', 'World War I', 'Quadratic Equations'].map((t) => (
                    <button key={t} onClick={() => setLocalTopic(t)} className="chip chip-inactive text-xs">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateLesson}
            disabled={!canCreate}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            Create My Lesson
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {!student && (
          <p className="text-center text-sm text-warning-500 mt-4">
            You'll need to set up your student profile first.
          </p>
        )}
      </div>
    </div>
  );
}
