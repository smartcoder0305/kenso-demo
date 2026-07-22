import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { HARDCODED } from "./hardcoded.js";
import type { ContentMode, Locale, SiteCopy } from "../shared/types.js";
import { LOCALES } from "../shared/types.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content");

export async function loadSourceJa(): Promise<SiteCopy> {
  const raw = await fs.readFile(path.join(contentRoot, "source", "ja.json"), "utf8");
  return JSON.parse(raw) as SiteCopy;
}

async function readJsonLocale(locale: Locale): Promise<SiteCopy | null> {
  const file = path.join(contentRoot, "json", `${locale}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as SiteCopy;
  } catch {
    return null;
  }
}

async function readYamlLocale(locale: Locale): Promise<SiteCopy | null> {
  const file = path.join(contentRoot, "yaml", `${locale}.yaml`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return yaml.load(raw) as SiteCopy;
  } catch {
    return null;
  }
}

async function readCache(mode: ContentMode, locale: Locale): Promise<SiteCopy | null> {
  const file = path.join(contentRoot, "cache", mode, `${locale}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as SiteCopy;
  } catch {
    return null;
  }
}

export async function writeLocale(
  mode: ContentMode,
  locale: Locale,
  copy: SiteCopy,
): Promise<void> {
  if (mode === "json") {
    const dir = path.join(contentRoot, "json");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${locale}.json`), JSON.stringify(copy, null, 2), "utf8");
    return;
  }
  if (mode === "yaml") {
    const dir = path.join(contentRoot, "yaml");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${locale}.yaml`), yaml.dump(copy, { lineWidth: 100 }), "utf8");
    return;
  }
  // hardcoded + wordpress: persist MT output under cache/
  const dir = path.join(contentRoot, "cache", mode);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${locale}.json`), JSON.stringify(copy, null, 2), "utf8");
}

export async function loadContent(
  mode: ContentMode,
  locale: Locale,
): Promise<{ copy: SiteCopy | null; source: "disk" | "hardcoded" | "cache" | "missing" }> {
  if (locale === "ja") {
    return { copy: await loadSourceJa(), source: "disk" };
  }

  if (mode === "json") {
    const copy = await readJsonLocale(locale);
    return { copy, source: copy ? "disk" : "missing" };
  }

  if (mode === "yaml") {
    const copy = await readYamlLocale(locale);
    return { copy, source: copy ? "disk" : "missing" };
  }

  if (mode === "hardcoded") {
    const copy = HARDCODED[locale] ?? null;
    if (copy) return { copy, source: "hardcoded" };
    const cached = await readCache("hardcoded", locale);
    return { copy: cached, source: cached ? "cache" : "missing" };
  }

  // wordpress: treat like missing until MT fills cache (plugin would sync posts)
  const cached = await readCache("wordpress", locale);
  if (cached) return { copy: cached, source: "cache" };
  // seed ja via source; try json as WP export fallback
  const fromJson = await readJsonLocale(locale);
  return { copy: fromJson, source: fromJson ? "disk" : "missing" };
}

export function assertLocale(value: string): Locale {
  if ((LOCALES as readonly string[]).includes(value)) return value as Locale;
  throw new Error(`Unsupported locale: ${value}`);
}

export function assertMode(value: string): ContentMode {
  const modes = ["json", "yaml", "hardcoded", "wordpress"] as const;
  if ((modes as readonly string[]).includes(value)) return value as ContentMode;
  throw new Error(`Unsupported mode: ${value}`);
}
