export const LOCALES = ["ja", "en", "zh", "ko", "th", "vi"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  ko: "한국어",
  th: "ไทย",
  vi: "Tiếng Việt",
};

export type ContentMode = "json" | "yaml" | "hardcoded" | "wordpress";

export interface SiteCopy {
  brand: string;
  tagline: string;
  heroLead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  nav: {
    projects: string;
    about: string;
    sustainability: string;
    contact: string;
  };
  sectionProjects: { title: string; body: string };
  sectionAbout: { title: string; body: string };
  sectionContact: { title: string; body: string; button: string };
  footer: string;
}

export const MODE_HINTS: Record<ContentMode, string> = {
  json: "React / frontend: strings live in JSON locale files (typical SPA i18n).",
  yaml: "Backend: strings live in YAML; API serves the active locale.",
  hardcoded: "Legacy: copy is embedded in source modules / templates.",
  wordpress: "WordPress: plugin + REST proxy; MT fills missing locales.",
};
