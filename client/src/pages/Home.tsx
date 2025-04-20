import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { Project } from "@shared/schema";
import AppLayout from "@/components/layout/AppLayout";
import { Plus, Code, FileText, Clock, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/projects', { name });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateModalOpen(false);
      navigate(`/project/${data.id}`);
      toast({
        title: "Project created!",
        description: `${data.name} has been created successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCreateProject = (name: string) => {
    createProjectMutation.mutate(name);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Projects</h2>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-card border border-border">
                  <CardHeader className="animate-pulse h-14 bg-muted"></CardHeader>
                  <CardContent className="animate-pulse h-20 bg-muted mt-2"></CardContent>
                  <CardFooter className="animate-pulse h-10 bg-muted mt-2"></CardFooter>
                </Card>
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="bg-card border border-border hover:border-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Code className="h-4 w-4 text-primary" />
                      {project.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border pt-3 flex justify-between">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 mr-1" />
                      <span>{project.files?.length || 0} files</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Settings className="h-3 w-3 mr-1" />
                      <span>{project.visibility || 'private'}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <h3 className="text-xl mb-2">Welcome, {user?.username || 'user'}!</h3>
              <p className="text-muted-foreground mb-6">Create your first project to get started with PLOT</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create a Project
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        isLoading={createProjectMutation.isPending}
      />
    </AppLayout>
  );
}
