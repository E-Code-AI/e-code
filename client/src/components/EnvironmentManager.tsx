import React, { useState, useEffect } from 'react';
import { Project } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, Plus, Save, Trash2, Key, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface EnvVariable {
  id: number;
  key: string;
  value: string;
  isSecret: boolean;
}

interface EnvironmentManagerProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function EnvironmentManager({ project, isOpen, onClose }: EnvironmentManagerProps) {
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<number, boolean>>({});
  const [newVar, setNewVar] = useState({ key: '', value: '', isSecret: false });
  const { toast } = useToast();

  // Fetch environment variables
  const fetchEnvVars = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest('GET', `/api/projects/${project.id}/env`);
      const data = await res.json();
      setEnvVars(data);
    } catch (error) {
      toast({
        title: 'Failed to load environment variables',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load environment variables when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchEnvVars();
    }
  }, [isOpen, project.id]);

  // Add a new environment variable
  const addEnvVar = () => {
    if (!newVar.key.trim()) {
      toast({
        title: 'Invalid variable',
        description: 'Variable key cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate key
    if (envVars.some(v => v.key === newVar.key.trim())) {
      toast({
        title: 'Duplicate key',
        description: `Environment variable "${newVar.key}" already exists`,
        variant: 'destructive',
      });
      return;
    }

    // Add new variable to the list (with temporary ID)
    setEnvVars([
      ...envVars,
      { 
        id: -Date.now(), // Temporary negative ID to distinguish unsaved vars
        key: newVar.key.trim(),
        value: newVar.value,
        isSecret: newVar.isSecret
      }
    ]);
    
    // Reset the form
    setNewVar({ key: '', value: '', isSecret: false });
  };

  // Remove an environment variable
  const removeEnvVar = (id: number) => {
    setEnvVars(envVars.filter(v => v.id !== id));
  };

  // Update an environment variable
  const updateEnvVar = (id: number, field: keyof EnvVariable, value: string | boolean) => {
    setEnvVars(envVars.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  // Toggle visibility of a secret value
  const toggleSecretVisibility = (id: number) => {
    setShowSecrets({
      ...showSecrets,
      [id]: !showSecrets[id]
    });
  };

  // Save all environment variables
  const saveEnvVars = async () => {
    setIsSaving(true);
    try {
      const res = await apiRequest('PUT', `/api/projects/${project.id}/env`, { variables: envVars });
      const data = await res.json();
      
      toast({
        title: 'Environment variables saved',
        description: 'Your changes have been successfully saved',
      });
      
      // Replace our local data with server data to get proper IDs
      setEnvVars(data);
    } catch (error) {
      toast({
        title: 'Failed to save environment variables',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Environment Variables
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Environment variables for your project will be available at runtime
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchEnvVars}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ScrollArea className="h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Key</TableHead>
                      <TableHead className="w-1/2">Value</TableHead>
                      <TableHead className="w-24 text-center">Secret</TableHead>
                      <TableHead className="w-14"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {envVars.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No environment variables yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      envVars.map(variable => (
                        <TableRow key={variable.id}>
                          <TableCell>
                            <Input 
                              value={variable.key} 
                              onChange={(e) => updateEnvVar(variable.id, 'key', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex">
                              <Input 
                                type={variable.isSecret && !showSecrets[variable.id] ? 'password' : 'text'}
                                value={variable.value} 
                                onChange={(e) => updateEnvVar(variable.id, 'value', e.target.value)}
                                className="h-8"
                              />
                              {variable.isSecret && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSecretVisibility(variable.id)}
                                  className="ml-1 h-8 w-8 p-0"
                                >
                                  {showSecrets[variable.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <input 
                              type="checkbox" 
                              checked={variable.isSecret}
                              onChange={(e) => updateEnvVar(variable.id, 'isSecret', e.target.checked)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm" 
                              onClick={() => removeEnvVar(variable.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              <div className="flex gap-2 pt-2">
                <Input 
                  placeholder="KEY"
                  value={newVar.key}
                  onChange={(e) => setNewVar({ ...newVar, key: e.target.value })}
                  className="w-1/3"
                />
                <Input 
                  placeholder="Value"
                  type={newVar.isSecret ? 'password' : 'text'}
                  value={newVar.value}
                  onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
                  className="flex-1"
                />
                <div className="flex items-center px-3">
                  <input 
                    type="checkbox" 
                    id="isSecret" 
                    checked={newVar.isSecret}
                    onChange={(e) => setNewVar({ ...newVar, isSecret: e.target.checked })}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="isSecret" className="text-sm">Secret</label>
                </div>
                <Button onClick={addEnvVar} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  variant="default" 
                  onClick={saveEnvVars} 
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}