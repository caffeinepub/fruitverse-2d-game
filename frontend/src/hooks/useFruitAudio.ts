import { useEffect, useRef, useState } from 'react';
import { useGetAllAudioMetadata } from './useQueries';

interface AudioHookReturn {
  playDrop: () => void;
  playMerge: () => void;
  playLevelUp: () => void;
  playLineClear: () => void;
  playGameOver: () => void;
  playBombExplode: () => void;
  playAlignmentPing: () => void;
  playScoreUp: () => void;
  playGameStart: () => void;
  playBoosterEarned: () => void;
  playMusic: () => void;
  toggleMusic: () => void;
  playEffect: (effectType: 'drop' | 'merge' | 'levelUp' | 'lineClear' | 'gameOver' | 'bombExplode' | 'alignmentPing' | 'scoreUp' | 'gameStart' | 'boosterEarned') => void;
  stopAll: () => void;
  isMusicOn: boolean;
  initializeAudio: () => void;
  isLoading: boolean;
}

/**
 * Custom hook for external MP3 audio system loaded from blob storage.
 * Loads MP3 files asynchronously from backend and plays them for game events.
 * Manages persistent isMusicOn state in localStorage with playMusic, toggleMusic, playEffect, and stopAll functions.
 */
export function useFruitAudio(username: string): AudioHookReturn {
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const [isMusicOn, setIsMusicOn] = useState<boolean>(() => {
    const stored = localStorage.getItem('fruitverse_music_enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const isInitializedRef = useRef(false);
  const { data: audioMetadata, isLoading } = useGetAllAudioMetadata();

  // Load all audio files from blob storage
  useEffect(() => {
    if (!audioMetadata || audioMetadata.length === 0) return;

    const loadAudio = async () => {
      for (const [id, metadata] of audioMetadata) {
        try {
          const url = metadata.blob.getDirectURL();
          const audio = new Audio(url);
          audio.preload = 'auto';
          
          // Special handling for background loop
          if (id === 'backgroundLoop') {
            audio.loop = true;
            audio.volume = 0.3;
            backgroundMusicRef.current = audio;
          } else {
            audio.volume = 0.5;
          }
          
          audioElementsRef.current.set(id, audio);
        } catch (error) {
          console.warn(`Failed to load audio ${id}:`, error);
        }
      }
    };

    loadAudio();

    return () => {
      // Cleanup all audio elements
      audioElementsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioElementsRef.current.clear();
      
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.src = '';
        backgroundMusicRef.current = null;
      }
    };
  }, [audioMetadata]);

  // Initialize audio context on first user interaction (respects autoplay policies)
  const initializeAudio = () => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
  };

  // Toggle music preference with persistent localStorage
  const toggleMusic = () => {
    const newMusicOn = !isMusicOn;
    setIsMusicOn(newMusicOn);
    localStorage.setItem('fruitverse_music_enabled', String(newMusicOn));

    if (!newMusicOn) {
      stopAll();
    } else {
      initializeAudio();
    }
  };

  // Play audio by ID
  const playAudio = (id: string) => {
    if (!isMusicOn) return;
    
    const audio = audioElementsRef.current.get(id);
    if (!audio) {
      console.warn(`Audio ${id} not found`);
      return;
    }

    try {
      initializeAudio();
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.warn(`Failed to play audio ${id}:`, error);
      });
    } catch (error) {
      console.warn(`Failed to play audio ${id}:`, error);
    }
  };

  // Play drop sound
  const playDrop = () => {
    playAudio('fruitDrop');
  };

  // Play merge sound
  const playMerge = () => {
    playAudio('fruitMerge');
  };

  // Play level up sound
  const playLevelUp = () => {
    playAudio('levelUp');
  };

  // Play line clear sound (using scoreUp as fallback)
  const playLineClear = () => {
    playAudio('scoreUp');
  };

  // Play game over sound
  const playGameOver = () => {
    playAudio('gameOver');
  };

  // Play bomb explode sound
  const playBombExplode = () => {
    playAudio('bombExplode');
  };

  // Play alignment ping sound
  const playAlignmentPing = () => {
    playAudio('alignmentPing');
  };

  // Play score up sound
  const playScoreUp = () => {
    playAudio('scoreUp');
  };

  // Play game start sound
  const playGameStart = () => {
    playAudio('gameStart');
  };

  // Play booster earned sound
  const playBoosterEarned = () => {
    playAudio('boosterEarned');
  };

  // Play background music loop
  const playMusic = () => {
    if (!isMusicOn || !backgroundMusicRef.current) return;

    try {
      initializeAudio();
      backgroundMusicRef.current.play().catch((error) => {
        console.warn('Failed to play background music:', error);
      });
    } catch (error) {
      console.warn('Failed to play background music:', error);
    }
  };

  // Play effect by type
  const playEffect = (effectType: 'drop' | 'merge' | 'levelUp' | 'lineClear' | 'gameOver' | 'bombExplode' | 'alignmentPing' | 'scoreUp' | 'gameStart' | 'boosterEarned') => {
    switch (effectType) {
      case 'drop':
        playDrop();
        break;
      case 'merge':
        playMerge();
        break;
      case 'levelUp':
        playLevelUp();
        break;
      case 'lineClear':
        playLineClear();
        break;
      case 'gameOver':
        playGameOver();
        break;
      case 'bombExplode':
        playBombExplode();
        break;
      case 'alignmentPing':
        playAlignmentPing();
        break;
      case 'scoreUp':
        playScoreUp();
        break;
      case 'gameStart':
        playGameStart();
        break;
      case 'boosterEarned':
        playBoosterEarned();
        break;
    }
  };

  // Stop all sounds immediately
  const stopAll = () => {
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
  };

  return {
    playDrop,
    playMerge,
    playLevelUp,
    playLineClear,
    playGameOver,
    playBombExplode,
    playAlignmentPing,
    playScoreUp,
    playGameStart,
    playBoosterEarned,
    playMusic,
    toggleMusic,
    playEffect,
    stopAll,
    isMusicOn,
    initializeAudio,
    isLoading,
  };
}
