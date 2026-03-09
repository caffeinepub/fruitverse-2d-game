import AvatarSelectorDialog from "@/components/AvatarSelectorDialog";
import type { BoosterTypeKey } from "@/components/BoosterPanel";
import FruitAnimation from "@/components/FruitAnimation";
import FruitMergeGame from "@/components/FruitMergeGame";
import HealthMonitor from "@/components/HealthMonitor";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Leaderboard from "@/components/Leaderboard";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVisualTheme } from "@/contexts/ThemeContext";
import {
  useDeleteOwnAccount,
  useGetAvatar,
  useGetBoosterInventory,
  useUseBooster,
} from "@/hooks/useQueries";
import { Activity, ArrowLeft, LogOut, Trash2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BoosterType } from "../backend";
import ModeSelectionPage, { type GameMode } from "./ModeSelectionPage";

interface GamePageProps {
  username: string;
  onLogout: () => void;
}

export default function GamePage({ username, onLogout }: GamePageProps) {
  const { t } = useLanguage();
  const { visualTheme } = useVisualTheme();
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [activeBooster, setActiveBooster] = useState<BoosterTypeKey | null>(
    null,
  );
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [healthMonitorOpen, setHealthMonitorOpen] = useState(false);

  const { data: boosterInventory, isLoading } =
    useGetBoosterInventory(username);
  const useBoosterMutation = useUseBooster();
  const { data: avatarData } = useGetAvatar(username);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const deleteAccountMutation = useDeleteOwnAccount();

  // Check daily streak reset on mount
  useEffect(() => {
    const lastLogin = localStorage.getItem("lastLoginDate");
    const today = new Date().toDateString();
    if (lastLogin && lastLogin !== today) {
      const lastDate = new Date(lastLogin);
      const todayDate = new Date();
      const diffMs = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        // Streak was broken
        localStorage.setItem("dailyStreakCount", "0");
        toast.info(t("dailyReward.streakReset"));
      }
    }
    localStorage.setItem("lastLoginDate", today);
  }, [t]);

  const currentAvatar = localAvatar || avatarData || "🍎";

  const themeBackgrounds = {
    tropical: "/assets/generated/tropical-fruits-bg.dim_800x600.png",
    berry: "/assets/generated/berry-forest-bg.dim_800x600.png",
    citrus: "/assets/generated/citrus-blast-bg.dim_800x600.png",
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
      toast.error(t("booster.notEnough"));
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
      console.error("Failed to use booster:", error);
      toast.error(t("error.actorNotInitialized"));
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

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync({ username });
      localStorage.clear();
      onLogout();
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Hesap silinemedi. Lütfen tekrar deneyin.");
    }
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
          filter: "brightness(0.6)",
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
                <h1 className="game-title">{t("app.title")}</h1>
                <p className="game-subtitle">
                  {t("app.welcomeUser", { username })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvatarDialogOpen(true)}
                className="text-xl sm:text-2xl leading-none hover:scale-110 transition-transform cursor-pointer select-none"
                title={t("avatar.select")}
                data-ocid="avatar.open_modal_button"
              >
                {currentAvatar}
              </button>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToModeSelection}
                className="font-semibold text-xs px-1.5 sm:px-3"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t("mode.back")}</span>
              </Button>
              <Dialog
                open={healthMonitorOpen}
                onOpenChange={setHealthMonitorOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-semibold text-xs px-1.5 sm:px-3"
                  >
                    <Activity className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">
                      {t("health.monitor")}
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="sr-only">
                      {t("health.title")}
                    </DialogTitle>
                  </DialogHeader>
                  <HealthMonitor />
                </DialogContent>
              </Dialog>
              <Dialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-semibold text-xs px-1.5 sm:px-3"
                  >
                    <Trophy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">
                      {t("leaderboard.viewLeaderboard")}
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="sr-only">
                      {t("leaderboard.title")}
                    </DialogTitle>
                  </DialogHeader>
                  <Leaderboard currentUsername={username} />
                </DialogContent>
              </Dialog>
              <ThemeSwitcher />
              <LanguageSwitcher />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-semibold text-xs px-1.5 sm:px-3 text-destructive border-destructive/40 hover:bg-destructive/10"
                    data-ocid="account.delete_button"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1.5">Hesabı Sil</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent data-ocid="account.dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Hesabınızı silmek istediğinizden emin misiniz? Bu işlem
                      geri alınamaz. Tüm verileriniz (skor, güçlendiriciler,
                      rozetler) kalıcı olarak silinecektir.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-ocid="account.cancel_button">
                      İptal
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-ocid="account.confirm_button"
                    >
                      Evet, Hesabımı Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="font-semibold text-xs px-1.5 sm:px-3"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t("auth.logout")}</span>
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
                nextFruitChangeCount={Number(
                  boosterInventory.nextFruitChangeCount,
                )}
                alignmentCount={Number(boosterInventory.alignmentCount)}
                onActivateBooster={handleActivateBooster}
                gameMode={selectedMode}
              />
            )}
          </div>
        </main>
      </div>

      <AvatarSelectorDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        username={username}
        currentAvatar={currentAvatar}
        onAvatarUpdated={(newAvatar) => setLocalAvatar(newAvatar)}
      />
    </div>
  );
}
