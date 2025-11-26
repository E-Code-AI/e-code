import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, ArrowLeft, Table2, BarChart3, FileCode, 
  MessageSquare, Zap, Clock, Bot, TrendingUp
} from 'lucide-react';
import { AgentSessionsGrid } from '@/components/grids/AgentSessionsGrid';
import { AgentActionsGrid } from '@/components/grids/AgentActionsGrid';
import { FileOperationsGrid } from '@/components/grids/FileOperationsGrid';
import { ConversationHistoryGrid } from '@/components/grids/ConversationHistoryGrid';
import { AgentMetricsDashboard } from '@/components/grids/AgentMetricsDashboard';
import type { AgentSessionRow } from '@shared/types/agent-grid.types';

export default function AgentActivity() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [selectedSession, setSelectedSession] = useState<AgentSessionRow | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSessionSelect = (session: AgentSessionRow) => {
    setSelectedSession(session);
    setActiveTab('actions');
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
    setActiveTab('sessions');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">Agent Activity</h1>
              </div>
              {selectedSession && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Badge variant="secondary" className="font-mono text-xs">
                    Session: {selectedSession.id.slice(0, 8)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToSessions}
                    className="gap-1"
                    data-testid="button-back-sessions"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    All Sessions
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Bot className="h-3 w-3" />
                AI Agent Dashboard
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5 mx-auto">
            <TabsTrigger value="dashboard" className="gap-2" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2" data-testid="tab-sessions">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2" data-testid="tab-actions">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2" data-testid="tab-files">
              <FileCode className="h-4 w-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2" data-testid="tab-messages">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Agent Metrics Overview
                </CardTitle>
                <CardDescription>
                  Comprehensive analytics and performance metrics for your AI agent sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentMetricsDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Agent Sessions
                </CardTitle>
                <CardDescription>
                  View and analyze all AI agent sessions with filtering, sorting, and export capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentSessionsGrid onSessionSelect={handleSessionSelect} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Agent Actions
                  {selectedSession && (
                    <Badge variant="secondary" className="ml-2">
                      Filtered by session
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Detailed log of all autonomous actions performed by the AI agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentActionsGrid sessionId={selectedSession?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  File Operations
                  {selectedSession && (
                    <Badge variant="secondary" className="ml-2">
                      Filtered by session
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Track all file system operations including creates, updates, and deletes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileOperationsGrid sessionId={selectedSession?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversation History
                  {selectedSession && (
                    <Badge variant="secondary" className="ml-2">
                      Filtered by session
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Browse and search through all AI conversation messages with extended thinking details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConversationHistoryGrid sessionId={selectedSession?.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
