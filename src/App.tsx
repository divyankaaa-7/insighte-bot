import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatContainer } from './components/Chat/ChatContainer';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { DocumentViewer } from './components/Document/DocumentViewer';
import { EmployeeIdModal } from './components/Modals/EmployeeIdModal';
import { AdminLoginModal } from './components/Modals/AdminLoginModal';
import { PolicyPagePreviewModal } from './components/Modals/PolicyPagePreviewModal';
import { LogoConfig, PolicyCategory, PolicyCitation, PolicyRole } from './types';
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

  // Apply dark mode class to documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('insighte_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
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

  // Role state: Opens BY DEFAULT in Consultant side
  const [currentRole, setCurrentRole] = useState<PolicyRole>('consultant');
  const [employeeId, setEmployeeId] = useState<string>(() => {
    return localStorage.getItem('insighte_employee_id') || '';
  });
  const [isEmployeeVerified, setIsEmployeeVerified] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('insighte_employee_verified') === 'true');
  });

  // Navigation View
  const [activeView, setActiveView] = useState<'chat' | 'admin' | 'document'>('chat');

  // Admin auth state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('insighte_admin_auth') === 'true';
  });

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeModalMessage, setEmployeeModalMessage] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [previewCitationCategory, setPreviewCitationCategory] = useState<PolicyCategory | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Handle Role change
  const handleRoleChange = (role: PolicyRole) => {
    if (role === 'employee' && !isEmployeeVerified) {
      setEmployeeModalMessage('Consultants cannot access Employee Policy. Please verify your Employee ID.');
      setIsEmployeeModalOpen(true);
      return;
    }
    setCurrentRole(role);
  };

  // Handle Employee Verification success
  const handleEmployeeVerified = (verifiedId: string) => {
    setEmployeeId(verifiedId);
    setIsEmployeeVerified(true);
    setCurrentRole('employee');
    localStorage.setItem('insighte_employee_id', verifiedId);
    localStorage.setItem('insighte_employee_verified', 'true');
  };

  // Handle Admin Button click
  const handleOpenAdmin = () => {
    if (isAdminLoggedIn) {
      setActiveView('admin');
    } else {
      setIsAdminModalOpen(true);
    }
  };

  // Handle Admin Login success
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('insighte_admin_auth', 'true');
    setActiveView('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('insighte_admin_auth');
    setActiveView('chat');
  };

  // Handle Citation click in chat: opens Policy Page Preview Modal
  const handleSelectCitation = (citation: PolicyCitation) => {
    const found = policies.find(p => p.id === citation.categoryId);
    if (found) {
      setPreviewCitationCategory(found);
      setIsPreviewModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Header */}
      <Header
        logoConfig={logoConfig}
        currentRole={currentRole}
        employeeId={employeeId}
        isEmployeeVerified={isEmployeeVerified}
        onRoleChange={handleRoleChange}
        onOpenEmployeeModal={() => {
          setEmployeeModalMessage('Verify your Employee ID to access permanent employee policies.');
          setIsEmployeeModalOpen(true);
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdmin={handleOpenAdmin}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' && (
          <ChatContainer
            currentRole={currentRole}
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
            onLogout={handleAdminLogout}
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
        onOpenInAdmin={(cat) => {
          if (isAdminLoggedIn) {
            setActiveView('admin');
          } else {
            setIsAdminModalOpen(true);
          }
        }}
      />

    </div>
  );
}
