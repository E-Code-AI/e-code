import { useEffect, useRef, useCallback } from 'react';
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
  const settingsRef = useRef<AudioNotificationSettings>(getStoredSettings());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioRef.current.complete = new Audio(AUDIO_URLS.complete);
    audioRef.current.complete.volume = settingsRef.current.volume;
    audioRef.current.complete.preload = 'auto';

    audioRef.current.error = new Audio(AUDIO_URLS.error);
    audioRef.current.error.volume = settingsRef.current.volume;
    audioRef.current.error.preload = 'auto';

    return () => {
      audioRef.current.complete?.pause();
      audioRef.current.error?.pause();
    };
  }, []);

  const playSound = useCallback((type: 'complete' | 'error') => {
    if (prefersReducedMotion) return;
    if (!settingsRef.current.enabled) return;

    const audio = audioRef.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = settingsRef.current.volume;
      audio.play().catch(() => {
        // Ignore autoplay errors (user hasn't interacted yet)
      });
    }
  }, [prefersReducedMotion]);

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
    settingsRef.current.enabled = enabled;
    saveSettings(settingsRef.current);
  }, []);

  const setVolume = useCallback((volume: number) => {
    settingsRef.current.volume = Math.max(0, Math.min(1, volume));
    saveSettings(settingsRef.current);
    if (audioRef.current.complete) {
      audioRef.current.complete.volume = settingsRef.current.volume;
    }
    if (audioRef.current.error) {
      audioRef.current.error.volume = settingsRef.current.volume;
    }
  }, []);

  const isEnabled = useCallback(() => settingsRef.current.enabled, []);
  const getVolume = useCallback(() => settingsRef.current.volume, []);

  return {
    setEnabled,
    setVolume,
    isEnabled,
    getVolume,
    playSound,
  };
}
