import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  Briefcase,
  BookOpen,
  Loader2,
  Info
} from 'lucide-react';
import { PolicyCategory, PolicyRole, DraftPolicyCategory } from '../../types';

interface PolicyUploaderProps {
  existingPolicies: PolicyCategory[];
  onUpdatePolicies: (updated: PolicyCategory[]) => void;
}

type UploadStep = 'select-type' | 'drop-file' | 'preview-text' | 'analyzing' | 'review' | 'done';

const MAX_FILE_MB = 20;
const ALLOWED_EXTS = ['.pdf', '.docx', '.txt'];

function ConfidenceBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
    pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      AI {pct}% confident
    </span>
  );
}

function StepIndicator({ current, step, label }: { current: UploadStep; step: UploadStep; label: string }) {
  const steps: UploadStep[] = ['select-type', 'drop-file', 'preview-text', 'analyzing', 'review', 'done'];
  const ci = steps.indexOf(current);
  const si = steps.indexOf(step);
  const done = ci > si;
  const active = ci === si;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
      active ? 'text-pink-500' : done ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600'
    }`}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
        active ? 'bg-pink-500 text-white' :
        done ? 'bg-emerald-500 text-white' :
        'bg-slate-200 dark:bg-slate-700'
      }`}>
        {done ? '✓' : si + 1}
      </span>
      {label}
    </div>
  );
}

export const PolicyUploader: React.FC<PolicyUploaderProps> = ({
  existingPolicies,
  onUpdatePolicies
}) => {
  const [step, setStep] = useState<UploadStep>('select-type');
  const [policyType, setPolicyType] = useState<PolicyRole>('consultant');
  const [dragging, setDragging] = useState(false);

  const [uploadError, setUploadError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [showFullText, setShowFullText] = useState(false);

  const [analysisError, setAnalysisError] = useState('');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [wasTruncated, setWasTruncated] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [drafts, setDrafts] = useState<DraftPolicyCategory[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<Partial<DraftPolicyCategory>>({});

  const [approvedCount, setApprovedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setStep('select-type');
    setUploadError('');
    setUploadLoading(false);
    setFileName('');
    setWordCount(0);
    setExtractedText('');
    setShowFullText(false);
    setAnalysisError('');
    setIsQuotaExceeded(false);
    setIsAnalyzing(false);
    setWasTruncated(false);
    setWarningMessage('');
    setDrafts([]);
    setExpandedId(null);
    setEditingId(null);
    setEditBuf({});
    setApprovedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = useCallback(async (file: File) => {
    setUploadError('');
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Please upload a PDF, DOCX, or TXT file.`);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed: ${MAX_FILE_MB} MB.`);
      return;
    }

    setUploadLoading(true);
    setStep('drop-file');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload-policy', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed.');
      setFileName(data.fileName);
      setWordCount(data.wordCount);
      setExtractedText(data.text);
      setStep('preview-text');
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
      setStep('drop-file');
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError('');
    setIsQuotaExceeded(false);
    setStep('analyzing');
    try {
      const res = await fetch('/api/admin/analyze-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText, policyType })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 429 || data.isQuotaExceeded) {
          setIsQuotaExceeded(true);
        }
        throw new Error(data.message || 'AI analysis failed.');
      }
      setDrafts(data.drafts as DraftPolicyCategory[]);
      setWasTruncated(Boolean(data.wasTruncated));
      setWarningMessage(data.warning || '');
      setStep('review');
    } catch (err: any) {
      const errorMsg = err.message || 'Analysis failed. Please try again.';
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        setIsQuotaExceeded(true);
      }
      setAnalysisError(errorMsg);
      setStep('preview-text');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleApprove = (id: string) =>
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, approved: !d.approved } : d));

  const approveAll = () => setDrafts(prev => prev.map(d => ({ ...d, approved: true })));
  const rejectAll  = () => setDrafts(prev => prev.map(d => ({ ...d, approved: false })));

  const startEdit = (d: DraftPolicyCategory) => {
    setEditingId(d.id);
    setEditBuf({ title: d.title, summary: d.summary, content: d.content, keywords: d.keywords, pageNumber: d.pageNumber });
    setExpandedId(d.id);
  };

  const saveEdit = (id: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? {
      ...d,
      title: String(editBuf.title ?? d.title).trim(),
      summary: String(editBuf.summary ?? d.summary).trim(),
      content: String(editBuf.content ?? d.content).trim(),
      keywords: editBuf.keywords ?? d.keywords,
      pageNumber: Number(editBuf.pageNumber) || d.pageNumber,
      edited: true
    } : d));
    setEditingId(null);
    setEditBuf({});
  };

  const cancelEdit = () => { setEditingId(null); setEditBuf({}); };

  const handleApproveAndMerge = () => {
    const approved = drafts.filter(d => d.approved);
    if (approved.length === 0) return;

    const now = new Date().toISOString().slice(0, 10);
    const newPolicies: PolicyCategory[] = approved.map(d => ({
      id: d.id,
      title: d.title,
      policyType: d.policyType,
      pageNumber: d.pageNumber,
      lastUpdated: now,
      summary: d.summary,
      content: d.content,
      keywords: d.keywords
    }));

    const existingTitles = existingPolicies.map(p => p.title.toLowerCase());
    const duplicates = newPolicies.filter(p => existingTitles.includes(p.title.toLowerCase()));
    if (duplicates.length > 0) {
      const names = duplicates.map(d => `"${d.title}"`).join(', ');
      const ok = window.confirm(
        `\u26a0\ufe0f The following category titles already exist:\n\n${names}\n\nDo you want to add them anyway as separate entries?`
      );
      if (!ok) return;
    }

    onUpdatePolicies([...existingPolicies, ...newPolicies]);
    setApprovedCount(approved.length);
    setStep('done');
  };

  const approvedDrafts = drafts.filter(d => d.approved).length;

  return (
    <div className="flex flex-col gap-6 p-1">

      {/* Step indicator */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 select-none">
        {(['select-type','drop-file','preview-text','analyzing','review','done'] as UploadStep[]).map((s, i, arr) => (
          <React.Fragment key={s}>
            <StepIndicator current={step} step={s} label={
              s === 'select-type' ? 'Select Type' :
              s === 'drop-file'   ? 'Upload File' :
              s === 'preview-text'? 'Preview Text':
              s === 'analyzing'   ? 'AI Analysis' :
              s === 'review'      ? 'Review'       : 'Done'
            } />
            {i < arr.length - 1 && <span className="text-slate-300 dark:text-slate-700 self-center text-xs">›</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Select Policy Type ──────────────────────────────────────── */}
      {step === 'select-type' && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Step 1 — Select Policy Type</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Choose whether this handbook contains <strong>Consultant</strong> or <strong>Employee</strong> policies.
              All AI-generated categories will be tagged with this type.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {(['consultant', 'employee'] as PolicyRole[]).map(type => (
              <button
                key={type}
                id={`upload-type-${type}`}
                onClick={() => setPolicyType(type)}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  policyType === type
                    ? type === 'consultant'
                      ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30'
                      : 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-pink-200 dark:hover:border-pink-800'
                }`}
              >
                {type === 'consultant'
                  ? <Briefcase className={`w-8 h-8 ${policyType === 'consultant' ? 'text-pink-500' : 'text-slate-400'}`} />
                  : <BookOpen  className={`w-8 h-8 ${policyType === 'employee'   ? 'text-indigo-500' : 'text-slate-400'}`} />}
                <div className="text-center">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 capitalize">{type}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {type === 'consultant' ? 'Shadow teachers, contractual' : 'Permanent staff, clinical leads'}
                  </div>
                </div>
                {policyType === type && <Check className={`w-4 h-4 ${type === 'consultant' ? 'text-pink-500' : 'text-indigo-500'}`} />}
              </button>
            ))}
          </div>
          <button
            id="upload-continue-to-file"
            onClick={() => setStep('drop-file')}
            className="self-start px-5 py-2.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: Drop File ────────────────────────────────────────────────── */}
      {step === 'drop-file' && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Step 2 — Upload Policy Document</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Uploading as <strong className={policyType === 'consultant' ? 'text-pink-500' : 'text-indigo-500'}>{policyType}</strong> policy.
              Supported: PDF, DOCX, TXT · Max {MAX_FILE_MB} MB
            </p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploadLoading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              dragging
                ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/20 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-600 hover:border-pink-300 dark:hover:border-pink-700 bg-slate-50 dark:bg-slate-800/50'
            } ${uploadLoading ? 'pointer-events-none opacity-70' : ''}`}
          >
            {uploadLoading ? (
              <>
                <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Extracting text…</p>
              </>
            ) : (
              <>
                <Upload className={`w-10 h-10 transition-colors ${dragging ? 'text-pink-500' : 'text-slate-400'}`} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Drag &amp; drop your file here</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">or click to browse</p>
                </div>
                <div className="flex gap-2">
                  {ALLOWED_EXTS.map(ext => (
                    <span key={ext} className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">{ext}</span>
                  ))}
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              id="policy-file-input"
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={onFileInput}
            />
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{uploadError}
            </div>
          )}

          <button onClick={() => setStep('select-type')} className="self-start text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline">
            ← Change policy type
          </button>
        </div>
      )}

      {/* ── STEP 3: Preview Extracted Text ──────────────────────────────────── */}
      {step === 'preview-text' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Step 3 — Review Extracted Text</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Verify the text looks correct before sending to AI.</p>
            </div>
            <button onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 shrink-0">
              <RotateCcw className="w-3 h-3" /> Start over
            </button>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <FileText className="w-5 h-5 text-slate-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{fileName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {wordCount.toLocaleString()} words · {extractedText.length.toLocaleString()} chars
                {extractedText.length > 85000 ? (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    (Document will be analyzed across {Math.ceil(extractedText.length / 82000)} passes to protect your Gemini quota)
                  </span>
                ) : (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    (Document will be analyzed in 1 fast pass to protect your Gemini quota)
                  </span>
                )}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              policyType === 'consultant'
                ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300'
                : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300'
            }`}>{policyType}</span>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Extracted Text Preview</span>
              <button onClick={() => setShowFullText(p => !p)} className="flex items-center gap-1 text-xs text-pink-500 hover:text-pink-600">
                {showFullText ? <><EyeOff className="w-3.5 h-3.5" /> Collapse</> : <><Eye className="w-3.5 h-3.5" /> Show full</>}
              </button>
            </div>
            <pre className={`text-xs text-slate-700 dark:text-slate-300 p-4 whitespace-pre-wrap font-mono bg-white dark:bg-slate-900 overflow-auto transition-all ${showFullText ? 'max-h-[600px]' : 'max-h-48'}`}>
              {extractedText}
            </pre>
          </div>

          {isQuotaExceeded ? (
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Gemini API Quota Limit Reached (HTTP 429)
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                {analysisError || 'Your Gemini API quota or rate limit has been exceeded. Document analysis was stopped immediately to prevent consuming quota.'}
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                You can retry manually when your Gemini API quota resets. Previously approved policies remain completely unaffected.
              </p>
            </div>
          ) : analysisError ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{analysisError}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              id="upload-analyze-btn"
              type="button"
              disabled={isAnalyzing}
              onClick={handleAnalyze}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all shadow-sm ${
                isAnalyzing
                  ? 'bg-slate-400 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Document...
                </>
              ) : isQuotaExceeded ? (
                <>
                  <RotateCcw className="w-4 h-4" /> Retry Analysis Manually
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Analyze with AI
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => { setStep('drop-file'); setUploadError(''); }}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline disabled:opacity-50"
            >
              Upload a different file
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Analyzing ───────────────────────────────────────────────── */}
      {step === 'analyzing' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-pink-100 dark:border-pink-950 border-t-pink-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-pink-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Gemini is reading your document…</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Identifying policy sections and generating summaries</p>
          </div>
        </div>
      )}

      {/* ── STEP 5: Review Drafts ────────────────────────────────────────────── */}
      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Step 5 — Review AI-Generated Categories</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {drafts.length} categories detected from <strong>{fileName}</strong>.
                Approve, edit, or reject each one before adding to the policy library.
              </p>
            </div>
            <button onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 shrink-0">
              <RotateCcw className="w-3 h-3" /> Start over
            </button>
          </div>

          {(wasTruncated || Boolean(warningMessage)) && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
              <Info className="w-4 h-4 shrink-0" />
              {warningMessage || 'The document analysis was partially incomplete due to an error in processing some sections. The categories below represent the sections successfully analyzed.'}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={approveAll} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
            </button>
            <button onClick={rejectAll} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium transition-colors">
              <XCircle className="w-3.5 h-3.5" /> Reject All
            </button>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{approvedDrafts} of {drafts.length} approved</span>
          </div>

          <div className="flex flex-col gap-3">
            {drafts.map(draft => {
              const isExpanded = expandedId === draft.id;
              const isEditing  = editingId  === draft.id;
              return (
                <div key={draft.id} className={`rounded-xl border-2 transition-all ${
                  draft.approved
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}>
                  {/* Card header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      id={`draft-approve-${draft.id}`}
                      onClick={() => toggleApprove(draft.id)}
                      title={draft.approved ? 'Click to reject' : 'Click to approve'}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        draft.approved ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                      }`}
                    >
                      {draft.approved && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          value={String(editBuf.title ?? draft.title)}
                          onChange={e => setEditBuf(b => ({ ...b, title: e.target.value }))}
                          className="w-full text-sm font-semibold px-2 py-1 rounded border border-pink-300 dark:border-pink-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {draft.title}
                          {draft.edited && <span className="ml-2 text-[10px] text-violet-500 font-normal">(edited)</span>}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Page {draft.pageNumber}</span>
                        <ConfidenceBadge score={draft.confidence} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(draft.id)} title="Save edits" className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"><Save className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} title="Cancel" className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <button onClick={() => startEdit(draft)} title="Edit" className="p-1.5 rounded-md text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30"><Edit3 className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => setExpandedId(isExpanded ? null : draft.id)} title={isExpanded ? 'Collapse' : 'Expand'} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => toggleApprove(draft.id)} title="Toggle approval" className={`p-1.5 rounded-md transition-colors ${draft.approved ? 'text-emerald-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-slate-300 dark:text-slate-600'}`}>
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Summary</label>
                        {isEditing ? (
                          <textarea value={String(editBuf.summary ?? draft.summary)} onChange={e => setEditBuf(b => ({ ...b, summary: e.target.value }))} rows={2} className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 resize-none" />
                        ) : (
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{draft.summary}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Keywords</label>
                        {isEditing ? (
                          <input value={(editBuf.keywords ?? draft.keywords).join(', ')} onChange={e => setEditBuf(b => ({ ...b, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {draft.keywords.map(kw => <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{kw}</span>)}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Full Content</label>
                        {isEditing ? (
                          <textarea value={String(editBuf.content ?? draft.content)} onChange={e => setEditBuf(b => ({ ...b, content: e.target.value }))} rows={8} className="mt-1 w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono resize-y" />
                        ) : (
                          <pre className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 max-h-64 overflow-y-auto">{draft.content}</pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              id="upload-add-approved-btn"
              onClick={handleApproveAndMerge}
              disabled={approvedDrafts === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                approvedDrafts > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Add {approvedDrafts > 0 ? approvedDrafts : ''} Approved to Policy Library
            </button>
            {approvedDrafts === 0 && <p className="text-xs text-slate-400">Approve at least one category above</p>}
          </div>
        </div>
      )}

      {/* ── STEP 6: Done ─────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {approvedCount} {approvedCount === 1 ? 'category' : 'categories'} added!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Approved categories have been merged into the policy library and saved to disk.
              The chatbot will use them immediately.
            </p>
          </div>
          <button
            id="upload-upload-another-btn"
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload Another Document
          </button>
        </div>
      )}
    </div>
  );
};
