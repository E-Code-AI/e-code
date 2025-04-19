import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { Project } from "@/lib/types";

export default function Home() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
    <div className="flex flex-col min-h-screen bg-dark text-white">
      <header className="border-b border-dark-600 p-4">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold">
              P
            </div>
            <h1 className="text-xl font-bold">PLOT</h1>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Projects</h2>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-dark-800 border-dark-600">
                <CardHeader className="animate-pulse h-14 bg-dark-700"></CardHeader>
                <CardContent className="animate-pulse h-20 bg-dark-700 mt-2"></CardContent>
                <CardFooter className="animate-pulse h-10 bg-dark-700 mt-2"></CardFooter>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="bg-dark-800 border-dark-600 cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400">
                    Last edited: {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </CardContent>
                <CardFooter className="border-t border-dark-600 pt-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <i className="ri-file-list-line mr-2 text-gray-400"></i>
                    <span>{project.files?.length || 0} files</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6">Create your first project to get started</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create a Project
            </Button>
          </div>
        )}
      </main>

      <CreateProjectModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        isLoading={createProjectMutation.isPending}
      />
    </div>
  );
}
