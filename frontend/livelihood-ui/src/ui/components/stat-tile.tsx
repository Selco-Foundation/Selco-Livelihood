import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Card } from "./ui/card";

export interface StatTileProps {
  icon: ReactNode;
  iconClassName?: string;
  label: string;
  value: string | number;
  link?: string;
}

export function StatTile({ icon, iconClassName, label, value, link }: StatTileProps) {
  const card = (
    <Card className="livelihood-card flex-row items-center gap-3 border-border p-4 shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </Card>
  );

  if (!link) {
    return card;
  }

  return (
    <Link to={link} className="block transition-opacity hover:opacity-90">
      {card}
    </Link>
  );
}
