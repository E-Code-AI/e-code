import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Trash2, Plus, RefreshCw, Database, Key, Save } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';

interface ReplitDBProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DBEntry {
  id: number;
  key: string;
  value: string;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

// Form validation schema
const dbEntrySchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required")
});

type DBEntryFormValues = z.infer<typeof dbEntrySchema>;

export function ReplitDB({ projectId, open, onOpenChange }: ReplitDBProps) {
  const [activeTab, setActiveTab] = useState<string>('explorer');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<DBEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Form setup
  const form = useForm<DBEntryFormValues>({
    resolver: zodResolver(dbEntrySchema),
    defaultValues: {
      key: '',
      value: ''
    }
  });
  
  // Fetch DB entries for the project
  const { data: dbEntries = [], refetch } = useQuery<DBEntry[]>({
    queryKey: ['/api/projects', projectId, 'db'],
    enabled: open && projectId > 0,
  });
  
  // Create DB entry mutation
  const createMutation = useMutation({
    mutationFn: async (data: DBEntryFormValues) => {
      const response = await fetch(`/api/projects/${projectId}/db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create DB entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'DB entry created',
        description: 'Your database entry has been created successfully.',
      });
      form.reset();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating DB entry',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Update DB entry mutation
  const updateMutation = useMutation({
    mutationFn: async (data: DBEntryFormValues & { id: number }) => {
      const response = await fetch(`/api/projects/${projectId}/db/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: data.key, value: data.value })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update DB entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'DB entry updated',
        description: 'Your database entry has been updated successfully.',
      });
      form.reset();
      setIsEditing(false);
      setEditingEntry(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating DB entry',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Delete DB entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/projects/${projectId}/db/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete DB entry');
      }
      
      return id;
    },
    onSuccess: () => {
      toast({
        title: 'DB entry deleted',
        description: 'Your database entry has been deleted successfully.',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting DB entry',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setIsEditing(false);
      setEditingEntry(null);
    }
  }, [open, form]);
  
  // Set form values when editing an entry
  useEffect(() => {
    if (editingEntry) {
      form.setValue('key', editingEntry.key);
      form.setValue('value', editingEntry.value);
    }
  }, [editingEntry, form]);
  
  const handleSubmit = (values: DBEntryFormValues) => {
    if (isEditing && editingEntry) {
      updateMutation.mutate({ ...values, id: editingEntry.id });
    } else {
      createMutation.mutate(values);
    }
  };
  
  const handleEditEntry = (entry: DBEntry) => {
    setIsEditing(true);
    setEditingEntry(entry);
    setActiveTab('add');
  };
  
  const handleDeleteEntry = (id: number) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      deleteMutation.mutate(id);
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingEntry(null);
    form.reset();
  };
  
  const refreshEntries = () => {
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            PLOT DB - Key-Value Storage
          </DialogTitle>
          <DialogDescription>
            Simple key-value storage for your project. Perfect for storing app configuration, user preferences, and more.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="explorer">Explorer</TabsTrigger>
            <TabsTrigger value="add">{isEditing ? 'Edit Entry' : 'Add Entry'}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="explorer" className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Database Entries</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshEntries}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <ScrollArea className="h-[300px]">
              {dbEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-center text-muted-foreground">
                  <Database className="h-10 w-10 mb-2 opacity-20" />
                  <p>No database entries found.</p>
                  <Button 
                    variant="link" 
                    onClick={() => setActiveTab('add')}
                    className="mt-2"
                  >
                    Create your first entry
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Key</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dbEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.key}</TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {entry.value}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditEntry(entry)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive" 
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setActiveTab('add')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Entry
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="add" className="py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a unique key name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the value" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update' : 'Save'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}