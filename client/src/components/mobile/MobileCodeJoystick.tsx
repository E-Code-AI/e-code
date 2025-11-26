/**
 * MobileCodeJoystick - Replit-style Joystick Navigation Control
 * Provides drag navigation for mobile code editing:
 * - Drag up/down to scroll through code quickly
 * - Swipe left/right or tap arrows to nudge cursor
 * - Multi-tap selection: tap (token) → tap (line) → tap (expand)
 * 
 * Matches Replit mobile app joystick control exactly
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  MousePointer2, Type, Rows3, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileCodeJoystickProps {
  onScroll?: (direction: 'up' | 'down', velocity: number) => void;
  onCursorMove?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onSelect?: (mode: 'token' | 'line' | 'block') => void;
  onToggle?: () => void;
  isVisible?: boolean;
  className?: string;
}

type SelectionMode = 'none' | 'token' | 'line' | 'block';

export function MobileCodeJoystick({
  onScroll,
  onCursorMove,
  onSelect,
  onToggle,
  isVisible = true,
  className
}: MobileCodeJoystickProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [tapCount, setTapCount] = useState(0);
  const lastTapTimeRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle multi-tap selection
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    if (timeSinceLastTap < 300) {
      // Quick successive tap - advance selection mode
      const nextTap = tapCount + 1;
      setTapCount(nextTap);
      
      if (nextTap === 1) {
        setSelectionMode('token');
        onSelect?.('token');
      } else if (nextTap === 2) {
        setSelectionMode('line');
        onSelect?.('line');
      } else if (nextTap >= 3) {
        setSelectionMode('block');
        onSelect?.('block');
        setTapCount(0);
      }
    } else {
      // First tap in new sequence
      setTapCount(1);
      setSelectionMode('token');
      onSelect?.('token');
    }

    // Reset after delay
    tapTimeoutRef.current = setTimeout(() => {
      setTapCount(0);
      setSelectionMode('none');
    }, 500);
  }, [tapCount, onSelect]);

  // Handle touch/drag start
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Handle touch/drag move
  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;

    const touch = 'touches' in e ? e.touches[0] : e;
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const offsetX = Math.max(-30, Math.min(30, touch.clientX - centerX));
    const offsetY = Math.max(-30, Math.min(30, touch.clientY - centerY));
    
    setDragOffset({ x: offsetX, y: offsetY });

    // Calculate velocity based on offset
    const velocity = Math.abs(offsetY) / 30;
    
    if (Math.abs(offsetY) > 10) {
      onScroll?.(offsetY < 0 ? 'up' : 'down', velocity);
    }
  }, [isDragging, onScroll]);

  // Handle touch/drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Arrow button handlers
  const handleArrowPress = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    onCursorMove?.(direction);
  }, [onCursorMove]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  if (!isVisible) return null;

  const selectionIcons = {
    none: MousePointer2,
    token: Type,
    line: Rows3,
    block: Square
  };
  const SelectionIcon = selectionIcons[selectionMode];

  return (
    <div 
      className={cn(
        "fixed bottom-24 right-4 z-50 flex flex-col items-center gap-2",
        className
      )}
      data-testid="mobile-code-joystick"
    >
      {/* Selection mode indicator */}
      {selectionMode !== 'none' && (
        <div className="bg-primary/10 text-primary px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1">
          <SelectionIcon className="w-3 h-3" />
          {selectionMode}
        </div>
      )}

      {/* Up arrow */}
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg"
        onTouchStart={() => handleArrowPress('up')}
        onClick={() => handleArrowPress('up')}
        data-testid="joystick-up"
      >
        <ChevronUp className="w-5 h-5" />
      </Button>

      {/* Middle row: Left - Joystick - Right */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg"
          onTouchStart={() => handleArrowPress('left')}
          onClick={() => handleArrowPress('left')}
          data-testid="joystick-left"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Main joystick */}
        <div
          ref={joystickRef}
          className={cn(
            "w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10",
            "border-2 border-primary/30 shadow-xl",
            "flex items-center justify-center cursor-grab active:cursor-grabbing",
            "touch-none select-none",
            isDragging && "border-primary"
          )}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onClick={handleTap}
          data-testid="joystick-center"
        >
          {/* Inner joystick nub */}
          <div
            className={cn(
              "w-8 h-8 rounded-full bg-primary/40 shadow-inner",
              "transition-transform duration-75 ease-out",
              isDragging && "bg-primary/60"
            )}
            style={{
              transform: `translate(${dragOffset.x / 2}px, ${dragOffset.y / 2}px)`
            }}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg"
          onTouchStart={() => handleArrowPress('right')}
          onClick={() => handleArrowPress('right')}
          data-testid="joystick-right"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Down arrow */}
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg"
        onTouchStart={() => handleArrowPress('down')}
        onClick={() => handleArrowPress('down')}
        data-testid="joystick-down"
      >
        <ChevronDown className="w-5 h-5" />
      </Button>

      {/* Toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="text-[10px] text-muted-foreground"
        data-testid="joystick-toggle"
      >
        Hide
      </Button>
    </div>
  );
}

export default MobileCodeJoystick;
