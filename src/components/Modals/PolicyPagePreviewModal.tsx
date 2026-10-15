import React from 'react';
import { X, BookOpen, Calendar, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { PolicyCategory } from '../../types';

interface PolicyPagePreviewModalProps {
  category: PolicyCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInAdmin?: (category: PolicyCategory) => void;
}

export const PolicyPagePreviewModal: React.FC<PolicyPagePreviewModalProps> = ({
  category,
  isOpen,
  onClose,
  onOpenInAdmin
}) => {
  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-sm border border-pink-200 dark:border-pink-800">
              P.{category.pageNumber}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {category.policyType} Policy
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Updated: {category.lastUpdated}</span>
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {category.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Summary */}
        <div className="px-6 py-3 bg-pink-50/60 dark:bg-pink-950/20 border-b border-pink-100 dark:border-pink-900/30">
          <p className="text-xs font-medium text-pink-900 dark:text-pink-200 italic">
            Summary: {category.summary}
          </p>
        </div>

        {/* Body Content - Original Page View */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line bg-slate-50/50 dark:bg-slate-950/40 rounded-xl m-4 border border-slate-200/80 dark:border-slate-800 select-text">
          {category.content}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Official Insighte Policy Document (Page {category.pageNumber})</span>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenInAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInAdmin(category);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 border border-pink-200 dark:border-pink-800 transition-colors flex items-center space-x-1"
              >
                <span>Edit in Admin</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
