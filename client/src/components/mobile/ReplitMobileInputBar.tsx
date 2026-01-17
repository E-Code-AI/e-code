import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { 
  ChevronUp, Paperclip, Mic, ArrowUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlashCommandMenu, DEFAULT_MCP_SERVERS, type MCPServer } from '../ai/SlashCommandMenu';

type BuildMode = 'build' | 'edit' | 'chat';

interface ReplitMobileInputBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  buildMode?: BuildMode;
  onBuildModeChange?: (mode: BuildMode) => void;
  onAttach?: () => void;
  onVoice?: () => void;
  onQuickActions?: () => void;
  onSettings?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  isWorking?: boolean;
  agentMode?: string;
  onSlashCommand?: () => void;
  onSlashSelect?: (server: MCPServer) => void;
}

const BuildModeIcon = memo(() => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <circle cx="7" cy="7" r="2.5" />
    <circle cx="17" cy="7" r="2.5" />
    <circle cx="7" cy="17" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
  </svg>
));
BuildModeIcon.displayName = 'BuildModeIcon';

export const ReplitMobileInputBar = memo(function ReplitMobileInputBar({
  placeholder,
  value = "",
  onChange,
  onSubmit,
  buildMode = 'build',
  onBuildModeChange,
  onAttach,
  onVoice,
  onQuickActions,
  onSettings,
  disabled = false,
  isLoading = false,
  isWorking = false,
  agentMode = 'build',
  onSlashCommand,
  onSlashSelect,
}: ReplitMobileInputBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync external value prop with internal state
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Dynamic placeholder based on agentMode
  const dynamicPlaceholder = placeholder || (
    agentMode === 'build' ? "What would you like me to build? Type / for integrations" :
    agentMode === 'edit' ? "Describe the changes you want to make..." :
    agentMode === 'chat' ? "Ask a question..." :
    "Make, test, iterate..."
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const prevValue = inputValue;
    
    // Detect "/" input for slash commands
    if (newValue.endsWith('/') && !prevValue.endsWith('/') && !showSlashMenu) {
      setShowSlashMenu(true);
      setSlashSearchQuery('');
      setSlashSelectedIndex(0);
      onSlashCommand?.();
    }
    
    // Update search query if slash menu is open
    if (showSlashMenu && newValue.includes('/')) {
      const slashIndex = newValue.lastIndexOf('/');
      const afterSlash = newValue.substring(slashIndex + 1);
      setSlashSearchQuery(afterSlash);
      setSlashSelectedIndex(0);
    }
    
    // Close menu if "/" is deleted
    if (showSlashMenu && !newValue.includes('/')) {
      setShowSlashMenu(false);
      setSlashSearchQuery('');
      setSlashSelectedIndex(0);
    }
    
    setInputValue(newValue);
    onChange?.(newValue);
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [onChange, inputValue, showSlashMenu, onSlashCommand]);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !disabled && !isLoading && !isWorking) {
      onSubmit?.(inputValue.trim());
      setInputValue("");
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  }, [inputValue, disabled, isLoading, isWorking, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle slash menu navigation
    if (showSlashMenu) {
      const filteredServers = DEFAULT_MCP_SERVERS.filter(server =>
        server.name.toLowerCase().includes(slashSearchQuery.toLowerCase()) ||
        server.description?.toLowerCase().includes(slashSearchQuery.toLowerCase())
      );
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        setSlashSearchQuery('');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex(prev => Math.min(prev + 1, filteredServers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredServers[slashSelectedIndex]) {
          handleSlashSelect(filteredServers[slashSelectedIndex]);
        }
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, showSlashMenu, slashSearchQuery, slashSelectedIndex]);

  const handleSlashSelect = useCallback((server: MCPServer) => {
    // Remove the "/" and any search query from input
    const slashIndex = inputValue.lastIndexOf('/');
    const beforeSlash = slashIndex > 0 ? inputValue.substring(0, slashIndex) : '';
    setInputValue(beforeSlash + `@${server.name} `);
    setShowSlashMenu(false);
    setSlashSearchQuery('');
    setSlashSelectedIndex(0);
    onSlashSelect?.(server);
    inputRef.current?.focus();
  }, [inputValue, onSlashSelect]);

  const handleBuildModeClick = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setShowBuildMenu(prev => !prev);
  }, []);

  const selectBuildMode = useCallback((mode: BuildMode) => {
    onBuildModeChange?.(mode);
    setShowBuildMenu(false);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [onBuildModeChange]);

  const hasContent = inputValue.trim().length > 0;
  const isDisabled = disabled || isLoading || isWorking;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 px-3 pb-2 mobile-safe-bottom">
      {/* Slash Command Menu - appears above input */}
      <SlashCommandMenu
        isOpen={showSlashMenu}
        onClose={() => {
          setShowSlashMenu(false);
          setSlashSearchQuery('');
          setSlashSelectedIndex(0);
        }}
        onSelect={handleSlashSelect}
        servers={DEFAULT_MCP_SERVERS}
        searchQuery={slashSearchQuery}
        onSearchChange={setSlashSearchQuery}
        selectedIndex={slashSelectedIndex}
      />
      
      <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={dynamicPlaceholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              "w-full px-4 pt-3 pb-12 text-[13px] resize-none bg-transparent",
              "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
              "focus:outline-none min-h-[48px] max-h-[120px]",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            data-testid="input-agent-message"
          />
          
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={handleBuildModeClick}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                  "bg-gray-100 dark:bg-[#2A2A2A] active:bg-gray-200 dark:active:bg-[#3A3A3A]",
                  "text-gray-700 dark:text-gray-300 active:scale-95 touch-manipulation"
                )}
                data-testid="button-build-mode"
              >
                <BuildModeIcon />
                <span className="capitalize">{buildMode}</span>
                <ChevronUp className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  showBuildMenu && "rotate-180"
                )} />
              </button>

              <button
                onClick={onAttach}
                className="p-2 rounded-lg active:bg-gray-100 dark:active:bg-[#2A2A2A] active:scale-95 transition-all touch-manipulation"
                data-testid="button-attach"
              >
                <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>

              <button
                onClick={onVoice}
                className="p-2 rounded-lg active:bg-gray-100 dark:active:bg-[#2A2A2A] active:scale-95 transition-all touch-manipulation"
                data-testid="button-voice"
              >
                <Mic className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleSubmit}
                disabled={!hasContent || isDisabled}
                className={cn(
                  "p-2 rounded-lg transition-all active:scale-95 touch-manipulation",
                  hasContent && !isDisabled
                    ? "bg-[#F59E0B] active:bg-[#D97706] text-white"
                    : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-400"
                )}
                data-testid="button-send"
              >
                {isWorking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {showBuildMenu && (
          <div className="border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
            <div className="p-2 space-y-1">
              {(['build', 'edit', 'chat'] as BuildMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => selectBuildMode(mode)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-[13px] rounded-lg transition-colors touch-manipulation",
                    buildMode === mode
                      ? "bg-[#7C65C1]/10 text-[#7C65C1]"
                      : "active:bg-gray-100 dark:active:bg-[#2A2A2A] text-gray-700 dark:text-gray-300"
                  )}
                  data-testid={`mode-${mode}`}
                >
                  <span className="capitalize font-medium">{mode}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-2">
                    {mode === 'build' && '- Create new features'}
                    {mode === 'edit' && '- Modify existing code'}
                    {mode === 'chat' && '- Ask questions'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
