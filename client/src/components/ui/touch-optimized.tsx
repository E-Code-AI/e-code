import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsTouch, useIsMobile } from '@/hooks/use-responsive';

interface TouchOptimizedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  haptic?: boolean;
}

export function TouchOptimizedButton({
  children,
  onClick,
  className,
  disabled = false,
  variant = 'default',
  size = 'md',
  haptic = true,
}: TouchOptimizedButtonProps) {
  const isTouch = useIsTouch();
  const isMobile = useIsMobile();
  const [isPressed, setIsPressed] = useState(false);
  const touchStartTime = useRef<number>(0);

  const baseClasses = cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    // Enhanced touch targets for mobile
    isTouch && 'min-h-[44px] min-w-[44px]',
    // Active state for better feedback
    isPressed && 'scale-95 brightness-90',
    className
  );

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  const sizeClasses = {
    sm: isTouch ? 'h-11 px-4 text-sm' : 'h-9 px-3 text-sm',
    md: isTouch ? 'h-12 px-6' : 'h-10 px-4',
    lg: isTouch ? 'h-14 px-8 text-lg' : 'h-11 px-8',
  };

  const handleTouchStart = () => {
    setIsPressed(true);
    touchStartTime.current = Date.now();
    
    // Haptic feedback
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    
    // Only trigger click if it was a quick tap (< 500ms)
    const touchDuration = Date.now() - touchStartTime.current;
    if (touchDuration < 500 && onClick && !disabled) {
      onClick();
    }
  };

  const handleClick = () => {
    if (!isTouch && onClick && !disabled) {
      onClick();
    }
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size])}
      onTouchStart={isTouch ? handleTouchStart : undefined}
      onTouchEnd={isTouch ? handleTouchEnd : undefined}
      onClick={handleClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}

interface TouchOptimizedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  type?: 'text' | 'password' | 'email' | 'search';
  autoFocus?: boolean;
  onEnter?: () => void;
}

export function TouchOptimizedInput({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  type = 'text',
  autoFocus = false,
  onEnter,
}: TouchOptimizedInputProps) {
  const isTouch = useIsTouch();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  const baseClasses = cn(
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    // Enhanced touch targets
    isTouch && 'min-h-[44px] text-base', // 16px font size prevents zoom on iOS
    isMobile && 'text-[16px]', // Prevent iOS zoom
    className
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };

  // Auto-focus handling for mobile
  useEffect(() => {
    if (autoFocus && !isMobile && inputRef.current) {
      // Only auto-focus on desktop to avoid unwanted keyboard popup
      inputRef.current.focus();
    }
  }, [autoFocus, isMobile]);

  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={baseClasses}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      autoComplete={type === 'password' ? 'current-password' : 'off'}
      spellCheck={type === 'search' || type === 'text'}
    />
  );
}

interface TouchOptimizedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
  autoResize?: boolean;
}

export function TouchOptimizedTextarea({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  rows = 4,
  autoResize = false,
}: TouchOptimizedTextareaProps) {
  const isTouch = useIsTouch();
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const baseClasses = cn(
    'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    // Enhanced for touch
    isTouch && 'min-h-[88px] text-base',
    isMobile && 'text-[16px]', // Prevent iOS zoom
    className
  );

  // Auto-resize functionality
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, autoResize]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={baseClasses}
      disabled={disabled}
      rows={rows}
      spellCheck={true}
    />
  );
}

interface SwipeGestureProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export function SwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className,
}: SwipeGestureProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isTouch = useIsTouch();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouch) return;
    
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTouch || !touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if it's a swipe gesture
    if (Math.max(absDeltaX, absDeltaY) < threshold) return;

    // Determine direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    touchStart.current = null;
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}