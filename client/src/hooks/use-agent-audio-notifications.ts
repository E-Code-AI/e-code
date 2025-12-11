import { useEffect, useRef, useCallback, useState } from 'react';
import { AgentEventBus } from '@/lib/agentEvents';
import { useReducedMotion } from './use-reduced-motion';

const AUDIO_URLS = {
  complete: '/assets/agent-sfx/complete.mp3',
  error: '/assets/agent-sfx/error.mp3',
};

interface AudioNotificationSettings {
  enabled: boolean;
  volume: number;
}

const STORAGE_KEY = 'agent-audio-notifications';

function getStoredSettings(): AudioNotificationSettings {
  if (typeof window === 'undefined') {
    return { enabled: false, volume: 0.5 };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { enabled: false, volume: 0.5 };
}

function saveSettings(settings: AudioNotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function useAgentAudioNotifications() {
  const prefersReducedMotion = useReducedMotion();
  const audioRef = useRef<{ complete: HTMLAudioElement | null; error: HTMLAudioElement | null }>({
    complete: null,
    error: null,
  });
  
  // Use state for enabled to trigger re-renders when toggled
  const [isEnabled, setIsEnabledState] = useState(() => getStoredSettings().enabled);
  const volumeRef = useRef(getStoredSettings().volume);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create audio elements
    const completeAudio = new Audio(AUDIO_URLS.complete);
    completeAudio.volume = volumeRef.current;
    completeAudio.preload = 'auto';
    audioRef.current.complete = completeAudio;

    const errorAudio = new Audio(AUDIO_URLS.error);
    errorAudio.volume = volumeRef.current;
    errorAudio.preload = 'auto';
    audioRef.current.error = errorAudio;

    return () => {
      // Full cleanup: pause, remove src, and null refs
      if (audioRef.current.complete) {
        audioRef.current.complete.pause();
        audioRef.current.complete.src = '';
        audioRef.current.complete = null;
      }
      if (audioRef.current.error) {
        audioRef.current.error.pause();
        audioRef.current.error.src = '';
        audioRef.current.error = null;
      }
    };
  }, []);

  const playSound = useCallback((type: 'complete' | 'error') => {
    if (prefersReducedMotion) return;
    if (!isEnabled) return;

    const audio = audioRef.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volumeRef.current;
      audio.play().catch(() => {
        // Ignore autoplay errors (user hasn't interacted yet)
      });
    }
  }, [prefersReducedMotion, isEnabled]);

  useEffect(() => {
    const unsubComplete = AgentEventBus.on('agent:complete', () => {
      playSound('complete');
    });

    const unsubError = AgentEventBus.on('agent:error', () => {
      playSound('error');
    });

    return () => {
      unsubComplete();
      unsubError();
    };
  }, [playSound]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    saveSettings({ enabled, volume: volumeRef.current });
  }, []);

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    saveSettings({ enabled: isEnabled, volume: volumeRef.current });
    if (audioRef.current.complete) {
      audioRef.current.complete.volume = volumeRef.current;
    }
    if (audioRef.current.error) {
      audioRef.current.error.volume = volumeRef.current;
    }
  }, [isEnabled]);

  const getVolume = useCallback(() => volumeRef.current, []);

  return {
    isEnabled,
    setEnabled,
    setVolume,
    getVolume,
    playSound,
  };
}
