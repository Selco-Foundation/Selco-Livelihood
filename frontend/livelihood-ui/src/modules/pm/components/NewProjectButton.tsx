import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { Link } from "@tanstack/react-router";
import { FolderPlus } from "lucide-react";
import { pmCreateProjectPath } from "../utils/paths";

interface NewProjectButtonProps {
  size?: "sm" | "default";
}

/** Single "New Project" entry point, reused on both the Overview page and
 *  the My Projects page so the two surfaces stay visually identical. */
export function NewProjectButton({ size = "sm" }: NewProjectButtonProps) {
  const { t } = useTranslate();

  return (
    <Button asChild size={size}>
      <Link to={pmCreateProjectPath()}>
        <FolderPlus className="size-4" />
        {translateOr(t, "ES_PM_NEW_PROJECT", "New Project")}
      </Link>
    </Button>
  );
}
