import type { ReactNode } from "react";

interface WizardActionFooterProps {
  children: ReactNode;
}

/** Persistent wizard actions within the content area, clear of the sidebar. */
export function WizardActionFooter({ children }: WizardActionFooterProps) {
  return (
    <footer className="fixed right-0 bottom-0 left-0 z-20 border-t border-border bg-page/95 px-4 py-3 backdrop-blur lg:left-[var(--sidebar-width)] lg:rounded-bl-[48px] lg:px-8">
      <div className="flex justify-end gap-3">{children}</div>
    </footer>
  );
}
