// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Settings, 
  Shield, 
  CreditCard, 
  Trash2, 
  AlertTriangle, 
  Globe, 
  Lock,
  Zap,
  Bell,
  Key,
  Users,
  ChevronLeft,
  Download,
  Archive
} from 'lucide-react';

interface Team {
  id: number;
  name: string;
  slug: string;
  description: string;
  visibility: 'public' | 'private';
  plan: 'free' | 'pro' | 'enterprise';
  memberCount: number;
  projectCount: number;
  workspaceCount: number;
  createdAt: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export default function TeamSettings() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [teamName, setTeamName] = useState('');
  const [teamSlug, setTeamSlug] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamVisibility, setTeamVisibility] = useState<'public' | 'private'>('private');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [notifyOnNewMembers, setNotifyOnNewMembers] = useState(true);
  const [notifyOnNewProjects, setNotifyOnNewProjects] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  // Fetch team details
  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: [`/api/teams/${id}`],
    enabled: !!id
  });
  
  // Update form when team data loads
  useEffect(() => {
    if (team) {
      setTeamName(team.name);
      setTeamSlug(team.slug);
      setTeamDescription(team.description);
      setTeamVisibility(team.visibility);
    }
  }, [team]);

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PATCH', `/api/teams/${id}`, {
        name: teamName,
        slug: teamSlug,
        description: teamDescription,
        visibility: teamVisibility
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Team updated!",
        description: "Your team settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update team",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/teams/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Team deleted",
        description: "Your team has been permanently deleted.",
      });
      setLocation('/teams');
    },
    onError: (error) => {
      toast({
        title: "Failed to delete team",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const isOwner = team?.role === 'owner';
  const canManageTeam = team?.role === 'owner' || team?.role === 'admin';

  if (teamLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Team not found</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation('/teams')}
            >
              Back to Teams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManageTeam) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You don't have permission to manage this team</p>
            <Button 
              className="mt-4"
              onClick={() => setLocation(`/teams/${id}`)}
            >
              Back to Team
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => setLocation(`/teams/${id}`)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Team
        </Button>
        <h1 className="text-3xl font-bold mb-2">Team Settings</h1>
        <p className="text-muted-foreground">Manage your team settings and preferences</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
              <CardDescription>Update your team's basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="My Awesome Team"
                />
              </div>

              <div>
                <Label htmlFor="team-slug">Team URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">e-code.com/teams/</span>
                  <Input
                    id="team-slug"
                    value={teamSlug}
                    onChange={(e) => setTeamSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="my-team"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="team-description">Description</Label>
                <Textarea
                  id="team-description"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="What does your team do?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="team-visibility">Visibility</Label>
                <Select value={teamVisibility} onValueChange={(value: any) => setTeamVisibility(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public - Anyone can see this team
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Private - Only members can see this team
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => updateTeamMutation.mutate()}
                disabled={updateTeamMutation.isPending}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure team notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Member Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify team admins when new members join
                  </p>
                </div>
                <Switch
                  checked={notifyOnNewMembers}
                  onCheckedChange={setNotifyOnNewMembers}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Project Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify team members when new projects are created
                  </p>
                </div>
                <Switch
                  checked={notifyOnNewProjects}
                  onCheckedChange={setNotifyOnNewProjects}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Manage team security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New members must be approved by an admin
                  </p>
                </div>
                <Switch
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">API Keys</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage API keys for team integrations
                </p>
                <Button variant="outline" size="sm">
                  <Key className="h-4 w-4 mr-2" />
                  Manage API Keys
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>View team activity and security events</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Audit Logs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Manage your team's subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium capitalize">{team.plan} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {team.plan === 'free' && 'Basic features for small teams'}
                      {team.plan === 'pro' && 'Advanced features for growing teams'}
                      {team.plan === 'enterprise' && 'Full features with priority support'}
                    </p>
                  </div>
                  <Badge variant={team.plan === 'enterprise' ? 'default' : team.plan === 'pro' ? 'secondary' : 'outline'}>
                    <Zap className="h-3 w-3 mr-1" />
                    {team.plan}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  {team.plan !== 'enterprise' && (
                    <Button>
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  )}
                  <Button variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Track your team's resource usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Team Members</span>
                  <span className="text-sm font-medium">{team.memberCount} / {team.plan === 'free' ? '5' : team.plan === 'pro' ? '50' : 'Unlimited'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Projects</span>
                  <span className="text-sm font-medium">{team.projectCount} / {team.plan === 'free' ? '10' : team.plan === 'pro' ? '100' : 'Unlimited'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Workspaces</span>
                  <span className="text-sm font-medium">{team.workspaceCount} / {team.plan === 'free' ? '3' : team.plan === 'pro' ? '20' : 'Unlimited'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="space-y-4">
          {isOwner ? (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Danger Zone</AlertTitle>
                <AlertDescription>
                  These actions are permanent and cannot be undone. Please proceed with caution.
                </AlertDescription>
              </Alert>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Archive Team</CardTitle>
                  <CardDescription>
                    Archiving will make the team read-only. Projects and data will be preserved.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Team
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Delete Team</CardTitle>
                  <CardDescription>
                    Permanently delete this team and all its data. This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Team
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                          This will permanently delete <strong>{team.name}</strong> and all its data including:
                          <ul className="list-disc list-inside mt-2">
                            <li>{team.projectCount} projects</li>
                            <li>{team.memberCount} team members</li>
                            <li>{team.workspaceCount} workspaces</li>
                          </ul>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="delete-confirm">
                            Type <strong>{team.name}</strong> to confirm
                          </Label>
                          <Input
                            id="delete-confirm"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder={team.name}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteTeamMutation.mutate()}
                          disabled={deleteConfirmation !== team.name || deleteTeamMutation.isPending}
                        >
                          Delete Team
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Only team owners can access the danger zone</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}