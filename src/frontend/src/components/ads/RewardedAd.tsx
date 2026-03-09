import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";
import { toast } from "sonner";

interface RewardedAdProps {
  open: boolean;
  onClose: () => void;
  onRewardClaimed: () => void;
  boosterType: string;
}

export default function RewardedAd({
  open,
  onClose,
  onRewardClaimed,
  boosterType: _boosterType,
}: RewardedAdProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;

    // Trigger native Android rewarded ad via JavaScript bridge
    if (
      window.AndroidBridge &&
      typeof window.AndroidBridge.showRewardedAd === "function"
    ) {
      window.AndroidBridge.showRewardedAd();
    } else {
      console.warn("AndroidBridge not available - running in browser mode");
      toast.error(t("ads.adFailedToLoad"));
      onClose();
    }

    // Listen for ad completion and reward callback from native Android
    const handleAdRewarded = () => {
      toast.success(t("ads.adComplete"));
      onRewardClaimed();
      onClose();
    };

    const handleAdClosed = () => {
      onClose();
    };

    const handleAdFailed = () => {
      toast.error(t("ads.adFailedToLoad"));
      onClose();
    };

    window.addEventListener("rewardedAdRewarded", handleAdRewarded);
    window.addEventListener("rewardedAdClosed", handleAdClosed);
    window.addEventListener("rewardedAdFailed", handleAdFailed);

    return () => {
      window.removeEventListener("rewardedAdRewarded", handleAdRewarded);
      window.removeEventListener("rewardedAdClosed", handleAdClosed);
      window.removeEventListener("rewardedAdFailed", handleAdFailed);
    };
  }, [open, onClose, onRewardClaimed, t]);

  // Return null - native Android SDK handles the ad display
  return null;
}
