import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { checkConsultantQueryingEmployeePolicy, checkIsOutOfDomain, retrievePolicyContext, validateEmployeeId, generateLocalPolicyResponse } from './src/utils/ragEngine';
import { INITIAL_CONSULTANT_POLICIES, INITIAL_EMPLOYEE_POLICIES, INSIGHTE_COMPANY_PROFILE } from './src/data/defaultPolicies';
import { PolicyCategory, PolicyRole } from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// In-memory policy storage that defaults to standard policies but can be updated by admin via API
let activePolicies: PolicyCategory[] = [
  ...INITIAL_CONSULTANT_POLICIES,
  ...INITIAL_EMPLOYEE_POLICIES
];

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
    return res.json({ success: true, user: { email, role: 'admin', name: 'Insighte Policy Administrator' } });
  }
  return res.status(401).json({ success: false, message: 'Invalid admin credentials. Use admin@insighte.in / admin123' });
});

// Sync updated policies from Admin
app.post('/api/policies/sync', (req, res) => {
  const { policies } = req.body;
  if (Array.isArray(policies) && policies.length > 0) {
    activePolicies = policies;
    return res.json({ success: true, count: activePolicies.length });
  }
  return res.status(400).json({ success: false, message: 'Invalid policies payload' });
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
${role === 'employee' ? `VERIFIED EMPLOYEE ID: ${employeeId}` : 'CONSULTANT (CONTRACTUAL / SHADOW TEACHER)'}

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
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
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
    const local = generateLocalPolicyResponse(req.body?.query || '', activePolicies, 'consultant');
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
