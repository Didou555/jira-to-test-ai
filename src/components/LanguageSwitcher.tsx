import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const languageNames: Record<Language, string> = {
  fr: "Français",
  en: "English",
  ru: "Русский",
};

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {languageNames[language]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("fr")}>
          🇫🇷 Français
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("en")}>
          🇬🇧 English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("ru")}>
          🇷🇺 Русский
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
