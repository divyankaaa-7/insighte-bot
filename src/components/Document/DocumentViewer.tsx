import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Briefcase, 
  UserCheck, 
  Lock, 
  Printer, 
  FileText, 
  ChevronRight,
  Sparkles,
  Download
} from 'lucide-react';
import { PolicyCategory, PolicyRole } from '../../types';

interface DocumentViewerProps {
  policies: PolicyCategory[];
  currentRole: PolicyRole | 'admin';
  isEmployeeVerified: boolean;
  onOpenEmployeeModal: (msg?: string) => void;
  onRoleChange: (role: PolicyRole | 'admin') => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  policies,
  currentRole,
  isEmployeeVerified,
  onOpenEmployeeModal,
  onRoleChange
}) => {
  const [selectedBook, setSelectedBook] = useState<PolicyRole>(currentRole === 'admin' ? 'employee' : currentRole);
  const [searchQuery, setSearchQuery] = useState('');

  // Lock employee policy if not verified (admin has full access)
  const isEmployeeLocked = selectedBook === 'employee' && !isEmployeeVerified && currentRole !== 'admin';

  const bookPolicies = useMemo(() => {
    return policies
      .filter(p => p.policyType === selectedBook)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }, [policies, selectedBook]);

  const [selectedPageId, setSelectedPageId] = useState<string>('');

  const activeCategory = useMemo(() => {
    if (bookPolicies.length === 0) return null;
    const found = bookPolicies.find(p => p.id === selectedPageId);
    return found || bookPolicies[0];
  }, [bookPolicies, selectedPageId]);

  // Keyword search across full document
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return bookPolicies.filter(p => {
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.keywords.some(k => k.toLowerCase().includes(q))
      );
    });
  }, [bookPolicies, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto w-full p-2 sm:p-6 space-y-6">
      
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        
        {/* Policy Book Toggle: Consultant vs Employee */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setSelectedBook('consultant');
                setSelectedPageId('');
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedBook === 'consultant'
                  ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Consultant Policy Handbook</span>
            </button>

            <button
              onClick={() => {
                if (!isEmployeeVerified) {
                  onOpenEmployeeModal('Please enter your Employee ID to unlock the Employee Service Manual.');
                } else {
                  setSelectedBook('employee');
                  setSelectedPageId('');
                }
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedBook === 'employee'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isEmployeeVerified ? (
                <UserCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>Employee Service Manual</span>
            </button>
          </div>
        </div>

        {/* Print / Export button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-blue-500" />
            <span>Print Current Section</span>
          </button>
        </div>

      </div>

      {/* If Employee Book is locked */}
      {isEmployeeLocked ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Employee Policy Access Restricted
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            You are browsing as a Consultant. Full internal employee policies (permanent leave quotas, EPF, health insurance, annual increments) require a verified Insighte Employee ID.
          </p>
          <button
            onClick={() => onOpenEmployeeModal()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all"
          >
            Verify Employee ID
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Keyword Search across entire Original Document */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search keywords across all ${selectedBook} policies (e.g. leave, meltdown, POSH, invoicing, notice)...`}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-pink-500/50"
              />
            </div>

            {searchQuery && (
              <div className="mt-3 text-xs text-slate-500">
                Found {searchResults.length} section(s) matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Document Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Categorisation Index */}
            <div className="lg:col-span-4 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
                Policy Document Index ({bookPolicies.length} Pages)
              </div>

              {(searchQuery ? searchResults : bookPolicies).map((cat) => {
                const isSelected = activeCategory?.id === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedPageId(cat.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-pink-500 shadow-md shadow-pink-500/10'
                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        P.{cat.pageNumber}
                      </div>
                      <div>
                        <h4 className={`text-xs font-bold ${
                          isSelected ? 'text-pink-600 dark:text-pink-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {cat.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {cat.summary}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                );
              })}
            </div>

            {/* Right: Exact Original Page View */}
            <div className="lg:col-span-8">
              {activeCategory ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  
                  {/* Header */}
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="px-3 py-1.5 rounded-xl bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 font-bold text-xs border border-pink-200 dark:border-pink-800">
                        Page {activeCategory.pageNumber} of {bookPolicies.length}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {activeCategory.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {selectedBook.toUpperCase()} OFFICIAL POLICY HANDBOOK
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    <div className="p-3.5 rounded-2xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30">
                      <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider block mb-1">
                        Executive Summary
                      </span>
                      <p className="text-xs text-pink-900 dark:text-pink-200 italic leading-relaxed">
                        {activeCategory.summary}
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line select-text">
                      {activeCategory.content}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      <span className="text-[11px] text-slate-400 mr-1">Keywords:</span>
                      {activeCategory.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
