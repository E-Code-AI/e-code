import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ECodeLoading } from '@/components/ECodeLoading';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

/**
 * AppLayout - Layout principal pour l'application IDE
 * 
 * Features:
 * - Vérifie l'authentification
 * - Affiche un loading state pendant la vérification
 * - Affiche la sidebar pour les utilisateurs authentifiés
 * - Layout flexible pour l'IDE
 */
export default function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  
  // Loading state - Pendant que l'auth se charge
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--ecode-surface)] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <ECodeLoading size="lg" message="Loading workspace..." />
        </div>
      </div>
    );
  }

  // Not authenticated - Rediriger vers login
  if (!isAuthenticated) {
    // Si vous utilisez wouter, vous pouvez faire une redirection ici
    // Pour l'instant, affichons un message
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--ecode-surface)] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <ECodeLoading size="lg" />
          <div>
            <h2 className="text-2xl font-semibold text-[var(--ecode-text)] dark:text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-[var(--ecode-text-secondary)] dark:text-slate-300 mb-6">
              Please log in to access your workspace
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-6 py-3 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white rounded-lg hover:from-sky-300 hover:via-blue-400 hover:to-indigo-400 transition-all"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Authenticated - Afficher le layout normal
  return (
    <div className="flex min-h-screen bg-[var(--ecode-surface)] dark:bg-slate-950 text-[var(--ecode-text)] dark:text-slate-100">
      {/* Sidebar (optionnel) */}
      {showSidebar && <Sidebar />}
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}