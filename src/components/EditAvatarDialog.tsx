import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfileApi } from "@/services/api";
import { useLanguage } from "@/contexts/LanguageContext";
import type { User } from "@/types/auth";

function getUserInitials(user: User): string {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.firstName) return user.firstName.slice(0, 2).toUpperCase();
  if (user.lastName) return user.lastName.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  if (user.mobile) return String(user.mobile).slice(0, 2).toUpperCase();
  return "?";
}

export default function EditAvatarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(user?.avatar ?? "");
      setPreviewError(false);
    }
  }, [open, user?.avatar]);

  useEffect(() => {
    setPreviewError(false);
  }, [url]);

  const trimmed = url.trim();
  const currentAvatar = user?.avatar ?? "";
  const unchanged = trimmed === currentAvatar;
  const saveDisabled = saving || (unchanged && !previewError);

  const handleSave = async () => {
    if (!user) return;

    if (trimmed !== "" && (!/^https?:\/\//i.test(trimmed) || trimmed.length > 2048)) {
      toast({
        title: t("sidebar.invalidUrl"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateProfileApi({ profile_img_url: trimmed === "" ? null : trimmed });
      await refreshUser();
      onOpenChange(false);
      toast({
        title: t("sidebar.avatarUpdated"),
        description: t("sidebar.avatarUpdatedDesc"),
      });
    } catch (err) {
      toast({
        title: t("sidebar.avatarUpdateFailed"),
        description: err instanceof Error ? err.message : t("sidebar.avatarUpdateFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("sidebar.editAvatarTitle")}</DialogTitle>
          <DialogDescription>{t("sidebar.editAvatarDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="avatar-url">{t("sidebar.imageUrlLabel")}</Label>
            <div className="relative">
              <Input
                id="avatar-url"
                type="url"
                inputMode="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pr-9"
                autoFocus
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  aria-label={t("sidebar.clearUrl")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("sidebar.imageUrlHelp")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("sidebar.preview")}</Label>
            <div className="w-full flex items-center justify-center p-4 rounded-lg border border-dashed border-border bg-muted/30">
              <div className="w-40 h-40 rounded-lg overflow-hidden bg-background flex items-center justify-center">
                {url && !previewError ? (
                  <img
                    src={url}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                    onError={() => setPreviewError(true)}
                  />
                ) : user ? (
                  <span className="text-3xl font-medium text-primary-foreground bg-primary w-full h-full flex items-center justify-center">
                    {getUserInitials(user)}
                  </span>
                ) : null}
              </div>
            </div>
            {previewError && url && (
              <p className="text-xs text-destructive">{t("sidebar.previewError")}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveDisabled}>
            {saving ? t("sidebar.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
