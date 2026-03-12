import { Button } from "@/components/ui/button";
import { useBackendHealthCheck } from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export default function BackendStatusBanner() {
  const { data, isError, isRefetching, refetch } = useBackendHealthCheck();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(10);
  const [isRetrying, setIsRetrying] = useState(false);

  const isOffline =
    isError || data?.status === "error" || data?.status === "disconnected";

  // Countdown timer — resets whenever offline state changes
  useEffect(() => {
    if (!isOffline) return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOffline]);

  if (!isOffline) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    setCountdown(10);
    try {
      await queryClient.invalidateQueries({ queryKey: ["backendHealth"] });
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      data-ocid="backend.error_state"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500 text-amber-950"
      style={{ boxShadow: "0 2px 12px 0 rgba(180,90,0,0.25)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="shrink-0 h-4 w-4" />
        <span className="text-sm font-semibold truncate">
          Sunucu bağlantısı kesildi
        </span>
        <span className="hidden sm:inline text-xs font-normal opacity-80">
          — {countdown} saniye sonra yeniden deneniyor
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="sm:hidden text-xs font-normal opacity-80">
          {countdown}s
        </span>
        {isRefetching || isRetrying ? (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Bağlanıyor...</span>
          </div>
        ) : (
          <Button
            data-ocid="backend.primary_button"
            size="sm"
            onClick={handleRetry}
            className="h-7 px-3 text-xs font-semibold bg-amber-950 text-amber-100 hover:bg-amber-900 border-0"
          >
            <Wifi className="h-3.5 w-3.5 mr-1" />
            Yeniden Dene
          </Button>
        )}
      </div>
    </div>
  );
}
