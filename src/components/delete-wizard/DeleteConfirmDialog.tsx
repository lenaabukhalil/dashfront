import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  children: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  requiredText?: string;
}

export function DeleteConfirmDialog({
  title,
  description,
  confirmLabel = "Archive",
  children,
  onConfirm,
  loading = false,
  requiredText,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const busy = loading || submitting;
  const canConfirm = requiredText ? typed === requiredText : true;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      setSubmitting(true);
      await onConfirm();
      setOpen(false);
      setTyped("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requiredText ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Type <span className="font-semibold text-foreground">{requiredText}</span> to confirm.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              placeholder={requiredText}
            />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || !canConfirm}
            onClick={handleConfirm}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {busy ? "Archiving..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
