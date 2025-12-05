import i18n, { Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export type SupportedLanguage = "en" | "es";

export const defaultNS = "common";
export const fallbackLng: SupportedLanguage = "en";

const resources: Resource = {
  en: {
    common: {
      app: {
        title: "My Application",
        description: "A modern web application",
      },
      navigation: {
        home: "Home",
        about: "About",
        contact: "Contact",
      },
      actions: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        close: "Close",
        confirm: "Confirm",
        back: "Back",
      },
      messages: {
        loading: "Loading...",
        error: "Something went wrong.",
        noData: "No data available.",
      },
    },
  },
  es: {
    common: {
      app: {
        title: "Mi Aplicación",
        description: "Una aplicación web moderna",
      },
      navigation: {
        home: "Inicio",
        about: "Acerca de",
        contact: "Contacto",
      },
      actions: {
        save: "Guardar",
        cancel: "Cancelar",
        delete: "Eliminar",
        edit: "Editar",
        close: "Cerrar",
        confirm: "Confirmar",
        back: "Volver",
      },
      messages: {
        loading: "Cargando...",
        error: "Algo salió mal.",
        noData: "No hay datos disponibles.",
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng,
    defaultNS,
    ns: [defaultNS],
    supportedLngs: ["en", "es"],
    load: "languageOnly",
    detection: {
      order: ["localStorage", "navigator", "htmlTag", "cookie", "path", "subdomain"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
      lookupCookie: "i18next",
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
    debug: process.env.NODE_ENV === "development",
  });

export const changeLanguage = async (lng: SupportedLanguage): Promise<void> => {
  if (i18n.language !== lng) {
    await i18n.changeLanguage(lng);
  }
};

export const getCurrentLanguage = (): SupportedLanguage => {
  const lang = i18n.language?.split("-")[0] as SupportedLanguage | undefined;
  if (lang === "en" || lang === "es") {
    return lang;
  }
  return fallbackLng;
};

export default i18n;