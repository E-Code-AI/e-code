import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  BookOpen,
  FileText,
  BarChart3,
  MoreHorizontal,
  Send,
  Paperclip,
  X,
  ChevronRight,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ECodeLoading } from '@/components/ECodeLoading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Quick action templates
const quickActions = [
  { icon: BookOpen, label: 'Book scanner' },
  { icon: FileText, label: 'Personal blog' },
  { icon: BarChart3, label: 'Statistics' },
];

// Get project icon based on project details
function getProjectIcon(project: Project) {
  const colors = [
    'bg-[#4A5BF6]', // Replit blue
    'bg-[#E54B4B]', // Red
    'bg-[#00A67E]', // Green
    'bg-[#F26522]', // Orange
    'bg-[#9B51E0]', // Purple
    'bg-[#F2C94C]', // Yellow
  ];
  
  const bgColor = colors[project.id % colors.length];
  const firstLetter = project.name.charAt(0).toUpperCase();
  
  return (
    <div className={`${bgColor} w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg`}>
      {firstLetter}
    </div>
  );
}

// Format time ago
function getTimeAgo(date: Date | string) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Check if project is deployed
function isDeployed(project: Project) {
  // In real implementation, this would check deployment status
  return project.id % 3 === 0;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [aiPrompt, setAiPrompt] = useState('');
  const [showBanner, setShowBanner] = useState(true);

  // Fetch recent projects
  const { data: recentProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects/recent'],
    enabled: !!user,
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiPrompt.trim()) {
      // Navigate to AI agent chat with the prompt
      navigate(`/ai-agent?prompt=${encodeURIComponent(aiPrompt)}`);
    }
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    // Navigate to AI agent with predefined prompt
    const prompts: Record<string, string> = {
      'Book scanner': 'Build a book scanner app that uses the camera to scan ISBN codes and fetch book details',
      'Personal blog': 'Create a personal blog website with posts, categories, and comments',
      'Statistics': 'Build a statistics dashboard with charts and data visualization',
    };
    navigate(`/ai-agent?prompt=${encodeURIComponent(prompts[action.label])}`);
  };

  if (isLoading) {
    return <ECodeLoading size="lg" />;
  }

  return (
    <div className="min-h-screen bg-[var(--ecode-background)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main greeting and AI prompt */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-normal text-[var(--ecode-text)] mb-6">
            Hi {user?.displayName || user?.username}, what do you want to make?
          </h1>
          
          {/* AI prompt input */}
          <form onSubmit={handleCreateProject} className="mb-6">
            <div className="relative">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe an app or site you want to create..."
                className="w-full h-12 pl-4 pr-24 text-base border-[var(--ecode-border)] focus:border-[var(--ecode-accent)] rounded-lg"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent)]/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Quick actions */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="gap-2 text-[var(--ecode-text-secondary)]"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Beta banner */}
        {showBanner && (
          <Card className="mb-8 p-4 bg-[var(--ecode-surface)] border-[var(--ecode-border)]">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  Beta
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--ecode-text)] mb-1">
                    Purchase domains on E-Code
                  </h3>
                  <p className="text-sm text-[var(--ecode-text-secondary)]">
                    Get your dream domain name in just a few clicks.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Recent Apps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--ecode-text)]">
              Your recent Apps
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
              className="text-[var(--ecode-text-secondary)] hover:text-[var(--ecode-text)]"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {recentProjects.length === 0 ? (
            <Card className="p-12 text-center bg-[var(--ecode-surface)] border-[var(--ecode-border)]">
              <p className="text-[var(--ecode-text-secondary)]">
                No apps yet. Create your first one above!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentProjects.slice(0, 5).map((project) => (
                <Card
                  key={project.id}
                  className="p-4 bg-[var(--ecode-surface)] border-[var(--ecode-border)] hover:border-[var(--ecode-accent)] transition-colors cursor-pointer"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getProjectIcon(project)}
                      <div>
                        <h3 className="font-medium text-[var(--ecode-text)]">
                          {project.name}
                        </h3>
                        <p className="text-sm text-[var(--ecode-text-secondary)]">
                          {getTimeAgo(project.updatedAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isDeployed(project) && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Deployed</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://${project.name.toLowerCase().replace(/\s+/g, '-')}.e-code.app`, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {!isDeployed(project) && project.visibility === 'private' && (
                        <span className="text-sm text-[var(--ecode-text-secondary)]">
                          Failed
                        </span>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/project/${project.id}`)}>
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}