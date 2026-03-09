import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUpdateAvatar } from "@/hooks/useQueries";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRESET_AVATARS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍉", "🍒", "🥥"];

interface AvatarSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  currentAvatar: string;
  onAvatarUpdated?: (newAvatar: string) => void;
}

export default function AvatarSelectorDialog({
  open,
  onOpenChange,
  username,
  currentAvatar,
  onAvatarUpdated,
}: AvatarSelectorDialogProps) {
  const { t } = useLanguage();
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || "🍎");
  const updateAvatarMutation = useUpdateAvatar();

  const handleSave = async () => {
    try {
      await updateAvatarMutation.mutateAsync({
        username,
        avatarId: selectedAvatar,
      });
      toast.success(`${t("avatar.select")}: ${selectedAvatar}`);
      onAvatarUpdated?.(selectedAvatar);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update avatar:", error);
      toast.error("Avatar güncellenemedi");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs" data-ocid="avatar.dialog">
        <DialogHeader>
          <DialogTitle className="text-center">
            {t("avatar.select")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 py-4">
          {PRESET_AVATARS.map((emoji, index) => (
            <button
              key={emoji}
              type="button"
              data-ocid={`avatar.item.${index + 1}`}
              onClick={() => setSelectedAvatar(emoji)}
              className={`
                flex items-center justify-center w-full aspect-square text-3xl rounded-xl
                border-2 transition-all duration-150
                ${
                  selectedAvatar === emoji
                    ? "border-primary bg-primary/10 scale-110 shadow-md"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                }
              `}
            >
              {emoji}
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-ocid="avatar.cancel_button"
          >
            {t("common.no")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateAvatarMutation.isPending}
            data-ocid="avatar.save_button"
          >
            {updateAvatarMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ...
              </>
            ) : (
              t("avatar.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
