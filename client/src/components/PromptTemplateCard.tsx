// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Star,
  Copy,
  Zap,
  ChevronDown,
  Code,
  Bug,
  FileText,
  RefreshCw,
  FileCode,
  Shield,
  Layers,
  HelpCircle,
  Users,
  Lock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  GitBranch,
  Cpu,
  PaintBucket,
} from 'lucide-react';

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

interface PromptTemplateCardProps {
  template: PromptTemplate;
  onUse: (template: PromptTemplate) => void;
  onApplyToProject: (template: PromptTemplate) => void;
  onRate?: (templateId: number, rating: number) => void;
  showFullDetails?: boolean;
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  code_generation: Code,
  debugging: Bug,
  documentation: FileText,
  refactoring: RefreshCw,
  testing: FileCode,
  performance: Zap,
  security: Shield,
  architecture: Layers,
  design: PaintBucket,
  optimization: Cpu,
  collaboration: GitBranch,
  other: HelpCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  code_generation: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  debugging: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  documentation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  refactoring: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  testing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  performance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  security: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  architecture: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  design: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  optimization: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  collaboration: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function PromptTemplateCard({
  template,
  onUse,
  onApplyToProject,
  onRate,
  showFullDetails = false,
}: PromptTemplateCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [userRating, setUserRating] = React.useState<number | null>(null);

  const CategoryIcon = CATEGORY_ICONS[template.category] || CATEGORY_ICONS.other;
  const categoryColor = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.other;

  const handleRate = (rating: number) => {
    setUserRating(rating);
    if (onRate) {
      onRate(template.id, rating);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatPromptPreview = (prompt: string) => {
    const lines = prompt.split('\n');
    const preview = lines.slice(0, 3).join('\n');
    return preview.length > 150 ? preview.substring(0, 150) + '...' : preview;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CategoryIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {template.isSystem && (
                <Badge variant="secondary" className="ml-2">
                  <Lock className="h-3 w-3 mr-1" />
                  System
                </Badge>
              )}
              {template.isPublic && (
                <Badge variant="outline" className="ml-1">
                  <Users className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm">{template.description}</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <Badge className={`${categoryColor} text-xs`}>
            {template.category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{template.usageCount} uses</span>
          </div>
          {template.rating > 0 && (
            <div className="flex items-center gap-1">
              {renderStars(Math.round(template.rating))}
              <span className="text-xs text-muted-foreground">({template.rating.toFixed(1)})</span>
            </div>
          )}
        </div>

        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="space-y-3">
            {/* Prompt Preview */}
            <div>
              <h4 className="text-sm font-medium mb-1">Prompt Preview</h4>
              <div className="bg-muted/50 p-3 rounded-md">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {isExpanded ? template.prompt : formatPromptPreview(template.prompt)}
                </pre>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                <ChevronDown
                  className={`h-4 w-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
                {isExpanded ? 'Show Less' : 'Show More Details'}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3">
              {/* Variables */}
              {template.variables && template.variables.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Variables</h4>
                  <div className="space-y-2">
                    {template.variables.map((variable, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 p-2 rounded-md text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <code className="font-mono text-primary">
                            {`{{${variable.name}}}`}
                          </code>
                          {variable.defaultValue && (
                            <span className="text-muted-foreground">
                              Default: {variable.defaultValue}
                            </span>
                          )}
                        </div>
                        {variable.description && (
                          <p className="text-muted-foreground mt-1">
                            {variable.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Examples */}
              {template.examples && template.examples.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Examples</h4>
                  <div className="space-y-2">
                    {template.examples.map((example, index) => (
                      <div key={index} className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs">
                          <div className="mb-2">
                            <span className="font-medium">Input:</span>
                            <pre className="mt-1 font-mono text-muted-foreground whitespace-pre-wrap">
                              {example.input}
                            </pre>
                          </div>
                          <div>
                            <span className="font-medium">Output:</span>
                            <pre className="mt-1 font-mono text-muted-foreground whitespace-pre-wrap">
                              {example.output}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Created By */}
              {template.createdBy && (
                <div className="text-xs text-muted-foreground">
                  Created by {template.createdBy}
                </div>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-0">
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => onUse(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy this template to create your own custom prompt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onApplyToProject(template)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Apply to Project
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Apply this template as an AI rule for the current project</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {onRate && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant={userRating === 1 ? 'destructive' : 'ghost'}
              className="h-8 w-8"
              onClick={() => handleRate(1)}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={userRating === 5 ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => handleRate(5)}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}