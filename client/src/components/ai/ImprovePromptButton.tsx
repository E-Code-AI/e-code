import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useToast } from '@/hooks/use-toast';

interface ImprovePromptButtonProps {
  currentPrompt: string;
  onPromptUpdate: (newPrompt: string) => void;
  disabled?: boolean;
}

export function ImprovePromptButton({ 
  currentPrompt, 
  onPromptUpdate, 
  disabled = false 
}: ImprovePromptButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [improvements, setImprovements] = useState<string[]>([]);
  const { toast } = useToast();
  
  const isEnabled = useFeatureFlag('aiUx.improvePrompt');
  
  if (!isEnabled) return null;
  
  const handleImprovePrompt = async () => {
    if (!currentPrompt.trim()) {
      toast({
        title: "No prompt to improve",
        description: "Please enter a prompt first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsOpen(true);
    setIsImproving(true);
    
    try {
      const response = await fetch('/api/ai/improve-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: currentPrompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to improve prompt');
      }
      
      const result = await response.json();
      setImprovedPrompt(result.improvedPrompt);
      setImprovements(result.improvements || []);
    } catch (error) {
      console.error('Error improving prompt:', error);
      toast({
        title: "Error improving prompt",
        description: "Please try again later.",
        variant: "destructive",
      });
      setIsOpen(false);
    } finally {
      setIsImproving(false);
    }
  };
  
  const handleAcceptChanges = () => {
    onPromptUpdate(improvedPrompt);
    setIsOpen(false);
    toast({
      title: "Prompt improved",
      description: "Your prompt has been updated with AI suggestions.",
    });
  };
  
  const handleReject = () => {
    setIsOpen(false);
    setImprovedPrompt('');
    setImprovements([]);
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleImprovePrompt}
        disabled={disabled || !currentPrompt.trim()}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Improve Prompt
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Improve Your Prompt</DialogTitle>
          </DialogHeader>
          
          {isImproving ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Analyzing and improving your prompt...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Improvements Summary */}
              {improvements.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Suggested Improvements:</h3>
                  <div className="flex flex-wrap gap-2">
                    {improvements.map((improvement, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {improvement}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Diff View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2 text-red-600">Original Prompt</h3>
                  <Textarea
                    value={currentPrompt}
                    readOnly
                    className="min-h-[200px] font-mono text-sm border-red-200"
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2 text-green-600">Improved Prompt</h3>
                  <Textarea
                    value={improvedPrompt}
                    onChange={(e) => setImprovedPrompt(e.target.value)}
                    className="min-h-[200px] font-mono text-sm border-green-200"
                    placeholder="Improved prompt will appear here..."
                  />
                </div>
              </div>
              
              {/* Character count */}
              <div className="flex justify-between text-xs text-gray-500">
                <span>Original: {currentPrompt.length} characters</span>
                <span>Improved: {improvedPrompt.length} characters</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleReject}
              disabled={isImproving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAcceptChanges}
              disabled={isImproving || !improvedPrompt.trim()}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Accept Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}