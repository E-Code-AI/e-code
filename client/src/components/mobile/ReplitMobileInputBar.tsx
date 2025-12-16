import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronUp, Paperclip, Mic, Zap, Settings2, ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
}

const BuildModeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <circle cx="7" cy="7" r="2.5" />
    <circle cx="17" cy="7" r="2.5" />
    <circle cx="7" cy="17" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
  </svg>
);

export function ReplitMobileInputBar({
  placeholder = "Make, test, iterate...",
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
}: ReplitMobileInputBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim() && !disabled && !isLoading) {
      onSubmit?.(inputValue.trim());
      setInputValue("");
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleBuildModeClick = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setShowBuildMenu(!showBuildMenu);
  };

  const selectBuildMode = (mode: BuildMode) => {
    onBuildModeChange?.(mode);
    setShowBuildMenu(false);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const hasContent = inputValue.trim().length > 0;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 px-3 pb-2 mobile-safe-bottom">
      <motion.div
        className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 500 }}
      >
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              "w-full px-4 pt-3 pb-12 text-sm resize-none bg-transparent",
              "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
              "focus:outline-none min-h-[48px] max-h-[120px]",
              (disabled || isLoading) && "opacity-50 cursor-not-allowed"
            )}
            data-testid="input-agent-message"
          />
          
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <motion.button
                onClick={handleBuildModeClick}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  "bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#3A3A3A]",
                  "text-gray-700 dark:text-gray-300"
                )}
                whileTap={{ scale: 0.95 }}
                data-testid="button-build-mode"
              >
                <BuildModeIcon />
                <span className="capitalize">{buildMode}</span>
                <ChevronUp className={cn(
                  "h-3 w-3 transition-transform",
                  showBuildMenu && "rotate-180"
                )} />
              </motion.button>

              <motion.button
                onClick={onAttach}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
                whileTap={{ scale: 0.92 }}
                data-testid="button-attach"
              >
                <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </motion.button>

              <motion.button
                onClick={onVoice}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
                whileTap={{ scale: 0.92 }}
                data-testid="button-voice"
              >
                <Mic className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </motion.button>
            </div>

            <div className="flex items-center gap-1">
              <motion.button
                onClick={onQuickActions}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
                whileTap={{ scale: 0.92 }}
                data-testid="button-quick-actions"
              >
                <Zap className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </motion.button>

              <motion.button
                onClick={onSettings}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
                whileTap={{ scale: 0.92 }}
                data-testid="button-settings"
              >
                <Settings2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </motion.button>

              <motion.button
                onClick={handleSubmit}
                disabled={!hasContent || disabled || isLoading}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  hasContent && !disabled && !isLoading
                    ? "bg-[#F59E0B] hover:bg-[#D97706] text-white"
                    : "bg-gray-100 dark:bg-[#2A2A2A] text-gray-400"
                )}
                whileTap={{ scale: 0.92 }}
                data-testid="button-send"
              >
                <ArrowUp className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {showBuildMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="p-2 space-y-1">
              {(['build', 'edit', 'chat'] as BuildMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => selectBuildMode(mode)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm rounded-lg transition-colors",
                    buildMode === mode
                      ? "bg-[#7C65C1]/10 text-[#7C65C1]"
                      : "hover:bg-gray-100 dark:hover:bg-[#2A2A2A] text-gray-700 dark:text-gray-300"
                  )}
                  data-testid={`mode-${mode}`}
                >
                  <span className="capitalize font-medium">{mode}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {mode === 'build' && '- Create new features'}
                    {mode === 'edit' && '- Modify existing code'}
                    {mode === 'chat' && '- Ask questions'}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
