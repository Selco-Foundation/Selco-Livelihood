import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui";

export interface ImBreadcrumbItem {
  label: string;
  to?: string;
}

interface ImBreadcrumbsProps {
  items: ImBreadcrumbItem[];
}

export function ImBreadcrumbs({ items }: ImBreadcrumbsProps) {
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
                  <Link to={item.to}>{item.label}</Link>
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
