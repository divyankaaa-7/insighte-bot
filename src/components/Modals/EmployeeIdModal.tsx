import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { validateEmployeeId } from '../../utils/ragEngine';
import { INSIGHTE_COMPANY_PROFILE } from '../../data/defaultPolicies';

interface EmployeeIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verifiedId: string) => void;
  initialMessage?: string;
}

export const EmployeeIdModal: React.FC<EmployeeIdModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMessage
}) => {
  const [empId, setEmpId] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = empId.trim().toUpperCase();

    if (!clean) {
      setError('Please enter your Employee ID');
      return;
    }

    if (validateEmployeeId(clean)) {
      setError('');
      onSuccess(clean);
      onClose();
    } else {
      setError('Invalid Employee ID. Expected format like INS-EMP-1042 or select a sample ID below.');
    }
  };

  const handleSelectSample = (sampleId: string) => {
    setEmpId(sampleId);
    setError('');
    onSuccess(sampleId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Employee Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock internal employee policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {initialMessage && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{initialMessage}</span>
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            Consultants cannot access full employee policies (such as permanent staff paid leave balances, PF, annual appraisals, or insurance). Please enter your verified Insighte Employee ID.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Insighte Employee ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={empId}
                  onChange={(e) => {
                    setEmpId(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. INS-EMP-1042"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-pink-500/50 uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans"
                  autoFocus
                />
              </div>
              {error && (
                <p className="mt-1.5 text-xs text-rose-500 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            {/* Quick Demo ID selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Quick Test IDs (Click to verify)
              </span>
              <div className="flex flex-wrap gap-2">
                {INSIGHTE_COMPANY_PROFILE.verifiedEmployeeIds.slice(0, 3).map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-950/40 dark:hover:text-pink-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <span>{sample}</span>
                    <ArrowRight className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Continue</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
