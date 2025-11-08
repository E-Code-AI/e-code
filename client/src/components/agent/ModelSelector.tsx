import { Check, ChevronsUpDown, Sparkles, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Model {
  id: string;
  name: string;
  description: string;
  category: 'gpt' | 'claude' | 'gemini';
  capabilities: {
    extendedThinking: boolean;
    codeGeneration: boolean;
    maxTokens: number;
    speed: 'fast' | 'medium' | 'slow';
    cost: 'low' | 'medium' | 'high';
  };
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

const categoryIcons = {
  gpt: Sparkles,
  claude: Brain,
  gemini: Zap,
};

const categoryColors = {
  gpt: 'text-green-500',
  claude: 'text-purple-500',
  gemini: 'text-blue-500',
};

export function ModelSelector({ selectedModel, onModelChange, className }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['/api/agent/models'],
  });

  const models: Model[] = modelsData?.models || [];
  const selected = models.find(m => m.id === selectedModel);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between w-full sm:w-[280px]", className)}
          data-testid="button-select-model"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selected && categoryIcons[selected.category] && (
              <span className={categoryColors[selected.category]}>
                {(() => {
                  const Icon = categoryIcons[selected.category];
                  return <Icon className="h-4 w-4" />;
                })()}
              </span>
            )}
            <span className="truncate">
              {selected ? selected.name : 'Select model...'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models..." data-testid="input-search-models" />
          <CommandEmpty>No models found.</CommandEmpty>
          
          {/* GPT Models */}
          <CommandGroup heading="OpenAI GPT">
            {models
              .filter(m => m.category === 'gpt')
              .map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => {
                    onModelChange(model.id);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 p-3"
                  data-testid={`model-option-${model.id}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          selectedModel === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Sparkles className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{model.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {model.capabilities.extendedThinking && (
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="h-3 w-3 mr-1" />
                          Thinking
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          model.capabilities.speed === 'fast' && "border-green-500 text-green-500",
                          model.capabilities.speed === 'medium' && "border-yellow-500 text-yellow-500",
                          model.capabilities.speed === 'slow' && "border-red-500 text-red-500"
                        )}
                      >
                        {model.capabilities.speed}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {model.description}
                  </p>
                  <div className="flex gap-2 ml-6 mt-1 text-xs text-muted-foreground">
                    <span>{model.capabilities.maxTokens.toLocaleString()} tokens</span>
                    <span>•</span>
                    <span>Cost: {model.capabilities.cost}</span>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>

          {/* Claude Models */}
          <CommandGroup heading="Anthropic Claude">
            {models
              .filter(m => m.category === 'claude')
              .map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => {
                    onModelChange(model.id);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 p-3"
                  data-testid={`model-option-${model.id}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          selectedModel === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Brain className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">{model.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {model.capabilities.extendedThinking && (
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="h-3 w-3 mr-1" />
                          Thinking
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          model.capabilities.speed === 'fast' && "border-green-500 text-green-500",
                          model.capabilities.speed === 'medium' && "border-yellow-500 text-yellow-500",
                          model.capabilities.speed === 'slow' && "border-red-500 text-red-500"
                        )}
                      >
                        {model.capabilities.speed}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {model.description}
                  </p>
                  <div className="flex gap-2 ml-6 mt-1 text-xs text-muted-foreground">
                    <span>{model.capabilities.maxTokens.toLocaleString()} tokens</span>
                    <span>•</span>
                    <span>Cost: {model.capabilities.cost}</span>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>

          {/* Gemini Models */}
          <CommandGroup heading="Google Gemini">
            {models
              .filter(m => m.category === 'gemini')
              .map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.id}
                  onSelect={() => {
                    onModelChange(model.id);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 p-3"
                  data-testid={`model-option-${model.id}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          selectedModel === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{model.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {model.capabilities.extendedThinking && (
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="h-3 w-3 mr-1" />
                          Thinking
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          model.capabilities.speed === 'fast' && "border-green-500 text-green-500",
                          model.capabilities.speed === 'medium' && "border-yellow-500 text-yellow-500",
                          model.capabilities.speed === 'slow' && "border-red-500 text-red-500"
                        )}
                      >
                        {model.capabilities.speed}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {model.description}
                  </p>
                  <div className="flex gap-2 ml-6 mt-1 text-xs text-muted-foreground">
                    <span>{model.capabilities.maxTokens.toLocaleString()} tokens</span>
                    <span>•</span>
                    <span>Cost: {model.capabilities.cost}</span>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
