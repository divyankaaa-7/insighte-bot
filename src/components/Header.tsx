import React from 'react';
import { Sun, Moon, Shield, UserCheck, Briefcase, Lock, Sparkles, HeartHandshake, Eye } from 'lucide-react';
import { LogoConfig, PolicyRole } from '../types';

interface HeaderProps {
  logoConfig: LogoConfig;
  currentRole: PolicyRole;
  employeeId: string;
  isEmployeeVerified: boolean;
  onRoleChange: (role: PolicyRole) => void;
  onOpenEmployeeModal: () => void;
  isAdminLoggedIn: boolean;
  onOpenAdmin: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  activeView: 'chat' | 'admin' | 'document';
  onViewChange: (view: 'chat' | 'admin' | 'document') => void;
}

export const Header: React.FC<HeaderProps> = ({
  logoConfig,
  currentRole,
  employeeId,
  isEmployeeVerified,
  onRoleChange,
  onOpenEmployeeModal,
  isAdminLoggedIn,
  onOpenAdmin,
  isDarkMode,
  onToggleDarkMode,
  activeView,
  onViewChange
}) => {
  // Render icon based on logoConfig
  const renderLogoIcon = () => {
    if (logoConfig.customImageUrl) {
      return (
        <img
          src={logoConfig.customImageUrl}
          alt="Insighte Logo"
          className="w-8 h-8 rounded-lg object-contain shadow-xs"
        />
      );
    }

    switch (logoConfig.iconType) {
      case 'butterfly':
        return (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: logoConfig.textColor }}
          >
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
        );
      case 'star-child':
        return (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: logoConfig.textColor }}
          >
            <UserCheck className="w-5 h-5 text-white" />
          </div>
        );
      case 'brain-heart':
      default:
        return (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: logoConfig.textColor }}
          >
            <HeartHandshake className="w-5 h-5 text-white" />
          </div>
        );
    }
  };

  const getFontSizeClass = () => {
    switch (logoConfig.fontSize) {
      case 'sm': return 'text-lg';
      case 'md': return 'text-xl';
      case 'lg': return 'text-2xl';
      case 'xl': return 'text-3xl';
      case '2xl': return 'text-4xl';
      default: return 'text-2xl';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Top Left: Logo "insighte" in light pink color with custom branding */}
        <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => onViewChange('chat')}>
          {renderLogoIcon()}
          <div className="flex flex-col">
            <span
              className={`${getFontSizeClass()} ${logoConfig.fontWeight} tracking-tight leading-none`}
              style={{
                color: logoConfig.textColor,
                fontFamily: logoConfig.fontFamily
              }}
            >
              {logoConfig.brandText}
            </span>
            {logoConfig.subText && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                {logoConfig.subText}
              </span>
            )}
          </div>
          
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800 ml-2">
            RAG Policy Intelligence
          </span>
        </div>

        {/* Top Center: View switcher for quick navigation */}
        <div className="hidden lg:flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => onViewChange('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'chat'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Policy Bot
          </button>
          <button
            onClick={() => onViewChange('document')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeView === 'document'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Policy Viewer</span>
          </button>
          <button
            onClick={onOpenAdmin}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeView === 'admin'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Dashboard</span>
          </button>
        </div>

        {/* Top Right: Role selector (Consultant / Employee), Dark/Light toggle, Admin access */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Role Selector: By default in Consultant side */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => onRoleChange('consultant')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentRole === 'consultant'
                  ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Consultant Mode (Default for shadow teachers and contractual specialists)"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Consultant</span>
            </button>

            <button
              onClick={() => {
                if (currentRole !== 'employee') {
                  onRoleChange('employee');
                } else if (!isEmployeeVerified) {
                  onOpenEmployeeModal();
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentRole === 'employee'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Employee Mode (Requires Employee ID verification)"
            >
              {isEmployeeVerified ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>Employee</span>
              {currentRole === 'employee' && isEmployeeVerified && (
                <span className="hidden sm:inline text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  {employeeId ? `(${employeeId})` : ''}
                </span>
              )}
            </button>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Admin Access Button */}
          <button
            onClick={onOpenAdmin}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isAdminLoggedIn
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700'
            }`}
            title="Admin Portal (Manage & Edit Policies, Categorisation & Search)"
          >
            <Shield className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden sm:inline">{isAdminLoggedIn ? 'Admin Active' : 'Admin'}</span>
          </button>

        </div>

      </div>
    </header>
  );
};
