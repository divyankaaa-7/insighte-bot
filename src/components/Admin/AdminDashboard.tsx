import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Shield, 
  BookOpen, 
  Briefcase, 
  UserCheck, 
  Palette, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RotateCcw, 
  FileUp, 
  Download, 
  Check, 
  AlertCircle, 
  ExternalLink,
  Highlighter,
  ChevronRight,
  Eye,
  LogOut,
  Undo2,
  MessageSquareText,
  RefreshCw
} from 'lucide-react';
import { LogoConfig, PolicyCategory, PolicyRole } from '../../types';
import { INITIAL_CONSULTANT_POLICIES, INITIAL_EMPLOYEE_POLICIES } from '../../data/defaultPolicies';

interface ChatFeedback {
  id: string;
  role: PolicyRole | 'admin';
  question: string;
  answer: string;
  comment: string;
  rating: 'helpful' | 'not-helpful' | null;
  createdAt: string;
}

interface AdminDashboardProps {
  policies: PolicyCategory[];
  onUpdatePolicies: (updated: PolicyCategory[]) => void;
  logoConfig: LogoConfig;
  onUpdateLogoConfig: (config: LogoConfig) => void;
  onLogout: () => void;
  onClose: () => void;
  initialSelectedCategory?: PolicyCategory | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  policies,
  onUpdatePolicies,
  logoConfig,
  onUpdateLogoConfig,
  onLogout,
  onClose,
  initialSelectedCategory
}) => {
  const [activeTab, setActiveTab] = useState<'consultant' | 'employee' | 'branding' | 'backup' | 'feedback'>(
    initialSelectedCategory ? initialSelectedCategory.policyType : 'consultant'
  );
  const [chatFeedback, setChatFeedback] = useState<ChatFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Selected category in active tab
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialSelectedCategory ? initialSelectedCategory.id : ''
  );

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPage, setEditPage] = useState<number>(1);
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editKeywords, setEditKeywords] = useState('');

  // Search in full document
  const [searchQuery, setSearchQuery] = useState('');

  // Branding editor state
  const [tempLogo, setTempLogo] = useState<LogoConfig>({ ...logoConfig });
  const [savedNotice, setSavedNotice] = useState(false);

  // New Category Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPage, setNewPage] = useState<number>(1);
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newKeywords, setNewKeywords] = useState('');

  // Undo history stack: each entry is a snapshot of policies before the change
  const MAX_HISTORY = 20;
  const [policyHistory, setPolicyHistory] = useState<PolicyCategory[][]>([]);
  const [undoNotice, setUndoNotice] = useState(false);

  const loadChatFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    setFeedbackError('');
    try {
      const response = await fetch('/api/admin/feedback');
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Feedback service is unavailable. Restart the app server and try again.');
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Could not load feedback.');
      }
      setChatFeedback(result.feedback);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : 'Could not load feedback.');
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'feedback') {
      void loadChatFeedback();
    }
  }, [activeTab, loadChatFeedback]);

  // Wrapped update: pushes current policies to history before updating
  const handleUpdatePoliciesWithHistory = useCallback((updated: PolicyCategory[]) => {
    setPolicyHistory(prev => {
      const newHistory = [...prev, policies];
      return newHistory.length > MAX_HISTORY ? newHistory.slice(newHistory.length - MAX_HISTORY) : newHistory;
    });
    onUpdatePolicies(updated);
  }, [policies, onUpdatePolicies]);

  // Undo last change
  const handleUndo = () => {
    if (policyHistory.length === 0) return;
    const previousPolicies = policyHistory[policyHistory.length - 1];
    setPolicyHistory(prev => prev.slice(0, prev.length - 1));
    onUpdatePolicies(previousPolicies);
    setUndoNotice(true);
    setTimeout(() => setUndoNotice(false), 2000);
  };

  // Filter policies for current tab
  const tabPolicies = useMemo(() => {
    return policies
      .filter(p => p.policyType === activeTab)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }, [policies, activeTab]);

  // Active category
  const activeCategory = useMemo(() => {
    if (tabPolicies.length === 0) return null;
    const found = tabPolicies.find(p => p.id === selectedCategoryId);
    return found || tabPolicies[0];
  }, [tabPolicies, selectedCategoryId]);

  // Set edit form values when activeCategory changes
  React.useEffect(() => {
    if (activeCategory) {
      setEditTitle(activeCategory.title);
      setEditPage(activeCategory.pageNumber);
      setEditSummary(activeCategory.summary);
      setEditContent(activeCategory.content);
      setEditKeywords(activeCategory.keywords.join(', '));
      setIsEditing(false);
    }
  }, [activeCategory]);

  // Search matches across current policy book
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: { category: PolicyCategory; snippet: string; count: number }[] = [];

    for (const cat of tabPolicies) {
      const full = `${cat.title} ${cat.summary} ${cat.content}`.toLowerCase();
      const occurrences = (full.match(new RegExp(q, 'g')) || []).length;
      if (occurrences > 0) {
        // extract snippet
        const idx = full.indexOf(q);
        const start = Math.max(0, idx - 40);
        const end = Math.min(full.length, idx + q.length + 60);
        const rawSnippet = full.slice(start, end);
        results.push({
          category: cat,
          snippet: `...${rawSnippet}...`,
          count: occurrences
        });
      }
    }

    return results;
  }, [tabPolicies, searchQuery]);

  // Save edited category
  const handleSaveCategory = () => {
    if (!activeCategory) return;
    const updated = policies.map(p => {
      if (p.id === activeCategory.id) {
        return {
          ...p,
          title: editTitle.trim(),
          pageNumber: Number(editPage) || 1,
          summary: editSummary.trim(),
          content: editContent,
          keywords: editKeywords.split(',').map(s => s.trim()).filter(Boolean),
          lastUpdated: new Date().toISOString().slice(0, 10)
        };
      }
      return p;
    });

    handleUpdatePoliciesWithHistory(updated);
    setIsEditing(false);
    showSaveSuccess();
  };

  // Add category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newCat: PolicyCategory = {
      id: `${activeTab}-${Date.now()}`,
      title: newTitle.trim(),
      policyType: activeTab as PolicyRole,
      pageNumber: Number(newPage) || (tabPolicies.length + 1),
      summary: newSummary.trim() || newTitle.trim(),
      content: newContent,
      keywords: newKeywords.split(',').map(s => s.trim()).filter(Boolean),
      lastUpdated: new Date().toISOString().slice(0, 10)
    };

    handleUpdatePoliciesWithHistory([...policies, newCat]);
    setSelectedCategoryId(newCat.id);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewKeywords('');
    showSaveSuccess();
  };

  // Delete category
  const handleDeleteCategory = (catId: string, title: string) => {
    if (tabPolicies.length <= 1) {
      alert('At least one policy category must remain in the document.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove the category "${title}" from the ${activeTab} policy book?`)) {
      const updated = policies.filter(p => p.id !== catId);
      handleUpdatePoliciesWithHistory(updated);
      setSelectedCategoryId(updated.find(p => p.policyType === activeTab)?.id || '');
      showSaveSuccess();
    }
  };

  // Save branding
  const handleSaveBranding = () => {
    onUpdateLogoConfig(tempLogo);
    showSaveSuccess();
  };

  const showSaveSuccess = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  // Reset policies to original Insighte defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all policies to standard Insighte official handbook defaults? Any custom edits will be replaced.')) {
      const defaults = [...INITIAL_CONSULTANT_POLICIES, ...INITIAL_EMPLOYEE_POLICIES];
      handleUpdatePoliciesWithHistory(defaults);
      showSaveSuccess();
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const dataStr = JSON.stringify({ policies, logoConfig, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `insighte-policies-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.policies)) {
          handleUpdatePoliciesWithHistory(json.policies);
          if (json.logoConfig) onUpdateLogoConfig(json.logoConfig);
          showSaveSuccess();
          alert('Policies and branding imported successfully!');
        } else {
          alert('Invalid backup file format: missing policies array.');
        }
      } catch (err: any) {
        alert(`Error parsing JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto p-2 sm:p-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Insighte Policy Administration
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Verified Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Modular categorization, original document page navigation, keyword search & branding customization
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {savedNotice && !undoNotice && (
            <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Saved Successfully</span>
            </span>
          )}

          {undoNotice && (
            <span className="flex items-center space-x-1 text-xs font-semibold text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Change reverted</span>
            </span>
          )}

          {policyHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 border border-amber-200 dark:border-amber-800 transition-colors"
              title="Undo the most recent policy change"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo last change</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Back to Bot
          </button>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('consultant')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'consultant'
              ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Consultant Policy Book</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {policies.filter(p => p.policyType === 'consultant').length} Sections
          </span>
        </button>

        <button
          onClick={() => setActiveTab('employee')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'employee'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Employee Policy Book</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {policies.filter(p => p.policyType === 'employee').length} Sections
          </span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'branding'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Logo & Branding Customizer</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'backup'
              ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileUp className="w-4 h-4" />
          <span>Import / Export & Reset</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'feedback'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageSquareText className="w-4 h-4" />
          <span>Chat Feedback ({chatFeedback.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {(activeTab === 'consultant' || activeTab === 'employee') && (
        <div className="space-y-6">
          
          {/* Keyword Search across entire Original Document */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search any keyword across entire ${activeTab} policy handbook (e.g. leave, meltdown, 28th, POSH, notice)...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-pink-500/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-pink-500 to-rose-600 text-white shadow-xs hover:opacity-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category / Page</span>
              </button>
            </div>

            {/* Live Search Results */}
            {searchQuery.trim() && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                  <span>Search matches for "{searchQuery}": {searchMatches.length} section(s) found</span>
                  <span className="text-[11px] text-pink-600 dark:text-pink-400">Click to jump to that page</span>
                </div>
                {searchMatches.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No matches found in the {activeTab} policy handbook.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {searchMatches.map((m, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedCategoryId(m.category.id);
                          setSearchQuery('');
                        }}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-pink-50 dark:hover:bg-pink-950/40 border border-slate-200 dark:border-slate-700/80 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                          <span>Page {m.category.pageNumber}: {m.category.title}</span>
                          <span className="px-1.5 py-0.2 rounded-sm bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 text-[10px]">
                            {m.count} hits
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                          {m.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Policy Split Layout: Left Modular Categorisation & Right Original Page View / Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Modular Categorisation */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Modular Categorisation ({tabPolicies.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Click to view exact page
                </span>
              </div>

              <div className="space-y-2">
                {tabPolicies.map((cat) => {
                  const isSelected = activeCategory?.id === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-pink-500 dark:border-pink-500 shadow-md shadow-pink-500/10'
                          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-pink-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          P.{cat.pageNumber}
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold ${
                            isSelected ? 'text-pink-600 dark:text-pink-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {cat.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {cat.summary}
                          </p>
                        </div>
                      </div>

                      {/* Remove Category button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id, cat.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all ml-2"
                        title="Remove category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right: Original Document Page View & Inline Editor */}
            <div className="lg:col-span-8">
              {activeCategory ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                  
                  {/* Page View Header */}
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="px-3 py-1.5 rounded-xl bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 font-bold text-xs border border-pink-200 dark:border-pink-800">
                        Page {activeCategory.pageNumber} of {tabPolicies.length}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {isEditing ? editTitle : activeCategory.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Last Updated: {activeCategory.lastUpdated}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveCategory}
                            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Updates</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-pink-600 hover:bg-pink-700 text-white shadow-xs transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit This Page</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Page Content / Editor Area */}
                  <div className="p-5 sm:p-6 space-y-4">
                    {isEditing ? (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                              Section Title
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                              Document Page Number
                            </label>
                            <input
                              type="number"
                              value={editPage}
                              onChange={(e) => setEditPage(Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                            Executive Summary (Shown in bot citations)
                          </label>
                          <input
                            type="text"
                            value={editSummary}
                            onChange={(e) => setEditSummary(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                            Original Document Page Full Content
                          </label>
                          <textarea
                            rows={14}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                            Keywords for Policy Search (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={editKeywords}
                            onChange={(e) => setEditKeywords(e.target.value)}
                            placeholder="e.g. leave, 48 hours, emergency, substitute, absence"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary Box */}
                        <div className="p-3.5 rounded-2xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30">
                          <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider block mb-1">
                            Section Summary
                          </span>
                          <p className="text-xs text-pink-900 dark:text-pink-200 leading-relaxed italic">
                            {activeCategory.summary}
                          </p>
                        </div>

                        {/* Exact Page Document Text */}
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line select-text">
                          {activeCategory.content}
                        </div>

                        {/* Keywords Pill List */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
                            Index Keywords:
                          </span>
                          {activeCategory.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center text-slate-400">
                  Select a category on the left to view the page.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Branding & Logo Customizer Tab */}
      {activeTab === 'branding' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-8">
          
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Company Logo & Branding Customizer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize company name font, color (light pink default), size, and icon/picture as requested in user brief.
            </p>
          </div>

          {/* Live Preview Showcase */}
          <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Live Header Logo Preview
            </span>
            <div className="flex flex-wrap items-center gap-8 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              
              {/* Light Mode Preview */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: tempLogo.textColor }}
                >
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span
                    className={`font-bold tracking-tight block ${
                      tempLogo.fontSize === 'sm' ? 'text-lg' : tempLogo.fontSize === 'md' ? 'text-xl' : tempLogo.fontSize === 'lg' ? 'text-2xl' : 'text-3xl'
                    }`}
                    style={{
                      color: tempLogo.textColor,
                      fontFamily: tempLogo.fontFamily
                    }}
                  >
                    {tempLogo.brandText}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {tempLogo.subText}
                  </span>
                </div>
              </div>

              {/* Dark Mode Preview */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: tempLogo.textColor }}
                >
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span
                    className={`font-bold tracking-tight block ${
                      tempLogo.fontSize === 'sm' ? 'text-lg' : tempLogo.fontSize === 'md' ? 'text-xl' : tempLogo.fontSize === 'lg' ? 'text-2xl' : 'text-3xl'
                    }`}
                    style={{
                      color: tempLogo.textColor,
                      fontFamily: tempLogo.fontFamily
                    }}
                  >
                    {tempLogo.brandText}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {tempLogo.subText}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            
            {/* Brand Text */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Brand Logo Text
              </label>
              <input
                type="text"
                value={tempLogo.brandText}
                onChange={(e) => setTempLogo({ ...tempLogo, brandText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Subtext */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Subheading / Tagline
              </label>
              <input
                type="text"
                value={tempLogo.subText}
                onChange={(e) => setTempLogo({ ...tempLogo, subText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Font Family
              </label>
              <select
                value={tempLogo.fontFamily}
                onChange={(e) => setTempLogo({ ...tempLogo, fontFamily: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Inter">Inter (Clean Modern Sans)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans (Contemporary)</option>
                <option value="Outfit">Outfit (Geometric Tech)</option>
                <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
                <option value="sans-serif">System Sans-Serif</option>
              </select>
            </div>

            {/* Color (Light pink default & presets) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Logo Color (Light Pink Default)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={tempLogo.textColor}
                  onChange={(e) => setTempLogo({ ...tempLogo, textColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={tempLogo.textColor}
                  onChange={(e) => setTempLogo({ ...tempLogo, textColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Color Presets */}
              <div className="flex items-center space-x-2 mt-2">
                {[
                  { name: 'Light Pink', hex: '#F472B6' },
                  { name: 'Rose', hex: '#FB7185' },
                  { name: 'Fuchsia', hex: '#E879F9' },
                  { name: 'Coral', hex: '#F87171' }
                ].map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setTempLogo({ ...tempLogo, textColor: preset.hex })}
                    className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 shadow-xs hover:scale-110 transition-transform"
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Logo Font Size
              </label>
              <select
                value={tempLogo.fontSize}
                onChange={(e) => setTempLogo({ ...tempLogo, fontSize: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="sm">Small (text-lg)</option>
                <option value="md">Medium (text-xl)</option>
                <option value="lg">Large (text-2xl - Default)</option>
                <option value="xl">Extra Large (text-3xl)</option>
              </select>
            </div>

            {/* Icon / Emblem Choice */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Logo Emblem / Icon
              </label>
              <select
                value={tempLogo.iconType}
                onChange={(e) => setTempLogo({ ...tempLogo, iconType: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="brain-heart">Care & Inclusion Emblem</option>
                <option value="butterfly">Neurodiversity Butterfly</option>
                <option value="star-child">Special Educator & Child</option>
              </select>
            </div>

          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setTempLogo({
                fontFamily: 'Plus Jakarta Sans',
                textColor: '#F472B6',
                fontSize: 'lg',
                fontWeight: 'font-extrabold',
                iconType: 'brain-heart',
                brandText: 'insighte',
                subText: 'Child Inclusion & Shadow Care'
              })}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Reset to Pink Default
            </button>

            <button
              onClick={handleSaveBranding}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-linear-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Save Branding</span>
            </button>
          </div>

        </div>
      )}

      {/* Backup, Import, and Reset Tab */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Management & Policy Backup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload local policy documents, export JSON configurations, or restore the standard Insighte handbook.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Export */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Export Policy Snapshot</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Download a complete JSON file containing all consultant & employee policies, categories, and branding settings.
              </p>
              <button
                onClick={handleExportBackup}
                className="w-full py-2 px-3 rounded-xl font-semibold bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 transition-colors"
              >
                Download JSON Backup
              </button>
            </div>

            {/* Import */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileUp className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Import Policies File</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Upload a JSON backup file locally to update policies, categories, and page indexes in bulk.
              </p>
              <label className="block w-full py-2 px-3 rounded-xl font-semibold text-center bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
                <span>Select JSON File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            {/* Reset */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Restore Insighte Defaults</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Reset both consultant & employee policies back to the official standard Insighte Child Inclusion Handbook.
              </p>
              <button
                onClick={handleResetDefaults}
                className="w-full py-2 px-3 rounded-xl font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors"
              >
                Reset to Official Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Chatbot Feedback</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Review comments alongside their questions and answers, then use curated examples to improve future responses.
              </p>
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                Feedback is collected for review; it does not automatically train the model.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(chatFeedback, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `insighte-chat-feedback-${new Date().toISOString().slice(0, 10)}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={chatFeedback.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Export feedback
              </button>
              <button
                onClick={() => void loadChatFeedback()}
                disabled={feedbackLoading}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${feedbackLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {feedbackError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              {feedbackError}
            </div>
          )}

          {feedbackLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Loading feedback...
            </div>
          ) : !feedbackError && chatFeedback.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              No chatbot feedback has been submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {chatFeedback.map(item => (
                <article key={item.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.role} {item.rating ? `· ${item.rating === 'helpful' ? 'Helpful' : 'Not helpful'}` : ''}
                    </span>
                    <time className="text-slate-400 dark:text-slate-500">{new Date(item.createdAt).toLocaleString()}</time>
                  </div>
                  <div>
                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Question</h4>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-300">{item.question}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Answer</h4>
                    <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-400">{item.answer}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Comment</h4>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800 dark:text-slate-200">{item.comment}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add New Policy Category & Document Page ({activeTab.toUpperCase()})
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Category Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Health & Safety / POSH Guidelines"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Page Number in Document *
                  </label>
                  <input
                    type="number"
                    required
                    value={newPage}
                    onChange={(e) => setNewPage(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Executive Summary
                </label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Brief summary of policy provisions"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Full Page Content *
                </label>
                <textarea
                  rows={8}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter the complete text of this policy page..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Keywords (comma-separated for search & retrieval)
                </label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="e.g. conduct, reporting, safe, student"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-pink-600 hover:bg-pink-700 text-white shadow-xs"
                >
                  Add Category to Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
