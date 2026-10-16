import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  FileSpreadsheet, 
  Printer, 
  Share2, 
  Mail, 
  Copy, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  Lock, 
  BookOpen, 
  UserCheck,
  Briefcase,
  HelpCircle,
  ExternalLink,
  Shield,
  MessageSquarePlus,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MessageSquareText
} from 'lucide-react';
import { ChatMessage, PolicyCategory, PolicyCitation, PolicyRole } from '../../types';
import { exportChatToCSV, exportChatToPDF, shareToWhatsApp, shareViaEmail, copyTranscript } from '../../utils/exportChat';

interface ChatContainerProps {
  currentRole: PolicyRole | 'admin';
  isAdminAuthenticated: boolean;
  employeeId: string;
  isEmployeeVerified: boolean;
  onRoleChange: (role: PolicyRole | 'admin') => void;
  onOpenEmployeeModal: (msg?: string) => void;
  onSelectCitation: (citation: PolicyCitation) => void;
  activePolicies: PolicyCategory[];
}

const getInitialWelcomeMessage = (role: PolicyRole | 'admin', employeeId: string): ChatMessage => {
  if (role === 'admin') {
    return {
      id: 'welcome-admin',
      sender: 'bot',
      role: 'admin',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello and welcome to **Insighte Policy Intelligence (Admin Mode)**! 🛡️\n\nYou have complete administrative clearance across both **Consultant** and **Employee** policy handbooks.\n- Ask questions regarding any clause across all 11 policy chapters\n- Check compliance standards, statutory POSH inquiry frameworks, and leave notice mandates\n- Use the **Admin Dashboard** in the top navigation to add, modify, or sync live policy chapters`,
      suggestedActions: [
        { label: '📋 View All Policies Overview', action: 'ask_query', payload: { query: 'Provide a complete summary of all consultant and employee policies' } },
        { label: '⚖️ POSH Compliance Rules', action: 'ask_query', payload: { query: 'What is the statutory POSH inquiry procedure and 90-day timeline?' } }
      ]
    };
  }

  if (role === 'employee') {
    return {
      id: 'welcome-employee',
      sender: 'bot',
      role: 'employee',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello and welcome to **Insighte Employee Policy Assistant**! 🏛️\n\nYou are authenticated as a verified team member **(${employeeId || 'INS-EMP-VERIFIED'})**.\nYou have access to internal permanent staff policies, including:\n- Paid Earned Leave (EL), Casual Leave (CL), and Sick Leave quotas\n- Employee Provident Fund (EPF), ESI, and ₹5,00,000 Group Health Insurance\n- Annual appraisal cycles, merit increments, and career progression\n- 30-day resignation notice period and separation settlement guidelines`,
      suggestedActions: [
        { label: '🏖️ Check Paid Leave Balance', action: 'ask_query', payload: { query: 'How many paid earned leaves (EL) do permanent employees get?' } },
        { label: '🏥 Health Insurance Details', action: 'ask_query', payload: { query: 'What is the Insighte Group Health Insurance coverage limit?' } }
      ]
    };
  }

  return {
    id: 'welcome-consultant',
    sender: 'bot',
    role: 'consultant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: `Hello and welcome to **Insighte Consultant Policy Assistant**! 🌸\n\nI am your dedicated policy assistant for **shadow teachers, therapists, and contractual consultants** supporting children with Autism Spectrum Disorder (ASD), ADHD, and developmental differences.\n\n**Direct Consultant Access (No Login Required):**\n- **Classroom Ethics:** Non-intrusive support, prompt fading, and student privacy\n- **Sensory Meltdown Support:** Co-regulation procedures and crisis de-escalation\n- **Leave Protocol:** 48-hour prior notice for planned absence and 7:00 AM emergency calls\n- **Monthly Invoicing:** Timesheet submission before 28th of every month`,
    suggestedActions: [
      { label: '📋 Leave Notice Policy', action: 'ask_query', payload: { query: 'What is the leave notice policy for consultants?' } },
      { label: '🧘 Sensory Meltdown Protocol', action: 'ask_query', payload: { query: 'What is the protocol for handling a sensory meltdown in class?' } },
      { label: '💵 Monthly Invoicing Rules', action: 'ask_query', payload: { query: 'When must monthly session invoices be submitted?' } }
    ]
  };
};

export const ChatContainer: React.FC<ChatContainerProps> = ({
  currentRole,
  isAdminAuthenticated,
  employeeId,
  isEmployeeVerified,
  onRoleChange,
  onOpenEmployeeModal,
  onSelectCitation,
  activePolicies
}) => {
  const [resetKey, setResetKey] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    getInitialWelcomeMessage(currentRole, employeeId)
  ]);

  const prevRoleRef = useRef(currentRole);
  const isResettingRef = useRef(false);
  useEffect(() => {
    if (prevRoleRef.current !== currentRole) {
      prevRoleRef.current = currentRole;
      if (!isResettingRef.current) {
        const roleNotice: ChatMessage = {
          id: `switch-${Date.now()}`,
          sender: 'system',
          role: currentRole,
          text: `Switched to **${currentRole.toUpperCase()}** Mode. Assistant context updated.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, roleNotice]);
      }
      isResettingRef.current = false;
    }
  }, [currentRole]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'helpful' | 'not-helpful'>>({});
  const [feedbackComments, setFeedbackComments] = useState<Record<string, string>>({});
  const [openFeedbackForms, setOpenFeedbackForms] = useState<Record<string, boolean>>({});
  const [submittedFeedback, setSubmittedFeedback] = useState<Record<string, boolean>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<Record<string, boolean>>({});
  const [feedbackErrors, setFeedbackErrors] = useState<Record<string, string>>({});
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const responseRole: PolicyRole | 'admin' = isAdminAuthenticated ? 'admin' : currentRole;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleResetChat = () => {
    if (window.confirm('Clear conversation history and start a new chat?')) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isResettingRef.current = true;
      setIsLoading(false);
      setInput('');
      setMessages([getInitialWelcomeMessage(currentRole, employeeId)]);
      setMessageFeedback({});
      setFeedbackComments({});
      setOpenFeedbackForms({});
      setSubmittedFeedback({});
      setSubmittingFeedback({});
      setFeedbackErrors({});
      setResetKey(prev => prev + 1);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: responseRole,
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          query,
          role: responseRole,
          employeeId: (isEmployeeVerified || responseRole === 'employee' || responseRole === 'admin') ? employeeId : '',
          clientPolicies: activePolicies
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Server error occurred');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        role: responseRole,
        text: data.answer || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        isOutOfDomain: Boolean(data.isOutOfDomain),
        requiresEmployeeId: Boolean(data.requiresEmployeeId),
        suggestedActions: data.suggestedActions || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'bot',
        role: responseRole,
        text: `⚠️ **Notice:** The assistant is experiencing network traffic. Please try submitting your inquiry again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleActionClick = (action: any) => {
    if (action.action === 'verify_id') {
      if (currentRole === 'consultant') {
        alert('🚫 Access Blocked: Consultants cannot switch to employee policy inside chat. Please Sign Out or Return to Dashboard to login with Employee credentials.');
        return;
      }
      onOpenEmployeeModal('Please enter your Employee ID and password to unlock full employee policies.');
    } else if (action.action === 'switch_role') {
      if (action.payload?.role === 'employee' && !isEmployeeVerified && currentRole === 'consultant') {
        alert('🚫 Access Blocked: Consultants cannot switch to employee policy. Staff login is required.');
      } else {
        onRoleChange(action.payload?.role);
      }
    } else if (action.action === 'ask_query') {
      handleSendMessage(action.payload?.query);
    }
  };

  const handleCopy = async () => {
    const success = await copyTranscript(messages);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sampleQuestions = currentRole === 'consultant' ? [
    'What is the notice period for taking leave as a shadow teacher?',
    'What is the protocol for handling a sensory meltdown in class?',
    'When must monthly session invoices be submitted?',
    'Can I post photos of my student on Instagram or WhatsApp?'
  ] : currentRole === 'employee' ? [
    'How many paid earned leaves (EL) do permanent employees get?',
    'What is the Insighte Group Health Insurance coverage limit?',
    'What is the statutory POSH inquiry timeline (90 days)?',
    'What is the non-compete period after employee separation?'
  ] : [
    'Give an executive summary of shadow teacher leave and notice rules',
    'What are the full-time employee EPF and health insurance terms?',
    'What are the mandatory steps in the internal grievance redressal mechanism?',
    'Compare consultant invoice guidelines with permanent payroll policies'
  ];

  return (
    <div className="flex flex-col h-full min-h-0 w-full p-2 sm:p-4">
      
      {/* Top Banner / Toolbar */}
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Active Role status indicator */}
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
            currentRole === 'consultant'
              ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800'
              : currentRole === 'employee'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          }`}>
            {currentRole === 'consultant' ? (
              <Briefcase className="w-3.5 h-3.5 text-pink-600" />
            ) : currentRole === 'employee' ? (
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span className="capitalize">{currentRole} Policy Bot</span>
          </div>

          {currentRole === 'consultant' ? (
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
              Contractual &amp; Shadow Teacher Guidelines
            </span>
          ) : currentRole === 'employee' ? (
            <span className="hidden sm:inline text-xs text-emerald-600 dark:text-emerald-400 font-medium font-mono">
              Verified ID: {employeeId || 'INS-EMP-VERIFIED'}
            </span>
          ) : (
            <span className="hidden sm:inline text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Administrator Oversight Active
            </span>
          )}
        </div>

        {/* Right: Share dropdown + New Chat */}
        <div className="flex items-center space-x-1.5">
          
          {/* Share dropdown */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu(prev => !prev)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Share or export this conversation"
            >
              <Share2 className="w-3.5 h-3.5 text-pink-500" />
              <span className="hidden md:inline">Share</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${showShareMenu ? 'rotate-180' : ''}`} />
            </button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Export &amp; Share
                </div>

                <button
                  onClick={() => { shareToWhatsApp(messages); setShowShareMenu(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                    <Share2 className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => { shareViaEmail(messages, currentRole); setShowShareMenu(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                    <Mail className="w-3 h-3 text-purple-600" />
                  </div>
                  <span>Email</span>
                </button>

                <button
                  onClick={() => { exportChatToCSV(messages, currentRole, employeeId); setShowShareMenu(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => { exportChatToPDF(); setShowShareMenu(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
                    <Printer className="w-3 h-3 text-orange-600" />
                  </div>
                  <span>Export PDF</span>
                </button>

                <button
                  onClick={() => { handleCopy(); setShowShareMenu(false); }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                  <span>{copied ? 'Copied!' : 'Copy Transcript'}</span>
                </button>
              </div>
            )}
          </div>

          {/* New Chat button */}
          <button
            id="new-chat-btn"
            onClick={handleResetChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-pink-50 hover:text-pink-600 dark:bg-slate-800 dark:hover:bg-pink-950/40 dark:hover:text-pink-300 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Start a new chat"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Chat</span>
          </button>

        </div>

      </div>

      {/* Print-only Header for PDF Export */}
      <div className="hidden print-only mb-6 pb-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold text-slate-900">Insighte Child Development &amp; Inclusive Education</h1>
        <p className="text-xs text-slate-600">Official Policy Assistant Consultation Audit Log</p>
        <div className="text-xs text-slate-500 mt-2 flex justify-between">
          <span>Role: {currentRole.toUpperCase()}</span>
          <span>Date: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-4 space-y-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-3 sm:p-5 shadow-xs">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const canRateAnswer = msg.sender === 'bot' && !msg.isError && messages[index - 1]?.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full chat-bubble`}
            >
              <div className="flex items-center space-x-1.5 mb-1 text-[11px] text-slate-400 dark:text-slate-500 px-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {isUser ? 'You' : 'Insighte Policy AI'}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>
                {msg.role && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                    {msg.role}
                  </span>
                )}
              </div>

              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[92%] sm:max-w-[85%] ${
                  isUser
                    ? 'bg-pink-600 text-white shadow-md shadow-pink-500/10 rounded-tr-xs'
                    : msg.isOutOfDomain
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-tl-xs'
                    : msg.requiresEmployeeId
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded-tl-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 shadow-xs rounded-tl-xs'
                }`}
              >
                {msg.isOutOfDomain && (
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 mb-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Out of Domain Query</span>
                  </div>
                )}

                {msg.requiresEmployeeId && (
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 mb-1.5">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Consultant Role Boundary</span>
                  </div>
                )}

                <div className="whitespace-pre-line select-text">
                  {msg.text}
                </div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 no-print">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3 text-pink-500" />
                      <span>Policy Citations (Click to view original page):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => onSelectCitation(c)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 border border-pink-200 dark:border-pink-800/80 transition-colors flex items-center space-x-1 shadow-2xs"
                        >
                          <span className="font-bold">Page {c.pageNumber}:</span>
                          <span className="truncate max-w-[180px]">{c.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap gap-2 no-print">
                    {msg.suggestedActions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleActionClick(act)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-linear-to-r from-pink-500 to-rose-600 text-white shadow-xs hover:opacity-95 transition-all flex items-center space-x-1"
                      >
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {canRateAnswer && (
                  <div className="no-print mt-2 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>{messageFeedback[msg.id] ? 'Thanks for rating this answer' : 'Was this helpful?'}</span>
                      <button
                        type="button"
                        onClick={() => setMessageFeedback(prev => ({ ...prev, [msg.id]: 'helpful' }))}
                        aria-label="Mark answer as helpful"
                        aria-pressed={messageFeedback[msg.id] === 'helpful'}
                        title="Helpful"
                        className={`rounded-md p-1 transition-colors ${
                          messageFeedback[msg.id] === 'helpful'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-700 dark:hover:text-emerald-300'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageFeedback(prev => ({ ...prev, [msg.id]: 'not-helpful' }))}
                        aria-label="Mark answer as not helpful"
                        aria-pressed={messageFeedback[msg.id] === 'not-helpful'}
                        title="Not helpful"
                        className={`rounded-md p-1 transition-colors ${
                          messageFeedback[msg.id] === 'not-helpful'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-700 dark:hover:text-rose-300'
                        }`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                      {!submittedFeedback[msg.id] && (
                        <button
                          type="button"
                          onClick={() => setOpenFeedbackForms(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          aria-expanded={Boolean(openFeedbackForms[msg.id])}
                          className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-slate-100 hover:text-pink-600 dark:hover:bg-slate-700 dark:hover:text-pink-300"
                        >
                          <MessageSquareText className="h-3.5 w-3.5" />
                          <span>{openFeedbackForms[msg.id] ? 'Close' : 'Write feedback'}</span>
                        </button>
                      )}
                    </div>
                    {openFeedbackForms[msg.id] && !submittedFeedback[msg.id] && (
                      <form
                        className="flex flex-col items-start gap-2 sm:flex-row sm:items-end"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const comment = feedbackComments[msg.id]?.trim();
                          const question = messages[index - 1];
                          if (!comment || !question) return;

                          setSubmittingFeedback(prev => ({ ...prev, [msg.id]: true }));
                          setFeedbackErrors(prev => ({ ...prev, [msg.id]: '' }));
                          try {
                            const response = await fetch('/api/feedback', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                role: msg.role,
                                question: question.text,
                                answer: msg.text,
                                rating: messageFeedback[msg.id] || null,
                                comment
                              })
                            });
                            if (!response.headers.get('content-type')?.includes('application/json')) {
                              throw new Error('Feedback service is unavailable. Restart the app server and try again.');
                            }
                            const result = await response.json();
                            if (!response.ok) {
                              throw new Error(result.message || 'Could not submit feedback.');
                            }
                            setSubmittedFeedback(prev => ({ ...prev, [msg.id]: true }));
                            setOpenFeedbackForms(prev => ({ ...prev, [msg.id]: false }));
                          } catch (error) {
                            setFeedbackErrors(prev => ({
                              ...prev,
                              [msg.id]: error instanceof Error ? error.message : 'Could not submit feedback. Please try again.'
                            }));
                          } finally {
                            setSubmittingFeedback(prev => ({ ...prev, [msg.id]: false }));
                          }
                        }}
                      >
                        <div className="w-full sm:max-w-md space-y-1.5">
                          <label className="sr-only" htmlFor={`feedback-${msg.id}`}>Write optional feedback</label>
                          <textarea
                            id={`feedback-${msg.id}`}
                            value={feedbackComments[msg.id] || ''}
                            onChange={(event) => setFeedbackComments(prev => ({ ...prev, [msg.id]: event.target.value }))}
                            maxLength={1000}
                            rows={2}
                            placeholder="What could we improve? (optional)"
                            disabled={submittingFeedback[msg.id]}
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-pink-950"
                          />
                          <p className="text-[10px] leading-relaxed">
                            Your comment and this question/answer will be saved for admin review to help improve future responses. Avoid including personal or sensitive details.
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={!feedbackComments[msg.id]?.trim() || submittingFeedback[msg.id]}
                          className="rounded-lg bg-pink-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingFeedback[msg.id] ? 'Submitting...' : 'Send feedback'}
                        </button>
                      </form>
                    )}
                    {feedbackErrors[msg.id] && (
                      <p role="alert" className="text-rose-600 dark:text-rose-400">{feedbackErrors[msg.id]}</p>
                    )}
                    {submittedFeedback[msg.id] && (
                      <p role="status" className="text-emerald-600 dark:text-emerald-400">
                        Thanks for sharing your feedback.
                      </p>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start space-x-2 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 flex items-center justify-center text-xs font-bold shrink-0">
              <Sparkles className="w-4 h-4 animate-spin text-pink-500" />
            </div>
            <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              <span>Searching policy handbook &amp; preparing answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Chips */}
      <div className="no-print mt-2 px-1">
        <div className="flex items-center space-x-1 text-[11px] text-slate-400 dark:text-slate-500 mb-1.5">
          <HelpCircle className="w-3 h-3" />
          <span>Recommended inquiries for {currentRole}s:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="shrink-0 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-950/50 dark:hover:text-pink-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="no-print mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm flex items-center space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={
            currentRole === 'consultant'
              ? 'Ask any question about Insighte consultant policy, shadow teaching, classroom conduct...'
              : 'Ask any question about permanent employee policy, benefits, clinical standards...'
          }
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          disabled={isLoading}
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Send query"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
