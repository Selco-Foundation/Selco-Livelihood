import { extractApiErrorMessage, translateOr, useTranslate } from "@/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  toast,
} from "@/ui";
import type { MouseEvent } from "react";
import { useDeleteOrgUser } from "../../hooks/use-org-users";
import type { OrgUser } from "../../types/organisation";

interface DeleteOrgUserDialogProps {
  organisationId: string;
  user: OrgUser | null;
  onClose: () => void;
}

export function DeleteOrgUserDialog({ organisationId, user, onClose }: DeleteOrgUserDialogProps) {
  const { t } = useTranslate();
  const deleteUser = useDeleteOrgUser(organisationId);

  function handleConfirm(event: MouseEvent) {
    // Keep the dialog open until the request settles.
    event.preventDefault();
    if (!user) return;
    deleteUser.mutate(user, {
      onSuccess: () => {
        toast.success(translateOr(t, "ORGANIZATION_USER_DELETION_SUCCESS", "User deleted successfully"));
        onClose();
      },
      onError: (error) => {
        // e.g. "User cannot be deleted because they have active or pending assignments."
        toast.error(
          extractApiErrorMessage(error) ?? translateOr(t, "ORGANIZATION_USER_DELETION_FAILED", "Failed to delete user"),
        );
        onClose();
      },
    });
  }

  return (
    <AlertDialog open={user !== null} onOpenChange={(open) => !open && !deleteUser.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translateOr(t, "ORG_DELETE_USER_TITLE", "Delete this user?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(
              t,
              "DELETE_ORG_USER_CONFIRMATION_MSG",
              "{{name}} will be removed from this organisation and will no longer be able to log in.",
            ).replace("{{name}}", user?.name ?? "")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteUser.isPending}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteUser.isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            {deleteUser.isPending
              ? translateOr(t, "ORG_DELETING", "Deleting...")
              : translateOr(t, "CORE_COMMON_DELETE", "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
