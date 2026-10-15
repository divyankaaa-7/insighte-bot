import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Download, 
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
  RefreshCw,
  UserCheck,
  Briefcase,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { ChatMessage, PolicyCategory, PolicyCitation, PolicyRole } from '../../types';
import { exportChatToCSV, exportChatToPDF, shareToWhatsApp, shareViaEmail, copyTranscript } from '../../utils/exportChat';

interface ChatContainerProps {
  currentRole: PolicyRole;
  employeeId: string;
  isEmployeeVerified: boolean;
  onRoleChange: (role: PolicyRole) => void;
  onOpenEmployeeModal: (msg?: string) => void;
  onSelectCitation: (citation: PolicyCitation) => void;
  activePolicies: PolicyCategory[];
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  currentRole,
  employeeId,
  isEmployeeVerified,
  onRoleChange,
  onOpenEmployeeModal,
  onSelectCitation,
  activePolicies
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'bot',
      role: 'consultant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello and welcome to **Insighte Policy Intelligence**! 🌸

I am your dedicated policy assistant for **shadow teachers, therapists, consultants, and team members** supporting children with Autism Spectrum Disorder (ASD), ADHD, and developmental differences.

**By default, you are currently in Consultant Mode.**
Are you accessing this as a **Consultant** or an **Employee**?
- **Consultants** can ask anything about classroom ethics, meltdown protocols, leave notice, POSH, and monthly invoicing.
- **Employees** can access full internal compensation, EPF, health insurance, and permanent staff policies by verifying their Employee ID.`,
      suggestedActions: [
        { label: '✨ Continue as Consultant', action: 'ask_query', payload: { query: 'What is the leave notice policy for consultants?' } },
        { label: '🔐 I am an Employee (Verify ID)', action: 'verify_id' }
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');

    // Append user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      role: currentRole,
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/rag/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          role: currentRole,
          employeeId: isEmployeeVerified ? employeeId : '',
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
        role: currentRole,
        text: data.answer || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        isOutOfDomain: Boolean(data.isOutOfDomain),
        requiresEmployeeId: Boolean(data.requiresEmployeeId),
        suggestedActions: data.suggestedActions || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'bot',
        role: currentRole,
        text: `⚠️ **Error:** Unable to query the policy system at this time. (${err.message || 'Network issue'}). Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.action === 'verify_id') {
      onOpenEmployeeModal('Please enter your Employee ID to unlock full employee policies.');
    } else if (action.action === 'switch_role') {
      if (action.payload?.role === 'employee' && !isEmployeeVerified) {
        onOpenEmployeeModal('Please verify your Employee ID before switching to Employee policy.');
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
    'Can I post photos of my student on Instagram or WhatsApp?',
    'What is the employee PF and annual appraisal policy?' // Test prompt to demonstrate restriction
  ] : [
    'How many paid earned leaves (EL) do permanent employees get?',
    'What is the Insighte Group Health Insurance coverage limit?',
    'What is the statutory POSH inquiry timeline (90 days)?',
    'What is the non-compete period after employee separation?'
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-5xl mx-auto w-full p-2 sm:p-4">
      
      {/* Top Banner / Export Toolbar */}
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Active Role status indicator */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            {currentRole === 'consultant' ? (
              <Briefcase className="w-3.5 h-3.5 text-pink-600" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span className="capitalize">{currentRole} Policy Chat</span>
          </div>

          {currentRole === 'consultant' ? (
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
              Contractual & Shadow Teacher Guidelines
            </span>
          ) : (
            <span className="hidden sm:inline text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Verified ID: {employeeId || 'INS-EMP-VERIFIED'}
            </span>
          )}
        </div>

        {/* Export and Save actions: CSV, PDF, WhatsApp, Mail, Copy */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          
          <button
            onClick={() => exportChatToCSV(messages, currentRole, employeeId)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            title="Export chat history as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">CSV</span>
          </button>

          <button
            onClick={exportChatToPDF}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            title="Export / Print chat as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">PDF</span>
          </button>

          <button
            onClick={() => shareToWhatsApp(messages)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            title="Share consultation summary to WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">WhatsApp</span>
          </button>

          <button
            onClick={() => shareViaEmail(messages, currentRole)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            title="Send chat history via Email"
          >
            <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden md:inline">Email</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            title="Copy consultation transcript"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('Clear conversation history?')) {
                setMessages([messages[0]]);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-1"
            title="Reset Chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* Print-only Header for PDF Export */}
      <div className="hidden print-only mb-6 pb-4 border-b border-slate-300">
        <h1 className="text-2xl font-bold text-slate-900">Insighte Child Development & Inclusive Education</h1>
        <p className="text-xs text-slate-600">Official RAG Policy Assistant Consultation Audit Log</p>
        <div className="text-xs text-slate-500 mt-2 flex justify-between">
          <span>Role: {currentRole.toUpperCase()}</span>
          <span>Date: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-4 space-y-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-3 sm:p-5 shadow-xs">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
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
                {/* Out of Domain alert banner */}
                {msg.isOutOfDomain && (
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 mb-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Out of Domain Query</span>
                  </div>
                )}

                {/* Restricted Access alert banner */}
                {msg.requiresEmployeeId && (
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 mb-1.5">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Consultant Role Boundary</span>
                  </div>
                )}

                {/* Message Body text */}
                <div className="whitespace-pre-line select-text">
                  {msg.text}
                </div>

                {/* Citations section with clickable page badges */}
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

                {/* Suggested actions (e.g. switch role, verify id) */}
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

              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-x-2 animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 flex items-center justify-center text-xs font-bold shrink-0">
              <Sparkles className="w-4 h-4 animate-spin text-pink-500" />
            </div>
            <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-700 shadow-xs flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              <span>Retrieving policy sections & generating grounded answer...</span>
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
