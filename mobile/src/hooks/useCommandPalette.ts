import { useCallback, useEffect, useRef, useState } from 'react';
import { commandRegistry, Command, CommandCategory } from '../services/command-registry';

interface UseCommandPaletteOptions {
  onNavigate?: (screen: string, params?: any) => void;
  onAction?: (actionId: string, params?: any) => void;
  enableShakeToOpen?: boolean;
}

interface UseCommandPaletteResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCommands: Command[];
  recentCommands: Command[];
  executeCommand: (commandId: string) => void;
  commandsByCategory: Record<CommandCategory, Command[]>;
}

const SHAKE_THRESHOLD = 2.5;
const SHAKE_DEBOUNCE_MS = 1000;

export function useCommandPalette(options: UseCommandPaletteOptions = {}): UseCommandPaletteResult {
  const { onNavigate, onAction, enableShakeToOpen = false } = options;
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [recentCommands, setRecentCommands] = useState<Command[]>([]);
  
  const lastShakeTime = useRef(0);
  const subscriptionRef = useRef<any>(null);

  // Initialize command registry with navigation handlers
  useEffect(() => {
    commandRegistry.setOptions({ onNavigate, onAction });
    setRecentCommands(commandRegistry.getRecentCommands());
  }, [onNavigate, onAction]);

  // Update filtered commands when search query changes
  useEffect(() => {
    const results = commandRegistry.search(searchQuery);
    setFilteredCommands(results);
  }, [searchQuery]);

  // Shake detection (optional - requires react-native-sensors)
  useEffect(() => {
    if (!enableShakeToOpen) return;

    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;

    const handleAccelerometer = ({ x, y, z }: { x: number; y: number; z: number }) => {
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);

      const acceleration = deltaX + deltaY + deltaZ;

      if (acceleration > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime.current > SHAKE_DEBOUNCE_MS) {
          lastShakeTime.current = now;
          setIsOpen(prev => !prev);
        }
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    const initShakeDetection = async () => {
      try {
        const { Accelerometer } = await import('react-native-sensors');
        subscriptionRef.current = Accelerometer.subscribe(handleAccelerometer);
      } catch (error) {
        console.warn('Shake detection not available (react-native-sensors may not be installed):', error);
      }
    };

    initShakeDetection();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [enableShakeToOpen]);

  const open = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
    setRecentCommands(commandRegistry.getRecentCommands());
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const executeCommand = useCallback((commandId: string) => {
    commandRegistry.executeCommand(commandId);
    setRecentCommands(commandRegistry.getRecentCommands());
    close();
  }, [close]);

  const commandsByCategory: Record<CommandCategory, Command[]> = {
    files: filteredCommands.filter(c => c.category === 'files'),
    actions: filteredCommands.filter(c => c.category === 'actions'),
    navigation: filteredCommands.filter(c => c.category === 'navigation'),
    ai: filteredCommands.filter(c => c.category === 'ai'),
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    searchQuery,
    setSearchQuery,
    filteredCommands,
    recentCommands,
    executeCommand,
    commandsByCategory,
  };
}
