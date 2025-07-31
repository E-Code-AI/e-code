import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Plus, Edit2, Trash2, ChevronRight, Lock, Unlock, Search, Settings } from 'lucide-react';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: number;
  resource: string;
  action: string;
  description: string;
  category: string;
}

export function CustomRoles() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/organizations/roles'],
    queryFn: async () => {
      // In real implementation, would fetch from actual endpoint
      return mockRoles;
    }
  });

  // Fetch available permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['/api/permissions'],
    queryFn: async () => {
      // In real implementation, would fetch from actual endpoint
      return mockPermissions;
    }
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; permissions: string[] }) => {
      const response = await fetch('/api/organizations/roles', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to create role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role Created",
        description: "The new role has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/roles'] });
      setCreateDialogOpen(false);
      setSelectedPermissions(new Set());
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; description: string; permissions: string[] }) => {
      const response = await fetch(`/api/organizations/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role Updated",
        description: "The role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/roles'] });
      setEditingRole(null);
      setSelectedPermissions(new Set());
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      const response = await fetch(`/api/organizations/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete role');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Role Deleted",
        description: "The role has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/roles'] });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCreateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRoleMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      permissions: Array.from(selectedPermissions)
    });
  };

  const handleUpdateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRole) return;
    const formData = new FormData(e.currentTarget);
    updateRoleMutation.mutate({
      id: editingRole.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      permissions: Array.from(selectedPermissions)
    });
  };

  const groupPermissionsByCategory = (perms: Permission[]) => {
    return perms.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  const filteredRoles = roles?.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Custom Roles & Permissions
        </h1>
        <p className="text-muted-foreground mt-2">
          Define custom roles with specific permissions for your organization
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Available Permissions</TabsTrigger>
          <TabsTrigger value="users">Role Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Roles</CardTitle>
                  <CardDescription>
                    Manage roles and their associated permissions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Role
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading roles...</p>
                </div>
              ) : filteredRoles && filteredRoles.length > 0 ? (
                <div className="grid gap-4">
                  {filteredRoles.map((role) => (
                    <div key={role.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{role.name}</h3>
                            {role.isSystem && (
                              <Badge variant="secondary">
                                <Lock className="mr-1 h-3 w-3" />
                                System
                              </Badge>
                            )}
                            {role.userCount !== undefined && (
                              <Badge variant="outline">
                                <Users className="mr-1 h-3 w-3" />
                                {role.userCount} users
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.slice(0, 5).map((perm) => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                            {role.permissions.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{role.permissions.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRole(role);
                              setSelectedPermissions(new Set(role.permissions));
                            }}
                            disabled={role.isSystem}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRoleMutation.mutate(role.id)}
                            disabled={role.isSystem || deleteRoleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No roles found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Available Permissions</CardTitle>
              <CardDescription>
                All permissions that can be assigned to roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading permissions...</p>
                </div>
              ) : permissions ? (
                <div className="space-y-6">
                  {Object.entries(groupPermissionsByCategory(permissions)).map(([category, perms]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-lg mb-3 capitalize">
                        {category.replace(/_/g, ' ')}
                      </h3>
                      <div className="grid gap-2">
                        {perms.map((perm) => (
                          <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {perm.resource}:{perm.action}
                              </code>
                              <p className="text-sm text-muted-foreground mt-1">{perm.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No permissions available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Role Assignments</CardTitle>
              <CardDescription>
                View and manage user role assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">User role management coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Role Dialog */}
      <Dialog open={createDialogOpen || !!editingRole} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditingRole(null);
          setSelectedPermissions(new Set());
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              Define the role name, description, and permissions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingRole?.name}
                  placeholder="e.g., Content Editor"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingRole?.description}
                  placeholder="Describe what this role can do..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Permissions</Label>
                <ScrollArea className="h-64 border rounded-lg p-4">
                  {permissions && Object.entries(groupPermissionsByCategory(permissions)).map(([category, perms]) => (
                    <div key={category} className="mb-6">
                      <h4 className="font-medium mb-2 capitalize">{category.replace(/_/g, ' ')}</h4>
                      <div className="space-y-2">
                        {perms.map((perm) => {
                          const permString = `${perm.resource}:${perm.action}`;
                          return (
                            <div key={perm.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={permString}
                                checked={selectedPermissions.has(permString)}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(selectedPermissions);
                                  if (checked) {
                                    newSet.add(permString);
                                  } else {
                                    newSet.delete(permString);
                                  }
                                  setSelectedPermissions(newSet);
                                }}
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={permString}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {perm.description}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  <code>{permString}</code>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => {
                setCreateDialogOpen(false);
                setEditingRole(null);
                setSelectedPermissions(new Set());
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRoleMutation.isPending || updateRoleMutation.isPending}>
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mock data for demonstration
const mockRoles: Role[] = [
  {
    id: 1,
    name: 'Owner',
    description: 'Full access to all resources and settings',
    permissions: ['project:create', 'project:read', 'project:update', 'project:delete', 'user:manage_roles', 'system:manage_organization'],
    isSystem: true,
    userCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Developer',
    description: 'Create and manage projects, view team resources',
    permissions: ['project:create', 'project:read', 'project:update', 'project:deploy', 'team:read'],
    isSystem: true,
    userCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Marketing Team',
    description: 'Access to marketing projects and analytics',
    permissions: ['project:read', 'team:read', 'billing:view'],
    isSystem: false,
    userCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockPermissions: Permission[] = [
  // Project Management
  { id: 1, resource: 'project', action: 'create', description: 'Create new projects', category: 'project_management' },
  { id: 2, resource: 'project', action: 'read', description: 'View projects', category: 'project_management' },
  { id: 3, resource: 'project', action: 'update', description: 'Edit project settings', category: 'project_management' },
  { id: 4, resource: 'project', action: 'delete', description: 'Delete projects', category: 'project_management' },
  { id: 5, resource: 'project', action: 'deploy', description: 'Deploy projects', category: 'project_management' },
  
  // User Management
  { id: 6, resource: 'user', action: 'create', description: 'Create new users', category: 'user_management' },
  { id: 7, resource: 'user', action: 'read', description: 'View user profiles', category: 'user_management' },
  { id: 8, resource: 'user', action: 'update', description: 'Edit user information', category: 'user_management' },
  { id: 9, resource: 'user', action: 'manage_roles', description: 'Assign/remove roles', category: 'user_management' },
  
  // Team Management
  { id: 10, resource: 'team', action: 'create', description: 'Create teams', category: 'team_management' },
  { id: 11, resource: 'team', action: 'read', description: 'View team information', category: 'team_management' },
  { id: 12, resource: 'team', action: 'manage_members', description: 'Add/remove team members', category: 'team_management' },
  
  // Billing
  { id: 13, resource: 'billing', action: 'view', description: 'View billing information', category: 'billing' },
  { id: 14, resource: 'billing', action: 'manage', description: 'Manage payment methods', category: 'billing' },
  
  // System
  { id: 15, resource: 'system', action: 'manage_sso', description: 'Configure SSO providers', category: 'system' },
  { id: 16, resource: 'system', action: 'view_audit_logs', description: 'View audit logs', category: 'system' },
  { id: 17, resource: 'system', action: 'manage_organization', description: 'Organization settings', category: 'system' },
];

export default CustomRoles;