import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";

export interface EntityFormActionsProps {
  mode: "create" | "edit";
  entityLabel: string;
  hasExistingEntity: boolean;
  disableSaveWhenInvalid?: boolean;
  isSubmitting?: boolean;
  onDiscard: () => void;
  onDelete?: () => void | Promise<void>;
  saveLabelOverride?: string;
  /** e.g. read-only tooltip when save is disabled by RBAC */
  submitTitle?: string;
}

export const EntityFormActions: React.FC<EntityFormActionsProps> = ({
  mode,
  entityLabel,
  hasExistingEntity,
  disableSaveWhenInvalid,
  isSubmitting,
  onDiscard,
  onDelete,
  saveLabelOverride,
  submitTitle,
}) => {
  const isCreate = mode === "create";
  const showDelete = !isCreate && hasExistingEntity && Boolean(onDelete);
  const saveLabel =
    saveLabelOverride ?? (isCreate ? "Add" : "Save changes");

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center">
        {showDelete && onDelete && (
          <ConfirmDeleteDialog entityLabel={entityLabel} onConfirm={onDelete}>
            <Button type="button" variant="destructive">
              Delete
            </Button>
          </ConfirmDeleteDialog>
        )}
      </div>

      <div className="flex justify-end gap-3 sm:ml-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onDiscard}
          disabled={isSubmitting}
        >
          Discard changes
        </Button>
        <Button
          type="submit"
          disabled={Boolean(isSubmitting) || Boolean(disableSaveWhenInvalid)}
          title={submitTitle}
        >
          {isSubmitting ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
};

