import { useEffect } from 'react';

interface InterstitialAdProps {
  onClose: () => void;
}

export default function InterstitialAd({ onClose }: InterstitialAdProps) {
  useEffect(() => {
    // Trigger native Android interstitial ad via JavaScript bridge
    if (window.AndroidBridge && typeof window.AndroidBridge.showInterstitialAd === 'function') {
      window.AndroidBridge.showInterstitialAd();
    } else {
      console.warn('AndroidBridge not available - running in browser mode');
    }

    // Listen for ad completion callback from native Android
    const handleAdComplete = () => {
      onClose();
    };

    window.addEventListener('interstitialAdClosed', handleAdComplete);

    return () => {
      window.removeEventListener('interstitialAdClosed', handleAdComplete);
    };
  }, [onClose]);

  // Return null - native Android SDK handles the ad display
  return null;
}
