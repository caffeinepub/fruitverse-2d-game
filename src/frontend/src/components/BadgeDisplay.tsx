import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Badges } from "../backend";

interface BadgeDisplayProps {
  badges: Badges;
  size?: "sm" | "md" | "lg";
}

export default function BadgeDisplay({
  badges,
  size = "md",
}: BadgeDisplayProps) {
  const { t } = useLanguage();

  const getBadgeInfo = () => {
    if (badges.hasMaster) {
      return {
        name: t("badge.master"),
        image: "/assets/generated/master-badge-transparent.dim_64x64.png",
        color: "from-purple-500 to-pink-500",
      };
    }
    if (badges.hasAdvanced) {
      return {
        name: t("badge.advanced"),
        image: "/assets/generated/platinum-badge-transparent.dim_64x64.png",
        color: "from-blue-400 to-cyan-400",
      };
    }
    if (badges.hasRookie) {
      return {
        name: t("badge.rookie"),
        image: "/assets/generated/silver-badge-transparent.dim_64x64.png",
        color: "from-gray-300 to-gray-500",
      };
    }
    if (badges.hasNovice) {
      return {
        name: t("badge.novice"),
        image: "/assets/generated/bronze-badge-transparent.dim_64x64.png",
        color: "from-amber-600 to-amber-800",
      };
    }
    return null;
  };

  const badgeInfo = getBadgeInfo();

  if (!badgeInfo) {
    return null;
  }

  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center justify-center">
            <img
              src={badgeInfo.image}
              alt={badgeInfo.name}
              className={`${sizeClasses[size]} object-contain`}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{badgeInfo.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
