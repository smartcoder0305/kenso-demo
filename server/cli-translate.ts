import "dotenv/config";
import { assertLocale, assertMode, loadSourceJa, writeLocale } from "./content.js";
import { translateSiteCopy } from "./translate.js";
import { LOCALES } from "../shared/types.js";

async function main() {
  const mode = assertMode(process.argv[2] || "json");
  const only = process.argv[3] ? assertLocale(process.argv[3]) : null;
  const ja = await loadSourceJa();
  const targets = only ? [only] : LOCALES.filter((l) => l !== "ja");

  for (const locale of targets) {
    process.stdout.write(`Translating → ${locale} (${mode})... `);
    const copy = await translateSiteCopy(ja, locale);
    await writeLocale(mode, locale, copy);
    console.log("ok");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
