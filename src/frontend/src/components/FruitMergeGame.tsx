import { BoosterType } from "@/backend";
import HowToPlayDialog from "@/components/HowToPlayDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFruitAudio } from "@/hooks/useFruitAudio";
import {
  useGetHighScore,
  useSubmitScore,
  useUpdateBoosterCount,
  useUpdateSoundPreference,
} from "@/hooks/useQueries";
import type { GameMode } from "@/pages/ModeSelectionPage";
import {
  Check,
  Copy,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { BoosterTypeKey } from "./BoosterPanel";

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
  { emoji: "🍒", color: "#ff6b6b", size: 20 },
  { emoji: "🍓", color: "#ff8787", size: 25 },
  { emoji: "🍊", color: "#ffa94d", size: 30 },
  { emoji: "🍋", color: "#ffd43b", size: 35 },
  { emoji: "🍎", color: "#ff6b6b", size: 40 },
  { emoji: "🍐", color: "#51cf66", size: 45 },
  { emoji: "🍇", color: "#845ef7", size: 50 },
  { emoji: "🍉", color: "#ff6b6b", size: 55 },
  { emoji: "🍍", color: "#ffd43b", size: 60 },
  { emoji: "🥥", color: "#8b4513", size: 65 },
];

// Puzzle levels definition
const PUZZLE_LEVELS = [
  { targetFruitLevel: 0, targetCount: 3, label: "🍒 x3" },
  { targetFruitLevel: 1, targetCount: 2, label: "🍓 x2" },
  { targetFruitLevel: 2, targetCount: 3, label: "🍊 x3" },
  { targetFruitLevel: 4, targetCount: 2, label: "🍎 x2" },
  { targetFruitLevel: 5, targetCount: 1, label: "🍐 x1" },
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
  gameMode,
}: FruitMergeGameProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
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
  const explosionAnimationRef = useRef<{
    x: number;
    y: number;
    frame: number;
  } | null>(null);
  const submitScoreMutation = useSubmitScore();
  const updateSoundPrefMutation = useUpdateSoundPreference();
  const updateBoosterCountMutation = useUpdateBoosterCount();

  // High score
  const { data: highScoreBigInt } = useGetHighScore(username);
  const highScore = highScoreBigInt ? Number(highScoreBigInt) : 0;

  // Puzzle mode state
  const [puzzleLevel, setPuzzleLevel] = useState(0); // index into PUZZLE_LEVELS
  const [puzzleMergeCount, setPuzzleMergeCount] = useState(0);
  const puzzleMergeCountRef = useRef(0);
  const [showPuzzleWinDialog, setShowPuzzleWinDialog] = useState(false);
  const [puzzleAllComplete, setPuzzleAllComplete] = useState(false);
  const [movesRemaining, setMovesRemaining] = useState(20);

  // Endless mode multiplier
  const [endlessMultiplier, setEndlessMultiplier] = useState(1.0);
  const endlessMultiplierRef = useRef(1.0);

  // Rewarded ad dialog
  const [rewardAdBoosterType, setRewardAdBoosterType] =
    useState<BoosterTypeKey | null>(null);
  const [showRewardAdDialog, setShowRewardAdDialog] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [adComplete, setAdComplete] = useState(false);
  const adIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Share state
  const [shareCopied, setShareCopied] = useState(false);

  // Pause state
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // Combo system
  const lastMergeTimeRef = useRef(0);
  const comboCountRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [comboDisplay, setComboDisplay] = useState<{
    count: number;
    visible: boolean;
  }>({ count: 0, visible: false });

  // Booster feedback
  const [boosterFeedback, setBoosterFeedback] = useState<string | null>(null);

  // Next fruit display state (mirrors the ref for rendering)
  const [nextFruitDisplay, setNextFruitDisplay] = useState(0);

  // Canvas flash state for alignment end signal
  const [canvasFlash, setCanvasFlash] = useState(false);
  const prevAlignmentGuideRef = useRef(false);

  // How to play dialog
  const [showHowToPlay, setShowHowToPlay] = useState(false);

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
  const getModeSettings = useCallback(() => {
    switch (gameMode) {
      case "normal":
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: true,
          modeLabel: t("mode.normal.label"),
        };
      case "speed":
        return {
          gravityMultiplier: 1.5,
          scoreMultiplier: 1.2,
          enableGameOver: true,
          modeLabel: t("mode.speed.label"),
        };
      case "puzzle":
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: false,
          modeLabel: t("mode.puzzle.label"),
        };
      case "endless":
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: false,
          modeLabel: t("mode.endless.label"),
        };
      default:
        return {
          gravityMultiplier: 1.0,
          scoreMultiplier: 1.0,
          enableGameOver: true,
          modeLabel: "",
        };
    }
  }, [gameMode, t]);

  const modeSettings = getModeSettings();

  // Helper function to play sound with Android bridge fallback
  const playSoundEffect = useCallback(
    (soundName: string) => {
      if ((window as any).AndroidAudio) {
        (window as any).AndroidAudio.playSound(soundName);
      } else {
        const soundMap: Record<
          string,
          | "drop"
          | "merge"
          | "levelUp"
          | "lineClear"
          | "gameOver"
          | "bombExplode"
          | "alignmentPing"
          | "scoreUp"
          | "gameStart"
          | "boosterEarned"
        > = {
          fruitDrop: "drop",
          fruitMerge: "merge",
          bombExplode: "bombExplode",
          alignmentPing: "alignmentPing",
          scoreUp: "scoreUp",
          gameStart: "gameStart",
          gameOver: "gameOver",
          levelUp: "levelUp",
          boosterEarned: "boosterEarned",
        };
        const effectType = soundMap[soundName];
        if (effectType) playEffect(effectType);
      }
    },
    [playEffect],
  );

  // Sync sound preference with backend
  const handleToggleSound = () => {
    toggleMusic();
    const newSoundState = !isMusicOn;
    updateSoundPrefMutation.mutate({ username, soundPref: newSoundState });
  };

  // Rewarded ad logic
  const openRewardAd = (boosterType: BoosterTypeKey) => {
    setRewardAdBoosterType(boosterType);
    setAdCountdown(5);
    setAdComplete(false);
    setShowRewardAdDialog(true);

    adIntervalRef.current = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          if (adIntervalRef.current) clearInterval(adIntervalRef.current);
          setAdComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClaimRewardAd = async () => {
    if (!adComplete || !rewardAdBoosterType) return;
    try {
      const boosterTypeMap: Record<BoosterTypeKey, BoosterType> = {
        bomb: BoosterType.bomb,
        nextFruitChange: BoosterType.nextFruitChange,
        alignment: BoosterType.alignment,
      };
      await updateBoosterCountMutation.mutateAsync({
        username,
        boosterType: boosterTypeMap[rewardAdBoosterType],
        amount: BigInt(1),
      });
      playSoundEffect("boosterEarned");
      toast.success(
        t("booster.adReward", { count: "1", type: rewardAdBoosterType }),
      );
    } catch {
      toast.error(t("error.actorNotInitialized"));
    }
    setShowRewardAdDialog(false);
    setRewardAdBoosterType(null);
  };

  useEffect(() => {
    return () => {
      if (adIntervalRef.current) clearInterval(adIntervalRef.current);
    };
  }, []);

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
    window.addEventListener("resize", updateCanvasScale);
    return () => window.removeEventListener("resize", updateCanvasScale);
  }, []);

  // Handle booster activation
  useEffect(() => {
    if (!activeBooster || !gameStarted || gameOver) return;

    if (activeBooster === "alignment") {
      setShowAlignmentGuide(true);
      playSoundEffect("alignmentPing");
      onBoosterUsed();
      const timer = setTimeout(() => setShowAlignmentGuide(false), 10000);
      return () => clearTimeout(timer);
    }
    if (activeBooster === "nextFruitChange") {
      const currentNext = nextFruitRef.current;
      let newNext: number = Math.floor(
        Math.random() * Math.min(5, FRUIT_LEVELS.length),
      );
      while (newNext === currentNext) {
        newNext = Math.floor(Math.random() * Math.min(5, FRUIT_LEVELS.length));
      }
      nextFruitRef.current = newNext;
      setNextFruitDisplay(newNext);
      onBoosterUsed();
    }
    if (activeBooster === "bomb") {
      setBombMode(true);
      setBoosterFeedback("💣 AKTİF!");
      setTimeout(() => setBoosterFeedback(null), 1500);
      onBoosterUsed();
    }
  }, [activeBooster, gameStarted, gameOver, onBoosterUsed, playSoundEffect]);

  // Alignment end signal - toast + canvas flash
  useEffect(() => {
    if (prevAlignmentGuideRef.current && !showAlignmentGuide && gameStarted) {
      toast("⏰ Rehber süresi doldu!");
      setCanvasFlash(true);
      setTimeout(() => setCanvasFlash(false), 600);
    }
    prevAlignmentGuideRef.current = showAlignmentGuide;
  }, [showAlignmentGuide, gameStarted]);

  // Stop all sounds when component unmounts or game exits
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  // Sound hint state for web autoplay workaround
  const [soundHintVisible, setSoundHintVisible] = useState(false);

  // Show how to play on first visit
  useEffect(() => {
    const shown = localStorage.getItem("howToPlayShown");
    if (!shown) {
      setShowHowToPlay(true);
      localStorage.setItem("howToPlayShown", "true");
    }
  }, []);

  // Endless multiplier: update based on score (max 5.0 for stronger differentiation)
  useEffect(() => {
    if (gameMode !== "endless") return;
    const multiplier = Math.min(1.0 + Math.floor(score / 500) * 0.1, 5.0);
    endlessMultiplierRef.current = multiplier;
    setEndlessMultiplier(multiplier);
  }, [score, gameMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameStarted || gameOver) return;

    const ctx = canvas.getContext("2d");
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
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fruit.emoji, fruit.x, fruit.y);
      ctx.restore();
    }

    function drawGameOverLine() {
      if (!ctx || !modeSettings.enableGameOver) return;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, GAME_OVER_LINE);
      ctx.lineTo(CANVAS_WIDTH, GAME_OVER_LINE);
      ctx.stroke();
      ctx.restore();
    }

    function drawContactTimer() {
      if (!ctx || !contactTimerRef.current || !modeSettings.enableGameOver)
        return;
      const elapsed = Date.now() - contactTimerRef.current.startTime;
      const progress = Math.min(elapsed / CONTACT_DURATION_MS, 1);
      const barWidth = 100;
      const barHeight = 8;
      const barX = (CANVAS_WIDTH - barWidth) / 2;
      const barY = GAME_OVER_LINE - 20;
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle =
        progress < 0.5 ? "rgba(255, 165, 0, 0.8)" : "rgba(255, 0, 0, 0.8)";
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      ctx.restore();
    }

    function drawAlignmentGuide() {
      if (!ctx || !showAlignmentGuide || previewXRef.current === null) return;
      const levelData = FRUIT_LEVELS[nextFruitRef.current];
      const x = Math.max(
        levelData.size,
        Math.min(previewXRef.current, CANVAS_WIDTH - levelData.size),
      );
      ctx.save();
      ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
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
      img.src =
        "/assets/generated/bomb-explosion-effect-transparent.dim_128x128.png";
      const scale = 1 + explosion.frame * 0.1;
      const alpha = 1 - explosion.frame * 0.1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        img,
        explosion.x - 64 * scale,
        explosion.y - 64 * scale,
        128 * scale,
        128 * scale,
      );
      ctx.restore();
      explosion.frame++;
      if (explosion.frame > 10) explosionAnimationRef.current = null;
    }

    function drawPreview() {
      if (
        !ctx ||
        previewXRef.current === null ||
        !canDropRef.current ||
        gameOverRef.current
      )
        return;
      const levelData = FRUIT_LEVELS[nextFruitRef.current];
      const x = Math.max(
        levelData.size,
        Math.min(previewXRef.current, CANVAS_WIDTH - levelData.size),
      );
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.font = `${levelData.size * 1.8}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(levelData.emoji, x, 50);
      ctx.restore();
    }

    function checkCollision(f1: Fruit, f2: Fruit): boolean {
      const dx = f2.x - f1.x;
      const dy = f2.y - f1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < f1.radius * f1.scale + f2.radius * f2.scale;
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

      if (
        f1.level === f2.level &&
        f1.level < FRUIT_LEVELS.length - 1 &&
        !f1.merging &&
        !f2.merging
      ) {
        f1.merging = true;
        f2.merging = true;

        playSoundEffect("fruitMerge");

        const mergedLevel = f1.level + 1;
        const levelData = FRUIT_LEVELS[mergedLevel];

        // Puzzle mode: track merges of source level (f1.level = f2.level)
        if (gameMode === "puzzle") {
          const currentPuzzle = PUZZLE_LEVELS[puzzleLevel] ?? PUZZLE_LEVELS[0];
          // A merge of two fruits at targetFruitLevel produces a higher level fruit - we count the result
          // Count when f1.level === targetFruitLevel (merged from target)
          if (f1.level === currentPuzzle.targetFruitLevel) {
            const newCount = puzzleMergeCountRef.current + 1;
            puzzleMergeCountRef.current = newCount;
            setPuzzleMergeCount(newCount);
          }
        }

        setTimeout(() => {
          const newFruit: Fruit = {
            id: fruitIdCounter.current++,
            x: (f1.x + f2.x) / 2,
            y: (f1.y + f2.y) / 2,
            radius: levelData.size,
            level: mergedLevel,
            vx: 0,
            vy: -2,
            color: levelData.color,
            emoji: levelData.emoji,
            merging: false,
            scale: 0.5,
          };

          fruitsRef.current = fruitsRef.current.filter(
            (f) => f.id !== f1.id && f.id !== f2.id,
          );
          fruitsRef.current.push(newFruit);

          if (
            contactTimerRef.current &&
            (contactTimerRef.current.fruitId === f1.id ||
              contactTimerRef.current.fruitId === f2.id)
          ) {
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

          const baseScore = (mergedLevel + 1) * 10;
          const currentMultiplier =
            gameMode === "endless"
              ? endlessMultiplierRef.current
              : modeSettings.scoreMultiplier;

          // Combo system
          const now = Date.now();
          if (now - lastMergeTimeRef.current < 1500) {
            comboCountRef.current += 1;
          } else {
            comboCountRef.current = 1;
          }
          lastMergeTimeRef.current = now;
          const comboBonus =
            comboCountRef.current >= 3
              ? 0.3
              : comboCountRef.current >= 2
                ? 0.15
                : 0;
          if (comboCountRef.current >= 2) {
            setComboDisplay({ count: comboCountRef.current, visible: true });
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            comboTimerRef.current = setTimeout(() => {
              setComboDisplay((prev) => ({ ...prev, visible: false }));
            }, 1500);
          }

          const finalScore = Math.floor(
            baseScore * currentMultiplier * (1 + comboBonus),
          );
          const newScore = scoreRef.current + finalScore;
          scoreRef.current = newScore;
          setScore(newScore);

          if (mergedLevel >= 5) {
            playSoundEffect("levelUp");
          } else {
            playSoundEffect("scoreUp");
          }
        }, 100);
      }
    }

    function isFruitTouchingDropLine(fruit: Fruit): boolean {
      const fruitTopEdge = fruit.y - fruit.radius * fruit.scale;
      const tolerance = 2;
      return fruitTopEdge <= GAME_OVER_LINE + tolerance;
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
              playSoundEffect("gameOver");
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
        if (contactTimerRef.current !== null) contactTimerRef.current = null;
      }

      return false;
    }

    function animate() {
      if (!ctx || !canvas || gameOverRef.current) return;
      if (isPausedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

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
            if (
              fruit.level === fruits[j].level &&
              !fruit.merging &&
              !fruits[j].merging
            ) {
              mergeFruits(i, j);
              break;
            }
            resolveCollision(fruit, fruits[j]);
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
  }, [
    gameStarted,
    gameOver,
    showAlignmentGuide,
    stopAll,
    modeSettings,
    playSoundEffect,
    gameMode,
    puzzleLevel,
  ]);

  // Submit score on game over (with offline queue)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only trigger on gameOver change
  useEffect(() => {
    if (gameOver && score > 0) {
      submitScoreMutation.mutateAsync({ username, score }).catch(() => {
        try {
          const pending = JSON.parse(
            localStorage.getItem("pendingScores") || "[]",
          );
          pending.push({ username, score, timestamp: Date.now() });
          localStorage.setItem("pendingScores", JSON.stringify(pending));
          toast(t("game.scoreSavedOffline") || "Skor çevrimdışı kaydedildi.");
        } catch {
          // ignore storage errors
        }
      });
    }
  }, [gameOver]);

  // Check puzzle mode win condition
  useEffect(() => {
    if (gameMode !== "puzzle" || !gameStarted || gameOver) return;
    const currentPuzzle = PUZZLE_LEVELS[puzzleLevel];
    if (!currentPuzzle) return;

    if (puzzleMergeCount >= currentPuzzle.targetCount) {
      puzzleMergeCountRef.current = 0;
      setPuzzleMergeCount(0);
      setShowPuzzleWinDialog(true);
    }
  }, [puzzleMergeCount, gameMode, gameStarted, gameOver, puzzleLevel]);

  // Check puzzle mode - moves exhausted
  useEffect(() => {
    if (gameMode !== "puzzle" || !gameStarted || gameOver) return;
    if (movesRemaining <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
      setShowGameOverDialog(true);
      stopAll();
    }
  }, [movesRemaining, gameMode, gameStarted, gameOver, stopAll]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    initializeAudio();
    setSoundHintVisible(false);
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
        return Math.sqrt(dx * dx + dy * dy) < fruit.radius * fruit.scale;
      });

      if (clickedFruitIndex !== -1) {
        const clickedFruit = fruitsRef.current[clickedFruitIndex];
        explosionAnimationRef.current = {
          x: clickedFruit.x,
          y: clickedFruit.y,
          frame: 0,
        };
        playSoundEffect("bombExplode");
        const destroyRadius = 80;
        fruitsRef.current = fruitsRef.current.filter((fruit) => {
          const dx = fruit.x - clickedFruit.x;
          const dy = fruit.y - clickedFruit.y;
          return Math.sqrt(dx * dx + dy * dy) > destroyRadius;
        });
        setBombMode(false);
      }
      return;
    }

    if (!canDropRef.current) return;

    const levelData = FRUIT_LEVELS[nextFruitRef.current];
    const clampedX = Math.max(
      levelData.size,
      Math.min(x, CANVAS_WIDTH - levelData.size),
    );

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
    const newNextFruit = Math.floor(
      Math.random() * Math.min(5, FRUIT_LEVELS.length),
    );
    nextFruitRef.current = newNextFruit;
    setNextFruitDisplay(newNextFruit);
    canDropRef.current = false;
    playSoundEffect("fruitDrop");

    if (gameMode === "puzzle") {
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
    scoreRef.current = 0;
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
    setShareCopied(false);

    if (gameMode === "puzzle") {
      setMovesRemaining(20);
      setPuzzleLevel(0);
      setPuzzleMergeCount(0);
      puzzleMergeCountRef.current = 0;
      setPuzzleAllComplete(false);
    }

    if (gameMode === "endless") {
      endlessMultiplierRef.current = 1.0;
      setEndlessMultiplier(1.0);
    }

    stopAll();
  };

  const startGame = () => {
    setGameStarted(true);
    resetGame();
    initializeAudio();
    playSoundEffect("gameStart");
    if (isMusicOn) {
      setTimeout(() => {
        playMusic();
      }, 500);
      // Show sound hint for web autoplay restriction awareness
      setSoundHintVisible(true);
      setTimeout(() => setSoundHintVisible(false), 3000);
    }
  };

  const handleNextPuzzleLevel = () => {
    const nextLevelIndex = puzzleLevel + 1;
    setShowPuzzleWinDialog(false);
    puzzleMergeCountRef.current = 0;
    setPuzzleMergeCount(0);

    if (nextLevelIndex >= PUZZLE_LEVELS.length) {
      setPuzzleAllComplete(true);
      gameOverRef.current = true;
      setGameOver(true);
      setShowGameOverDialog(true);
    } else {
      setPuzzleLevel(nextLevelIndex);
      setMovesRemaining(20);
    }
  };

  // Share handlers
  const getShareMessage = () => {
    const modeLabel = modeSettings.modeLabel;
    return `FruitVerse'de ${score} puan yaptım! (${modeLabel}) Siz de oynayın: https://fruitverse-kaz.caffeine.xyz/`;
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(getShareMessage());
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleShareTwitter = () => {
    const msg = encodeURIComponent(getShareMessage());
    window.open(`https://twitter.com/intent/tweet?text=${msg}`, "_blank");
  };

  const handleShareCopy = async () => {
    try {
      await navigator.clipboard.writeText(getShareMessage());
      setShareCopied(true);
      toast.success(t("share.copied"));
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  const currentPuzzle = PUZZLE_LEVELS[puzzleLevel];

  const boosters = [
    { type: "bomb" as BoosterTypeKey, count: bombCount, icon: "💣" },
    {
      type: "nextFruitChange" as BoosterTypeKey,
      count: nextFruitChangeCount,
      icon: "🔄",
    },
    { type: "alignment" as BoosterTypeKey, count: alignmentCount, icon: "📏" },
  ];

  const isEndlessBeat =
    gameMode === "endless" && score > 0 && score > highScore;

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
              <p className="game-instructions">{t("game.instructions")}</p>
              <Button
                onClick={startGame}
                size="lg"
                className="game-start-button"
                disabled={audioLoading}
                data-ocid="game.primary_button"
              >
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                {audioLoading ? t("game.loading") : t("game.startGame")}
              </Button>
            </div>
          ) : (
            <>
              {/* Puzzle objective panel - prominent */}
              {gameMode === "puzzle" && currentPuzzle && !gameOver && (
                <div
                  className="w-full mb-2 rounded-xl overflow-hidden border-2 border-amber-400"
                  style={{
                    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                  }}
                >
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-lg font-black"
                        style={{
                          animation:
                            puzzleMergeCount > 0
                              ? "pulse 0.4s ease-in-out"
                              : undefined,
                        }}
                      >
                        {currentPuzzle.label.split(" ")[0]}
                      </span>
                      <span className="text-white font-bold text-sm drop-shadow">
                        {t("puzzle.objective")}: {currentPuzzle.label}
                      </span>
                    </div>
                    <span className="text-white font-black text-sm drop-shadow">
                      {t("puzzle.level", { level: String(puzzleLevel + 1) })} ·{" "}
                      {puzzleMergeCount}/{currentPuzzle.targetCount}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-amber-200/50">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.min((puzzleMergeCount / currentPuzzle.targetCount) * 100, 100)}%`,
                        background: "linear-gradient(90deg, #fff, #fef3c7)",
                        boxShadow: "0 0 8px rgba(255,255,255,0.8)",
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="game-controls-row">
                <div className="flex flex-col items-start gap-0.5">
                  <div className="game-score">
                    {t("game.score")}: {score}
                    {isEndlessBeat && (
                      <span
                        className="ml-1 text-xs font-black animate-pulse"
                        style={{ color: "#f59e0b" }}
                      >
                        ★
                      </span>
                    )}
                  </div>
                  {highScore > 0 && (
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("game.personalBest", { score: String(highScore) })}
                    </div>
                  )}
                  <div className="text-xs font-semibold text-primary">
                    {modeSettings.modeLabel}
                  </div>
                  {gameMode === "puzzle" && (
                    <div className="text-xs font-medium text-muted-foreground">
                      {t("mode.puzzle.moves")}: {movesRemaining}
                    </div>
                  )}
                  {gameMode === "endless" && endlessMultiplier > 1 && (
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black"
                      style={{
                        background:
                          endlessMultiplier >= 3
                            ? "linear-gradient(90deg, #7c3aed, #db2777)"
                            : endlessMultiplier >= 2
                              ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                              : "linear-gradient(90deg, #fbbf24, #f97316)",
                        color: "#fff",
                        boxShadow:
                          endlessMultiplier >= 2
                            ? "0 0 8px rgba(245,158,11,0.7)"
                            : undefined,
                        animation:
                          endlessMultiplier >= 4
                            ? "pulse 0.8s infinite"
                            : undefined,
                      }}
                    >
                      ⚡ ×{endlessMultiplier.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="game-boosters-inline">
                  {boosters.map((booster) => {
                    const isActive = activeBooster === booster.type;
                    const canUse = booster.count > 0;
                    return (
                      <div
                        key={booster.type}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            canUse
                              ? onActivateBooster(booster.type)
                              : openRewardAd(booster.type)
                          }
                          disabled={isActive}
                          className={`booster-inline-btn ${isActive ? "booster-inline-active" : ""} ${!canUse ? "booster-inline-disabled" : ""}`}
                          title={
                            booster.type === "alignment"
                              ? "10 saniye boyunca dikey bir düşme rehberi gösterir"
                              : canUse
                                ? `${booster.icon} ${booster.count}`
                                : t("booster.watchAd")
                          }
                          data-ocid="game.toggle"
                        >
                          <span className="booster-inline-icon">
                            {booster.icon}
                          </span>
                          <span className="booster-inline-count">
                            {booster.count}
                          </span>
                        </button>
                        {!canUse && (
                          <button
                            type="button"
                            onClick={() => openRewardAd(booster.type)}
                            className="text-xs leading-none text-blue-500 hover:text-blue-700 transition-colors"
                            title={t("booster.watchAd")}
                          >
                            📺
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="game-controls-right">
                  <Button
                    onClick={() => setShowHowToPlay(true)}
                    variant="ghost"
                    size="sm"
                    className="sound-toggle-btn"
                    title={t("howToPlay.title")}
                  >
                    <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </Button>
                  <Button
                    onClick={handleToggleSound}
                    variant="ghost"
                    size="sm"
                    className="sound-toggle-btn"
                    title={isMusicOn ? t("sound.turnOff") : t("sound.turnOn")}
                  >
                    {isMusicOn ? (
                      <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    ) : (
                      <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    )}
                  </Button>
                  {gameStarted && !gameOver && (
                    <Button
                      onClick={() => {
                        const next = !isPaused;
                        setIsPaused(next);
                        isPausedRef.current = next;
                      }}
                      variant="ghost"
                      size="sm"
                      className="sound-toggle-btn"
                      data-ocid={
                        isPaused ? "game.resume_button" : "game.pause_button"
                      }
                      title={isPaused ? t("game.resume") : t("game.pause")}
                    >
                      <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </Button>
                  )}
                  <Button
                    onClick={resetGame}
                    variant="outline"
                    size="sm"
                    className="game-reset-btn"
                    data-ocid="game.secondary_button"
                  >
                    <RotateCcw className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                    {t("game.restart")}
                  </Button>
                </div>
              </div>

              {bombMode && (
                <div className="bomb-mode-indicator">
                  {t("booster.selectFruit")}
                </div>
              )}

              {/* Game canvas wrapper - speed / endless mode styling */}
              <div
                ref={containerRef}
                className={`game-canvas-container${gameMode === "endless" ? " endless-mode-active" : ""}${gameMode === "speed" ? " speed-mode-active" : ""}`}
                style={{
                  position: "relative",
                  boxShadow:
                    gameMode === "speed"
                      ? canvasFlash
                        ? "0 0 0 4px #fff, 0 0 28px 8px #ef4444"
                        : "0 0 20px 4px rgba(251,63,0,0.7)"
                      : canvasFlash
                        ? "0 0 0 3px #fff, 0 0 20px 6px rgba(0,200,255,0.8)"
                        : undefined,
                  transition: "box-shadow 0.15s ease",
                }}
              >
                {/* Speed mode vignette overlay */}
                {gameMode === "speed" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background:
                        "radial-gradient(ellipse at center, transparent 55%, rgba(220,30,0,0.35) 100%)",
                      borderRadius: "inherit",
                      zIndex: 2,
                      animation: "speedPulse 1s ease-in-out infinite",
                    }}
                  />
                )}
                {/* Speed mode badge */}
                {gameMode === "speed" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      zIndex: 12,
                      pointerEvents: "none",
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #dc2626, #f97316)",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      boxShadow: "0 0 12px rgba(239,68,68,0.9)",
                      animation: "speedPulse 0.8s ease-in-out infinite",
                    }}
                  >
                    ⚡ SPEED MODE
                  </div>
                )}
                {gameMode === "endless" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background: "rgba(15, 15, 40, 0.7)",
                      borderRadius: "inherit",
                      zIndex: 1,
                    }}
                  />
                )}
                {/* Endless beat record indicator */}
                {isEndlessBeat && gameMode === "endless" && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 10,
                      pointerEvents: "none",
                      padding: "2px 10px",
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
                      color: "#1a0a00",
                      fontWeight: 900,
                      fontSize: 11,
                      letterSpacing: "0.05em",
                      boxShadow: "0 0 12px rgba(251,191,36,0.8)",
                      animation: "pulse 1s infinite",
                    }}
                  >
                    🏆 KİŞİSEL REKOR!
                  </div>
                )}
                {/* Sound autoplay hint */}
                {soundHintVisible && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 10,
                      pointerEvents: "none",
                      padding: "4px 12px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.65)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    🔊 Sesi başlatmak için tıklayın
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleCanvasClick(
                        e as unknown as React.MouseEvent<HTMLCanvasElement>,
                      );
                  }}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={handleCanvasMouseLeave}
                  className={`game-canvas ${bombMode ? "cursor-crosshair border-red-500" : "cursor-pointer"}`}
                  style={{
                    width: `${CANVAS_WIDTH * canvasScale}px`,
                    height: `${CANVAS_HEIGHT * canvasScale}px`,
                  }}
                  data-ocid="game.canvas_target"
                />
                {/* Pause overlay */}
                {isPaused && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 20,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.6)",
                      borderRadius: "inherit",
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 22,
                        letterSpacing: "0.08em",
                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                      }}
                    >
                      {t("game.paused")}
                    </div>
                    <Button
                      onClick={() => {
                        setIsPaused(false);
                        isPausedRef.current = false;
                      }}
                      data-ocid="game.resume_button"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {t("game.resume")}
                    </Button>
                  </div>
                )}
                {/* Combo display */}
                {comboDisplay.visible && comboDisplay.count >= 2 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "30%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 15,
                      pointerEvents: "none",
                      padding: "6px 18px",
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 18,
                      letterSpacing: "0.05em",
                      boxShadow: "0 0 16px rgba(239,68,68,0.8)",
                      animation: "pulse 0.5s ease-in-out",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("game.combo", { count: String(comboDisplay.count) })}
                  </div>
                )}
                {/* Booster feedback */}
                {boosterFeedback && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 15,
                      pointerEvents: "none",
                      padding: "8px 20px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.75)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 16,
                      animation: "pulse 0.4s ease-in-out 2",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {boosterFeedback}
                  </div>
                )}
              </div>

              <div className="next-fruit-indicator">
                <span className="text-xs text-muted-foreground">
                  {t("game.nextFruit")}:
                </span>{" "}
                <span className="text-2xl">
                  {FRUIT_LEVELS[nextFruitDisplay].emoji}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Game Over Dialog */}
      <AlertDialog
        open={showGameOverDialog}
        onOpenChange={setShowGameOverDialog}
      >
        <AlertDialogContent data-ocid="game.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl text-center">
              {puzzleAllComplete ? t("puzzle.allComplete") : t("game.gameOver")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3 sm:space-y-4">
              <div className="text-4xl sm:text-5xl md:text-6xl">
                {puzzleAllComplete ? "🏆" : "🎮"}
              </div>
              <div className="text-lg sm:text-xl font-bold text-foreground">
                {t("game.finalScore")}: {score}
              </div>
              {score > highScore && highScore > 0 && (
                <div className="text-sm font-bold text-yellow-500">
                  🏆 {t("game.personalRecord")}
                </div>
              )}
              <p className="text-sm sm:text-base">
                {t("game.gameOverMessage")}
              </p>

              {/* Social Share buttons */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  {t("share.title")}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareWhatsApp}
                    className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                    data-ocid="game.secondary_button"
                  >
                    💬 {t("share.whatsapp")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareTwitter}
                    className="text-sky-600 border-sky-300 hover:bg-sky-50 text-xs"
                    data-ocid="game.secondary_button"
                  >
                    🐦 {t("share.twitter")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareCopy}
                    className="text-xs"
                    data-ocid="game.secondary_button"
                  >
                    {shareCopied ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-green-600" />
                        {t("share.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        {t("share.copy")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              onClick={resetGame}
              className="w-full sm:w-auto"
              data-ocid="game.confirm_button"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("game.playAgain")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Puzzle Win Dialog */}
      <Dialog open={showPuzzleWinDialog} onOpenChange={setShowPuzzleWinDialog}>
        <DialogContent
          className="max-w-xs text-center"
          data-ocid="puzzle.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              🎉 {t("puzzle.win")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-5xl mb-3">🍀</div>
            <p className="text-sm text-muted-foreground">
              {t("puzzle.level", { level: String(puzzleLevel + 1) })}{" "}
              {t("puzzle.win")}
            </p>
          </div>
          <DialogFooter className="justify-center">
            <Button
              onClick={handleNextPuzzleLevel}
              data-ocid="puzzle.primary_button"
            >
              {puzzleLevel + 1 >= PUZZLE_LEVELS.length
                ? t("puzzle.allComplete")
                : t("puzzle.nextLevel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How To Play Dialog */}
      <HowToPlayDialog
        open={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      {/* Rewarded Ad Dialog */}
      <Dialog
        open={showRewardAdDialog}
        onOpenChange={(open) => {
          if (!open) {
            if (adIntervalRef.current) clearInterval(adIntervalRef.current);
            setShowRewardAdDialog(false);
            setRewardAdBoosterType(null);
          }
        }}
      >
        <DialogContent
          className="max-w-xs text-center"
          data-ocid="rewardad.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-center">
              {t("booster.adTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="text-5xl">📺</div>
            <p className="text-sm text-muted-foreground">
              {t("booster.adDescription")}
            </p>
            {!adComplete ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <span className="text-2xl font-bold text-primary">
                  {adCountdown}s
                </span>
              </div>
            ) : (
              <div className="text-green-600 font-bold text-sm">
                ✅ {t("ads.adComplete")}
              </div>
            )}
          </div>
          <DialogFooter className="justify-center">
            <Button
              onClick={handleClaimRewardAd}
              disabled={!adComplete}
              data-ocid="rewardad.confirm_button"
            >
              {adComplete ? t("ads.claimReward") : t("booster.adWatching")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
