import cors from "cors";
import express from "express";
import {
  assertLocale,
  assertMode,
  loadContent,
  loadSourceJa,
  writeLocale,
} from "./content.js";
import { translateSiteCopy } from "./translate.js";
import { LOCALES, LOCALE_LABELS, MODE_HINTS } from "../shared/types.js";
import type { ContentMode, Locale } from "../shared/types.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasAiKey: Boolean(process.env.AI_API_KEY?.trim()),
    model: process.env.AI_API_MODEL?.trim() || "gpt-5.2",
    locales: LOCALES,
    labels: LOCALE_LABELS,
    modes: MODE_HINTS,
  });
});

app.get("/api/content", async (req, res) => {
  try {
    const mode = assertMode(String(req.query.mode || "json"));
    const locale = assertLocale(String(req.query.lang || "ja"));
    const { copy, source } = await loadContent(mode, locale);
    if (!copy) {
      res.status(404).json({
        error: "missing_locale",
        message: `No ${mode} content for ${locale}. Call POST /api/translate to generate via OpenAI MT.`,
        mode,
        locale,
      });
      return;
    }
    res.json({ mode, locale, source, copy });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

/** WordPress-style REST shape for demos / plugin clients */
app.get("/api/wp/v2/pages", async (req, res) => {
  try {
    const locale = assertLocale(String(req.query.lang || "ja"));
    const mode: ContentMode = "wordpress";
    const { copy, source } = await loadContent(mode, locale);
    if (!copy) {
      res.status(404).json({ code: "rest_no_route_locale", message: "Locale not translated yet" });
      return;
    }
    res.json([
      {
        id: 1,
        slug: "home",
        lang: locale,
        source,
        title: { rendered: copy.brand },
        excerpt: { rendered: copy.tagline },
        content: { rendered: copy.heroLead },
        acf: copy,
      },
    ]);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/translate", async (req, res) => {
  try {
    const mode = assertMode(String(req.body?.mode || "json"));
    const locale = assertLocale(String(req.body?.lang));
    if (locale === "ja") {
      res.status(400).json({ error: "Source locale ja does not need translation" });
      return;
    }

    const force = Boolean(req.body?.force);
    if (!force) {
      const existing = await loadContent(mode, locale);
      if (existing.copy) {
        res.json({
          mode,
          locale,
          source: existing.source,
          copy: existing.copy,
          skipped: true,
        });
        return;
      }
    }

    const ja = await loadSourceJa();
    const translated = await translateSiteCopy(ja, locale as Locale);
    await writeLocale(mode, locale, translated);
    res.json({
      mode,
      locale,
      source: "machine",
      copy: translated,
      skipped: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("AI_API_KEY") ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

app.post("/api/translate-all", async (req, res) => {
  try {
    const mode = assertMode(String(req.body?.mode || "json"));
    const force = Boolean(req.body?.force);
    const ja = await loadSourceJa();
    const results: Array<{ locale: Locale; status: string; detail?: string }> = [];

    for (const locale of LOCALES) {
      if (locale === "ja") {
        results.push({ locale, status: "source" });
        continue;
      }
      try {
        if (!force) {
          const existing = await loadContent(mode, locale);
          if (existing.copy) {
            results.push({ locale, status: "cached" });
            continue;
          }
        }
        const translated = await translateSiteCopy(ja, locale);
        await writeLocale(mode, locale, translated);
        results.push({ locale, status: "translated" });
      } catch (err) {
        results.push({
          locale,
          status: "error",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    res.json({ mode, results });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default app;
