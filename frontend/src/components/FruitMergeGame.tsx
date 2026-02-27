import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { RotateCcw, Play, Volume2, VolumeX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSubmitScore, useUpdateSoundPreference } from '@/hooks/useQueries';
import { useFruitAudio } from '@/hooks/useFruitAudio';
import { toast } from 'sonner';
import type { BoosterTypeKey } from './BoosterPanel';
import type { GameMode } from '@/pages/ModeSelectionPage';

interface Fruit {
  id: number;
  x: number;
  y: number;
  radius: number;
  level: number;
  vx: number;
  vy: number;
  color: string;
  emoji: string;
  merging: boolean;
  scale: number;
}

interface ContactTimer {
  fruitId: number;
  startTime: number;
}

const FRUIT_LEVELS = [
  { emoji: '🍒', color: '#ff6b6b', size: 20 },
  { emoji: '🍓', color: '#ff8787', size: 25 },
  { emoji: '🍊', color: '#ffa94d', size: 30 },
  { emoji: '🍋', color: '#ffd43b', size: 35 },
  { emoji: '🍎', color: '#ff6b6b', size: 40 },
  { emoji: '🍐', color: '#51cf66', size: 45 },
  { emoji: '🍇', color: '#845ef7', size: 50 },
  { emoji: '🍉', color: '#ff6b6b', size: 55 },
  { emoji: '🍍', color: '#ffd43b', size: 60 },
  { emoji: '🥥', color: '#8b4513', size: 65 },
];

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GAME_OVER_LINE = 100;
const CONTACT_DURATION_MS = 2000;

interface FruitMergeGameProps {
  activeBooster: BoosterTypeKey | null;
  onBoosterUsed: () => void;
  username: string;
  bombCount: number;
  nextFruitChangeCount: number;
  alignmentCount: number;
  onActivateBooster: (type: BoosterTypeKey) => void;
  gameMode: GameMode;
}

export default function FruitMergeGame({ 
  activeBooster, 
  onBoosterUsed, 
  username,
  bombCount,
  nextFruitChangeCount,
  alignmentCount,
  onActivateBooster,
  gameMode
}: FruitMergeGameProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const fruitsRef = useRef<Fruit[]>([]);
  const nextFruitRef = useRef<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const fruitIdCounter = useRef(0);
  const canDropRef = useRef(true);
  const previewXRef = useRef<number | null>(null);
  const gameOverRef = useRef(false);
  const contactTimerRef = useRef<ContactTimer | null>(null);
  const [showAlignmentGuide, setShowAlignmentGuide] = useState(false);
  const [bombMode, setBombMode] = useState(false);
  const explosionAnimationRef = useRef<{ x: number; y: number; frame: number } | null>(null);
  const submitScoreMutation = useSubmitScore();
  const updateSoundPrefMutation = useUpdateSoundPreference();

  // Puzzle mode state
  const [puzzleLevel, setPuzzleLevel] = useState(1);
  const [movesRemaining, setMovesRemaining] = useState(20);
  const [puzzleObjective, setPuzzleObjective] = useState<{ targetLevel: number; targetCount: number }>({ targetLevel: 3, targetCount: 3 });

  // Use the external MP3 audio system
  const {
    playEffect,
    playMusic,
    toggleMusic,
    stopAll,
    isMusicOn,
    initializeAudio,
    isLoading: audioLoading,
  } = useFruitAudio(username);

  // Get mode-specific settings
  const getModeSettings = () => {
    switch (gameMode) {
      case 'normal':
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: true,
          modeLabel: t('mode.normal.label'),
        };
      case 'speed':
        return {
          gravityMultiplier: 1.5,
          scoreMultiplier: 1.2,
          enableGameOver: true,
          modeLabel: t('mode.speed.label'),
        };
      case 'puzzle':
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: false,
          modeLabel: t('mode.puzzle.label'),
        };
      case 'endless':
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: false,
          modeLabel: t('mode.endless.label'),
        };
      default:
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: true,
          modeLabel: '',
        };
    }
  };

  const modeSettings = getModeSettings();

  // Helper function to play sound with Android bridge fallback
  const playSoundEffect = (soundName: string) => {
    // If Android bridge is available, use native audio
    if (window.AndroidAudio) {
      window.AndroidAudio.playSound(soundName);
    } else {
      // Map Android sound names to browser effect types
      const soundMap: Record<string, 'drop' | 'merge' | 'levelUp' | 'lineClear' | 'gameOver' | 'bombExplode' | 'alignmentPing' | 'scoreUp' | 'gameStart' | 'boosterEarned'> = {
        'fruitDrop': 'drop',
        'fruitMerge': 'merge',
        'bombExplode': 'bombExplode',
        'alignmentPing': 'alignmentPing',
        'scoreUp': 'scoreUp',
        'gameStart': 'gameStart',
        'gameOver': 'gameOver',
        'levelUp': 'levelUp',
        'boosterEarned': 'boosterEarned',
      };
      
      const effectType = soundMap[soundName];
      if (effectType) {
        playEffect(effectType);
      }
    }
  };

  // Sync sound preference with backend
  const handleToggleSound = () => {
    toggleMusic();
    const newSoundState = !isMusicOn;
    
    updateSoundPrefMutation.mutate({
      username,
      soundPref: newSoundState,
    });
  };

  // Handle canvas scaling for responsive design
  useEffect(() => {
    const updateCanvasScale = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      const scaleX = containerWidth / CANVAS_WIDTH;
      const scaleY = containerHeight / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY, 1);
      
      setCanvasScale(scale);
    };

    updateCanvasScale();
    window.addEventListener('resize', updateCanvasScale);
    return () => window.removeEventListener('resize', updateCanvasScale);
  }, []);

  // Handle booster activation
  useEffect(() => {
    if (!activeBooster || !gameStarted || gameOver) return;

    if (activeBooster === 'alignment') {
      setShowAlignmentGuide(true);
      playSoundEffect('alignmentPing');
      onBoosterUsed();
      
      const timer = setTimeout(() => {
        setShowAlignmentGuide(false);
      }, 10000);

      return () => clearTimeout(timer);
    } else if (activeBooster === 'nextFruitChange') {
      const currentNext = nextFruitRef.current;
      let newNext;
      do {
        newNext = Math.floor(Math.random() * Math.min(5, FRUIT_LEVELS.length));
      } while (newNext === currentNext);
      
      nextFruitRef.current = newNext;
      onBoosterUsed();
    } else if (activeBooster === 'bomb') {
      setBombMode(true);
      onBoosterUsed();
    }
  }, [activeBooster, gameStarted, gameOver, onBoosterUsed]);

  // Stop all sounds when component unmounts or game exits
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameStarted || gameOver) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const gravity = 0.5 * modeSettings.gravityMultiplier;
    const friction = 0.98;
    const restitution = 0.3;

    function drawFruit(fruit: Fruit) {
      if (!ctx) return;

      ctx.save();
      ctx.globalAlpha = fruit.merging ? 0.5 : 1;

      ctx.font = `${fruit.radius * fruit.scale * 1.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, fruit.x, fruit.y);

      ctx.restore();
    }

    function drawGameOverLine() {
      if (!ctx || !modeSettings.enableGameOver) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, GAME_OVER_LINE);
      ctx.lineTo(CANVAS_WIDTH, GAME_OVER_LINE);
      ctx.stroke();
      ctx.restore();
    }

    function drawContactTimer() {
      if (!ctx || !contactTimerRef.current || !modeSettings.enableGameOver) return;

      const elapsed = Date.now() - contactTimerRef.current.startTime;
      const progress = Math.min(elapsed / CONTACT_DURATION_MS, 1);

      const barWidth = 100;
      const barHeight = 8;
      const barX = (CANVAS_WIDTH - barWidth) / 2;
      const barY = GAME_OVER_LINE - 20;

      ctx.save();
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = progress < 0.5 ? 'rgba(255, 165, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      ctx.restore();
    }

    function drawAlignmentGuide() {
      if (!ctx || !showAlignmentGuide || previewXRef.current === null) return;

      const levelData = FRUIT_LEVELS[nextFruitRef.current];
      const x = Math.max(levelData.size, Math.min(previewXRef.current, CANVAS_WIDTH - levelData.size));

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.restore();
    }

    function drawExplosion() {
      if (!ctx || !explosionAnimationRef.current) return;

      const explosion = explosionAnimationRef.current;
      const img = new Image();
      img.src = '/assets/generated/bomb-explosion-effect-transparent.dim_128x128.png';

      const scale = 1 + (explosion.frame * 0.1);
      const alpha = 1 - (explosion.frame * 0.1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        img,
        explosion.x - (64 * scale),
        explosion.y - (64 * scale),
        128 * scale,
        128 * scale
      );
      ctx.restore();

      explosion.frame++;
      if (explosion.frame > 10) {
        explosionAnimationRef.current = null;
      }
    }

    function drawPreview() {
      if (!ctx || previewXRef.current === null || !canDropRef.current || gameOverRef.current) return;

      const levelData = FRUIT_LEVELS[nextFruitRef.current];
      const x = Math.max(levelData.size, Math.min(previewXRef.current, CANVAS_WIDTH - levelData.size));

      ctx.save();
      ctx.globalAlpha = 0.5;

      ctx.font = `${levelData.size * 1.8}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(levelData.emoji, x, 50);
      ctx.restore();
    }

    function checkCollision(f1: Fruit, f2: Fruit): boolean {
      const dx = f2.x - f1.x;
      const dy = f2.y - f1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (f1.radius * f1.scale + f2.radius * f2.scale);
    }

    function resolveCollision(f1: Fruit, f2: Fruit) {
      const dx = f2.x - f1.x;
      const dy = f2.y - f1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) return;

      const overlap = f1.radius * f1.scale + f2.radius * f2.scale - distance;

      if (overlap > 0) {
        const nx = dx / distance;
        const ny = dy / distance;

        const totalMass = f1.radius + f2.radius;
        const ratio1 = f2.radius / totalMass;
        const ratio2 = f1.radius / totalMass;

        f1.x -= nx * overlap * ratio1;
        f1.y -= ny * overlap * ratio1;
        f2.x += nx * overlap * ratio2;
        f2.y += ny * overlap * ratio2;

        const dvx = f2.vx - f1.vx;
        const dvy = f2.vy - f1.vy;
        const dvn = dvx * nx + dvy * ny;

        if (dvn < 0) {
          const impulse = (2 * dvn) / (1 / f1.radius + 1 / f2.radius);

          f1.vx += (impulse * nx) / f1.radius;
          f1.vy += (impulse * ny) / f1.radius;
          f2.vx -= (impulse * nx) / f2.radius;
          f2.vy -= (impulse * ny) / f2.radius;
        }
      }
    }

    function mergeFruits(index1: number, index2: number) {
      const fruits = fruitsRef.current;
      const f1 = fruits[index1];
      const f2 = fruits[index2];

      if (f1.level === f2.level && f1.level < FRUIT_LEVELS.length - 1 && !f1.merging && !f2.merging) {
        f1.merging = true;
        f2.merging = true;

        playSoundEffect('fruitMerge');

        const newLevel = f1.level + 1;
        const levelData = FRUIT_LEVELS[newLevel];

        setTimeout(() => {
          const newFruit: Fruit = {
            id: fruitIdCounter.current++,
            x: (f1.x + f2.x) / 2,
            y: (f1.y + f2.y) / 2,
            radius: levelData.size,
            level: newLevel,
            vx: 0,
            vy: -2,
            color: levelData.color,
            emoji: levelData.emoji,
            merging: false,
            scale: 0.5,
          };

          fruitsRef.current = fruitsRef.current.filter((f) => f.id !== f1.id && f.id !== f2.id);
          fruitsRef.current.push(newFruit);

          if (contactTimerRef.current && 
              (contactTimerRef.current.fruitId === f1.id || contactTimerRef.current.fruitId === f2.id)) {
            contactTimerRef.current = null;
          }

          const scaleInterval = setInterval(() => {
            if (newFruit.scale < 1) {
              newFruit.scale += 0.1;
            } else {
              newFruit.scale = 1;
              clearInterval(scaleInterval);
            }
          }, 30);

          const baseScore = (newLevel + 1) * 10;
          const finalScore = Math.floor(baseScore * modeSettings.scoreMultiplier);
          setScore((prev) => prev + finalScore);
          
          if (newLevel >= 5) {
            playSoundEffect('levelUp');
          } else {
            playSoundEffect('scoreUp');
          }
        }, 100);
      }
    }

    function isFruitTouchingDropLine(fruit: Fruit): boolean {
      const fruitTopEdge = fruit.y - (fruit.radius * fruit.scale);
      const tolerance = 2;
      return fruitTopEdge <= (GAME_OVER_LINE + tolerance);
    }

    function checkGameOver(): boolean {
      if (gameOverRef.current || !modeSettings.enableGameOver) return false;

      const fruits = fruitsRef.current;
      let touchingFruit: Fruit | null = null;

      for (const fruit of fruits) {
        if (isFruitTouchingDropLine(fruit)) {
          touchingFruit = fruit;
          break;
        }
      }

      if (touchingFruit !== null) {
        if (contactTimerRef.current) {
          if (contactTimerRef.current.fruitId === touchingFruit.id) {
            const elapsed = Date.now() - contactTimerRef.current.startTime;
            if (elapsed >= CONTACT_DURATION_MS) {
              gameOverRef.current = true;
              setGameOver(true);
              setShowGameOverDialog(true);
              canDropRef.current = false;
              contactTimerRef.current = null;
              
              playSoundEffect('gameOver');
              stopAll();
              
              return true;
            }
          } else {
            contactTimerRef.current = {
              fruitId: touchingFruit.id,
              startTime: Date.now(),
            };
          }
        } else {
          contactTimerRef.current = {
            fruitId: touchingFruit.id,
            startTime: Date.now(),
          };
        }
      } else {
        if (contactTimerRef.current !== null) {
          contactTimerRef.current = null;
        }
      }

      return false;
    }

    function animate() {
      if (!ctx || !canvas || gameOverRef.current) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawGameOverLine();
      drawContactTimer();
      drawAlignmentGuide();
      drawPreview();
      drawExplosion();

      const fruits = fruitsRef.current;

      fruits.forEach((fruit, i) => {
        fruit.vy += gravity;
        
        fruit.x += fruit.vx;
        fruit.y += fruit.vy;

        fruit.vx *= friction;
        fruit.vy *= friction;

        if (fruit.x - fruit.radius * fruit.scale < 0) {
          fruit.x = fruit.radius * fruit.scale;
          fruit.vx *= -restitution;
        }
        if (fruit.x + fruit.radius * fruit.scale > canvas.width) {
          fruit.x = canvas.width - fruit.radius * fruit.scale;
          fruit.vx *= -restitution;
        }
        
        if (fruit.y + fruit.radius * fruit.scale > canvas.height) {
          fruit.y = canvas.height - fruit.radius * fruit.scale;
          fruit.vy *= -restitution;
          fruit.vx *= friction;

          if (Math.abs(fruit.vy) < 0.5 && Math.abs(fruit.vx) < 0.5) {
            canDropRef.current = true;
          }
        }

        for (let j = i + 1; j < fruits.length; j++) {
          if (checkCollision(fruit, fruits[j])) {
            if (fruit.level === fruits[j].level && !fruit.merging && !fruits[j].merging) {
              mergeFruits(i, j);
              break;
            } else {
              resolveCollision(fruit, fruits[j]);
            }
          }
        }

        drawFruit(fruit);
      });

      if (!checkGameOver()) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animate();

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, showAlignmentGuide, stopAll, modeSettings]);

  useEffect(() => {
    if (gameOver && score > 0) {
      submitScoreMutation.mutate(
        { username, score },
        {
          onError: (error) => {
            console.error('Failed to submit score:', error);
            toast.error(t('error.actorNotInitialized'));
          },
        }
      );
    }
  }, [gameOver, score, username, submitScoreMutation, t]);

  // Check puzzle mode win condition
  useEffect(() => {
    if (gameMode !== 'puzzle' || !gameStarted || gameOver) return;

    // Check if moves are exhausted
    if (movesRemaining <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
      setShowGameOverDialog(true);
      stopAll();
    }
  }, [movesRemaining, gameMode, gameStarted, gameOver, stopAll]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    initializeAudio();

    if (gameOver || gameOverRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (bombMode) {
      const clickedFruitIndex = fruitsRef.current.findIndex((fruit) => {
        const dx = fruit.x - x;
        const dy = fruit.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < fruit.radius * fruit.scale;
      });

      if (clickedFruitIndex !== -1) {
        const clickedFruit = fruitsRef.current[clickedFruitIndex];
        
        explosionAnimationRef.current = {
          x: clickedFruit.x,
          y: clickedFruit.y,
          frame: 0,
        };

        playSoundEffect('bombExplode');

        const destroyRadius = 80;
        fruitsRef.current = fruitsRef.current.filter((fruit) => {
          const dx = fruit.x - clickedFruit.x;
          const dy = fruit.y - clickedFruit.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance > destroyRadius;
        });

        setBombMode(false);
      }
      return;
    }

    if (!canDropRef.current) return;

    const levelData = FRUIT_LEVELS[nextFruitRef.current];
    const clampedX = Math.max(levelData.size, Math.min(x, CANVAS_WIDTH - levelData.size));

    const newFruit: Fruit = {
      id: fruitIdCounter.current++,
      x: clampedX,
      y: 50,
      radius: levelData.size,
      level: nextFruitRef.current,
      vx: 0,
      vy: 0,
      color: levelData.color,
      emoji: levelData.emoji,
      merging: false,
      scale: 1,
    };

    fruitsRef.current.push(newFruit);
    nextFruitRef.current = Math.floor(Math.random() * Math.min(5, FRUIT_LEVELS.length));
    canDropRef.current = false;

    playSoundEffect('fruitDrop');

    // Decrease moves in puzzle mode
    if (gameMode === 'puzzle') {
      setMovesRemaining((prev) => prev - 1);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver || gameOverRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    previewXRef.current = (e.clientX - rect.left) * scaleX;
  };

  const handleCanvasMouseLeave = () => {
    previewXRef.current = null;
  };

  const resetGame = () => {
    fruitsRef.current = [];
    setScore(0);
    setGameOver(false);
    setShowGameOverDialog(false);
    gameOverRef.current = false;
    nextFruitRef.current = 0;
    fruitIdCounter.current = 0;
    canDropRef.current = true;
    previewXRef.current = null;
    contactTimerRef.current = null;
    setShowAlignmentGuide(false);
    setBombMode(false);
    explosionAnimationRef.current = null;
    
    // Reset puzzle mode state
    if (gameMode === 'puzzle') {
      setMovesRemaining(20);
      setPuzzleLevel(1);
      setPuzzleObjective({ targetLevel: 3, targetCount: 3 });
    }
    
    stopAll();
  };

  const startGame = () => {
    setGameStarted(true);
    resetGame();
    
    initializeAudio();
    playSoundEffect('gameStart');
    
    // Start background music after a short delay
    if (isMusicOn) {
      setTimeout(() => {
        playMusic();
      }, 500);
    }
  };

  const boosters = [
    {
      type: 'bomb' as BoosterTypeKey,
      count: bombCount,
      icon: '💣',
    },
    {
      type: 'nextFruitChange' as BoosterTypeKey,
      count: nextFruitChangeCount,
      icon: '🔄',
    },
    {
      type: 'alignment' as BoosterTypeKey,
      count: alignmentCount,
      icon: '📏',
    },
  ];

  return (
    <>
      <Card className="game-card">
        <CardContent className="game-card-content">
          {!gameStarted ? (
            <div className="game-start-screen">
              <div className="text-3xl sm:text-4xl md:text-5xl">🍎🍊🍇</div>
              <div className="text-xl sm:text-2xl font-bold mb-2 text-primary">
                {modeSettings.modeLabel}
              </div>
              <p className="game-instructions">
                {t('game.instructions')}
              </p>
              <Button 
                onClick={startGame} 
                size="lg" 
                className="game-start-button"
                disabled={audioLoading}
              >
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                {audioLoading ? 'Yükleniyor...' : 'Başlat'}
              </Button>
            </div>
          ) : (
            <>
              <div className="game-controls-row">
                <div className="flex flex-col items-start gap-1">
                  <div className="game-score">
                    {t('game.score')}: {score}
                  </div>
                  <div className="text-xs font-semibold text-primary">
                    {modeSettings.modeLabel}
                  </div>
                  {gameMode === 'puzzle' && (
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('mode.puzzle.moves')}: {movesRemaining}
                    </div>
                  )}
                </div>
                
                <div className="game-boosters-inline">
                  {boosters.map((booster) => {
                    const isActive = activeBooster === booster.type;
                    const canUse = booster.count > 0;

                    return (
                      <button
                        key={booster.type}
                        onClick={() => onActivateBooster(booster.type)}
                        disabled={!canUse || isActive}
                        className={`booster-inline-btn ${
                          isActive ? 'booster-inline-active' : ''
                        } ${!canUse ? 'booster-inline-disabled' : ''}`}
                        title={`${booster.icon} ${booster.count}`}
                      >
                        <span className="booster-inline-icon">{booster.icon}</span>
                        <span className="booster-inline-count">{booster.count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="game-controls-right">
                  <Button 
                    onClick={handleToggleSound} 
                    variant="ghost" 
                    size="sm" 
                    className="sound-toggle-btn"
                    title={isMusicOn ? t('sound.turnOff') : t('sound.turnOn')}
                  >
                    {isMusicOn ? (
                      <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    ) : (
                      <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    )}
                  </Button>

                  <Button onClick={resetGame} variant="outline" size="sm" className="game-reset-btn">
                    <RotateCcw className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                    Yeniden Başlat
                  </Button>
                </div>
              </div>
              
              {bombMode && (
                <div className="bomb-mode-indicator">
                  {t('booster.selectFruit')}
                </div>
              )}
              
              <div ref={containerRef} className="game-canvas-container">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={handleCanvasMouseLeave}
                  className={`game-canvas ${
                    bombMode ? 'cursor-crosshair border-red-500' : 'cursor-pointer'
                  }`}
                  style={{ 
                    width: `${CANVAS_WIDTH * canvasScale}px`,
                    height: `${CANVAS_HEIGHT * canvasScale}px`,
                  }}
                />
              </div>
              
              <div className="next-fruit-indicator">
                {t('game.nextFruit')}: {FRUIT_LEVELS[nextFruitRef.current].emoji}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showGameOverDialog} onOpenChange={setShowGameOverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl text-center">
              {t('game.gameOver')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3 sm:space-y-4">
              <div className="text-4xl sm:text-5xl md:text-6xl">🎮</div>
              <div className="text-lg sm:text-xl font-bold text-foreground">
                {t('game.finalScore')}: {score}
              </div>
              <p className="text-sm sm:text-base">{t('game.gameOverMessage')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={resetGame} className="w-full sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('game.playAgain')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
