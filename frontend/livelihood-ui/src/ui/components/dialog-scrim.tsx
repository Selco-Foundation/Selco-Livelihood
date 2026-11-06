import { createPortal } from "react-dom";

interface DialogScrimProps {
  open: boolean;
  onDismiss: () => void;
}

/**
 * A plain dimming backdrop for a `Dialog modal={false}` (see `useBodyScrollLock`
 * for why some dialogs need `modal={false}`). Radix's own `DialogOverlay` only
 * renders for a *modal* dialog, so turning modal off silently drops both the
 * dim and the click-blocking it provides — anything behind the dialog stays
 * clickable. This restores both: it's an opaque full-viewport layer, so it
 * naturally intercepts pointer events the same way the built-in overlay does,
 * and a click on it dismisses the dialog (matching Radix's own outside-click
 * behavior).
 */
export function DialogScrim({ open, onDismiss }: DialogScrimProps) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      onClick={onDismiss}
      className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      data-state={open ? "open" : "closed"}
    />,
    document.body,
  );
}
