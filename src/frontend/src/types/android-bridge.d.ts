declare global {
  interface Window {
    AndroidBridge?: {
      showInterstitialAd: () => void;
      showRewardedAd: () => void;
    };
    AndroidAudio?: {
      playSound: (soundName: string) => void;
    };
  }
}

export {};
