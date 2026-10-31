import express from 'express';
import path from 'path';
import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import { checkConsultantQueryingEmployeePolicy, checkIsOutOfDomain, retrievePolicyContext, validateEmployeeId, generateLocalPolicyResponse } from './src/utils/ragEngine';
import { INITIAL_CONSULTANT_POLICIES, INITIAL_EMPLOYEE_POLICIES, INSIGHTE_COMPANY_PROFILE } from './src/data/defaultPolicies';
import { PolicyCategory, PolicyRole } from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const feedbackFilePath = path.resolve(process.cwd(), 'data', 'feedback.json');
const policiesFilePath = path.resolve(process.cwd(), 'data', 'policies.json');
const uploadsTmpDir = path.resolve(process.cwd(), 'data', 'uploads_tmp');
const adminSessions = new Map<string, number>();
const adminSessionDurationMs = 8 * 60 * 60 * 1000;
let feedbackWriteQueue: Promise<void> = Promise.resolve();

// ─── Multer: disk-based temp storage for uploaded files ────────────────────
const upload = multer({
  dest: uploadsTmpDir,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const allowedExt = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are supported.'));
    }
  }
});

// ─── Policy disk persistence helpers ──────────────────────────────────────
async function readPersistedPolicies(): Promise<PolicyCategory[]> {
  try {
    if (!existsSync(policiesFilePath)) return [];
    const raw = await readFile(policiesFilePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as PolicyCategory[];
  } catch {
    // corrupted file — fall through to defaults
  }
  return [];
}

async function persistPolicies(policies: PolicyCategory[]): Promise<void> {
  await mkdir(path.dirname(policiesFilePath), { recursive: true });
  await writeFile(policiesFilePath, JSON.stringify(policies, null, 2), 'utf8');
}

// Safe delete of a temp file — suppresses errors so upload flow never breaks
async function safeDeleteTmp(filePath: string): Promise<void> {
  try { await unlink(filePath); } catch { /* ignore */ }
}

type ChatFeedback = {
  id: string;
  role: PolicyRole | 'admin';
  question: string;
  answer: string;
  comment: string;
  rating: 'helpful' | 'not-helpful' | null;
  createdAt: string;
};

const getAdminSession = (req: express.Request) => {
  const sessionCookie = req.headers.cookie
    ?.split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('insighte_admin_session='));
  return sessionCookie?.slice('insighte_admin_session='.length);
};

const requireAdminSession = (req: express.Request, res: express.Response) => {
  const session = getAdminSession(req);
  const expiresAt = session ? adminSessions.get(session) : undefined;
  if (!session || !expiresAt || expiresAt <= Date.now()) {
    if (session) adminSessions.delete(session);
    res.status(401).json({ message: 'Administrator sign-in is required.' });
    return false;
  }
  return true;
};

const readChatFeedback = async (): Promise<ChatFeedback[]> => {
  try {
    const file = await readFile(feedbackFilePath, 'utf8');
    const parsed: unknown = JSON.parse(file);
    if (!Array.isArray(parsed)) throw new Error('Feedback data file must contain an array.');
    return parsed as ChatFeedback[];
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

app.use(express.json({ limit: '10mb' }));

// In-memory policy storage — seeded from disk on startup, falls back to bundled defaults
let activePolicies: PolicyCategory[] = [
  ...INITIAL_CONSULTANT_POLICIES,
  ...INITIAL_EMPLOYEE_POLICIES
];

// Load persisted policies from disk before server starts accepting requests
// Persisted policies replace defaults entirely so admin edits survive restarts
async function loadPersistedPoliciesIntoMemory(): Promise<void> {
  const persisted = await readPersistedPolicies();
  if (persisted.length > 0) {
    activePolicies = persisted;
    console.log(`Loaded ${persisted.length} policies from data/policies.json`);
  } else {
    console.log(`No persisted policies found — using ${activePolicies.length} built-in defaults`);
  }
}

// Initialize Gemini SDK with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
    activePolicyCount: activePolicies.length,
    timestamp: new Date().toISOString()
  });
});

// Employee validation endpoint
app.post('/api/employee/verify', (req, res) => {
  const { loginId, password } = req.body;
  const cleanId = (loginId || '').trim().toUpperCase();

  if (!cleanId) {
    return res.status(400).json({ success: false, message: 'Employee ID is required.' });
  }

  const isValidId = validateEmployeeId(cleanId);
  const isValidPw = password === 'emp123' || password === 'insighte123' || password === 'employee' || password === 'password' || (typeof password === 'string' && password.trim().length >= 4);

  if (isValidId && isValidPw) {
    return res.json({
      success: true,
      employeeId: cleanId,
      user: {
        id: cleanId,
        role: 'employee',
        name: `Insighte Staff (${cleanId})`
      }
    });
  }

  if (!isValidId) {
    return res.status(401).json({
      success: false,
      message: 'Invalid Employee ID. Format: INS-EMP-1042 (or use demo ID).'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid password. (Use demo password: emp123)'
  });
});

// Admin validation endpoint
app.post('/api/admin/verify', (req, res) => {
  const { email, password } = req.body;
  // Standard demo credentials or environment configured
  if (
    (email === 'admin@insighte.in' && (password === 'admin123' || password === 'insighte@2025')) ||
    (email === 'admin' && (password === 'admin' || password === 'admin123'))
  ) {
    const session = randomUUID();
    adminSessions.set(session, Date.now() + adminSessionDurationMs);
    res.setHeader(
      'Set-Cookie',
      `insighte_admin_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${adminSessionDurationMs / 1000}${isProduction ? '; Secure' : ''}`
    );
    return res.json({ success: true, user: { email, role: 'admin', name: 'Insighte Policy Administrator' } });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials. Use admin@insighte.in / admin123' });
});

app.post('/api/admin/logout', (req, res) => {
  const session = getAdminSession(req);
  if (session) adminSessions.delete(session);
  res.setHeader(
    'Set-Cookie',
    `insighte_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isProduction ? '; Secure' : ''}`
  );
  return res.json({ success: true });
});

app.post('/api/feedback', async (req, res) => {
  const { role, question, answer, comment, rating } = req.body ?? {};
  if (!['consultant', 'employee', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'A valid policy role is required.' });
  }
  if (typeof question !== 'string' || !question.trim() || question.length > 5000) {
    return res.status(400).json({ message: 'The question is required and must be under 5,000 characters.' });
  }
  if (typeof answer !== 'string' || !answer.trim() || answer.length > 15000) {
    return res.status(400).json({ message: 'The answer is required and must be under 15,000 characters.' });
  }
  if (typeof comment !== 'string' || !comment.trim() || comment.length > 1000) {
    return res.status(400).json({ message: 'Feedback is required and must be under 1,000 characters.' });
  }
  if (rating !== null && rating !== undefined && rating !== 'helpful' && rating !== 'not-helpful') {
    return res.status(400).json({ message: 'Feedback rating is invalid.' });
  }

  const feedback: ChatFeedback = {
    id: randomUUID(),
    role,
    question: question.trim(),
    answer: answer.trim(),
    comment: comment.trim(),
    rating: rating ?? null,
    createdAt: new Date().toISOString()
  };

  const write = feedbackWriteQueue.then(async () => {
    const existingFeedback = await readChatFeedback();
    await mkdir(path.dirname(feedbackFilePath), { recursive: true });
    await writeFile(feedbackFilePath, JSON.stringify([...existingFeedback, feedback], null, 2), 'utf8');
  });
  feedbackWriteQueue = write.catch(error => {
    console.error('Could not save chatbot feedback:', error);
  });

  try {
    await write;
    return res.status(201).json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Could not save feedback. Please try again later.' });
  }
});

app.get('/api/admin/feedback', async (req, res) => {
  if (!requireAdminSession(req, res)) return;
  try {
    await feedbackWriteQueue;
    return res.json({ feedback: await readChatFeedback() });
  } catch (error) {
    console.error('Could not read chatbot feedback:', error);
    return res.status(500).json({ message: 'Could not load chatbot feedback.' });
  }
});

// Sync updated policies from Admin — also persists to disk
app.post('/api/policies/sync', async (req, res) => {
  const { policies } = req.body;
  if (Array.isArray(policies) && policies.length > 0) {
    activePolicies = policies;
    try {
      await persistPolicies(policies);
    } catch (err) {
      console.warn('Could not persist policies to disk:', err);
    }
    return res.json({ success: true, count: activePolicies.length });
  }
  return res.status(400).json({ success: false, message: 'Invalid policies payload' });
});

// ─── Upload: extract text from PDF / DOCX / TXT ───────────────────────────
app.post('/api/admin/upload-policy', upload.single('file'), async (req, res) => {
  if (!requireAdminSession(req, res)) return;

  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: 'No file received. Please attach a PDF, DOCX, or TXT file.' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  let extractedText = '';

  try {
    if (ext === '.pdf') {
      // Dynamic import supporting both pdf-parse v2+ (PDFParse class) and v1 (function)
      const pdfModule: any = await import('pdf-parse');
      const buffer = await readFile(file.path);
      if (typeof pdfModule.PDFParse === 'function') {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = (result?.text || '').trim();
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      } else {
        const parseFn = pdfModule.default || pdfModule;
        const result = await parseFn(buffer);
        extractedText = (result?.text || '').trim();
      }
      if (!extractedText) {
        await safeDeleteTmp(file.path);
        return res.status(422).json({
          success: false,
          message: 'This PDF appears to be scanned (image-only) and contains no extractable text. Please use a text-based PDF.'
        });
      }
    } else if (ext === '.docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: file.path });
      extractedText = result.value.trim();
      if (!extractedText) {
        await safeDeleteTmp(file.path);
        return res.status(422).json({ success: false, message: 'Could not extract text from this DOCX file. It may be empty or protected.' });
      }
    } else if (ext === '.txt') {
      extractedText = (await readFile(file.path, 'utf8')).trim();
      if (!extractedText) {
        await safeDeleteTmp(file.path);
        return res.status(422).json({ success: false, message: 'The uploaded text file is empty.' });
      }
    } else {
      await safeDeleteTmp(file.path);
      return res.status(400).json({ success: false, message: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' });
    }

    // Clean up temp file immediately after successful extraction
    await safeDeleteTmp(file.path);

    return res.json({
      success: true,
      fileName: file.originalname,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      charCount: extractedText.length,
      text: extractedText
    });
  } catch (err: any) {
    await safeDeleteTmp(file.path);
    console.error('Text extraction error:', err);
    return res.status(500).json({ success: false, message: `Text extraction failed: ${err?.message || 'Unknown error'}` });
  }
});

// ─── Helpers: Smart Document Chunking & Category Deduplication ─────────────
function splitTextIntoChunks(text: string, chunkSize = 85000, overlap = 3000): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= text.length) {
      const lastChunk = text.slice(startIndex).trim();
      if (lastChunk) chunks.push(lastChunk);
      break;
    }

    // Attempt to break at a natural paragraph boundary within the last 20% of the chunk
    const searchWindowStart = Math.max(startIndex, endIndex - Math.floor(chunkSize * 0.2));
    const paragraphBreak = text.lastIndexOf('\n\n', endIndex);

    if (paragraphBreak > searchWindowStart) {
      endIndex = paragraphBreak + 2;
    } else {
      const lineBreak = text.lastIndexOf('\n', endIndex);
      if (lineBreak > searchWindowStart) {
        endIndex = lineBreak + 1;
      } else {
        const spaceBreak = text.lastIndexOf(' ', endIndex);
        if (spaceBreak > searchWindowStart) {
          endIndex = spaceBreak + 1;
        }
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk) chunks.push(chunk);

    const nextStart = endIndex - overlap;
    startIndex = nextStart > startIndex ? nextStart : endIndex;
  }

  return chunks;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(policy|handbook|guidelines|guideline|protocol|protocols|section|rules|rule)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function areTitlesSimilar(titleA: string, titleB: string): boolean {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Substring containment only for multi-word phrases (at least 2 words) to prevent false single-word matches
  const wordsListA = normA.split(/\s+/).filter(w => w.length > 1);
  const wordsListB = normB.split(/\s+/).filter(w => w.length > 1);

  if (wordsListA.length >= 2 && wordsListB.length >= 2) {
    if (normA.includes(normB) || normB.includes(normA)) {
      return true;
    }
  }

  // Token set overlap (Jaccard similarity)
  const wordsA = new Set(normA.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(normB.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return (intersection / union) >= 0.75;
}

function mergeCategories(existing: any, incoming: any): any {
  const title = incoming.title && incoming.title.length > existing.title.length ? incoming.title : existing.title;
  const summary = (incoming.summary?.length || 0) > (existing.summary?.length || 0)
    ? incoming.summary
    : existing.summary;

  let content = existing.content || '';
  const incomingContent = incoming.content || '';
  if (!content.includes(incomingContent) && !incomingContent.includes(content)) {
    content = `${content}\n\n${incomingContent}`.trim();
  } else if (incomingContent.length > content.length) {
    content = incomingContent;
  }

  const keywordsSet = new Set<string>();
  if (Array.isArray(existing.keywords)) {
    existing.keywords.forEach((k: any) => keywordsSet.add(String(k).toLowerCase().trim()));
  }
  if (Array.isArray(incoming.keywords)) {
    incoming.keywords.forEach((k: any) => keywordsSet.add(String(k).toLowerCase().trim()));
  }
  const keywords = Array.from(keywordsSet).filter(Boolean);

  const confidence = Math.max(
    typeof existing.confidence === 'number' ? existing.confidence : 0.8,
    typeof incoming.confidence === 'number' ? incoming.confidence : 0.8
  );

  const pageNumber = Math.min(
    typeof existing.pageNumber === 'number' && existing.pageNumber > 0 ? existing.pageNumber : 1,
    typeof incoming.pageNumber === 'number' && incoming.pageNumber > 0 ? incoming.pageNumber : 1
  );

  return {
    ...existing,
    title,
    summary,
    content,
    keywords,
    confidence,
    pageNumber
  };
}

function deduplicateCategories(rawCategories: any[]): any[] {
  const merged: any[] = [];

  for (const cat of rawCategories) {
    if (!cat || typeof cat.title !== 'string' || typeof cat.content !== 'string') continue;
    if (!cat.title.trim() || !cat.content.trim()) continue;

    const existingIndex = merged.findIndex(m => areTitlesSimilar(m.title, cat.title));
    if (existingIndex >= 0) {
      merged[existingIndex] = mergeCategories(merged[existingIndex], cat);
    } else {
      merged.push({ ...cat });
    }
  }

  return merged;
}

function extractJsonFromModelResponse(text: string): any {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  throw new Error('Could not parse valid JSON array from model output');
}

let isDocumentAnalysisInProgress = false;

function isGeminiQuotaError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code || err.response?.status || err.error?.code || err.error?.status;
  if (status === 429 || status === '429' || status === 'RESOURCE_EXHAUSTED') return true;
  const msg = (String(err.message || '') + ' ' + String(err.stack || '') + ' ' + String(err)).toLowerCase();
  if (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('exhausted')
  ) {
    return true;
  }
  try {
    const serialized = JSON.stringify(err).toLowerCase();
    return (
      serialized.includes('429') ||
      serialized.includes('resource_exhausted') ||
      serialized.includes('quota')
    );
  } catch {}
  return false;
}

// ─── Analyze: send extracted text to Gemini → return structured categories ─
app.post('/api/admin/analyze-policy', async (req, res) => {
  if (!requireAdminSession(req, res)) return;

  if (!ai) {
    return res.status(503).json({ success: false, message: 'Gemini API is not configured. Please set GEMINI_API_KEY in your .env file.' });
  }

  // Prevent duplicate concurrent analysis submissions
  if (isDocumentAnalysisInProgress) {
    return res.status(409).json({
      success: false,
      message: 'A document analysis is already in progress. Please wait for it to complete.'
    });
  }

  const { text, policyType }: { text: string; policyType: 'consultant' | 'employee' } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 50) {
    return res.status(400).json({ success: false, message: 'Extracted text is too short to analyze.' });
  }
  if (policyType !== 'consultant' && policyType !== 'employee') {
    return res.status(400).json({ success: false, message: 'policyType must be "consultant" or "employee".' });
  }

  isDocumentAnalysisInProgress = true;
  try {
    // Split document into macro-sections to minimize API calls (uses 1 to 3 calls max instead of 14-21)
    const chunks = splitTextIntoChunks(text.trim(), 85000, 3000);
    const allRawCategories: any[] = [];
    let failedChunks = 0;
    const chunkErrors: string[] = [];
    let quotaExceeded = false;
    let quotaErrorMessage = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const partHeader = chunks.length > 1 ? ` (Part ${i + 1} of ${chunks.length})` : '';

      const analysisPrompt = `You are an expert HR policy analyst for "Insighte" (Child Development & Inclusive Education).

Your task: Read the following policy document text${partHeader} and extract distinct policy categories from it.

For each category found, return a JSON object with these exact fields:
- "title": string — clear, professional category name (e.g. "Leave & Attendance Policy")
- "pageNumber": number — estimated page/section number (start from ${i + 1} if unknown)
- "summary": string — 1-2 sentence plain-English summary of what this section covers
- "content": string — core policy clauses, rules, procedures, and key details for this category (concise, clear, and focused on substantive rules)
- "keywords": string[] — 5 to 8 lowercase keywords for search retrieval
- "confidence": number — your confidence from 0.0 to 1.0 that this is a distinct policy category

The policyType for ALL categories in this document is: "${policyType}"

Rules:
1. Extract 3 to 10 distinct, major policy categories from this text. Group related subsections together under their primary policy heading (e.g. Leave & Attendance, Conduct & Ethics, POSH, Remuneration, Safeguarding) rather than over-fragmenting.
2. Return ONLY a valid JSON array — no prose, no markdown fences, no extra text.
3. If this text does not appear to contain distinct policy provisions, return an empty array: []

DOCUMENT TEXT:
${chunk}`;

      try {
        console.log(`[Policy AI] Analyzing section ${i + 1}/${chunks.length} (${chunk.length} chars, quota-optimized)...`);
        const chunkStart = Date.now();
        let rawJson = '';

        try {
          // Primary: ultra-fast gemini-3.5-flash-lite
          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: analysisPrompt,
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          });
          rawJson = (geminiResponse.text || '').trim();
        } catch (liteErr: any) {
          if (isGeminiQuotaError(liteErr)) throw liteErr;
          console.warn(`[Policy AI] Fast model unavailable on section ${i + 1}, retrying with gemini-3.8-flash (low thinking):`, liteErr?.message || liteErr);
          const fallbackResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: analysisPrompt,
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              thinkingConfig: {
                thinkingLevel: 'low' as any
              }
            }
          });
          rawJson = (fallbackResponse.text || '').trim();
        }

        const parsed = extractJsonFromModelResponse(rawJson);

        let categoryList: any[] = [];
        if (Array.isArray(parsed)) {
          categoryList = parsed;
        } else if (parsed && typeof parsed === 'object') {
          const arrayVal = Object.values(parsed).find(v => Array.isArray(v));
          if (Array.isArray(arrayVal)) {
            categoryList = arrayVal;
          }
        }

        const elapsedSec = ((Date.now() - chunkStart) / 1000).toFixed(1);
        console.log(`[Policy AI] Section ${i + 1}/${chunks.length} extracted ${categoryList.length} categories in ${elapsedSec}s.`);
        if (categoryList.length > 0) {
          allRawCategories.push(...categoryList);
        }

        // Safety pause between sections to stay comfortably within rate limits
        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err: any) {
        console.error(`[Policy AI] Error on chunk ${i + 1}/${chunks.length}:`, err);
        if (isGeminiQuotaError(err)) {
          console.warn(`[Policy AI] Quota exhausted (429/RESOURCE_EXHAUSTED). Stopping analysis immediately. Chunks ${i + 2} to ${chunks.length} will NOT be executed.`);
          quotaExceeded = true;
          quotaErrorMessage = 'Gemini API quota has been exhausted (HTTP 429 / RESOURCE_EXHAUSTED). Document analysis has been stopped immediately to avoid exceeding rate limits. Please wait for your Gemini quota to reset before retrying.';
          break; // Stop immediately
        }
        failedChunks++;
        chunkErrors.push(err?.message || `Chunk ${i + 1} failed`);
      }
    }

    // If quota limit was exceeded, stop immediately and return explicit 429 error
    if (quotaExceeded) {
      return res.status(429).json({
        success: false,
        isQuotaExceeded: true,
        message: quotaErrorMessage
      });
    }

    if (allRawCategories.length === 0) {
      if (failedChunks > 0) {
        return res.status(500).json({
          success: false,
          message: `AI analysis failed: ${chunkErrors[0] || 'Unable to process document sections.'}`
        });
      }
      return res.status(422).json({
        success: false,
        message: 'The AI could not identify any policy categories in this document. Please check the extracted text and try again.'
      });
    }

    // Deduplicate and merge categories across all analyzed chunks
    const deduplicated = deduplicateCategories(allRawCategories);
    const now = new Date().toISOString().slice(0, 10);

    const drafts = deduplicated
      .filter(c => c && typeof c.title === 'string' && typeof c.content === 'string' && c.title.trim() && c.content.trim())
      .map((c, i) => ({
        id: `upload-${policyType}-${Date.now()}-${i}`,
        title: String(c.title).trim(),
        policyType,
        pageNumber: typeof c.pageNumber === 'number' && c.pageNumber > 0 ? c.pageNumber : i + 1,
        summary: typeof c.summary === 'string' ? c.summary.trim() : '',
        content: String(c.content).trim(),
        keywords: Array.isArray(c.keywords)
          ? c.keywords.map((k: any) => String(k).trim()).filter(Boolean)
          : [],
        lastUpdated: now,
        confidence: typeof c.confidence === 'number' ? Math.min(1, Math.max(0, c.confidence)) : 0.85,
        approved: false,
        edited: false
      }));

    if (drafts.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'The AI could not identify any policy categories in this document. Please check the extracted text and try again.'
      });
    }

    const wasTruncated = failedChunks > 0;
    const warning = failedChunks > 0
      ? `Document analysis was partially incomplete: ${failedChunks} of ${chunks.length} sections encountered an error during analysis. The categories below represent the sections successfully analyzed.`
      : undefined;

    return res.json({
      success: true,
      drafts,
      wasTruncated,
      warning,
      totalChunks: chunks.length,
      processedChunks: chunks.length - failedChunks
    });
  } finally {
    isDocumentAnalysisInProgress = false;
  }
});

// Primary policy query endpoint
app.post('/api/chat/ask', async (req, res) => {
  try {
    const {
      query,
      role = 'consultant',
      employeeId = '',
      clientPolicies = null
    }: {
      query: string;
      role: PolicyRole | 'admin';
      employeeId?: string;
      clientPolicies?: PolicyCategory[] | null;
    } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const currentPolicies = Array.isArray(clientPolicies) && clientPolicies.length > 0
      ? clientPolicies
      : activePolicies;

    const trimmedQuery = query.trim();

    // 1. Guardrail: Check Out-Of-Domain
    if (checkIsOutOfDomain(trimmedQuery)) {
      return res.json({
        answer: "⚠️ **Not Related to Company or Policy:** This question is outside the scope of Insighte's company policies, shadow teaching operations, and institutional guidelines. Please ask questions related to Insighte shadow teacher protocols, IEP execution, leave policy, POSH guidelines, or compensation.",
        isOutOfDomain: true,
        citations: []
      });
    }

    // 2. Guardrail: Consultant inquiring about Employee-only policies
    if (role === 'consultant' && checkConsultantQueryingEmployeePolicy(trimmedQuery, role)) {
      return res.json({
        answer: "🔒 **Access Restricted:** You are currently in **Consultant** mode. Internal full-time employee policies (such as permanent staff paid leave quotas, Provident Fund, health insurance, and annual appraisal cycles) are strictly confidential and restricted to verified Insighte employees. Please switch to **Employee** mode and provide your Employee ID to access these policies.",
        requiresEmployeeId: true,
        citations: [],
        suggestedActions: [
          { label: 'Switch to Employee & Verify ID', action: 'switch_role', payload: { role: 'employee' } }
        ]
      });
    }

    // 3. If in Employee role, verify Employee ID validity
    let isVerifiedEmployee = false;
    if (role === 'employee') {
      isVerifiedEmployee = validateEmployeeId(employeeId);
      if (!isVerifiedEmployee) {
        return res.json({
          answer: "⚠️ **Employee ID Required:** To access internal Insighte Employee Policies, please enter a valid Employee ID (e.g., `INS-EMP-1042` or `INS-EMP-2024`).",
          requiresEmployeeId: true,
          citations: []
        });
      }
    }

    // 4. Retrieve Context Chunks
    const retrievalRole = role === 'admin' ? 'employee' : role;
    const { matchedCategories, citations } = retrievePolicyContext(trimmedQuery, currentPolicies, retrievalRole);

    const contextText = matchedCategories.map(cat => (
      `=== [Page ${cat.pageNumber}] CATEGORY: ${cat.title} (${cat.policyType.toUpperCase()} POLICY) ===\nSUMMARY: ${cat.summary}\nFULL TEXT:\n${cat.content}\n`
    )).join('\n\n');

    // 5. Generate Answer via Gemini API with fast timeout & instant local fallback
    let responseText = '';

    if (ai) {
      try {
        const systemInstruction = `You are the official AI Policy Assistant for "Insighte" (Child Development & Inclusive Education Services).
Insighte provides shadow teachers, special education consultants, and clinical therapists for children with Autism Spectrum Disorder (ASD), ADHD, and developmental delays.

USER ROLE: ${role.toUpperCase()}
${role === 'employee' ? `VERIFIED EMPLOYEE ID: ${employeeId}` : role === 'admin' ? 'ADMINISTRATOR with full access to consultant and employee policy handbooks' : 'CONSULTANT (CONTRACTUAL / SHADOW TEACHER)'}

INSTRUCTIONS:
1. Answer the user's question accurately, concisely, and warmly based ONLY on the provided Insighte Policy documentation and company context.
2. ALWAYS cite the exact Page Number and Section/Category Name from the context (e.g. "[Page 2: Shadow Teacher Code of Conduct]").
3. If the user asks about shadow teacher responsibilities, remind them of child-centric care, sensory regulation, and non-intrusive classroom support.
4. If the question is not covered in the retrieved documents, clearly state: "This specific detail is not specified in the current policy document. Please contact your Insighte Case Coordinator or HR at support@insighte.in."
5. Never invent or hallucinate legal commitments not present in the policy text.
6. Format your answer cleanly with Markdown bolding, bullet points, and citation badges.`;

        const prompt = `COMPANY CONTEXT:
${INSIGHTE_COMPANY_PROFILE.name} - ${INSIGHTE_COMPANY_PROFILE.tagline}
Core focus: ${INSIGHTE_COMPANY_PROFILE.description}

RETRIEVED POLICY CONTEXT:
${contextText}

USER QUESTION:
"${trimmedQuery}"

Provide a grounded, professional response with explicit page citations:`;

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI generation timeout')), 15000)
        );

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        }).catch((err) => {
          console.warn('[Policy AI Chat] gemini-3.5-flash-lite failed, falling back to gemini-3.8-flash (low thinking):', err?.message || err);
          return ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.2,
              thinkingConfig: {
                thinkingLevel: 'low' as any
              }
            },
          });
        });

        const geminiResponse = await Promise.race([geminiPromise, timeoutPromise]);
        responseText = geminiResponse.text || '';
      } catch (err: any) {
        console.warn('Gemini API call skipped or timed out, using instant policy fallback:', err?.message || err);
      }
    }

    // High quality instant fallback ensuring 0% error rate with instant response
    if (!responseText) {
      const local = generateLocalPolicyResponse(trimmedQuery, currentPolicies, retrievalRole as any);
      responseText = local.text;
    }

    return res.json({
      answer: responseText,
      citations,
      isOutOfDomain: false,
      requiresEmployeeId: false
    });
  } catch (error: any) {
    console.error('Error in /api/chat/ask:', error);
    // Even in catch block, provide fallback answer from active policies instead of 500 error
    const fallbackRole = req.body?.role === 'admin' ? 'employee' : 'consultant';
    const local = generateLocalPolicyResponse(req.body?.query || '', activePolicies, fallbackRole);
    return res.json({
      answer: local.text,
      citations: local.citations,
      isOutOfDomain: false,
      requiresEmployeeId: false
    });
  }
});

// Setup Vite in Dev or Static files in Production
async function startServer() {
  // Ensure temp upload directory exists
  await mkdir(uploadsTmpDir, { recursive: true });

  // Load persisted policies from disk (overrides defaults if present)
  await loadPersistedPoliciesIntoMemory();

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Insighte Policy AI Server listening on port ${PORT}`);
  });
}

startServer();
