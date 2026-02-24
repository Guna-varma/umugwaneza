import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === "en" ? "rw" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("umugwaneza_lang", newLang);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 text-[#64748b] hover:text-[#1e293b]"
      data-testid="button-language-switch"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-semibold">{currentLang === "en" ? "RW" : "EN"}</span>
    </Button>
  );
}
