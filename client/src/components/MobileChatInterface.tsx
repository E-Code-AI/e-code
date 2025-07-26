import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Send, Paperclip, Mic, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { QUICK_SUGGESTIONS } from '@/constants/brand';

interface MobileChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBuilding: (description: string) => void;
}

export function MobileChatInterface({ isOpen, onClose, onStartBuilding }: MobileChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onStartBuilding(message);
      setMessage('');
    }
  };

  // Use first 3 suggestions
  const quickSuggestions = QUICK_SUGGESTIONS.slice(0, 3);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="h-full flex flex-col">
        {/* Header matching Replit design */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
              {user ? (user.displayName || user.username || 'You').slice(0, 2).toUpperCase() : 'GU'}
            </div>
            <span className="font-medium text-foreground">
              {user ? `${user.displayName || user.username || 'Your'}'s workspace` : "Guest's workspace"}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Chat Interface - Centered like Replit */}
        <div className="flex-1 flex flex-col justify-center p-4 md:p-8 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold mb-2 text-foreground">
              Hi {user ? (user.displayName || user.username || 'there') : 'there'},
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground">
              what do you want to make?
            </p>
          </div>

          {/* Input Card */}
          <Card className="p-4 md:p-6 shadow-lg border">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe a website or app you want to make..."
                className="w-full min-h-[120px] md:min-h-[160px] text-base md:text-lg resize-none border-none focus:ring-0 focus:border-none bg-transparent p-0 outline-none placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="p-2">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button 
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Start chat
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick suggestions */}
          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground text-center">Try these ideas:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickSuggestions.map((suggestion, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom navigation matching Replit mobile design */}
        <div className="border-t p-4 bg-background">
          <div className="flex justify-around max-w-sm mx-auto">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">My Apps</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">+</span>
              </div>
              <span className="text-xs font-medium text-foreground">Create</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-muted-foreground rounded-full" />
              </div>
              <span className="text-xs text-muted-foreground">Account</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}