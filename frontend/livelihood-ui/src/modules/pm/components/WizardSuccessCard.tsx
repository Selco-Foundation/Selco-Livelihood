import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

interface WizardSuccessCardProps {
  /** e.g. "Project Created!" — already translated by the caller. */
  title: string;
  /** e.g. "Project Name" — already translated by the caller. */
  itemLabel: string;
  itemName?: string;
  /** The follow-on buttons. Each wizard navigates somewhere different, so the actions stay
   *  with the page rather than being parameterised here. */
  actions: ReactNode;
}

/** The terminal screen both PM wizards show once their final submit succeeds. */
export function WizardSuccessCard({ title, itemLabel, itemName, actions }: WizardSuccessCardProps) {
  return (
    <div className="w-full space-y-6">
      <div className="livelihood-card overflow-hidden">
        <div className="flex flex-col items-center gap-4 bg-primary px-6 py-12 text-center text-primary-foreground">
          <h1 className="text-2xl font-bold">{title}</h1>
          <CheckCircle2 className="size-12" />
          <div>
            <p className="text-sm font-medium">{itemLabel}</p>
            <p className="text-lg font-semibold">{itemName}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4">{actions}</div>
      </div>
    </div>
  );
}
