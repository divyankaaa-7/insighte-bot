import React, { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Shield, 
  UserCheck, 
  Briefcase, 
  Lock, 
  Sparkles, 
  HeartHandshake, 
  Eye, 
  Ban, 
  LogOut, 
  LayoutDashboard,
  AlertTriangle,
  Settings,
  ChevronDown,
  X
} from 'lucide-react';
import { LogoConfig, PolicyRole, UserRole } from '../types';

interface HeaderProps {
  logoConfig: LogoConfig;
  currentRole: PolicyRole | 'admin';
  userAuthRole: UserRole | null;
  employeeId: string;
  isEmployeeVerified: boolean;
  onRoleChange: (role: PolicyRole | 'admin') => void;
  isAdminLoggedIn: boolean;
  onOpenAdmin: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  activeView: 'dashboard' | 'chat' | 'admin' | 'document';
  onViewChange: (view: 'dashboard' | 'chat' | 'admin' | 'document') => void;
  onSignOut: () => void;
  onOpenDashboard: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  logoConfig,
  currentRole,
  userAuthRole,
  employeeId,
  isEmployeeVerified,
  onRoleChange,
  isAdminLoggedIn,
  onOpenAdmin,
  isDarkMode,
  onToggleDarkMode,
  activeView,
  onViewChange,
  onSignOut,
  onOpenDashboard
}) => {
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [shakeButton, setShakeButton] = useState<'employee' | 'admin' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerBlockedFeedback = (target: 'employee' | 'admin') => {
    setShakeButton(target);
    setBlockedMessage(
      target === 'employee'
        ? '🚫 Access Blocked: Consultants cannot access Employee portal. Staff authentication is required.'
        : '🚫 Access Blocked: Consultants cannot access Admin portal. Administrator credentials required.'
    );

    setTimeout(() => {
      setShakeButton(null);
    }, 600);

    setTimeout(() => {
      setBlockedMessage(null);
    }, 4000);
  };

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

  const isEmployeeAuth = userAuthRole === 'employee' || isEmployeeVerified;
  const isAdminAuth = userAuthRole === 'admin' || isAdminLoggedIn;
  const isPureConsultant = userAuthRole === 'consultant' && !isEmployeeAuth && !isAdminAuth;
  const isPureEmployee = userAuthRole === 'employee' && !isAdminAuth;

  const handleEmployeeClick = () => {
    if (isPureConsultant) {
      triggerBlockedFeedback('employee');
      return;
    }

    if (isEmployeeAuth || isAdminAuth) {
      onRoleChange('employee');
      onViewChange('chat');
    } else {
      triggerBlockedFeedback('employee');
    }
  };

  const handleAdminClick = () => {
    if (isPureConsultant || (!isAdminAuth && !isEmployeeAuth)) {
      triggerBlockedFeedback('admin');
      return;
    }

    if (isAdminAuth) {
      onOpenAdmin();
    } else {
      triggerBlockedFeedback('admin');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 min-h-[4.5rem] py-2 flex items-center justify-between gap-3">
        
        {/* Top Left: Logo */}
        <div 
          className="flex items-center space-x-3 cursor-pointer select-none group" 
          onClick={onOpenDashboard}
          title="Return to Portal Selection Dashboard"
        >
          {renderLogoIcon()}
          <div className="flex flex-col">
            <span
              className={`${getFontSizeClass()} ${logoConfig.fontWeight} tracking-tight leading-none group-hover:opacity-90 transition-opacity`}
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
            Policy Intelligence
          </span>
        </div>

        {/* Top Center: View switcher */}
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

          {!isAdminAuth && (
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
          )}

          {/* Admin Dashboard: only show for Admin auth */}
          {isAdminAuth && (
            <button
              onClick={onOpenAdmin}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeView === 'admin'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Admin Dashboard"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          )}
        </div>

        {/* Top Right: Role selector + Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Role Options Group — context-aware visibility */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            
            {/* Consultant: always shown */}
            <button
              onClick={() => {
                onRoleChange('consultant');
                onViewChange('chat');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentRole === 'consultant'
                  ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Consultant Mode"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Consultant</span>
            </button>

            {/* Employee: hidden for pure consultant; shown for employee & admin */}
            {!isPureConsultant && (
              <button
                onClick={handleEmployeeClick}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                  shakeButton === 'employee' ? 'animate-bounce' : ''
                } ${
                  currentRole === 'employee'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={
                  isEmployeeAuth
                    ? `Employee Mode (Verified: ${employeeId || 'Active'})`
                    : 'Employee Mode (Requires Employee Login)'
                }
              >
                {isEmployeeAuth ? (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Employee</span>

                {isEmployeeAuth && currentRole === 'employee' && (
                  <span className="hidden sm:inline text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {employeeId ? `(${employeeId})` : ''}
                  </span>
                )}
              </button>
            )}

            {/* Admin: only shown for admin auth */}
            {isAdminAuth && (
              <button
                onClick={handleAdminClick}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                  shakeButton === 'admin' ? 'animate-bounce' : ''
                } ${
                  isAdminAuth && (activeView === 'admin' || currentRole === 'admin')
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Admin Portal Active"
              >
                <Shield className="w-3.5 h-3.5 text-pink-500" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

          </div>

          {/* Settings Icon + Dropdown (top-right) */}
          <div className="relative" ref={settingsRef}>
            <button
              id="header-settings-btn"
              onClick={() => setShowSettings(prev => !prev)}
              className={`p-2 rounded-xl transition-colors border cursor-pointer ${
                showSettings
                  ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700'
              }`}
              title="Settings"
              aria-label="Open settings"
            >
              <Settings className={`w-4 h-4 transition-transform duration-200 ${showSettings ? 'rotate-45' : ''}`} />
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Settings className="w-3.5 h-3.5 text-pink-500" />
                    <span>Settings</span>
                  </span>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dark / Light Mode */}
                <button
                  onClick={() => { onToggleDarkMode(); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-slate-800 flex items-center justify-center border border-amber-100 dark:border-slate-700">
                      {isDarkMode ? (
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </div>
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {isDarkMode ? 'On' : 'Off'}
                  </span>
                </button>

                {!isAdminAuth && (
                  <button
                    onClick={() => { onViewChange('document'); setShowSettings(false); }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span>Policy Viewer</span>
                  </button>
                )}

                {/* Sign Out */}
                {(isEmployeeAuth || isAdminAuth) && (
                  <button
                    onClick={() => { onSignOut(); setShowSettings(false); }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-100 dark:border-rose-900">
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                    <span>Sign Out</span>
                  </button>
                )}

                {/* Return to Dashboard (for consultant) */}
                {isPureConsultant && (
                  <button
                    onClick={() => { onOpenDashboard(); setShowSettings(false); }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <LayoutDashboard className="w-3.5 h-3.5 text-pink-500" />
                    </div>
                    <span>Switch Portal</span>
                  </button>
                )}

              </div>
            )}
          </div>

        </div>

      </div>

      {/* Floating Blocked Notification Toast */}
      {blockedMessage && (
        <div className="w-full bg-rose-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-center space-x-2 shadow-md animate-in slide-in-from-top duration-200">
          <Ban className="w-4 h-4 shrink-0 text-white" />
          <span>{blockedMessage}</span>
          <button 
            onClick={() => setBlockedMessage(null)}
            className="ml-3 underline hover:opacity-80 text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
};
