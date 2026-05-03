import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/ThemeProvider';
import { ReplitSecretsPanel } from './ReplitSecretsPanel';
import {
  Settings,
  Code,
  Palette,
  Bell,
  Shield,
  ChevronRight,
  Loader2,
  Save,
  RotateCcw,
  User,
  ExternalLink,
  Key,
  Lock,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AccountSectionProps {
  navigate: (path: string) => void;
}

function AccountSection({ navigate }: AccountSectionProps) {
  const { data: me, isLoading } = useQuery<{
    id: string;
    username: string;
    email?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    subscriptionTier?: string | null;
    twoFactorEnabled?: boolean;
  }>({ queryKey: ['/api/me'] });

  return (
    <div className="space-y-4">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Account</span>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={me?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {(me?.displayName || me?.username || 'U')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate">{me?.displayName || me?.username}</p>
              <p className="text-[11px] text-muted-foreground truncate">{me?.email}</p>
            </div>
            {me?.subscriptionTier && me.subscriptionTier !== 'free' && (
              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px] capitalize">{me.subscriptionTier}</Badge>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <button
              className="w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => navigate('/settings')}
              data-testid="button-open-user-settings"
            >
              <User className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Profile &amp; Settings</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => navigate('/settings')}
              data-testid="button-open-ssh-keys"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">SSH Keys</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => navigate('/settings')}
              data-testid="button-open-security"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Security &amp; 2FA</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              onClick={() => navigate('/settings')}
              data-testid="button-open-account-settings"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Billing &amp; Plan</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface SettingSection {
  id: 'editor' | 'appearance' | 'project' | 'notifications' | 'environment' | 'account';
  title: string;
  icon: React.ElementType;
}

interface ProjectSettings {
  projectId?: number;
  fontSize: string;
  tabSize: string;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSave: boolean;
  formatOnSave: boolean;
  editorTheme: string;
  projectName: string;
  projectDescription: string;
  projectPrivacy: 'public' | 'private' | 'unlisted';
  themeId?: string;
}

interface NotificationSettings {
  email?: Record<string, boolean>;
  push?: Record<string, boolean>;
  frequency?: 'instant' | 'hourly' | 'daily' | 'weekly';
}

const defaultProjectSettings: ProjectSettings = {
  fontSize: '14',
  tabSize: '2',
  wordWrap: true,
  lineNumbers: true,
  minimap: true,
  autoSave: true,
  formatOnSave: true,
  editorTheme: 'vs-light',
  projectName: 'My Project',
  projectDescription: 'A Replit project',
  projectPrivacy: 'private',
  themeId: 'light',
};

const defaultNotificationSettings: NotificationSettings = {
  email: {
    deployments: true,
    agent: true,
    security: true,
  },
  push: {
    deployments: true,
    agent: true,
    mentions: true,
  },
  frequency: 'instant',
};

export function ReplitSettingsPanel({ projectId }: { projectId?: string }) {
  const [activeSection, setActiveSection] = useState<SettingSection['id']>('editor');
  const [isDirty, setIsDirty] = useState(false);
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string; projectId?: string }>();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const resolvedProjectId = projectId ?? params.projectId ?? params.id ?? new URLSearchParams(window.location.search).get('projectId') ?? undefined;

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(defaultProjectSettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);

  const sections: SettingSection[] = useMemo(() => [
    { id: 'editor', title: 'Editor', icon: Code },
    { id: 'appearance', title: 'Appearance', icon: Palette },
    { id: 'project', title: 'Project', icon: Shield },
    { id: 'notifications', title: 'Notifications', icon: Bell },
    { id: 'environment', title: 'Environment', icon: Settings },
    { id: 'account', title: 'Account', icon: User },
  ], []);

  const { data: fetchedProjectSettings, isLoading: projectSettingsLoading, refetch: refetchProjectSettings } = useQuery<ProjectSettings>({
    queryKey: [`/api/projects/${resolvedProjectId}/settings`],
    enabled: !!resolvedProjectId,
  });

  const { data: fetchedNotificationSettings, isLoading: notificationSettingsLoading, refetch: refetchNotificationSettings } = useQuery<NotificationSettings>({
    queryKey: ['/api/notifications/settings'],
  });

  useEffect(() => {
    if (fetchedProjectSettings) {
      setProjectSettings({
        ...defaultProjectSettings,
        ...fetchedProjectSettings,
      });
      if (fetchedProjectSettings.themeId && ['light', 'dark', 'system'].includes(fetchedProjectSettings.themeId)) {
        setTheme(fetchedProjectSettings.themeId as 'light' | 'dark' | 'system');
      }
      setIsDirty(false);
    }
  }, [fetchedProjectSettings, setTheme]);

  useEffect(() => {
    if (fetchedNotificationSettings) {
      setNotificationSettings({
        ...defaultNotificationSettings,
        ...fetchedNotificationSettings,
        email: {
          ...defaultNotificationSettings.email,
          ...(fetchedNotificationSettings.email || {}),
        },
        push: {
          ...defaultNotificationSettings.push,
          ...(fetchedNotificationSettings.push || {}),
        },
      });
      setIsDirty(false);
    }
  }, [fetchedNotificationSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedProjectId) {
        throw new Error('Project ID required');
      }

      const themeId = theme === 'dark' || theme === 'light' || theme === 'system' ? theme : 'system';

      const [savedProjectSettings, savedNotificationSettings] = await Promise.all([
        apiRequest<ProjectSettings>('PUT', `/api/projects/${resolvedProjectId}/settings`, {
          ...projectSettings,
          themeId,
        }),
        apiRequest<NotificationSettings>('PUT', '/api/notifications/settings', notificationSettings),
      ]);

      return { savedProjectSettings, savedNotificationSettings };
    },
    onSuccess: ({ savedProjectSettings, savedNotificationSettings }) => {
      queryClient.setQueryData([`/api/projects/${resolvedProjectId}/settings`], savedProjectSettings);
      queryClient.setQueryData(['/api/notifications/settings'], savedNotificationSettings);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${resolvedProjectId}/settings`] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/settings'] });
      setIsDirty(false);
      toast({
        title: 'Settings saved',
        description: 'Project and notification settings were updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save settings',
        description: error.message || 'An error occurred while saving settings.',
        variant: 'destructive',
      });
    },
  });

  const updateProjectSettings = (updates: Partial<ProjectSettings>) => {
    setProjectSettings((current) => ({ ...current, ...updates }));
    setIsDirty(true);
  };

  const updateNotificationBranch = (branch: 'email' | 'push', key: string, value: boolean) => {
    setNotificationSettings((current) => ({
      ...current,
      [branch]: {
        ...(current[branch] || {}),
        [key]: value,
      },
    }));
    setIsDirty(true);
  };

  const handleReset = async () => {
    await Promise.all([refetchProjectSettings(), refetchNotificationSettings()]);
    setIsDirty(false);
    toast({
      title: 'Settings reset',
      description: 'Unsaved changes were discarded.',
    });
  };

  const isLoading = projectSettingsLoading || notificationSettingsLoading;

  const renderSectionContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 p-3">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-10 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      );
    }

    switch (activeSection) {
      case 'editor':
        return (
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Editor Preferences</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fontSize" className="text-[13px] text-muted-foreground">Font Size</Label>
                <Select value={projectSettings.fontSize} onValueChange={(value) => updateProjectSettings({ fontSize: value })}>
                  <SelectTrigger id="fontSize" className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12px</SelectItem>
                    <SelectItem value="14">14px</SelectItem>
                    <SelectItem value="16">16px</SelectItem>
                    <SelectItem value="18">18px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tabSize" className="text-[13px] text-muted-foreground">Tab Size</Label>
                <Select value={projectSettings.tabSize} onValueChange={(value) => updateProjectSettings({ tabSize: value })}>
                  <SelectTrigger id="tabSize" className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 spaces</SelectItem>
                    <SelectItem value="4">4 spaces</SelectItem>
                    <SelectItem value="8">8 spaces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { id: 'wordWrap', label: 'Word Wrap', value: projectSettings.wordWrap },
                { id: 'lineNumbers', label: 'Line Numbers', value: projectSettings.lineNumbers },
                { id: 'minimap', label: 'Minimap', value: projectSettings.minimap },
                { id: 'autoSave', label: 'Auto Save', value: projectSettings.autoSave },
                { id: 'formatOnSave', label: 'Format on Save', value: projectSettings.formatOnSave },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between h-9 px-3 rounded-lg bg-muted">
                  <Label htmlFor={item.id} className="text-[15px] leading-[20px] cursor-pointer">{item.label}</Label>
                  <Switch
                    id={item.id}
                    checked={item.value}
                    onCheckedChange={(checked) => updateProjectSettings({ [item.id]: checked } as Partial<ProjectSettings>)}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Appearance</span>
            <div>
              <Label htmlFor="appTheme" className="text-[13px] text-muted-foreground">Application Theme</Label>
              <Select value={theme} onValueChange={(value) => { setTheme(value as 'light' | 'dark' | 'system'); setIsDirty(true); }}>
                <SelectTrigger id="appTheme" className="mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editorTheme" className="text-[13px] text-muted-foreground">Editor Theme</Label>
              <Select value={projectSettings.editorTheme} onValueChange={(value) => updateProjectSettings({ editorTheme: value })}>
                <SelectTrigger id="editorTheme" className="mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vs-light">VS Light</SelectItem>
                  <SelectItem value="vs-dark">VS Dark</SelectItem>
                  <SelectItem value="monokai">Monokai</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                  <SelectItem value="solarized">Solarized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Project</span>
            <div>
              <Label htmlFor="projectName" className="text-[13px] text-muted-foreground">Project Name</Label>
              <Input id="projectName" value={projectSettings.projectName} onChange={(e) => updateProjectSettings({ projectName: e.target.value })} className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="projectDescription" className="text-[13px] text-muted-foreground">Description</Label>
              <Input id="projectDescription" value={projectSettings.projectDescription} onChange={(e) => updateProjectSettings({ projectDescription: e.target.value })} className="mt-1 h-8" />
            </div>
            <div>
              <Label htmlFor="privacy" className="text-[13px] text-muted-foreground">Privacy</Label>
              <Select value={projectSettings.projectPrivacy} onValueChange={(value) => updateProjectSettings({ projectPrivacy: value as ProjectSettings['projectPrivacy'] })}>
                <SelectTrigger id="privacy" className="mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Notifications</span>
            <div className="space-y-3">
              {[
                { branch: 'email' as const, key: 'deployments', label: 'Deployment Emails' },
                { branch: 'email' as const, key: 'agent', label: 'Agent Emails' },
                { branch: 'email' as const, key: 'security', label: 'Security Emails' },
                { branch: 'push' as const, key: 'deployments', label: 'Deployment Push' },
                { branch: 'push' as const, key: 'agent', label: 'Agent Push' },
                { branch: 'push' as const, key: 'mentions', label: 'Mentions Push' },
              ].map((item) => (
                <div key={`${item.branch}-${item.key}`} className="flex items-center justify-between h-9 px-3 rounded-lg bg-muted">
                  <Label htmlFor={`${item.branch}-${item.key}`} className="text-[15px] leading-[20px] cursor-pointer">{item.label}</Label>
                  <Switch
                    id={`${item.branch}-${item.key}`}
                    checked={Boolean(notificationSettings[item.branch]?.[item.key])}
                    onCheckedChange={(checked) => updateNotificationBranch(item.branch, item.key, checked)}
                  />
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="notificationFrequency" className="text-[13px] text-muted-foreground">Delivery Frequency</Label>
              <Select
                value={notificationSettings.frequency || 'instant'}
                onValueChange={(value) => {
                  setNotificationSettings((current) => ({ ...current, frequency: value as NotificationSettings['frequency'] }));
                  setIsDirty(true);
                }}
              >
                <SelectTrigger id="notificationFrequency" className="mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'environment':
        return <ReplitSecretsPanel projectId={projectId} />;

      case 'account':
        return (
          <AccountSection navigate={navigate} />
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--ecode-surface)]">
      <div className="h-9 px-2.5 flex items-center border-b border-[var(--ecode-border)] shrink-0">
        <div className="flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-[var(--ecode-text-muted)]" />
          <span className="text-xs font-medium text-[var(--ecode-text)]">Settings</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-48 border-r border-border shrink-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 h-8 rounded-lg transition-colors',
                      activeSection === section.id
                        ? 'bg-card text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                    data-testid={`button-section-${section.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left text-[13px]">{section.title}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-3">
              {renderSectionContent()}
            </div>
          </ScrollArea>

          {isDirty && activeSection !== 'environment' && (
            <div className="border-t border-border p-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">You have unsaved changes</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-8"
                    onClick={handleReset}
                    disabled={saveMutation.isPending}
                    data-testid="button-reset-settings"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                  <Button
                    className="h-8"
                    onClick={() => saveMutation.mutate(undefined)}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-settings"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
