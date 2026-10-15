export type PolicyRole = 'consultant' | 'employee';
export type UserRole = 'consultant' | 'employee' | 'admin';

export interface PolicyCategory {
  id: string;
  title: string;
  policyType: PolicyRole;
  pageNumber: number;
  lastUpdated: string;
  summary: string;
  content: string;
  keywords: string[];
}

export interface PolicyCitation {
  categoryId: string;
  title: string;
  pageNumber: number;
  snippet?: string;
  policyType: PolicyRole;
}

export interface SuggestedAction {
  label: string;
  action: 'switch_role' | 'verify_id' | 'ask_query' | 'view_page' | 'open_admin';
  payload?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  role: PolicyRole | 'admin';
  text: string;
  timestamp: string;
  citations?: PolicyCitation[];
  isOutOfDomain?: boolean;
  requiresEmployeeId?: boolean;
  suggestedActions?: SuggestedAction[];
  isError?: boolean;
}

export interface LogoConfig {
  fontFamily: 'Plus Jakarta Sans' | 'Inter' | 'Outfit' | 'Playfair Display' | 'sans-serif' | 'serif' | 'monospace';
  textColor: string;
  fontSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fontWeight: 'font-normal' | 'font-medium' | 'font-semibold' | 'font-bold' | 'font-extrabold';
  iconType: 'brain-heart' | 'butterfly' | 'star-child' | 'sparkles' | 'custom';
  customImageUrl?: string;
  brandText: string;
  subText: string;
}

export interface SearchMatch {
  categoryId: string;
  title: string;
  pageNumber: number;
  policyType: PolicyRole;
  snippet: string;
  matchIndex: number;
}
