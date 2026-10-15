import React, { useState } from 'react';
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
  AlertTriangle
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
  // State for temporary blocked banner / toast alert
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [shakeButton, setShakeButton] = useState<'employee' | 'admin' | null>(null);

  // Trigger block symbol action and feedback
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

  // Whether user is authenticated as Employee or Admin
  const isEmployeeAuth = userAuthRole === 'employee' || isEmployeeVerified;
  const isAdminAuth = userAuthRole === 'admin' || isAdminLoggedIn;
  const isPureConsultant = userAuthRole === 'consultant' && !isEmployeeAuth && !isAdminAuth;

  // Handle Employee option click
  const handleEmployeeClick = () => {
    if (isPureConsultant) {
      // Strictly blocked for consultant
      triggerBlockedFeedback('employee');
      return;
    }

    if (isEmployeeAuth || isAdminAuth) {
      // Can access employee bot
      onRoleChange('employee');
      onViewChange('chat');
    } else {
      triggerBlockedFeedback('employee');
    }
  };

  // Handle Admin option click
  const handleAdminClick = () => {
    if (isPureConsultant || (!isAdminAuth && !isEmployeeAuth)) {
      // Strictly blocked for consultant
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Top Left: Logo "insighte" in light pink color with custom branding */}
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
            onClick={isAdminAuth ? onOpenAdmin : () => triggerBlockedFeedback('admin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeView === 'admin'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : isPureConsultant
                ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={isPureConsultant ? '🚫 Admin Dashboard blocked for consultants' : 'Admin Dashboard'}
          >
            {isPureConsultant ? (
              <Ban className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Shield className="w-3.5 h-3.5" />
            )}
            <span>Admin Dashboard</span>
          </button>
        </div>

        {/* Top Right: Role selector (Consultant / Employee / Admin), Dark/Light toggle, Sign Out */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Role Options Group */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            
            {/* 1. Consultant Option: Always accessible */}
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
              title="Consultant Mode (Default for shadow teachers and contractual specialists)"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Consultant</span>
            </button>

            {/* 2. Employee Option: VISIBLE to consultant, but clicks are BLOCKED if consultant */}
            <button
              onClick={handleEmployeeClick}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                shakeButton === 'employee' ? 'animate-bounce' : ''
              } ${
                currentRole === 'employee'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : isPureConsultant
                  ? 'text-rose-600/80 dark:text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-not-allowed border border-dashed border-rose-300 dark:border-rose-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={
                isPureConsultant
                  ? '🚫 Access Blocked: Consultants cannot access Employee portal'
                  : isEmployeeAuth
                  ? `Employee Mode (Verified: ${employeeId || 'Active'})`
                  : 'Employee Mode (Requires Employee Login)'
              }
            >
              {isPureConsultant ? (
                // BLOCK SYMBOL for consultant
                <Ban className="w-3.5 h-3.5 text-rose-500" />
              ) : isEmployeeAuth ? (
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>Employee</span>

              {/* Show block badge when in pure consultant mode */}
              {isPureConsultant && (
                <span className="hidden sm:inline text-[9px] font-bold px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                  BLOCKED
                </span>
              )}

              {/* Verified ID badge for authenticated employees */}
              {isEmployeeAuth && currentRole === 'employee' && (
                <span className="hidden sm:inline text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  {employeeId ? `(${employeeId})` : ''}
                </span>
              )}
            </button>

            {/* 3. Admin Option: VISIBLE to consultant, but clicks are BLOCKED if consultant */}
            <button
              onClick={handleAdminClick}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
                shakeButton === 'admin' ? 'animate-bounce' : ''
              } ${
                isAdminAuth && (activeView === 'admin' || currentRole === 'admin')
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                  : isPureConsultant
                  ? 'text-rose-600/80 dark:text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-not-allowed border border-dashed border-rose-300 dark:border-rose-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={
                isPureConsultant
                  ? '🚫 Access Blocked: Consultants cannot access Admin portal'
                  : isAdminAuth
                  ? 'Admin Portal Active'
                  : 'Admin Portal (Login Required)'
              }
            >
              {isPureConsultant ? (
                // BLOCK SYMBOL for consultant
                <Ban className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-pink-500" />
              )}
              <span className="hidden sm:inline">Admin</span>

              {/* Show block badge when in pure consultant mode */}
              {isPureConsultant && (
                <span className="hidden sm:inline text-[9px] font-bold px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                  BLOCKED
                </span>
              )}
            </button>

          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            id="header-theme-toggle"
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

          {/* Sign Out / Switch Portal Button */}
          {isEmployeeAuth || isAdminAuth ? (
            // For Employee or Admin: Prominent Sign Out Button
            <button
              onClick={onSignOut}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
              title="Sign Out of verified session (Re-login will be required)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          ) : (
            // For Consultant: Return to Dashboard button to switch role
            <button
              onClick={onOpenDashboard}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Return to Portal Selection Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-pink-500" />
              <span className="hidden md:inline">Portals</span>
            </button>
          )}

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
