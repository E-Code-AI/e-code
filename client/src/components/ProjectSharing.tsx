import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Share2, 
  Link, 
  Copy, 
  Mail,
  Users,
  Globe,
  Lock,
  Eye,
  Edit3,
  UserPlus,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ProjectSharingProps {
  projectId: number;
  projectName: string;
  className?: string;
}

interface Collaborator {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'pending';
}

type SharePermission = 'private' | 'unlisted' | 'public';

export function ProjectSharing({ projectId, projectName, className }: ProjectSharingProps) {
  const [sharePermission, setSharePermission] = useState<SharePermission>('private');
  const [shareLink, setShareLink] = useState(`https://e-code.app/@user/${projectName}`);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      username: 'alice_dev',
      email: 'alice@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      role: 'owner',
      status: 'active'
    },
    {
      id: '2',
      username: 'bob_coder',
      email: 'bob@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      role: 'editor',
      status: 'active'
    }
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: 'Link Copied',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    // Show information about team-based collaboration
    toast({
      title: 'Team Collaboration',
      description: 'Project sharing is managed through Teams. Create or join a team to collaborate on projects.',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Navigate to teams page
            window.location.href = '/teams';
          }}
        >
          Go to Teams
        </Button>
      ),
    });
    setInviteEmail('');
  };

  const removeCollaborator = (id: string) => {
    toast({
      title: 'Team Management',
      description: 'To remove collaborators, please manage team members through the Teams page.',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = '/teams';
          }}
        >
          Go to Teams
        </Button>
      ),
    });
  };

  const updateCollaboratorRole = (id: string, role: 'editor' | 'viewer') => {
    setCollaborators(prev => prev.map(c => 
      c.id === id ? { ...c, role } : c
    ));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Lock className="h-3 w-3" />;
      case 'editor': return <Edit3 className="h-3 w-3" />;
      case 'viewer': return <Eye className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Project
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Share Permissions */}
        <div className="space-y-3">
          <Label>Project Visibility</Label>
          <RadioGroup 
            value={sharePermission} 
            onValueChange={(value) => setSharePermission(value as SharePermission)}
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="private" id="private" />
              <div className="flex-1">
                <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                  <Lock className="h-4 w-4" />
                  Private
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Only you and invited collaborators can access
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="unlisted" id="unlisted" />
              <div className="flex-1">
                <Label htmlFor="unlisted" className="flex items-center gap-2 cursor-pointer">
                  <Link className="h-4 w-4" />
                  Unlisted
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Anyone with the link can view
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="public" id="public" />
              <div className="flex-1">
                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                  <Globe className="h-4 w-4" />
                  Public
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Anyone can find and view this project
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Share Link */}
        {sharePermission !== 'private' && (
          <>
            <div className="space-y-3">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyShareLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Invite Collaborators */}
        <div className="space-y-3">
          <Label>Invite Collaborators</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="editor">Can Edit</option>
              <option value="viewer">Can View</option>
            </select>
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Invite
            </Button>
          </div>
        </div>

        {/* Collaborators List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Collaborators</Label>
            <Badge variant="secondary">{collaborators.length} members</Badge>
          </div>
          
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {collaborators.map(collaborator => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={collaborator.avatar} />
                      <AvatarFallback>
                        {collaborator.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{collaborator.username}</p>
                      <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {collaborator.status === 'pending' && (
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    )}
                    
                    {collaborator.role === 'owner' ? (
                      <Badge variant="default" className="text-xs">
                        {getRoleIcon(collaborator.role)}
                        <span className="ml-1">Owner</span>
                      </Badge>
                    ) : (
                      <>
                        <select
                          value={collaborator.role}
                          onChange={(e) => updateCollaboratorRole(
                            collaborator.id, 
                            e.target.value as 'editor' | 'viewer'
                          )}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="editor">Can Edit</option>
                          <option value="viewer">Can View</option>
                        </select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => removeCollaborator(collaborator.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}