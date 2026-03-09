import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBackendHealthCheck } from "@/hooks/useQueries";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function HealthMonitor() {
  const { t, language } = useLanguage();
  const { data: healthStatus, isLoading: healthLoading } =
    useBackendHealthCheck();
  const [lastCheckTime, setLastCheckTime] = useState<string>("");

  useEffect(() => {
    if (healthStatus?.timestamp) {
      const date = new Date(healthStatus.timestamp);
      setLastCheckTime(
        date.toLocaleTimeString(language, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }
  }, [healthStatus, language]);

  const isUnhealthy =
    healthStatus?.status === "error" || healthStatus?.status === "disconnected";

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "disconnected":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("health.title")}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(healthStatus?.status)} text-white border-none`}
                >
                  {getStatusIcon(healthStatus?.status)}
                  <span className="ml-1">
                    {t(`health.status.${healthStatus?.status || "unknown"}`)}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("health.statusTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-xs">
          {t("health.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("health.lastCheck")}
          </span>
          <span className="font-medium">
            {healthLoading ? t("health.checking") : lastCheckTime}
          </span>
        </div>

        {/* Reconnecting indicator */}
        {isUnhealthy && (
          <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("health.reconnecting")}
          </div>
        )}

        {/* Status Message */}
        <div className="text-xs text-muted-foreground">
          {healthStatus?.status === "healthy" && (
            <p className="text-green-600">{t("health.message.healthy")}</p>
          )}
          {healthStatus?.status === "error" && (
            <p className="text-red-600">{t("health.message.error")}</p>
          )}
          {healthStatus?.status === "disconnected" && (
            <p className="text-yellow-600">
              {t("health.message.disconnected")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
