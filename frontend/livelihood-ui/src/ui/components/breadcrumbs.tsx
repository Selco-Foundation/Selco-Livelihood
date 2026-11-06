import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

export interface BreadcrumbEntry {
  label: string;
  to?: string;
  search?: Record<string, unknown>;
}

interface BreadcrumbsProps {
  items: BreadcrumbEntry[];
}

/** Module-agnostic breadcrumb trail — every module renders its own trail through this. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.flatMap((item, index) => {
          const nodes = [];

          if (index > 0) {
            nodes.push(<BreadcrumbSeparator key={`sep-${index}`} />);
          }

          nodes.push(
            <BreadcrumbItem key={`item-${index}`}>
              {item.to ? (
                <BreadcrumbLink asChild>
                  <Link to={item.to} search={item.search}>
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>,
          );

          return nodes;
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
