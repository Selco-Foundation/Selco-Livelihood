import { translateOr, useDebouncedValue, useTranslate } from "@/shared";
import { Input, Label } from "@/ui";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallationPlanSearchProps {
  initialSearchText?: string;
  onSearch: (searchText: string) => void;
}

export function InstallationPlanSearch({
  initialSearchText = "",
  onSearch,
}: InstallationPlanSearchProps) {
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
    <div className="livelihood-card p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Label htmlFor="installation-plan-search" className="shrink-0">
          {translateOr(t, "ES_IR_SEARCH_INSTALLATION_PLAN", "Search Installation Plan")}
        </Label>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <div className="relative sm:w-120 lg:w-[520px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="installation-plan-search"
              name="installation-plan-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="pl-9"
            />
          </div>
          <button
            type="button"
            onClick={clearSearch}
            className="cursor-pointer text-left text-sm font-semibold text-primary hover:underline"
          >
            {translateOr(t, "ES_COMMON_CLEAR_SEARCH", "Clear Search")}
          </button>
        </div>
      </div>
    </div>
  );
}
