import { setLocale, useLocaleStore, SUPPORTED_LANGUAGES } from "@/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui";
import { ChevronDown, Globe } from "lucide-react";
import { useState } from "react";

export function LanguageSwitcher() {
  const currentLocale = useLocaleStore((state) => state.locale);
  const [isSwitching, setIsSwitching] = useState(false);

  const current =
    SUPPORTED_LANGUAGES.find((language) => language.code === currentLocale) ??
    SUPPORTED_LANGUAGES[0];

  const handleSelect = async (code: string) => {
    if (code === currentLocale || isSwitching) {
      return;
    }

    setIsSwitching(true);
    try {
      await setLocale(code);
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
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => void handleSelect(language.code)}
          >
            {language.nativeLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
