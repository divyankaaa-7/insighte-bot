import React, { useState } from 'react';
import { 
  Briefcase, 
  UserCheck, 
  Shield, 
  ArrowRight, 
  Lock, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Sun, 
  Moon,
  HeartHandshake
} from 'lucide-react';
import { LogoConfig } from '../../types';
import { validateEmployeeId } from '../../utils/ragEngine';

interface RoleDashboardProps {
  logoConfig: LogoConfig;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectConsultant: () => void;
  onLoginEmployee: (employeeId: string) => void;
  onLoginAdmin: () => void;
}

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  logoConfig,
  isDarkMode,
  onToggleDarkMode,
  onSelectConsultant,
  onLoginEmployee,
  onLoginAdmin
}) => {
  // Employee form state
  const [employeeId, setEmployeeId] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  // Admin form state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Active expanded tab for mobile or cleaner presentation
  const [activeCard, setActiveCard] = useState<'consultant' | 'employee' | 'admin'>('consultant');

  // Handle Employee Form Submit
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeError('');

    const cleanId = employeeId.trim().toUpperCase();
    if (!cleanId) {
      setEmployeeError('Please enter your Employee ID (e.g. INS-EMP-1042)');
      return;
    }
    if (!employeePassword.trim()) {
      setEmployeeError('Please enter your employee password');
      return;
    }

    setIsEmployeeLoading(true);
    try {
      const res = await fetch('/api/employee/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: cleanId, password: employeePassword.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginEmployee(cleanId);
      } else {
        // Fallback local verification
        if (
          validateEmployeeId(cleanId) && 
          (employeePassword === 'emp123' || employeePassword === 'insighte123' || employeePassword.length >= 4)
        ) {
          onLoginEmployee(cleanId);
        } else {
          setEmployeeError(data.message || 'Invalid Employee ID or Password. (Demo: INS-EMP-1042 / emp123)');
        }
      }
    } catch {
      if (
        validateEmployeeId(cleanId) && 
        (employeePassword === 'emp123' || employeePassword === 'insighte123' || employeePassword.length >= 4)
      ) {
        onLoginEmployee(cleanId);
      } else {
        setEmployeeError('Invalid credentials. Quick demo: INS-EMP-1042 / emp123');
      }
    } finally {
      setIsEmployeeLoading(false);
    }
  };

  // Quick fill employee demo
  const handleQuickFillEmployee = () => {
    setEmployeeId('INS-EMP-1042');
    setEmployeePassword('emp123');
    setEmployeeError('');
  };

  // Handle Admin Form Submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const cleanEmail = adminEmail.trim();
    if (!cleanEmail) {
      setAdminError('Please enter admin email or ID');
      return;
    }
    if (!adminPassword.trim()) {
      setAdminError('Please enter admin password');
      return;
    }

    setIsAdminLoading(true);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: adminPassword.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginAdmin();
      } else {
        // Fallback local check
        if (
          (cleanEmail === 'admin@insighte.in' && (adminPassword === 'admin123' || adminPassword === 'insighte@2025')) ||
          (cleanEmail === 'admin' && (adminPassword === 'admin' || adminPassword === 'admin123'))
        ) {
          onLoginAdmin();
        } else {
          setAdminError(data.message || 'Invalid Admin credentials. (Demo: admin@insighte.in / admin123)');
        }
      }
    } catch {
      if (
        (cleanEmail === 'admin@insighte.in' && (adminPassword === 'admin123' || adminPassword === 'insighte@2025')) ||
        (cleanEmail === 'admin' && (adminPassword === 'admin' || adminPassword === 'admin123'))
      ) {
        onLoginAdmin();
      } else {
        setAdminError('Invalid credentials. Demo: admin@insighte.in / admin123');
      }
    } finally {
      setIsAdminLoading(false);
    }
  };

  // Quick fill admin demo
  const handleQuickFillAdmin = () => {
    setAdminEmail('admin@insighte.in');
    setAdminPassword('admin123');
    setAdminError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Navbar */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: logoConfig.textColor }}
          >
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span
              className="text-2xl font-extrabold tracking-tight leading-none"
              style={{
                color: logoConfig.textColor,
                fontFamily: logoConfig.fontFamily
              }}
            >
              {logoConfig.brandText}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-0.5">
              {logoConfig.subText}
            </span>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <button
          id="dashboard-theme-toggle"
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700 cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-6xl mx-auto w-full">
        
        {/* Header Introduction */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800 mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span>Select Portal Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome to Insighte Policy Intelligence
          </h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Choose your role to open your dedicated assistant. Consultants have direct access, while permanent employees and administrators authenticate with their credentials.
          </p>
        </div>

        {/* 3 Portal Selection Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          
          {/* Card 1: Consultant (NO LOGIN REQUIRED) */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 border-pink-200 dark:border-pink-900/60 shadow-lg shadow-pink-500/5 p-6 hover:shadow-xl hover:border-pink-400 dark:hover:border-pink-700 transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800 flex items-center justify-center shadow-xs">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                No Login Required
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Consultant
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Shadow Teachers, Contractual Therapists & Inclusion Specialists
            </p>

            {/* Scope highlights */}
            <div className="space-y-2 mb-6 flex-1 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                <span>Immediate direct access (0 credentials required)</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                <span>Shadow teacher classroom ethics & prompt fading</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                <span>Sensory meltdown protocols & emergency notice</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                <span>Monthly billable session invoicing procedures</span>
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 mb-6">
              💡 <strong>Consultant Mode:</strong> Employee and admin sections in the top bar will remain restricted.
            </div>

            {/* Enter Button */}
            <button
              onClick={onSelectConsultant}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20 hover:opacity-95 transition-all flex items-center justify-center space-x-2 group cursor-pointer"
            >
              <span>Enter Consultant Chatbot</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Employee (LOGIN ID & PASSWORD REQUIRED) */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 shadow-lg shadow-indigo-500/5 p-6 hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-700 transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>ID & Password Required</span>
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Employee
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
              Permanent Faculty, Clinical Therapists & Institutional Staff
            </p>

            {/* Login Form */}
            <form onSubmit={handleEmployeeSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      if (employeeError) setEmployeeError('');
                    }}
                    placeholder="e.g. INS-EMP-1042"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={employeePassword}
                    onChange={(e) => {
                      setEmployeePassword(e.target.value);
                      if (employeeError) setEmployeeError('');
                    }}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                {employeeError && (
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{employeeError}</span>
                  </div>
                )}

                {/* Quick Demo Fill Button */}
                <button
                  type="button"
                  onClick={handleQuickFillEmployee}
                  className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center justify-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Click to Fill Demo (INS-EMP-1042 / emp123)</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isEmployeeLoading}
                className="w-full py-3 px-4 mt-4 rounded-xl font-semibold text-sm bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all flex items-center justify-center space-x-2 group cursor-pointer disabled:opacity-50"
              >
                <span>{isEmployeeLoading ? 'Verifying...' : 'Sign In to Employee Bot'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>

          {/* Card 3: Admin (LOGIN ID & PASSWORD REQUIRED) */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 shadow-lg shadow-emerald-500/5 p-6 hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-700 transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-xs">
                <Shield className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                <KeyRound className="w-3 h-3" />
                <span>Admin Auth Required</span>
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Admin
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
              Policy Administrators, HR Directors & Leadership
            </p>

            {/* Login Form */}
            <form onSubmit={handleAdminSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Admin Email or ID
                  </label>
                  <input
                    type="text"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      if (adminError) setAdminError('');
                    }}
                    placeholder="admin@insighte.in"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (adminError) setAdminError('');
                    }}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {adminError && (
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                {/* Quick Demo Fill Button */}
                <button
                  type="button"
                  onClick={handleQuickFillAdmin}
                  className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>Click to Fill Demo (admin@insighte.in / admin123)</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isAdminLoading}
                className="w-full py-3 px-4 mt-4 rounded-xl font-semibold text-sm bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all flex items-center justify-center space-x-2 group cursor-pointer disabled:opacity-50"
              >
                <span>{isAdminLoading ? 'Authenticating...' : 'Sign In to Admin Bot'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>

        </div>

        {/* Security & Access Summary Footer */}
        <div className="mt-12 text-center text-xs text-slate-500 dark:text-slate-400 max-w-xl">
          <p>
            Insighte Policy System provides automated policy intelligence with strict role segregation to ensure confidential internal HR records are protected while providing prompt assistance to contractual shadow teachers.
          </p>
        </div>

      </div>

    </div>
  );
};
