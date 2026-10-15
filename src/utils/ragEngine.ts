import { PolicyCategory, PolicyCitation, PolicyRole } from '../types';
import { INSIGHTE_COMPANY_PROFILE } from '../data/defaultPolicies';

// Keywords that indicate the query is asking about internal full-time employee policies
const EMPLOYEE_SPECIFIC_TERMS = [
  'employee leave', 'earned leave', 'el quota', 'permanent leave', 'casual leave for employee',
  'provident fund', 'epf', 'esi', 'health insurance 5 lakh', 'annual appraisal',
  'annual increment', 'maternity leave 26 weeks', 'paternity leave 10 days',
  'full time salary', 'full time benefits', 'permanent staff', 'internal employee',
  'non-compete 12 months', '30 days notice', 'gratuity 5 years', 'hrms portal check-in'
];

// In-domain keywords related to Insighte, autism, shadow teaching, education, and company policies
const IN_DOMAIN_KEYWORDS = [
  'insighte', 'shadow', 'teacher', 'consultant', 'employee', 'policy', 'leave', 'absence',
  'sick', 'emergency', 'notice', 'autism', 'asd', 'adhd', 'special needs', 'neurodiverse',
  'meltdown', 'sensory', 'posh', 'harassment', 'sexual harassment', 'pocso', 'child',
  'classroom', 'conduct', 'dress code', 'mobile phone', 'parents', 'school', 'iep',
  'audit', 'remuneration', 'invoice', 'invoicing', 'salary', 'timesheet', '28th',
  'payment', 'payout', 'tds', 'confidentiality', 'photo', 'social media', 'video',
  'grievance', 'termination', 'resignation', 'appraisal', 'insurance', 'provident fund',
  'pediatrician', 'therapy', 'inclusion', 'student', 'id', 'credential', 'company',
  'site', 'website', 'service', 'training', 'contact', 'hours', 'support', 'ic', 'committee'
];

// Check if query is clearly outside the scope of company policies and operations
export function checkIsOutOfDomain(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 3) return false;

  // Obvious non-domain questions
  const outOfDomainTriggers = [
    'capital of', 'weather in', 'write python', 'write javascript', 'code for',
    'crypto', 'bitcoin', 'ethereum', 'recipe for', 'how to bake', 'movie', 'song',
    'football', 'cricket score', 'fifa', 'who won', 'stock price', 'joke',
    'tell me a story about a dragon', 'translate into spanish', 'quantum physics',
    'solve equation', 'math problem', 'elon musk', 'donald trump', 'barack obama'
  ];

  for (const trigger of outOfDomainTriggers) {
    if (normalized.includes(trigger)) {
      return true;
    }
  }

  // Count domain term matches
  const hasDomainTerm = IN_DOMAIN_KEYWORDS.some(term => normalized.includes(term));
  
  // If the query is sufficiently long (> 4 words) and contains ZERO domain terms, flag as out of domain
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  if (words.length >= 4 && !hasDomainTerm) {
    return true;
  }

  return false;
}

// Check if a consultant is asking for employee-only policies
export function checkConsultantQueryingEmployeePolicy(query: string, currentRole: PolicyRole): boolean {
  if (currentRole === 'employee') return false; // Employees have full access

  const normalized = query.toLowerCase();

  // Explicit mention of employee policy or benefits
  const matchesEmployeeTerm = EMPLOYEE_SPECIFIC_TERMS.some(term => normalized.includes(term));
  
  if (matchesEmployeeTerm) return true;

  // Queries explicitly asking "what is the employee policy for..." or "how many leaves for employees"
  if (
    (normalized.includes('employee') || normalized.includes('full time') || normalized.includes('permanent')) &&
    (normalized.includes('leave') || normalized.includes('salary') || normalized.includes('appraisal') || normalized.includes('pf') || normalized.includes('insurance') || normalized.includes('notice'))
  ) {
    return true;
  }

  return false;
}

// Retrieve relevant policy categories (RAG retrieval)
export function retrievePolicyContext(
  query: string,
  categories: PolicyCategory[],
  allowedRole: PolicyRole
): { matchedCategories: PolicyCategory[]; citations: PolicyCitation[] } {
  const normalizedQuery = query.toLowerCase();
  const queryTokens = normalizedQuery.split(/\W+/).filter(t => t.length > 2);

  // Filter accessible policies based on role
  const accessibleCategories = categories.filter(c => {
    if (allowedRole === 'employee') return true; // employee can access both
    return c.policyType === 'consultant'; // consultant can only access consultant policies
  });

  // Score each category
  const scored = accessibleCategories.map(cat => {
    let score = 0;
    const catTitle = cat.title.toLowerCase();
    const catContent = cat.content.toLowerCase();
    const catSummary = cat.summary.toLowerCase();

    // Direct title match boost
    if (catTitle.includes(normalizedQuery)) score += 50;

    // Check keywords
    for (const kw of cat.keywords) {
      if (normalizedQuery.includes(kw.toLowerCase())) {
        score += 25;
      }
    }

    // Token frequency matching
    for (const token of queryTokens) {
      if (catTitle.includes(token)) score += 15;
      if (catSummary.includes(token)) score += 10;
      
      const count = (catContent.match(new RegExp(token, 'g')) || []).length;
      score += Math.min(count * 2, 20);
    }

    return { category: cat, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top categories with positive score or top 2 if score is low
  const topMatches = scored.filter(s => s.score > 5).slice(0, 3);
  const finalCategories = topMatches.length > 0 ? topMatches.map(m => m.category) : scored.slice(0, 1).map(m => m.category);

  const citations: PolicyCitation[] = finalCategories.map(cat => ({
    categoryId: cat.id,
    title: cat.title,
    pageNumber: cat.pageNumber,
    policyType: cat.policyType,
    snippet: cat.summary
  }));

  return { matchedCategories: finalCategories, citations };
}

// Validate employee ID against company roster / standard pattern
export function validateEmployeeId(id: string): boolean {
  if (!id) return false;
  const cleanId = id.trim().toUpperCase();

  // Pattern INS-EMP-XXXX or INS-XXXX
  const pattern = /^INS-(EMP-)?[0-9]{3,5}$/i;
  if (pattern.test(cleanId)) return true;

  // Preset roster
  return INSIGHTE_COMPANY_PROFILE.verifiedEmployeeIds.includes(cleanId);
}

// Fallback high-quality answer generator when Gemini API is streaming or offline
export function generateLocalRAGResponse(
  query: string,
  categories: PolicyCategory[],
  role: PolicyRole
): { text: string; citations: PolicyCitation[] } {
  const { matchedCategories, citations } = retrievePolicyContext(query, categories, role);

  if (matchedCategories.length === 0) {
    return {
      text: `I could not locate a specific clause directly addressing your question in the ${role.toUpperCase()} Policy documents. Please contact your Insighte Case Coordinator or HR at ${INSIGHTE_COMPANY_PROFILE.supportEmail}.`,
      citations: []
    };
  }

  const primaryCat = matchedCategories[0];
  const responseParts = [
    `Based on the official **Insighte ${primaryCat.policyType === 'consultant' ? 'Consultant Policy Handbook' : 'Employee Service Manual'}** ([Page ${primaryCat.pageNumber}: ${primaryCat.title}]):\n\n`,
    `### Key Policy Provisions\n`,
    `> ${primaryCat.summary}\n\n`,
    `#### Relevant Clause Details:\n`,
    primaryCat.content.split('\n\n').slice(1, 4).join('\n\n'),
    `\n\n📌 *For complete text, refer to Page ${primaryCat.pageNumber} in the policy document viewer.*`
  ];

  return {
    text: responseParts.join(''),
    citations
  };
}
