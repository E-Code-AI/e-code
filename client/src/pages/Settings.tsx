import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/ThemeProvider';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageShell } from '@/components/layout/PageShell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  User,
  Bell,
  Shield,
  Palette,
  Code,
  Key,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Plus,
  Copy,
  Check,
  Loader2,
  Users,
  Brain,
  Settings2,
  ChevronRight,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Laptop,
  LogOut,
  Pencil,
  Mail,
  Link2,
  Link2Off,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  website: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  githubUsername: z.string().max(50).optional(),
  twitterUsername: z.string().max(50).optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type PasswordForm = z.infer<typeof passwordSchema>;

const sshKeySchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  publicKey: z.string().min(20, 'Public key is too short').max(8192),
});
type SSHKeyForm = z.infer<typeof sshKeySchema>;

type Section = 'profile' | 'security' | 'ssh-keys' | 'notifications' | 'teams' | 'ai-privacy' | 'appearance' | 'editor' | 'sessions' | 'connected' | 'danger';

interface UserProfile {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  website?: string | null;
  githubUsername?: string | null;
  twitterUsername?: string | null;
}

interface SshKey {
  id: string;
  label: string;
  fingerprint: string;
  createdAt: string;
}

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesCount?: number;
}

interface NotificationPrefs {
  email?: Record<string, boolean>;
  push?: Record<string, boolean>;
  frequency?: 'instant' | 'hourly' | 'daily' | 'weekly';
}

interface TeamMembership {
  id: number;
  name: string;
  role: string;
  memberCount: number;
  plan: string;
}

interface AiPrivacyPrefs {
  agentMemoryEnabled: boolean;
  trainingOptOut: boolean;
}

interface EditorPrefs {
  fontSize: string;
  tabSize: string;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSave: boolean;
  formatOnSave: boolean;
  editorTheme: string;
}

interface SessionInfo {
  id: string;
  isCurrent: boolean;
  device: string;
  ip: string;
  lastActive: string;
  createdAt: string;
}

interface ConnectedService {
  id: string;
  name: string;
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
}

interface SecurityEvent {
  id: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'ssh-keys', label: 'SSH Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'connected', label: 'Connected Services', icon: Link2 },
  { id: 'ai-privacy', label: 'AI & Privacy', icon: Brain },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Code },
  { id: 'sessions', label: 'Sessions', icon: Laptop },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

export default function Settings() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [showAddSSHKey, setShowAddSSHKey] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpToken, setTotpToken] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState<string[]>([]);
  const [disablePasswordVisible, setDisablePasswordVisible] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [renameKeyId, setRenameKeyId] = useState<string | null>(null);
  const [renameKeyLabel, setRenameKeyLabel] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailPassword, setNewEmailPassword] = useState('');
  const [showEmailChange, setShowEmailChange] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const { data: me, isLoading: meLoading } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
  });

  const { data: sshKeys = [], isLoading: sshLoading, refetch: refetchSSH } = useQuery<SshKey[]>({
    queryKey: ['/api/ssh-keys'],
  });

  const { data: twoFAStatus, isLoading: twoFALoading, refetch: refetchTwoFA } = useQuery<TwoFactorStatus>({
    queryKey: ['/api/2fa/status'],
  });

  const { data: notificationPrefs, isLoading: notifsLoading } = useQuery<NotificationPrefs>({
    queryKey: ['/api/notifications/settings'],
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<TeamMembership[]>({
    queryKey: ['/api/teams'],
  });

  const { data: aiPrivacy, isLoading: aiPrivacyLoading } = useQuery<AiPrivacyPrefs>({
    queryKey: ['/api/users/ai-preferences'],
  });

  const { data: editorPrefs, isLoading: editorPrefsLoading } = useQuery<EditorPrefs>({
    queryKey: ['/api/users/editor-preferences'],
  });

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<{ sessions: SessionInfo[] }>({
    queryKey: ['/api/users/sessions'],
  });

  const { data: connectedServicesData, isLoading: connectedLoading, refetch: refetchConnected } = useQuery<{ services: ConnectedService[] }>({
    queryKey: ['/api/users/connected-services'],
  });

  const { data: securityEventsData, isLoading: secEventsLoading } = useQuery<{ events: SecurityEvent[] }>({
    queryKey: ['/api/users/security-events'],
    enabled: activeSection === 'security',
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      bio: '',
      avatarUrl: '',
      website: '',
      githubUsername: '',
      twitterUsername: '',
    },
  });

  useEffect(() => {
    if (me) {
      profileForm.reset({
        displayName: me.displayName || '',
        bio: me.bio || '',
        avatarUrl: me.avatarUrl || '',
        website: me.website || '',
        githubUsername: me.githubUsername || '',
        twitterUsername: me.twitterUsername || '',
      });
    }
  }, [me]);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const sshKeyForm = useForm<SSHKeyForm>({
    resolver: zodResolver(sshKeySchema),
    defaultValues: { label: '', publicKey: '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      if (!me?.id) throw new Error('Not authenticated');
      return apiRequest('PUT', `/api/user/${me.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({ title: 'Profile saved', description: 'Your profile has been updated.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save profile', description: err.message, variant: 'destructive' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      if (!me?.id) throw new Error('Not authenticated');
      return apiRequest('PUT', `/api/user/${me.id}`, {
        currentPassword: data.currentPassword,
        password: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: 'Password changed', description: 'Your password has been updated.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to change password', description: err.message, variant: 'destructive' });
    },
  });

  const setup2FAMutation = useMutation({
    mutationFn: () => apiRequest<{ secret: string; qrCodeUrl: string; backupCodes: string[] }>('POST', '/api/2fa/setup', {}),
    onSuccess: (data) => {
      setShowBackupCodes(data.backupCodes || []);
      setShow2FASetup(true);
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to initiate 2FA setup', description: err.message, variant: 'destructive' });
    },
  });

  const confirm2FAMutation = useMutation({
    mutationFn: (token: string) => apiRequest('POST', '/api/2fa/confirm', { token }),
    onSuccess: () => {
      refetchTwoFA();
      setShow2FASetup(false);
      setTotpToken('');
      toast({ title: '2FA enabled', description: 'Two-factor authentication is now active.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to enable 2FA', description: err.message, variant: 'destructive' });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: (password: string) => apiRequest('POST', '/api/2fa/disable', { password }),
    onSuccess: () => {
      refetchTwoFA();
      setDisablePassword('');
      toast({ title: '2FA disabled', description: 'Two-factor authentication has been turned off.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to disable 2FA', description: err.message, variant: 'destructive' });
    },
  });

  const regenBackupMutation = useMutation({
    mutationFn: () => apiRequest<{ backupCodes: string[] }>('POST', '/api/2fa/backup-codes/regenerate', {}),
    onSuccess: (data) => {
      setShowBackupCodes(data.backupCodes || []);
      refetchTwoFA();
      toast({ title: 'Backup codes regenerated', description: 'Save these codes somewhere safe.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to regenerate codes', description: err.message, variant: 'destructive' });
    },
  });

  const addSSHKeyMutation = useMutation({
    mutationFn: (data: SSHKeyForm) => apiRequest('POST', '/api/ssh-keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ssh-keys'] });
      sshKeyForm.reset();
      setShowAddSSHKey(false);
      toast({ title: 'SSH key added', description: 'Your public key has been registered.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to add SSH key', description: err.message, variant: 'destructive' });
    },
  });

  const deleteSSHKeyMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/ssh-keys/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ssh-keys'] });
      toast({ title: 'SSH key removed' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to remove key', description: err.message, variant: 'destructive' });
    },
  });

  const saveNotificationsMutation = useMutation({
    mutationFn: (prefs: NotificationPrefs) => apiRequest('PUT', '/api/notifications/settings', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/settings'] });
      toast({ title: 'Notifications saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save notifications', description: err.message, variant: 'destructive' });
    },
  });

  const saveAiPrivacyMutation = useMutation({
    mutationFn: (prefs: AiPrivacyPrefs) => apiRequest('PUT', '/api/users/ai-preferences', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/ai-preferences'] });
      toast({ title: 'AI & Privacy preferences saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save AI preferences', description: err.message, variant: 'destructive' });
    },
  });

  const saveEditorPrefsMutation = useMutation({
    mutationFn: (prefs: EditorPrefs) => apiRequest('PUT', '/api/users/editor-preferences', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/editor-preferences'] });
      toast({ title: 'Editor preferences saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save editor preferences', description: err.message, variant: 'destructive' });
    },
  });

  const revokeAllSessionsMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/users/sessions/revoke-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/sessions'] });
      toast({ title: 'Sessions revoked', description: 'All other sessions have been signed out.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to revoke sessions', description: err.message, variant: 'destructive' });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sid: string) => apiRequest('DELETE', `/api/users/sessions/${sid}`, {}),
    onSuccess: () => {
      refetchSessions();
      toast({ title: 'Session signed out' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to sign out session', description: err.message, variant: 'destructive' });
    },
  });

  const renameSSHKeyMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      apiRequest('PATCH', `/api/ssh-keys/${id}/rename`, { label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ssh-keys'] });
      setRenameKeyId(null);
      setRenameKeyLabel('');
      toast({ title: 'SSH key renamed' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to rename key', description: err.message, variant: 'destructive' });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: async ({ email, currentPassword }: { email: string; currentPassword: string }) => {
      if (!me?.id) throw new Error('Not authenticated');
      return apiRequest('PUT', `/api/user/${me.id}`, { email, currentPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      setShowEmailChange(false);
      setNewEmail('');
      setNewEmailPassword('');
      toast({ title: 'Email updated', description: 'Your email address has been changed successfully.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to change email', description: err.message, variant: 'destructive' });
    },
  });

  const disconnectServiceMutation = useMutation({
    mutationFn: (serviceId: string) => apiRequest('DELETE', `/api/users/connected-services/${serviceId}`, {}),
    onSuccess: () => {
      refetchConnected();
      toast({ title: 'Service disconnected' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to disconnect', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!me?.id) throw new Error('Not authenticated');
      return apiRequest('DELETE', `/api/user/${me.id}`);
    },
    onSuccess: () => {
      toast({ title: 'Account deleted' });
      navigate('/');
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete account', description: err.message, variant: 'destructive' });
    },
  });

  const [localNotifs, setLocalNotifs] = useState<NotificationPrefs>({
    email: { deployments: true, agent: true, security: true },
    push: { deployments: true, agent: true, mentions: true },
    frequency: 'instant',
  });
  useEffect(() => {
    if (notificationPrefs) setLocalNotifs(notificationPrefs);
  }, [notificationPrefs]);

  const [localAiPrivacy, setLocalAiPrivacy] = useState<AiPrivacyPrefs>({
    agentMemoryEnabled: true,
    trainingOptOut: false,
  });
  useEffect(() => {
    if (aiPrivacy) setLocalAiPrivacy(aiPrivacy);
  }, [aiPrivacy]);

  const [localEditorPrefs, setLocalEditorPrefs] = useState<EditorPrefs>({
    fontSize: '14', tabSize: '2', wordWrap: true, lineNumbers: true,
    minimap: true, autoSave: true, formatOnSave: true, editorTheme: 'vs-light',
  });
  useEffect(() => {
    if (editorPrefs) setLocalEditorPrefs(editorPrefs);
  }, [editorPrefs]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Public Profile</h2>
              <p className="text-sm text-muted-foreground">Update your name, bio, and social links.</p>
            </div>
            {meLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 ring-2 ring-border">
                      <AvatarImage src={profileForm.watch('avatarUrl') || undefined} />
                      <AvatarFallback>{(me?.displayName || me?.username || 'U')[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <FormField control={profileForm.control} name="avatarUrl" render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl><Input {...field} placeholder="https://example.com/avatar.png" data-testid="input-avatar-url" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username (read-only)</Label>
                      <Input value={me?.username || ''} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (read-only)</Label>
                      <Input value={me?.email || ''} disabled />
                    </div>
                  </div>

                  <FormField control={profileForm.control} name="displayName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl><Input {...field} data-testid="input-display-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={profileForm.control} name="bio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl><Textarea {...field} rows={4} placeholder="Tell people about yourself" data-testid="input-bio" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Social Links</p>

                  <FormField control={profileForm.control} name="website" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl><Input {...field} placeholder="https://yoursite.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={profileForm.control} name="githubUsername" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Username</FormLabel>
                        <FormControl><Input {...field} placeholder="octocat" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={profileForm.control} name="twitterUsername" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter / X Username</FormLabel>
                        <FormControl><Input {...field} placeholder="handle" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                      {updateProfileMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Profile'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold">Security</h2>
              <p className="text-sm text-muted-foreground">Manage your password, email, and two-factor authentication.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Address</CardTitle>
                <CardDescription>Your current email: <strong>{me?.email || '—'}</strong></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showEmailChange ? (
                  <Button variant="outline" onClick={() => setShowEmailChange(true)} data-testid="button-change-email">
                    <Mail className="mr-2 h-4 w-4" />Change Email
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">New Email Address</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="you@example.com"
                        data-testid="input-new-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-password">Current Password</Label>
                      <Input
                        id="email-password"
                        type="password"
                        value={newEmailPassword}
                        onChange={(e) => setNewEmailPassword(e.target.value)}
                        placeholder="Confirm with your password"
                        data-testid="input-email-password"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => changeEmailMutation.mutate({ email: newEmail, currentPassword: newEmailPassword })}
                        disabled={changeEmailMutation.isPending || !newEmail || !newEmailPassword}
                        data-testid="button-submit-email"
                      >
                        {changeEmailMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Update Email
                      </Button>
                      <Button variant="outline" onClick={() => { setShowEmailChange(false); setNewEmail(''); setNewEmailPassword(''); }}>
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Your email address will be updated immediately. Use a password manager to keep track of the change.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Use a strong password you don't use elsewhere.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((d) => changePasswordMutation.mutate(d))} className="space-y-4">
                    <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl><Input {...field} type="password" data-testid="input-current-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input {...field} type="password" data-testid="input-new-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl><Input {...field} type="password" data-testid="input-confirm-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-change-password">
                      {changePasswordMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing...</> : 'Change Password'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security using an authenticator app (TOTP).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {twoFALoading ? (
                  <div className="h-8 w-32 rounded bg-muted animate-pulse" />
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Badge variant={twoFAStatus?.enabled ? 'default' : 'secondary'} data-testid="badge-2fa-status">
                        {twoFAStatus?.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {twoFAStatus?.enabled && twoFAStatus.backupCodesCount !== undefined && (
                        <span className="text-sm text-muted-foreground">{twoFAStatus.backupCodesCount} backup codes remaining</span>
                      )}
                    </div>
                    {!twoFAStatus?.enabled ? (
                      <Button onClick={() => setup2FAMutation.mutate(undefined)} disabled={setup2FAMutation.isPending} data-testid="button-enable-2fa">
                        {setup2FAMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Enable 2FA
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => regenBackupMutation.mutate(undefined)} disabled={regenBackupMutation.isPending} data-testid="button-regen-backup">
                          {regenBackupMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                          Regenerate Backup Codes
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" data-testid="button-disable-2fa">Disable 2FA</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                              <AlertDialogDescription>Enter your password to confirm.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="relative">
                              <Input
                                type={disablePasswordVisible ? 'text' : 'password'}
                                value={disablePassword}
                                onChange={(e) => setDisablePassword(e.target.value)}
                                placeholder="Your current password"
                                data-testid="input-disable-2fa-password"
                              />
                              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setDisablePasswordVisible(v => !v)}>
                                {disablePasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDisablePassword('')}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => disable2FAMutation.mutate(disablePassword)}
                                disabled={disable2FAMutation.isPending || !disablePassword}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disable
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Security Activity</CardTitle>
                <CardDescription>The last 20 security-related actions on your account.</CardDescription>
              </CardHeader>
              <CardContent>
                {secEventsLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
                ) : (securityEventsData?.events ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity to show.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(securityEventsData?.events ?? []).map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm" data-testid={`sec-event-${ev.id}`}>
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium capitalize">{ev.action.replace(/_/g, ' ')}</span>
                          {ev.ipAddress && <span className="text-muted-foreground ml-2">from {ev.ipAddress}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{new Date(ev.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {showBackupCodes.length > 0 && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-base">Save Your Backup Codes</CardTitle>
                  <CardDescription>Store these somewhere safe. Each code can only be used once.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {showBackupCodes.map((code) => (
                      <code key={code} className="px-3 py-1.5 rounded bg-muted text-sm font-mono">{code}</code>
                    ))}
                  </div>
                  {!twoFAStatus?.enabled && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app to activate 2FA:</p>
                      <div className="flex gap-2">
                        <Input value={totpToken} onChange={(e) => setTotpToken(e.target.value)} placeholder="123456" maxLength={6} className="w-32" data-testid="input-totp-token" />
                        <Button onClick={() => confirm2FAMutation.mutate(totpToken)} disabled={confirm2FAMutation.isPending || totpToken.length < 6} data-testid="button-confirm-2fa">
                          {confirm2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Enable'}
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowBackupCodes([])}>
                    <X className="mr-2 h-4 w-4" />Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'ssh-keys':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">SSH Keys</h2>
                <p className="text-sm text-muted-foreground">Public keys used for SSH authentication.</p>
              </div>
              <Button onClick={() => setShowAddSSHKey(true)} data-testid="button-add-ssh-key">
                <Plus className="mr-2 h-4 w-4" />Add Key
              </Button>
            </div>

            {sshLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : sshKeys.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No SSH keys added yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sshKeys.map((key) => (
                  <Card key={key.id} data-testid={`ssh-key-${key.id}`}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        {renameKeyId === key.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={renameKeyLabel}
                              onChange={(e) => setRenameKeyLabel(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              data-testid={`input-rename-ssh-key-${key.id}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameSSHKeyMutation.mutate({ id: key.id, label: renameKeyLabel });
                                if (e.key === 'Escape') { setRenameKeyId(null); setRenameKeyLabel(''); }
                              }}
                            />
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => renameSSHKeyMutation.mutate({ id: key.id, label: renameKeyLabel })} disabled={renameSSHKeyMutation.isPending}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setRenameKeyId(null); setRenameKeyLabel(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="font-medium text-sm">{key.label}</p>
                        )}
                        <p className="text-xs font-mono text-muted-foreground truncate">{key.fingerprint}</p>
                        <p className="text-xs text-muted-foreground">Added {new Date(key.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1 ml-3 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(key.fingerprint, key.id)}>
                          {copiedKey === key.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setRenameKeyId(key.id); setRenameKeyLabel(key.label); }}
                          data-testid={`rename-ssh-key-${key.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" data-testid={`delete-ssh-key-${key.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove SSH Key?</AlertDialogTitle>
                              <AlertDialogDescription>"{key.label}" will be deleted. SSH sessions using it will stop working.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSSHKeyMutation.mutate(key.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Dialog open={showAddSSHKey} onOpenChange={(open) => { setShowAddSSHKey(open); if (!open) sshKeyForm.reset(); }}>
              <DialogContent data-testid="dialog-add-ssh-key">
                <DialogHeader>
                  <DialogTitle>Add SSH Key</DialogTitle>
                  <DialogDescription>Paste your public key (e.g. id_rsa.pub or id_ed25519.pub).</DialogDescription>
                </DialogHeader>
                <Form {...sshKeyForm}>
                  <form onSubmit={sshKeyForm.handleSubmit((d) => addSSHKeyMutation.mutate(d))} className="space-y-4">
                    <FormField control={sshKeyForm.control} name="label" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. My MacBook" data-testid="input-ssh-key-label" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={sshKeyForm.control} name="publicKey" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Key</FormLabel>
                        <FormControl><Textarea {...field} rows={4} placeholder="ssh-ed25519 AAAA..." className="font-mono text-xs" data-testid="input-ssh-key-content" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowAddSSHKey(false)}>Cancel</Button>
                      <Button type="submit" disabled={addSSHKeyMutation.isPending} data-testid="button-submit-ssh-key">
                        {addSSHKeyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Add Key
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Choose how and when you receive notifications.</p>
            </div>
            {notifsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Email Notifications</p>
                  {(['deployments', 'agent', 'security'] as const).map((key) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor={`email-${key}`} className="capitalize cursor-pointer">{key === 'agent' ? 'AI Agent' : key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                      <Switch
                        id={`email-${key}`}
                        checked={Boolean(localNotifs.email?.[key])}
                        onCheckedChange={(v) => setLocalNotifs(prev => ({ ...prev, email: { ...prev.email, [key]: v } }))}
                        data-testid={`switch-email-${key}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Push Notifications</p>
                  {(['deployments', 'agent', 'mentions'] as const).map((key) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor={`push-${key}`} className="capitalize cursor-pointer">{key === 'agent' ? 'AI Agent' : key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                      <Switch
                        id={`push-${key}`}
                        checked={Boolean(localNotifs.push?.[key])}
                        onCheckedChange={(v) => setLocalNotifs(prev => ({ ...prev, push: { ...prev.push, [key]: v } }))}
                        data-testid={`switch-push-${key}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Delivery Frequency</Label>
                  <Select value={localNotifs.frequency || 'instant'} onValueChange={(v) => setLocalNotifs(prev => ({ ...prev, frequency: v as NotificationPrefs['frequency'] }))}>
                    <SelectTrigger data-testid="select-notification-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="hourly">Hourly digest</SelectItem>
                      <SelectItem value="daily">Daily digest</SelectItem>
                      <SelectItem value="weekly">Weekly digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => saveNotificationsMutation.mutate(localNotifs)} disabled={saveNotificationsMutation.isPending} data-testid="button-save-notifications">
                  {saveNotificationsMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Preferences'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'teams':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Teams</h2>
              <p className="text-sm text-muted-foreground">Your team memberships and roles.</p>
            </div>
            {teamsLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : teams.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You're not a member of any teams.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/teams/new')}>Create a Team</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <Card key={team.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(`/teams/${team.id}`)} data-testid={`team-${team.id}`}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">{team.memberCount} members · {team.plan} plan</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{team.role}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'ai-privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">AI & Privacy</h2>
              <p className="text-sm text-muted-foreground">Control how AI features use your data.</p>
            </div>
            {aiPrivacyLoading ? (
              <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="agent-memory" className="text-base cursor-pointer">Agent Memory</Label>
                    <p className="text-sm text-muted-foreground">Allow the AI agent to remember context across sessions.</p>
                  </div>
                  <Switch
                    id="agent-memory"
                    checked={localAiPrivacy.agentMemoryEnabled}
                    onCheckedChange={(v) => setLocalAiPrivacy(prev => ({ ...prev, agentMemoryEnabled: v }))}
                    data-testid="switch-agent-memory"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="training-opt-out" className="text-base cursor-pointer">Opt out of AI training</Label>
                    <p className="text-sm text-muted-foreground">Exclude your code and interactions from model training data.</p>
                  </div>
                  <Switch
                    id="training-opt-out"
                    checked={localAiPrivacy.trainingOptOut}
                    onCheckedChange={(v) => setLocalAiPrivacy(prev => ({ ...prev, trainingOptOut: v }))}
                    data-testid="switch-training-opt-out"
                  />
                </div>

                <Separator />

                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="font-medium">Data Export</p>
                    <p className="text-sm text-muted-foreground">Request a copy of all your stored data.</p>
                  </div>
                  <Button variant="outline" data-testid="button-request-data-export" onClick={() => toast({ title: 'Export requested', description: "You'll receive an email when your data is ready." })}>
                    Request Data Export
                  </Button>
                </div>

                <Button onClick={() => saveAiPrivacyMutation.mutate(localAiPrivacy)} disabled={saveAiPrivacyMutation.isPending} data-testid="button-save-ai-privacy">
                  {saveAiPrivacyMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Preferences'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Choose how E-Code looks for you.</p>
            </div>
            <div className="space-y-3">
              <Label>Application Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'light', label: 'Light', Icon: Sun },
                  { value: 'dark', label: 'Dark', Icon: Moon },
                  { value: 'system', label: 'System', Icon: Monitor },
                ] as const).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setGlobalTheme(value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-accent',
                      globalTheme === value && 'border-primary bg-accent',
                    )}
                    data-testid={`button-theme-${value}`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{label}</span>
                    {globalTheme === value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'editor':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Editor Preferences</h2>
              <p className="text-sm text-muted-foreground">Your default editor settings, applied across all projects.</p>
            </div>
            {editorPrefsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ed-font-size">Font Size</Label>
                    <Select value={localEditorPrefs.fontSize} onValueChange={(v) => setLocalEditorPrefs(p => ({ ...p, fontSize: v }))}>
                      <SelectTrigger id="ed-font-size" data-testid="select-editor-font-size"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['12','13','14','15','16','18','20'].map(s => <SelectItem key={s} value={s}>{s}px</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ed-tab-size">Tab Size</Label>
                    <Select value={localEditorPrefs.tabSize} onValueChange={(v) => setLocalEditorPrefs(p => ({ ...p, tabSize: v }))}>
                      <SelectTrigger id="ed-tab-size" data-testid="select-editor-tab-size"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 spaces</SelectItem>
                        <SelectItem value="4">4 spaces</SelectItem>
                        <SelectItem value="8">8 spaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ed-theme">Editor Theme</Label>
                  <Select value={localEditorPrefs.editorTheme} onValueChange={(v) => setLocalEditorPrefs(p => ({ ...p, editorTheme: v }))}>
                    <SelectTrigger id="ed-theme" data-testid="select-editor-theme"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vs-light">VS Light</SelectItem>
                      <SelectItem value="vs-dark">VS Dark</SelectItem>
                      <SelectItem value="hc-black">High Contrast Black</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {([
                    { key: 'wordWrap', label: 'Word Wrap' },
                    { key: 'lineNumbers', label: 'Line Numbers' },
                    { key: 'minimap', label: 'Minimap' },
                    { key: 'autoSave', label: 'Auto Save' },
                    { key: 'formatOnSave', label: 'Format on Save' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor={`ed-${key}`} className="cursor-pointer">{label}</Label>
                      <Switch
                        id={`ed-${key}`}
                        checked={localEditorPrefs[key]}
                        onCheckedChange={(v) => setLocalEditorPrefs(p => ({ ...p, [key]: v }))}
                        data-testid={`switch-editor-${key}`}
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={() => saveEditorPrefsMutation.mutate(localEditorPrefs)} disabled={saveEditorPrefsMutation.isPending} data-testid="button-save-editor-prefs">
                  {saveEditorPrefsMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Preferences'}
                </Button>
              </div>
            )}
          </div>
        );

      case 'sessions':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Sessions & Devices</h2>
                <p className="text-sm text-muted-foreground">Your active login sessions across all devices.</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-revoke-all-sessions">
                    <LogOut className="mr-2 h-4 w-4" />Sign out all others
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
                    <AlertDialogDescription>All devices except this one will be signed out immediately.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => revokeAllSessionsMutation.mutate(undefined)} disabled={revokeAllSessionsMutation.isPending}>
                      Sign out others
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {sessionsLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                {(sessionsData?.sessions ?? []).map((session) => (
                  <Card key={session.id} className={session.isCurrent ? 'border-primary/40' : ''} data-testid={`session-${session.id}`}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Laptop className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate max-w-sm">{session.device}</p>
                            {session.isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">IP: {session.ip}</p>
                          <p className="text-xs text-muted-foreground">Last active: {new Date(session.lastActive).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Signed in: {new Date(session.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-3 shrink-0 text-destructive hover:text-destructive" data-testid={`revoke-session-${session.id}`}>
                              <LogOut className="h-4 w-4 mr-1" />Sign out
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sign out this session?</AlertDialogTitle>
                              <AlertDialogDescription>The device using this session will be signed out immediately.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => revokeSessionMutation.mutate(session.id)}
                                disabled={revokeSessionMutation.isPending}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Sign out
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'connected':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Connected Services</h2>
              <p className="text-sm text-muted-foreground">Manage third-party services linked to your account.</p>
            </div>
            {connectedLoading ? (
              <div className="space-y-3">{[1].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (connectedServicesData?.services ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No services connected.</p>
            ) : (
              <div className="space-y-3">
                {(connectedServicesData?.services ?? []).map((svc) => (
                  <Card key={svc.id} data-testid={`connected-service-${svc.id}`}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                          {svc.connected ? (
                            <Link2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Link2Off className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{svc.name}</p>
                          {svc.connected && svc.username && (
                            <p className="text-xs text-muted-foreground">@{svc.username}</p>
                          )}
                          {svc.connected && svc.connectedAt && (
                            <p className="text-xs text-muted-foreground">
                              Connected {new Date(svc.connectedAt).toLocaleDateString()}
                            </p>
                          )}
                          {!svc.connected && (
                            <p className="text-xs text-muted-foreground">Not connected</p>
                          )}
                        </div>
                      </div>
                      {svc.connected ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/5" data-testid={`disconnect-service-${svc.id}`}>
                              <Link2Off className="h-4 w-4 mr-1" />Disconnect
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect {svc.name}?</AlertDialogTitle>
                              <AlertDialogDescription>Your {svc.name} access token will be removed. You can reconnect at any time.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => disconnectServiceMutation.mutate(svc.id)}
                                disabled={disconnectServiceMutation.isPending}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Badge variant="secondary">Not connected</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'danger':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">Irreversible actions. Proceed with caution.</p>
            </div>
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Delete Account</CardTitle>
                <CardDescription>Permanently delete your account and all associated data. This cannot be undone.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm">Type your username <strong>{me?.username}</strong> to confirm</Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={me?.username || 'username'}
                    data-testid="input-delete-confirm"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => deleteAccountMutation.mutate(undefined)}
                  disabled={deleteAccountMutation.isPending || deleteConfirmText !== me?.username}
                  data-testid="button-delete-account"
                >
                  {deleteAccountMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" />Delete Account</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageShell>
      <div className="flex gap-0 -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 min-h-[calc(100vh-4rem)]">
        <aside className="w-56 shrink-0 border-r bg-card">
          <div className="p-4">
            <h1 className="text-base font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4" />Settings
            </h1>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <nav className="p-2 space-y-0.5" data-testid="nav-settings-sidebar">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                    activeSection === id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    id === 'danger' && activeSection !== 'danger' && 'text-destructive/70 hover:text-destructive hover:bg-destructive/10',
                    id === 'danger' && activeSection === 'danger' && 'bg-destructive/10 text-destructive',
                  )}
                  data-testid={`button-settings-${id}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        <main className="flex-1 min-w-0 p-6 md:p-8">
          <div className="max-w-2xl">
            {renderSection()}
          </div>
        </main>
      </div>
    </PageShell>
  );
}
