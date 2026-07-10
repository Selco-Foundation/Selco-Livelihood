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
    <Card className="livelihood-card min-w-64 max-w-xs flex-row items-center gap-3 border-border px-4 py-5 shadow-sm">
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-base leading-6 font-normal text-ink-600">{label}</p>
        <p className="text-2xl leading-9 font-normal text-ink-950">{value}</p>
      </div>
    </Card>
  );

  if (!link) {
    return card;
  }

  return (
    <Link to={link} className="block min-w-64 max-w-xs transition-opacity hover:opacity-90">
      {card}
    </Link>
  );
}
