import { setLocale, useLanguages, useLocaleStore } from "@/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from "@/ui";
import { ChevronDown, Globe } from "lucide-react";
import { useState } from "react";

export function LanguageSwitcher() {
  const currentLocale = useLocaleStore((state) => state.locale);
  const languages = useLanguages();
  const [isSwitching, setIsSwitching] = useState(false);

  const current =
    languages.find((language) => language.code === currentLocale) ?? languages[0];

  const handleSelect = async (code: string) => {
    if (code === currentLocale || isSwitching) {
      return;
    }

    setIsSwitching(true);
    try {
      await setLocale(code);
    } catch (error) {
      toast.error("Failed to change language", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isSwitching} className="gap-1">
          <Globe className="size-4 opacity-60" />
          <span>{current?.nativeLabel ?? "Language"}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className="cursor-pointer"
            onClick={() => void handleSelect(language.code)}
          >
            {language.nativeLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
