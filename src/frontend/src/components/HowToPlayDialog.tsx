import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface HowToPlayDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function HowToPlayDialog({
  open,
  onClose,
}: HowToPlayDialogProps) {
  const { t } = useLanguage();

  const stepKeys = [
    "howToPlay.step1",
    "howToPlay.step2",
    "howToPlay.step3",
    "howToPlay.step4",
    "howToPlay.step5",
  ] as const;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-xs sm:max-w-sm"
        data-ocid="howtoplay.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            {t("howToPlay.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {stepKeys.map((key) => (
            <div
              key={key}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {stepKeys.indexOf(key) + 1}
              </span>
              <span className="text-sm leading-relaxed">{t(key)}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="justify-center">
          <Button
            onClick={onClose}
            className="w-full"
            data-ocid="howtoplay.close_button"
          >
            {t("howToPlay.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
