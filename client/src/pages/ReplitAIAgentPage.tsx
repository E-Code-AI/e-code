import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ReplitLayout } from '@/components/layout/ReplitLayout';
import { ReplitAgent } from '@/components/ReplitAgent';
import { 
  Sparkles, 
  Send, 
  Paperclip,
  Code,
  Globe,
  Palette,
  FileText,
  Brain,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Example prompts categorized by type
const examplePrompts = {
  "Web Apps": [
    { text: "Build a personal portfolio website with dark mode", icon: Globe },
    { text: "Create a todo app with categories and due dates", icon: FileText },
    { text: "Make a real-time chat application", icon: Code },
  ],
  "Tools": [
    { text: "Build a markdown editor with live preview", icon: FileText },
    { text: "Create a password generator with strength meter", icon: Brain },
    { text: "Make a budget tracker with charts", icon: Code },
  ],
  "Games": [
    { text: "Create a memory card game", icon: Palette },
    { text: "Build a word guessing game", icon: Brain },
    { text: "Make a drawing canvas app", icon: Palette },
  ],
};

export default function ReplitAIAgentPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const params = useParams();
  const [prompt, setPrompt] = useState('');
  const [showAgent, setShowAgent] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);

  // Get prompt from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPrompt = urlParams.get('prompt');
    if (urlPrompt) {
      setPrompt(urlPrompt);
      // Auto-submit if prompt is provided
      handleSubmit();
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    // Create a new project for this AI session
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: prompt.slice(0, 50) + '...',
          language: 'javascript',
          visibility: 'private',
        }),
      });

      if (response.ok) {
        const project = await response.json();
        setProjectId(project.id);
        setShowAgent(true);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleExampleClick = (exampleText: string) => {
    setPrompt(exampleText);
    handleSubmit();
  };

  if (showAgent && projectId) {
    return (
      <ReplitLayout showSidebar={false}>
        <div className="h-full flex flex-col bg-[var(--ecode-background)]">
          {/* Header */}
          <div className="border-b border-[var(--ecode-border)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/dashboard')}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-lg font-medium">AI Agent</h1>
                  <p className="text-sm text-[var(--ecode-text-secondary)]">Building your app...</p>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/project/${projectId}`)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Open Editor
              </Button>
            </div>
          </div>

          {/* AI Agent Chat */}
          <div className="flex-1 overflow-y-auto">
            <ReplitAgent 
              projectId={projectId} 
              className="h-full"
            />
          </div>
        </div>
      </ReplitLayout>
    );
  }

  return (
    <ReplitLayout showSidebar={false}>
      <div className="min-h-screen bg-[var(--ecode-background)] flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex justify-center mb-8">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20">
                <Sparkles className="h-14 w-14 text-[var(--ecode-accent)]" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--ecode-text)] mb-4">
              Hi {user?.displayName || user?.username}, what do you want to build?
            </h1>
            <p className="text-lg text-[var(--ecode-text-secondary)] max-w-2xl mx-auto">
              Describe your app idea in any language. I'll build it for you instantly.
            </p>
          </div>

          {/* Main Input */}
          <form onSubmit={handleSubmit} className="mb-12">
            <div className="relative max-w-2xl mx-auto">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe an app or site you want to create..."
                className="w-full h-14 pl-6 pr-32 text-lg border-2 border-[var(--ecode-border)] focus:border-[var(--ecode-accent)] rounded-2xl"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button
                  type="submit"
                  size="default"
                  className="h-10 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white gap-2"
                  disabled={!prompt.trim()}
                >
                  <Send className="h-4 w-4" />
                  Build
                </Button>
              </div>
            </div>
          </form>

          {/* Example Prompts */}
          <div className="space-y-8">
            <h2 className="text-center text-lg font-medium text-[var(--ecode-text-secondary)]">
              Try these examples
            </h2>
            {Object.entries(examplePrompts).map(([category, examples]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-[var(--ecode-text-secondary)] mb-3">
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {examples.map((example, index) => (
                    <Card
                      key={index}
                      className="p-4 cursor-pointer hover:border-[var(--ecode-accent)] transition-colors"
                      onClick={() => handleExampleClick(example.text)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-[var(--ecode-surface-secondary)]">
                          <example.icon className="h-5 w-5 text-[var(--ecode-accent)]" />
                        </div>
                        <p className="text-sm text-[var(--ecode-text)] flex-1">
                          {example.text}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="mt-12 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/projects')}
              className="text-[var(--ecode-text-secondary)]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start from scratch instead
            </Button>
          </div>
        </div>
      </div>
    </ReplitLayout>
  );
}