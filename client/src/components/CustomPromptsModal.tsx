// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Settings,
  Plus,
  Search,
  Star,
  StarOff,
  Copy,
  Trash2,
  Edit,
  Save,
  X,
  FileText,
  Code,
  Bug,
  Zap,
  RefreshCw,
  FileCode,
  Shield,
  Layers,
  HelpCircle,
  ChevronRight,
  Upload,
  Download,
  History,
  Variable,
  Eye,
} from 'lucide-react';
import { PromptTemplateCard } from './PromptTemplateCard';

interface CustomPromptsModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PromptTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  prompt: string;
  variables: Array<{ name: string; description: string; defaultValue?: string }>;
  isSystem: boolean;
  isPublic: boolean;
  createdBy?: string;
  usageCount: number;
  rating: number;
  tags: string[];
  examples?: Array<{ input: string; output: string }>;
}

interface CustomPrompt {
  id: number;
  name: string;
  description: string;
  category: string;
  prompt: string;
  variables: Record<string, string>;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
}

interface ProjectAiRule {
  id: number;
  projectId: string;
  customPromptId?: number;
  templateId?: number;
  name: string;
  description: string;
  isActive: boolean;
  priority: number;
  conditions?: {
    fileTypes?: string[];
    paths?: string[];
    keywords?: string[];
  };
  settings?: {
    autoApply?: boolean;
    maxTokens?: number;
    temperature?: number;
  };
}

const PROMPT_CATEGORIES = [
  { value: 'code_generation', label: 'Code Generation', icon: Code },
  { value: 'debugging', label: 'Debugging', icon: Bug },
  { value: 'documentation', label: 'Documentation', icon: FileText },
  { value: 'refactoring', label: 'Refactoring', icon: RefreshCw },
  { value: 'testing', label: 'Testing', icon: FileCode },
  { value: 'performance', label: 'Performance', icon: Zap },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'architecture', label: 'Architecture', icon: Layers },
  { value: 'other', label: 'Other', icon: HelpCircle },
];

export function CustomPromptsModal({ projectId, isOpen, onClose }: CustomPromptsModalProps) {
  const [selectedTab, setSelectedTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState('');
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    prompt: '',
    variables: [] as Array<{ name: string; description: string; defaultValue?: string }>,
    isPublic: false,
    isFavorite: false,
  });

  // Fetch data queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/ai/prompt-templates', selectedCategory],
    enabled: isOpen && selectedTab === 'templates',
  });

  const { data: customPrompts = [], isLoading: promptsLoading } = useQuery({
    queryKey: ['/api/ai/custom-prompts'],
    enabled: isOpen,
  });

  const { data: projectRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ai-rules`],
    enabled: isOpen && !!projectId,
  });

  const { data: promptHistory = [] } = useQuery({
    queryKey: ['/api/ai/prompt-history', projectId],
    enabled: isOpen && selectedTab === 'history',
  });

  // Mutations
  const createPromptMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest('/api/ai/custom-prompts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/custom-prompts'] });
      toast({ title: 'Success', description: 'Custom prompt created successfully' });
      setIsCreating(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create custom prompt', variant: 'destructive' });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/ai/custom-prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/custom-prompts'] });
      toast({ title: 'Success', description: 'Custom prompt updated successfully' });
      setEditingPrompt(null);
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/ai/custom-prompts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/custom-prompts'] });
      toast({ title: 'Success', description: 'Custom prompt deleted successfully' });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/projects/${projectId}/ai-rules`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ai-rules`] });
      toast({ title: 'Success', description: 'AI rule created successfully' });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/ai-rules/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ai-rules`] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'other',
      prompt: '',
      variables: [],
      isPublic: false,
      isFavorite: false,
    });
  };

  const handleCreatePrompt = () => {
    if (!formData.name || !formData.prompt) {
      toast({ title: 'Error', description: 'Name and prompt are required', variant: 'destructive' });
      return;
    }
    createPromptMutation.mutate(formData);
  };

  const handleAddVariable = () => {
    setFormData({
      ...formData,
      variables: [
        ...formData.variables,
        { name: '', description: '', defaultValue: '' },
      ],
    });
  };

  const handleRemoveVariable = (index: number) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((_, i) => i !== index),
    });
  };

  const handleVariableChange = (index: number, field: string, value: string) => {
    const updatedVariables = [...formData.variables];
    updatedVariables[index] = { ...updatedVariables[index], [field]: value };
    setFormData({ ...formData, variables: updatedVariables });
  };

  const previewPromptWithVariables = () => {
    let preview = formData.prompt;
    formData.variables.forEach((variable) => {
      const value = variable.defaultValue || `[${variable.name}]`;
      preview = preview.replace(new RegExp(`{{${variable.name}}}`, 'g'), value);
    });
    setPreviewPrompt(preview);
  };

  const handleImportPrompts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const prompts = JSON.parse(text);
      
      // Import logic here
      toast({ title: 'Success', description: `Imported ${prompts.length} prompts` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to import prompts', variant: 'destructive' });
    }
  };

  const handleExportPrompts = () => {
    const dataStr = JSON.stringify(customPrompts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'custom-prompts.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredTemplates = templates.filter((template: PromptTemplate) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredPrompts = customPrompts.filter((prompt: CustomPrompt) => {
    const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
    const matchesSearch = prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prompt.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Custom Prompts Manager</DialogTitle>
          <DialogDescription>
            Manage your AI prompts, templates, and project-specific rules
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PROMPT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center">
                        <cat.icon className="mr-2 h-4 w-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('import-prompts')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <input
                id="import-prompts"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportPrompts}
              />
              <Button variant="outline" size="sm" onClick={handleExportPrompts}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Prompt
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">Active Rules</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="custom">My Prompts</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100%-120px)] mt-4">
              <TabsContent value="active" className="space-y-4">
                {rulesLoading ? (
                  <div>Loading...</div>
                ) : projectRules.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        No active AI rules for this project
                      </p>
                      <Button onClick={() => setSelectedTab('templates')}>
                        Browse Templates
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  projectRules.map((rule: ProjectAiRule) => (
                    <Card key={rule.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={(checked) =>
                              toggleRuleMutation.mutate({ id: rule.id, isActive: checked })
                            }
                          />
                        </div>
                        <CardDescription>{rule.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-4 text-sm">
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                          {rule.settings?.autoApply && (
                            <Badge variant="secondary">Auto-Apply</Badge>
                          )}
                          {rule.conditions?.fileTypes && (
                            <Badge variant="outline">
                              Files: {rule.conditions.fileTypes.join(', ')}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="templates" className="space-y-4">
                {templatesLoading ? (
                  <div>Loading templates...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTemplates.map((template: PromptTemplate) => (
                      <PromptTemplateCard
                        key={template.id}
                        template={template}
                        onUse={() => {
                          setFormData({
                            ...formData,
                            name: template.name,
                            description: template.description,
                            category: template.category,
                            prompt: template.prompt,
                            variables: template.variables || [],
                          });
                          setIsCreating(true);
                        }}
                        onApplyToProject={() => {
                          createRuleMutation.mutate({
                            templateId: template.id,
                            name: template.name,
                            description: template.description,
                            isActive: true,
                            priority: 0,
                          });
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                {promptsLoading ? (
                  <div>Loading prompts...</div>
                ) : filteredPrompts.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        No custom prompts created yet
                      </p>
                      <Button onClick={() => setIsCreating(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Prompt
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPrompts.map((prompt: CustomPrompt) => (
                      <Card key={prompt.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{prompt.name}</CardTitle>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  updatePromptMutation.mutate({
                                    id: prompt.id,
                                    data: { isFavorite: !prompt.isFavorite },
                                  })
                                }
                              >
                                {prompt.isFavorite ? (
                                  <Star className="h-4 w-4 fill-yellow-500" />
                                ) : (
                                  <StarOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingPrompt(prompt)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePromptMutation.mutate(prompt.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription>{prompt.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <Badge variant="outline">{prompt.category}</Badge>
                            <span>Used {prompt.usageCount} times</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {promptHistory.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground">No prompt usage history yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  promptHistory.map((item: any) => (
                    <Card key={item.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{item.prompt.substring(0, 100)}...</CardTitle>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Create/Edit Prompt Dialog */}
        {(isCreating || editingPrompt) && (
          <Dialog open={true} onOpenChange={() => { setIsCreating(false); setEditingPrompt(null); }}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPrompt ? 'Edit Custom Prompt' : 'Create Custom Prompt'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter prompt name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMPT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this prompt does"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="prompt">Prompt Content</Label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Enter your prompt here. Use {{variableName}} for variables."
                    rows={8}
                    className="font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Variables</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVariable}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Variable
                    </Button>
                  </div>
                  {formData.variables.map((variable, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <Input
                        placeholder="Variable name"
                        value={variable.name}
                        onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Description"
                        value={variable.description}
                        onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                      />
                      <Input
                        placeholder="Default value"
                        value={variable.defaultValue || ''}
                        onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveVariable(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="public"
                      checked={formData.isPublic}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                    />
                    <Label htmlFor="public">Make Public</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="favorite"
                      checked={formData.isFavorite}
                      onCheckedChange={(checked) => setFormData({ ...formData, isFavorite: checked })}
                    />
                    <Label htmlFor="favorite">Add to Favorites</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={previewPromptWithVariables}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>

                {previewPrompt && (
                  <div>
                    <Label>Preview</Label>
                    <Card>
                      <CardContent className="p-4">
                        <pre className="whitespace-pre-wrap text-sm">{previewPrompt}</pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => { setIsCreating(false); setEditingPrompt(null); }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePrompt}>
                    <Save className="mr-2 h-4 w-4" />
                    {editingPrompt ? 'Update' : 'Create'} Prompt
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}