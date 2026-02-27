import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Trophy, Activity, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVisualTheme } from '@/contexts/ThemeContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import FruitAnimation from '@/components/FruitAnimation';
import FruitMergeGame from '@/components/FruitMergeGame';
import ModeSelectionPage, { GameMode } from './ModeSelectionPage';
import { BoosterTypeKey } from '@/components/BoosterPanel';
import Leaderboard from '@/components/Leaderboard';
import HealthMonitor from '@/components/HealthMonitor';
import { useGetBoosterInventory, useUseBooster } from '@/hooks/useQueries';
import { BoosterType } from '../backend';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface GamePageProps {
  username: string;
  onLogout: () => void;
}

export default function GamePage({ username, onLogout }: GamePageProps) {
  const { t } = useLanguage();
  const { visualTheme } = useVisualTheme();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [activeBooster, setActiveBooster] = useState<BoosterTypeKey | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [healthMonitorOpen, setHealthMonitorOpen] = useState(false);

  const { data: boosterInventory, isLoading } = useGetBoosterInventory(username);
  const useBoosterMutation = useUseBooster();

  const themeBackgrounds = {
    tropical: '/assets/generated/tropical-fruits-bg.dim_800x600.png',
    berry: '/assets/generated/berry-forest-bg.dim_800x600.png',
    citrus: '/assets/generated/citrus-blast-bg.dim_800x600.png',
  };

  const handleActivateBooster = async (type: BoosterTypeKey) => {
    if (!boosterInventory) return;

    const boosterTypeMap: Record<BoosterTypeKey, BoosterType> = {
      bomb: BoosterType.bomb,
      nextFruitChange: BoosterType.nextFruitChange,
      alignment: BoosterType.alignment,
    };

    const counts = {
      bomb: Number(boosterInventory.bombCount),
      nextFruitChange: Number(boosterInventory.nextFruitChangeCount),
      alignment: Number(boosterInventory.alignmentCount),
    };

    if (counts[type] <= 0) {
      toast.error(t('booster.notEnough'));
      return;
    }

    try {
      await useBoosterMutation.mutateAsync({
        username,
        boosterType: boosterTypeMap[type],
        amount: BigInt(1),
      });

      setActiveBooster(type);
    } catch (error) {
      console.error('Failed to use booster:', error);
      toast.error(t('error.actorNotInitialized'));
    }
  };

  const handleBoosterUsed = () => {
    setActiveBooster(null);
  };

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
  };

  const handleBackToModeSelection = () => {
    setSelectedMode(null);
  };

  // Show mode selection if no mode is selected
  if (!selectedMode) {
    return <ModeSelectionPage onModeSelect={handleModeSelect} />;
  }

  return (
    <div className="game-page-container">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: `url(${themeBackgrounds[visualTheme]})`,
          filter: 'brightness(0.6)',
        }}
      />

      {/* Animated Fruits */}
      <FruitAnimation theme={visualTheme} />

      {/* Content */}
      <div className="relative z-10 game-content-wrapper">
        {/* Header */}
        <header className="game-header">
          <div className="game-header-content">
            <div className="flex items-center gap-1 sm:gap-2">
              <img
                src="/assets/generated/fruitverse-logo-transparent.dim_200x200.png"
                alt="FruitVerse"
                className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10"
              />
              <div>
                <h1 className="game-title">
                  {t('app.title')}
                </h1>
                <p className="game-subtitle">
                  {t('app.welcomeUser', { username })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBackToModeSelection}
                className="font-semibold text-xs px-1.5 sm:px-3"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('mode.back')}</span>
              </Button>
              <Dialog open={healthMonitorOpen} onOpenChange={setHealthMonitorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="font-semibold text-xs px-1.5 sm:px-3">
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t('health.monitor')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="sr-only">{t('health.title')}</DialogTitle>
                  </DialogHeader>
                  <HealthMonitor />
                </DialogContent>
              </Dialog>
              <Dialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="font-semibold text-xs px-1.5 sm:px-3">
                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t('leaderboard.viewLeaderboard')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="sr-only">{t('leaderboard.title')}</DialogTitle>
                  </DialogHeader>
                  <Leaderboard currentUsername={username} />
                </DialogContent>
              </Dialog>
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Button variant="outline" size="sm" onClick={onLogout} className="font-semibold text-xs px-1.5 sm:px-3">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('auth.logout')}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="game-main-content">
          {/* Game Canvas - Center, flexible, optimized for all screens */}
          <div className="game-canvas-wrapper">
            {!isLoading && boosterInventory && (
              <FruitMergeGame
                activeBooster={activeBooster}
                onBoosterUsed={handleBoosterUsed}
                username={username}
                bombCount={Number(boosterInventory.bombCount)}
                nextFruitChangeCount={Number(boosterInventory.nextFruitChangeCount)}
                alignmentCount={Number(boosterInventory.alignmentCount)}
                onActivateBooster={handleActivateBooster}
                gameMode={selectedMode}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
