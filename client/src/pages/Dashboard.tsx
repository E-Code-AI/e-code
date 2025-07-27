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
  CheckCircle2,
  Edit,
  Copy,
  Trash
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
      navigate(`/agent?prompt=${encodeURIComponent(aiPrompt)}`);
    }
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    // Navigate to AI agent with predefined prompt
    const prompts: Record<string, string> = {
      'Book scanner': 'Build a book scanner app that uses the camera to scan ISBN codes and fetch book details',
      'Personal blog': 'Create a personal blog website with posts, categories, and comments',
      'Statistics': 'Build a statistics dashboard with charts and data visualization',
    };
    navigate(`/agent?prompt=${encodeURIComponent(prompts[action.label])}`);
  };

  if (isLoading) {
    return <ECodeLoading size="lg" />;
  }

  return (
    <div className="min-h-screen bg-[var(--ecode-background)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Beta banner */}
        {showBanner && (
          <Card className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-[var(--ecode-border)] rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded">
                  Beta
                </span>
                <div>
                  <h3 className="font-medium text-[var(--ecode-text)] text-sm mb-0.5">
                    Purchase domains on E-Code
                  </h3>
                  <p className="text-xs text-[var(--ecode-text-secondary)]">
                    Get your dream domain name in just a few clicks.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="h-7 w-7 hover:bg-white/50 dark:hover:bg-black/20 rounded"
              >
                <X className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
              </Button>
            </div>
          </Card>
        )}

        {/* Main greeting */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-normal text-[var(--ecode-text)]">
            Hi {user?.displayName || user?.username}, what do you want to make?
          </h1>
        </div>
          
        {/* AI prompt input - Replit exact design */}
        <form onSubmit={handleCreateProject} className="mb-8">
            <div className="relative max-w-xl mx-auto">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe an app or site you want to create..."
                className="w-full h-14 pl-5 pr-28 text-base bg-[var(--ecode-surface)] border border-[var(--ecode-border)] focus:border-[var(--ecode-accent)] focus:bg-white rounded-full shadow-sm transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 hover:bg-[var(--ecode-surface-secondary)] rounded-full"
                >
                  <Paperclip className="h-5 w-5 text-[var(--ecode-text-secondary)]" />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 bg-gradient-to-r from-[var(--ecode-accent)] to-[var(--ecode-blue)] hover:opacity-90 rounded-full shadow-sm"
                >
                  <Send className="h-5 w-5 text-white" />
                </Button>
              </div>
            </div>
          </form>

          {/* Quick actions */}
          <div className="flex items-center justify-center gap-3 mb-10">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="h-9 px-4 gap-2 text-sm font-normal text-[var(--ecode-text-secondary)] border-[var(--ecode-border)] hover:bg-[var(--ecode-surface)] rounded-full"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>

        {/* Your recent Apps */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-[var(--ecode-text)]">
              Your recent Apps
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
              className="text-sm text-[var(--ecode-text-secondary)] hover:text-[var(--ecode-text)] -mr-2 flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {recentProjects.length === 0 ? (
            <Card className="p-16 text-center bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-lg">
              <p className="text-[var(--ecode-text-secondary)] text-base">
                No apps yet. Create your first one above!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentProjects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="group bg-[var(--ecode-surface)] border border-[var(--ecode-border)] hover:border-[var(--ecode-border-hover)] transition-colors cursor-pointer rounded-lg p-4"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {getProjectIcon(project)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base text-[var(--ecode-text)]">
                        {project.name}
                      </h3>
                      <p className="text-sm text-[var(--ecode-text-secondary)]">
                        {getTimeAgo(project.updatedAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isDeployed(project) && (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">Deployed</span>
                        </div>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/project/${project.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}