import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/Chat/ChatContainer';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { DocumentViewer } from './components/Document/DocumentViewer';
import { EmployeeIdModal } from './components/Modals/EmployeeIdModal';
import { AdminLoginModal } from './components/Modals/AdminLoginModal';
import { PolicyPagePreviewModal } from './components/Modals/PolicyPagePreviewModal';
import { RoleDashboard } from './components/Dashboard/RoleDashboard';
import { LogoConfig, PolicyCategory, PolicyCitation, PolicyRole, UserRole } from './types';
import { INITIAL_CONSULTANT_POLICIES, INITIAL_EMPLOYEE_POLICIES } from './data/defaultPolicies';

const DEFAULT_LOGO_CONFIG: LogoConfig = {
  fontFamily: 'Plus Jakarta Sans',
  textColor: '#F472B6', // Light pink default as requested by user
  fontSize: 'lg',
  fontWeight: 'font-extrabold',
  iconType: 'brain-heart',
  brandText: 'insighte',
  subText: 'Child Development & Inclusion'
};

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('insighte_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to documentElement — this triggers all dark: Tailwind classes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      const root = document.getElementById('root');
      if (root) root.classList.add('dark');
      localStorage.setItem('insighte_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      const root = document.getElementById('root');
      if (root) root.classList.remove('dark');
      localStorage.setItem('insighte_theme', 'light');
    }
  }, [isDarkMode]);

  // Logo & Branding state
  const [logoConfig, setLogoConfig] = useState<LogoConfig>(() => {
    try {
      const saved = localStorage.getItem('insighte_logo_config');
      return saved ? JSON.parse(saved) : DEFAULT_LOGO_CONFIG;
    } catch {
      return DEFAULT_LOGO_CONFIG;
    }
  });

  const handleUpdateLogoConfig = (newConfig: LogoConfig) => {
    setLogoConfig(newConfig);
    localStorage.setItem('insighte_logo_config', JSON.stringify(newConfig));
  };

  // Policies state (combines Consultant and Employee)
  const [policies, setPolicies] = useState<PolicyCategory[]>(() => {
    try {
      const saved = localStorage.getItem('insighte_policies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [...INITIAL_CONSULTANT_POLICIES, ...INITIAL_EMPLOYEE_POLICIES];
  });

  const handleUpdatePolicies = (updated: PolicyCategory[]) => {
    setPolicies(updated);
    localStorage.setItem('insighte_policies', JSON.stringify(updated));

    // Also sync with server in background
    fetch('/api/policies/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policies: updated })
    }).catch(err => console.warn('Could not sync with backend:', err));
  };

  // Authenticated Role & View state:
  // Starts on 'dashboard' (small dashboard to choose consultant, employee, or admin)
  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'admin' | 'document'>('dashboard');
  const [userAuthRole, setUserAuthRole] = useState<UserRole | null>(null);

  // Current Role in the chat / active bot: 'consultant' | 'employee' | 'admin'
  const [currentRole, setCurrentRole] = useState<PolicyRole | 'admin'>('consultant');
  
  // Employee auth state
  const [employeeId, setEmployeeId] = useState<string>('');
  const [isEmployeeVerified, setIsEmployeeVerified] = useState<boolean>(false);

  // Admin auth state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeModalMessage, setEmployeeModalMessage] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [previewCitationCategory, setPreviewCitationCategory] = useState<PolicyCategory | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // 1. Consultant Entry: No login ID needed
  const handleSelectConsultant = () => {
    setUserAuthRole('consultant');
    setCurrentRole('consultant');
    setActiveView('chat');
  };

  // 2. Employee Login: ID and Password verified
  const handleLoginEmployee = (verifiedId: string) => {
    setUserAuthRole('employee');
    setCurrentRole('employee');
    setEmployeeId(verifiedId);
    setIsEmployeeVerified(true);
    setActiveView('chat');
  };

  // 3. Admin Login: Credentials verified
  const handleLoginAdmin = () => {
    setUserAuthRole('admin');
    setCurrentRole('admin');
    setIsAdminLoggedIn(true);
    setActiveView('chat');
  };

  // Handle Role change in the top right
  const handleRoleChange = (role: PolicyRole | 'admin') => {
    if (userAuthRole === 'consultant' && role !== 'consultant') {
      // Consultant is strictly blocked from Employee and Admin
      return;
    }

    if (role === 'employee' && !isEmployeeVerified && userAuthRole !== 'admin') {
      setEmployeeModalMessage('Consultants cannot access Employee Policy. Please verify your Employee ID and password.');
      setIsEmployeeModalOpen(true);
      return;
    }

    setCurrentRole(role);
  };

  // Handle Employee Verification success from modal
  const handleEmployeeVerified = (verifiedId: string) => {
    setEmployeeId(verifiedId);
    setIsEmployeeVerified(true);
    setUserAuthRole('employee');
    setCurrentRole('employee');
  };

  // Handle Admin Button click
  const handleOpenAdmin = () => {
    if (userAuthRole === 'consultant') {
      return; // blocked for consultant
    }
    if (isAdminLoggedIn || userAuthRole === 'admin') {
      setActiveView('admin');
    } else {
      setIsAdminModalOpen(true);
    }
  };

  // Handle Admin Login success from modal
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setUserAuthRole('admin');
    setCurrentRole('admin');
    setActiveView('admin');
  };

  // Sign out handler:
  // "everytime employee or admin signout ,to access again they should sign in"
  const handleSignOut = () => {
    fetch('/api/admin/logout', { method: 'POST' }).catch(error => {
      console.warn('Could not end administrator session:', error);
    });
    setIsAdminLoggedIn(false);
    setIsEmployeeVerified(false);
    setEmployeeId('');
    setUserAuthRole(null);
    setCurrentRole('consultant');
    sessionStorage.removeItem('insighte_admin_auth');
    localStorage.removeItem('insighte_employee_verified');
    localStorage.removeItem('insighte_employee_id');
    setActiveView('dashboard');
  };

  // Handle Citation click in chat: opens Policy Page Preview Modal
  const handleSelectCitation = (citation: PolicyCitation) => {
    const found = policies.find(p => p.id === citation.categoryId);
    if (found) {
      setPreviewCitationCategory(found);
      setIsPreviewModalOpen(true);
    }
  };

  // If on Dashboard, render the small portal selection dashboard
  if (activeView === 'dashboard') {
    return (
      <RoleDashboard
        logoConfig={logoConfig}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        onSelectConsultant={handleSelectConsultant}
        onLoginEmployee={handleLoginEmployee}
        onLoginAdmin={handleLoginAdmin}
      />
    );
  }

  return (
    <div className="h-screen min-h-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Header */}
      <Header
        logoConfig={logoConfig}
        currentRole={currentRole}
        userAuthRole={userAuthRole}
        employeeId={employeeId}
        isEmployeeVerified={isEmployeeVerified}
        onRoleChange={handleRoleChange}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdmin={handleOpenAdmin}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        activeView={activeView}
        onViewChange={setActiveView}
        onSignOut={handleSignOut}
        onOpenDashboard={() => setActiveView('dashboard')}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-row overflow-hidden">
        {activeView === 'chat' && (
          <ChatContainer
            currentRole={currentRole}
            isAdminAuthenticated={isAdminLoggedIn || userAuthRole === 'admin'}
            employeeId={employeeId}
            isEmployeeVerified={isEmployeeVerified}
            onRoleChange={handleRoleChange}
            onOpenEmployeeModal={(msg) => {
              setEmployeeModalMessage(msg || '');
              setIsEmployeeModalOpen(true);
            }}
            onSelectCitation={handleSelectCitation}
            activePolicies={policies}
          />
        )}

        {activeView === 'document' && (
          <DocumentViewer
            policies={policies}
            currentRole={currentRole}
            isEmployeeVerified={isEmployeeVerified}
            onOpenEmployeeModal={(msg) => {
              setEmployeeModalMessage(msg || '');
              setIsEmployeeModalOpen(true);
            }}
            onRoleChange={handleRoleChange}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            policies={policies}
            onUpdatePolicies={handleUpdatePolicies}
            logoConfig={logoConfig}
            onUpdateLogoConfig={handleUpdateLogoConfig}
            onLogout={handleSignOut}
            onClose={() => setActiveView('chat')}
            initialSelectedCategory={previewCitationCategory}
          />
        )}
      </main>

      {/* Modals */}
      <EmployeeIdModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSuccess={handleEmployeeVerified}
        initialMessage={employeeModalMessage}
      />

      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      <PolicyPagePreviewModal
        category={previewCitationCategory}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onOpenInAdmin={() => {
          if (isAdminLoggedIn || userAuthRole === 'admin') {
            setActiveView('admin');
          } else {
            setIsAdminModalOpen(true);
          }
        }}
      />

    </div>
  );
}
