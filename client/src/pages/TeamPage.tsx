import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Settings, Folder, Activity, UserPlus, Mail, Shield, 
  MoreVertical, Trash2, ChevronRight, Plus, X, Check, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Team {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  ownerId: number;
  plan: string;
  memberLimit: number;
  storageLimit: number;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  permissions: any;
  joinedAt: string;
  invitedBy?: number;
  isActive: boolean;
  user?: {
    id: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface TeamProject {
  id: number;
  name: string;
  description?: string;
  visibility: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamActivity {
  id: number;
  teamId: number;
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  metadata: any;
  createdAt: string;
}

export default function TeamPage() {
  const { teamId } = useParams() as { teamId: string };
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  // Fetch team details
  const { data: team, isLoading: isLoadingTeam } = useQuery<Team>({
    queryKey: [`/api/teams/${teamId}`],
  });

  // Fetch team members
  const { data: members, isLoading: isLoadingMembers } = useQuery<TeamMember[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: !!team,
  });

  // Fetch team projects
  const { data: projects, isLoading: isLoadingProjects } = useQuery<TeamProject[]>({
    queryKey: [`/api/teams/${teamId}/projects`],
    enabled: !!team,
  });

  // Fetch team activity
  const { data: activity, isLoading: isLoadingActivity } = useQuery<TeamActivity[]>({
    queryKey: [`/api/teams/${teamId}/activity`],
    enabled: !!team,
  });

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return apiRequest(`/api/teams/${teamId}/invitations`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      toast({
        title: 'Invitation sent',
        description: 'Team invitation has been sent successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send invitation',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (data: Partial<Team>) => {
      return apiRequest(`/api/teams/${teamId}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}`] });
      setIsSettingsDialogOpen(false);
      toast({
        title: 'Team updated',
        description: 'Team settings have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update team',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/teams/${teamId}/members/${userId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      toast({
        title: 'Member removed',
        description: 'Team member has been removed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to remove member',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiRequest(`/api/teams/${teamId}/members/${userId}`, 'PATCH', { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      toast({
        title: 'Role updated',
        description: 'Member role has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update role',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const handleInviteMember = () => {
    if (!inviteEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleUpdateTeam = () => {
    updateTeamMutation.mutate({
      name: teamName || team?.name,
      description: teamDescription || team?.description,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatActivityAction = (action: string, entityType: string) => {
    const actionMap: Record<string, string> = {
      'member.added': 'added a new member',
      'member.removed': 'removed a member',
      'member.role_updated': 'updated member role',
      'project.added': 'added a project',
      'project.removed': 'removed a project',
      'team.updated': 'updated team settings',
      'workspace.created': 'created a workspace',
    };
    return actionMap[`${entityType}.${action}`] || action;
  };

  if (isLoadingTeam) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">Team not found</h3>
            <p className="text-muted-foreground mb-4">
              The team you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => setLocation('/teams')}>
              Back to Teams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              {team.logo ? (
                <AvatarImage src={team.logo} alt={team.name} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-2xl">
                  {team.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{team.name}</h1>
              {team.description && (
                <p className="text-muted-foreground">{team.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={team.plan === 'free' ? 'outline' : 'default'}>
              {team.plan}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setTeamName(team.name);
                setTeamDescription(team.description || '');
                setIsSettingsDialogOpen(true);
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members ({members?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Folder className="mr-2 h-4 w-4" />
            Projects ({projects?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Members</h2>
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          {member.user?.avatarUrl ? (
                            <AvatarImage src={member.user.avatarUrl} alt={member.user.username} />
                          ) : (
                            <AvatarFallback>
                              {member.user?.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user?.displayName || member.user?.username}</p>
                          <p className="text-sm text-muted-foreground">@{member.user?.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => updateMemberRoleMutation.mutate({
                              userId: member.userId,
                              role: member.role === 'member' ? 'admin' : 'member'
                            })}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Change to {member.role === 'member' ? 'Admin' : 'Member'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => removeMemberMutation.mutate(member.userId)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Projects</h2>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>

          {!projects || projects.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground">
                  Add projects to share them with your team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline">{project.language}</Badge>
                      <span className="text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>

          <Card>
            <CardContent className="p-6">
              {!activity || activity.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No activity yet
                </p>
              ) : (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">User {item.userId}</span>{' '}
                          {formatActivityAction(item.action, item.entityType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Send an invitation to add someone to your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={inviteMemberMutation.isPending}>
              {inviteMemberMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team settings</DialogTitle>
            <DialogDescription>
              Update your team's information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam} disabled={updateTeamMutation.isPending}>
              {updateTeamMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}