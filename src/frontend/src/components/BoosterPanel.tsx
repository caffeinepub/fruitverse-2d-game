import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlignCenterVertical, Bomb, RefreshCw } from "lucide-react";

export type BoosterTypeKey = "bomb" | "nextFruitChange" | "alignment";

interface BoosterPanelProps {
  bombCount: number;
  nextFruitChangeCount: number;
  alignmentCount: number;
  activeBooster: BoosterTypeKey | null;
  onActivateBooster: (type: BoosterTypeKey) => void;
  disabled?: boolean;
}

export default function BoosterPanel({
  bombCount,
  nextFruitChangeCount,
  alignmentCount,
  activeBooster,
  onActivateBooster,
  disabled = false,
}: BoosterPanelProps) {
  const { t } = useLanguage();

  const boosters = [
    {
      type: "bomb" as BoosterTypeKey,
      name: t("booster.bomb"),
      description: t("booster.bombDesc"),
      icon: Bomb,
      count: bombCount,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950",
      borderColor: "border-red-200 dark:border-red-800",
      image: "/assets/generated/bomb-booster-icon-transparent.dim_64x64.png",
    },
    {
      type: "nextFruitChange" as BoosterTypeKey,
      name: t("booster.nextFruitChange"),
      description: t("booster.nextFruitChangeDesc"),
      icon: RefreshCw,
      count: nextFruitChangeCount,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      borderColor: "border-blue-200 dark:border-blue-800",
      image:
        "/assets/generated/fruit-change-booster-icon-transparent.dim_64x64.png",
    },
    {
      type: "alignment" as BoosterTypeKey,
      name: t("booster.alignment"),
      description: t("booster.alignmentDesc"),
      icon: AlignCenterVertical,
      count: alignmentCount,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
      borderColor: "border-green-200 dark:border-green-800",
      image:
        "/assets/generated/alignment-booster-icon-transparent.dim_64x64.png",
    },
  ];

  return (
    <Card className="booster-card">
      <CardHeader className="booster-card-header">
        <CardTitle className="booster-card-title">
          {t("booster.title")}
        </CardTitle>
        <CardDescription className="booster-card-description">
          {t("booster.clickToUse")}
        </CardDescription>
      </CardHeader>
      <CardContent className="booster-card-content">
        <div className="booster-grid">
          {boosters.map((booster) => {
            const Icon = booster.icon;
            const isActive = activeBooster === booster.type;
            const canUse = booster.count > 0 && !disabled;

            return (
              <div
                key={booster.type}
                className={`booster-item ${
                  isActive
                    ? `${booster.borderColor} ${booster.bgColor} shadow-md`
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                {/* Icon and Badge */}
                <div className="booster-icon-wrapper">
                  <img
                    src={booster.image}
                    alt={booster.name}
                    className="booster-icon"
                  />
                  {isActive && (
                    <div className="booster-active-badge">
                      <Badge
                        variant="default"
                        className="h-3 px-0.5 text-[9px] leading-none"
                      >
                        {t("booster.active")}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="booster-info">
                  <div className="booster-header">
                    <h3 className="booster-name">{booster.name}</h3>
                    <Badge variant="secondary" className="booster-count">
                      {booster.count}
                    </Badge>
                  </div>
                  <p className="booster-description">{booster.description}</p>
                </div>

                {/* Action Button */}
                <div className="booster-actions">
                  <Button
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    onClick={() => onActivateBooster(booster.type)}
                    disabled={!canUse || isActive}
                    className="booster-use-button"
                  >
                    <Icon className="booster-button-icon" />
                    <span className="booster-button-text">
                      {t("booster.use")}
                    </span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
