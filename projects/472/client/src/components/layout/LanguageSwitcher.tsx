import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

type LanguageOption = {
  code: string;
  label: string;
};

interface LanguageSwitcherProps {
  className?: string;
  variant?: "select" | "buttons";
  languages?: LanguageOption[];
  showLabel?: boolean;
}

const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  variant = "select",
  languages,
  showLabel = false,
}) => {
  const { i18n, t } = useTranslation();
  const availableLanguages = useMemo(
    () => languages && languages.length > 0 ? languages : DEFAULT_LANGUAGES,
    [languages]
  );

  const currentLanguage = i18n.language?.split("-")[0] || i18n.resolvedLanguage || "en";

  const handleChangeLanguage = useCallback(
    async (lang: string) => {
      if (lang === currentLanguage) return;
      try {
        await i18n.changeLanguage(lang);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to change language:", error);
      }
    },
    [i18n, currentLanguage]
  );

  const renderSelect = () => (
    <div className={className}>
      {showLabel && (
        <label
          htmlFor="language-switcher"
          style={{
            marginRight: 8,
            fontSize: 14,
          }}
        >
          {t("common.language", "Language")}
        </label>
      )}
      <select
        id="language-switcher"
        value={currentLanguage}
        onChange={(e) => handleChangeLanguage(e.target.value)}
        style={{
          padding: "4px 8px",
          borderRadius: 4,
          border: "1px solid #ccc",
          fontSize: 14,
          backgroundColor: "#fff",
        }}
        aria-label={t("common.language", "Language")}
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderButtons = () => (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: 14,
          }}
        >
          {t("common.language", "Language")}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={t("common.language", "Language")}
        style={{
          display: "inline-flex",
          borderRadius: 999,
          border: "1px solid #ccc",
          padding: 2,
          backgroundColor: "#f7f7f7",
        }}
      >
        {availableLanguages.map((lang) => {
          const isActive = lang.code === currentLanguage;
          return (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleChangeLanguage(lang.code)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 13,
                cursor: "pointer",
                backgroundColor: isActive ? "#2563eb" : "transparent",
                color: isActive ? "#ffffff" : "#111827",
                transition: "background-color 0.15s ease, color 0.15s ease",
              }}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (variant === "buttons") {
    return renderButtons();
  }

  return renderSelect();
};

export default LanguageSwitcher;