/**
 * IDEPage - Web IDE entry point
 * 
 * Loads project data and renders the UnifiedIDELayout component
 * which handles all responsive layouts (desktop/tablet/mobile).
 */

import { useCallback, lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@shared/schema';
import { ECodeLoading } from '@/components/ECodeLoading';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';

const UnifiedIDELayout = lazy(() => import('@/components/ide/UnifiedIDELayout'));

export default function IDEPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = (params.projectId || params.id) as string;

  // ✅ FIX (Dec 11, 2025): Persist bootstrap token in state to survive URL changes
  // Extract token from URL only once on mount or when projectId changes
  const initialTokenRef = useRef<string | null>(null);
  const [stableBootstrapToken, setStableBootstrapToken] = useState<string | null>(null);
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('bootstrap');
    
    // Only set if we have a token and haven't already captured one for this project
    if (urlToken && initialTokenRef.current !== urlToken) {
      console.log('[IDEPage] Capturing bootstrap token in stable state:', {
        tokenLength: urlToken.length,
        tokenPreview: urlToken.substring(0, 30) + '...'
      });
      initialTokenRef.current = urlToken;
      setStableBootstrapToken(urlToken);
    }
  }, [projectId]);
  
  // For query purposes, still extract from URL each time
  const searchParams = new URLSearchParams(window.location.search);
  const urlBootstrapToken = searchParams.get('bootstrap');
  
  // Use stable token for AutonomousWorkspaceViewer, URL token for queries
  const bootstrapToken = stableBootstrapToken;
  
  console.log('[IDEPage] Component render:', {
    projectId,
    hasStableToken: !!stableBootstrapToken,
    hasUrlToken: !!urlBootstrapToken,
    tokenLength: stableBootstrapToken?.length
  });

  const handleWorkspaceComplete = useCallback(() => {
    // Clear the stable bootstrap token - workspace creation is complete
    setStableBootstrapToken(null);
    initialTokenRef.current = null;
    
    const url = new URL(window.location.href);
    url.searchParams.delete('bootstrap');
    window.history.replaceState({}, '', url);

    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });

    toast({
      title: "Workspace Ready!",
      description: "Your AI-powered workspace has been created successfully.",
    });
  }, [projectId, queryClient, toast]);

  const handleWorkspaceError = useCallback((error: string) => {
    toast({
      title: "Workspace Creation Failed",
      description: error,
      variant: "destructive",
    });
  }, [toast]);

  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ['/api/projects', projectId, { bootstrap: !!bootstrapToken }],
    queryFn: async () => {
      const url = `/api/projects/${projectId}${bootstrapToken ? `?bootstrap=${bootstrapToken}` : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch project: ${res.status} ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && (!!user || !!bootstrapToken),
  });

  if (isLoadingProject) {
    return <ECodeLoading fullScreen size="lg" text="Loading workspace..." />;
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const normalizedProjectId = String(project?.id ?? projectId);

  return (
    <>
      <Toaster />
      <ErrorBoundary>
        <Suspense fallback={<ECodeLoading fullScreen size="lg" text="Loading workspace..." />}>
          <UnifiedIDELayout 
            projectId={normalizedProjectId}
            bootstrapToken={bootstrapToken}
            onWorkspaceComplete={handleWorkspaceComplete}
            onWorkspaceError={handleWorkspaceError}
          />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}