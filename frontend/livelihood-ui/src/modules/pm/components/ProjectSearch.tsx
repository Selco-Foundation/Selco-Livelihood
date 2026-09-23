import { translateOr, useDebouncedValue, useTranslate } from "@/shared";
import { Button, Input, Label } from "@/ui";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ProjectSearchProps {
  initialSearchText?: string;
  onSearch: (searchText: string) => void;
}

export function ProjectSearch({ initialSearchText = "", onSearch }: ProjectSearchProps) {
  const { t } = useTranslate();
  const [searchText, setSearchText] = useState(initialSearchText);
  const debouncedSearchText = useDebouncedValue(searchText);

  useEffect(() => {
    onSearch(debouncedSearchText.trim());
  }, [debouncedSearchText]);

  function clearSearch() {
    setSearchText("");
    onSearch("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
      <Label htmlFor="project-search" className="sr-only">
        {translateOr(t, "ES_PM_SEARCH_PROJECT", "Search Project")}
      </Label>
      <div className="relative sm:w-100 lg:w-[520px]">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="project-search"
          name="project-search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="pl-9 pr-9"
        />
        {searchText ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={clearSearch}
            aria-label={translateOr(t, "ES_COMMON_CLEAR_SEARCH", "Clear Search")}
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
