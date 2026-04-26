/**
 * Runtimes Page
 * Provides UI for viewing and managing language runtimes
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { LanguageEnvironments, Language, languageConfigs } from '@/components/LanguageEnvironments';
import { RuntimePanel } from '@/components/RuntimePanel';
import { apiRequest } from '@/lib/queryClient';
import { normalizeRuntimeDependencies } from '@/lib/runtimeDependencies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, AlertCircle } from 'lucide-react';

interface ProjectSummary {
  id: number;
  name: string;
  description?: string | null;
}

export default function RuntimesPage() {
  const [location, navigate] = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const projectIdFromQuery = searchParams.get('projectId') || '';
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('nodejs');
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromQuery);
  
  const { data: dependencies, isLoading: isLoadingDependencies } = useQuery({
    queryKey: ['/api/runtime/dependencies'],
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery<ProjectSummary[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await apiRequest<any>('GET', '/api/projects');
      return (res.projects && Array.isArray(res.projects)) ? res.projects : (Array.isArray(res) ? res : []);
    },
    refetchInterval: false,
  });
  const { dockerAvailable, nixAvailable } = normalizeRuntimeDependencies(dependencies);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const fallbackProjectId = String(projects[0].id);
      setSelectedProjectId(fallbackProjectId);
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set('projectId', fallbackProjectId);
      navigate(`/runtimes?${nextParams.toString()}`, { replace: true });
    }
  }, [navigate, projects, selectedProjectId]);

  const selectedProject = projects.find((project) => String(project.id) === selectedProjectId) || null;

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('projectId', value);
    navigate(`/runtimes?${nextParams.toString()}`, { replace: true });
  };

  // If neither Docker nor Nix is available, show a warning
  const showDependencyWarning = !isLoadingDependencies && !dockerAvailable && !nixAvailable;

  return (
    <div className="container py-6" data-testid="page-runtimes">
      <h1 className="text-3xl font-bold mb-6" data-testid="heading-runtimes">Language Runtimes</h1>
      
      {showDependencyWarning && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Runtime Dependencies Not Available</AlertTitle>
          <AlertDescription>
            Docker and Nix are not available on this system. Language runtimes require either Docker or Nix to be installed.
          </AlertDescription>
        </Alert>
      )}

      {!dockerAvailable && nixAvailable && (
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Using Nix for Language Runtimes</AlertTitle>
          <AlertDescription>
            Docker is not available. Using Nix for language runtime environments.
          </AlertDescription>
        </Alert>
      )}

      {dockerAvailable && !nixAvailable && (
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Using Docker for Language Runtimes</AlertTitle>
          <AlertDescription>
            Nix is not available. Using Docker for language runtime environments.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <LanguageEnvironments 
            onSelectLanguage={setSelectedLanguage}
            selectedLanguage={selectedLanguage}
          />
        </div>
        
        <div className="lg:col-span-3">
          <Tabs defaultValue="info" className="h-full" data-testid="tabs-runtimes">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
              <TabsTrigger value="info" data-testid="tab-language-info">Language Info</TabsTrigger>
              <TabsTrigger value="runtime" data-testid="tab-runtime">Runtime</TabsTrigger>
              </TabsList>

              <Select value={selectedProjectId} onValueChange={handleProjectChange} disabled={isLoadingProjects || projects.length === 0}>
                <SelectTrigger className="w-full sm:w-[280px]" data-testid="select-runtimes-project">
                  <SelectValue placeholder={isLoadingProjects ? 'Loading projects...' : 'Select a project'} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <TabsContent value="info" className="h-[calc(100%-2rem)]">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{selectedLanguage ? `${selectedLanguage} Environment` : 'Language Environment'}</CardTitle>
                  <CardDescription>
                    Setup and configuration details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedLanguage && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[13px] font-medium">Runtime Setup</h3>
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {dockerAvailable ? 
                            `Using Docker with official ${selectedLanguage} images` : 
                            nixAvailable ? 
                              `Using Nix with ${selectedLanguage} packages` : 
                              'No runtime environment available'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-[13px] font-medium">Environment Info</h3>
                        <table className="w-full text-[13px] mt-1">
                          <tbody>
                            <tr>
                              <td className="py-1 font-medium">Default File</td>
                              <td className="py-1 text-muted-foreground">
                                {languageConfigs[selectedLanguage]?.defaultFile || 'index.js'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 font-medium">Run Command</td>
                              <td className="py-1 text-muted-foreground font-mono text-[11px]">
                                {languageConfigs[selectedLanguage]?.runCommand || 'node index.js'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 font-medium">File Extensions</td>
                              <td className="py-1 text-muted-foreground">
                                {languageConfigs[selectedLanguage]?.fileExtensions.join(', ') || '.js'}
                              </td>
                            </tr>
                            {languageConfigs[selectedLanguage]?.installCommand && (
                              <tr>
                                <td className="py-1 font-medium">Install Command</td>
                                <td className="py-1 text-muted-foreground font-mono text-[11px]">
                                  {languageConfigs[selectedLanguage]?.installCommand}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      <div>
                        <h3 className="text-[13px] font-medium">Packages & Dependencies</h3>
                        <p className="text-[13px] text-muted-foreground mt-1">
                          {selectedLanguage === 'nodejs' || selectedLanguage === 'typescript' ? 
                            'Manages dependencies via package.json and npm' : 
                            selectedLanguage === 'python' ? 
                              'Manages dependencies via requirements.txt and pip' : 
                              'Dependency management varies by project'
                          }
                        </p>
                      </div>

                      {selectedProject && (
                        <div>
                          <h3 className="text-[13px] font-medium">Selected Project</h3>
                          <p className="text-[13px] text-muted-foreground mt-1">
                            {selectedProject.name}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="runtime" className="h-[calc(100%-2rem)]">
              {selectedProjectId ? (
                <RuntimePanel projectId={Number(selectedProjectId)} />
              ) : (
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Runtime Environment</CardTitle>
                    <CardDescription>
                      Select a project to manage its runtime
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                      No project selected
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
