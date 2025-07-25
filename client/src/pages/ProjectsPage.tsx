import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Project, InsertProject } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Spinner } from '@/components/ui/spinner';
import { 
  Code, 
  Plus, 
  Trash2, 
  Edit, 
  ExternalLink, 
  Clock, 
  Eye, 
  EyeOff, 
  Settings 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Form schema
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(64, "Project name must be less than 64 characters"),
  description: z.string().max(255, "Description must be less than 255 characters").optional(),
  language: z.string().min(1, "Language is required"),
  visibility: z.enum(["public", "private", "unlisted"]),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const ProjectsPage = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Form for new project
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      language: "typescript",
      visibility: "private",
    },
  });

  // Query for fetching projects
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/projects');
      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }
      return res.json();
    }
  });

  // Mutation for creating a new project
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: ProjectFormValues) => {
      const res = await apiRequest('POST', '/api/projects', projectData);
      if (!res.ok) {
        throw new Error('Failed to create project');
      }
      return res.json();
    },
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      form.reset();
      setNewProjectOpen(false);
      toast({
        title: "Great! Your project is ready",
        description: `"${project.name}" is all set up. Let's start creating!`,
      });
      // Navigate to the new project
      setLocation(`/project/${project.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Oops! Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error('Failed to delete project');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setConfirmDeleteOpen(false);
      setDeleteProjectId(null);
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle new project form submission
  const onSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  // Handle delete project confirmation
  const confirmDelete = () => {
    if (deleteProjectId) {
      deleteProjectMutation.mutate(deleteProjectId);
    }
  };

  // Function to get language icon
  const getLanguageIcon = (language: string | null) => {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return <Code className="h-4 w-4 text-blue-400" />;
      case 'python':
        return <Code className="h-4 w-4 text-yellow-400" />;
      case 'html':
        return <Code className="h-4 w-4 text-orange-400" />;
      case 'css':
        return <Code className="h-4 w-4 text-purple-400" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  // Function to format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Function to get visibility badge
  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Badge variant="default" className="bg-green-600"><Eye className="h-3 w-3 mr-1" />Everyone can see</Badge>;
      case 'private':
        return <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" />Just for you</Badge>;
      case 'unlisted':
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Link sharing only</Badge>;
      default:
        return null;
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="container-responsive py-10 flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground text-responsive-sm">Loading projects...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container-responsive py-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-destructive/10 p-4 sm:p-6 text-destructive max-w-md mx-auto w-full text-center">
          <p className="text-responsive-sm">Error loading projects: {error.message}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects'] })}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-responsive">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-responsive-xl font-bold">My Projects</h1>
          <p className="text-muted-foreground mt-1 text-responsive-sm">All your creative work in one place</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link href="/templates">
            <Button variant="outline" className="w-full sm:w-auto">
              Browse Templates
            </Button>
          </Link>
          <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Let's start something new! Give your project a name and choose your starting point.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Awesome Project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="A brief description of your project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you like to create?</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose your starting point" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="html">Website (HTML)</SelectItem>
                          <SelectItem value="javascript">Interactive App (JavaScript)</SelectItem>
                          <SelectItem value="python">Automation Script (Python)</SelectItem>
                          <SelectItem value="typescript">Advanced Web App (TypeScript)</SelectItem>
                          <SelectItem value="go">Server Application (Go)</SelectItem>
                          <SelectItem value="rust">System Tool (Rust)</SelectItem>
                          <SelectItem value="java">Desktop App (Java)</SelectItem>
                          <SelectItem value="csharp">Windows App (C#)</SelectItem>
                          <SelectItem value="cpp">Performance Tool (C++)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who can see this?</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose privacy setting" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="private">
                            <div className="flex items-center">
                              <EyeOff className="h-4 w-4 mr-2" />
                              Just for me
                            </div>
                          </SelectItem>
                          <SelectItem value="public">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Share with everyone
                            </div>
                          </SelectItem>
                          <SelectItem value="unlisted">
                            <div className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Only people with the link
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        You can change this anytime
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewProjectOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending && (
                      <Spinner size="sm" className="mr-2" />
                    )}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center text-responsive-sm">
                      {getLanguageIcon(project.language)}
                      <span className="ml-2 truncate">{project.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1.5 text-xs sm:text-sm line-clamp-2">
                      {project.description || "No description provided"}
                    </CardDescription>
                  </div>
                  <div>
                    {getVisibilityBadge(project.visibility)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Updated {formatDate(project.updatedAt)}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setDeleteProjectId(project.id);
                    setConfirmDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-1"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                  <Button asChild size="sm" className="gap-1">
                    <Link to={`/project/${project.id}`}>
                      <Edit className="h-4 w-4" />
                      Open
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <Code className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-1">No projects yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Create your first project to start coding, collaborating, and building amazing applications.
          </p>
          <Button onClick={() => setNewProjectOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first project
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending && (
                <Spinner size="sm" className="mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;