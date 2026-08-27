import { translateOr, useTranslate } from "@/shared";
import { Button, Input, Label } from "@/ui";
import { useState } from "react";

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(searchText.trim());
  }

  function clearSearch() {
    setSearchText("");
    onSearch("");
  }

  function handleSearchTextChange(value: string) {
    setSearchText(value);
    onSearch(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="livelihood-card p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="installation-plan-search">
            {translateOr(t, "ES_IR_SEARCH_INSTALLATION_PLAN", "Search Installation Plan")}
          </Label>
          <Input
            id="installation-plan-search"
            name="installation-plan-search"
            value={searchText}
            onChange={(event) => handleSearchTextChange(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
          <button
            type="button"
            onClick={clearSearch}
            className="order-2 cursor-pointer text-left text-sm font-semibold text-primary hover:underline sm:order-1"
          >
            {translateOr(t, "ES_COMMON_CLEAR_SEARCH", "Clear Search")}
          </button>
          <Button type="submit" className="order-1 sm:order-2">
            {translateOr(t, "ES_COMMON_SEARCH", "Search")}
          </Button>
        </div>
      </div>
    </form>
  );
}
