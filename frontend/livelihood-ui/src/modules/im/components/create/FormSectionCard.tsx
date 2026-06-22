import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface FormSectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

export function FormSectionCard({
  icon: Icon,
  title,
  description,
  children,
}: FormSectionCardProps) {
  return (
    <section className="livelihood-card p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
