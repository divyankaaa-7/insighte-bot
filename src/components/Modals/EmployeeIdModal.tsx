import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertCircle, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = empId.trim().toUpperCase();

    if (!cleanId) {
      setError('Please enter your Employee ID');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/employee/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: cleanId, password: password.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setError('');
        onSuccess(cleanId);
        onClose();
      } else {
        // Fallback local check
        if (
          validateEmployeeId(cleanId) &&
          (password === 'emp123' || password === 'insighte123' || password.length >= 4)
        ) {
          setError('');
          onSuccess(cleanId);
          onClose();
        } else {
          setError(data.message || 'Invalid Employee ID or password. (Demo: INS-EMP-1042 / emp123)');
        }
      }
    } catch {
      if (
        validateEmployeeId(cleanId) &&
        (password === 'emp123' || password === 'insighte123' || password.length >= 4)
      ) {
        setError('');
        onSuccess(cleanId);
        onClose();
      } else {
        setError('Network error or invalid credentials. Demo: INS-EMP-1042 / emp123');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSample = (sampleId: string) => {
    setEmpId(sampleId);
    setPassword('emp123');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Employee Authentication
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

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            Please enter your Employee ID and password to access permanent staff policies (including paid leaves, EPF, health insurance, and appraisal cycles).
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Insighte Employee ID
              </label>
              <input
                type="text"
                value={empId}
                onChange={(e) => {
                  setEmpId(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. INS-EMP-1042"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {error && (
              <p className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {/* Quick Demo selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Quick Demo Credentials (Click to fill)
              </span>
              <div className="flex flex-wrap gap-2">
                {INSIGHTE_COMPANY_PROFILE.verifiedEmployeeIds.slice(0, 3).map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center space-x-1"
                  >
                    <span>{sample} / emp123</span>
                    <Sparkles className="w-3 h-3 text-indigo-500 opacity-70" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Verifying...' : 'Sign In & Open Bot'}</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
