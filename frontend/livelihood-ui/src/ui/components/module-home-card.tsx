import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";

export interface ModuleHomeCardKpi {
  count: string | number | undefined;
  label: string;
  link?: string;
}

export interface ModuleHomeCardLink {
  label: string;
  link: string;
}

interface ModuleHomeCardProps {
  icon: ReactNode;
  moduleName: string;
  kpis: ModuleHomeCardKpi[];
  links: ModuleHomeCardLink[];
}

export function ModuleHomeCard({
  icon,
  moduleName,
  kpis,
  links,
}: ModuleHomeCardProps) {
  return (
    <Card className="livelihood-card h-full border-border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary p-3">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{moduleName}</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-md border border-border bg-muted/40 p-3">
              {kpi.link ? (
                <Link
                  to={kpi.link}
                  className="text-2xl font-bold text-primary hover:underline"
                >
                  {kpi.count ?? "-"}
                </Link>
              ) : (
                <p className="text-2xl font-bold text-primary">{kpi.count ?? "-"}</p>
              )}
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
        <ul className="space-y-1 text-sm">
          {links.map((item) => (
            <li key={item.link}>
              <Link to={item.link} className="text-primary hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
