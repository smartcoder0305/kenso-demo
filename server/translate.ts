import type { Locale, SiteCopy } from "../shared/types.js";
import { LOCALE_LABELS } from "../shared/types.js";

function extractJsonObject(text: string): SiteCopy {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Translator did not return a JSON object");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as SiteCopy;
}

function aiConfig() {
  const endpoint =
    process.env.AI_API_ENDPOINT?.trim() || "https://api.openai.com/v1/chat/completions";
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_API_MODEL?.trim() || "gpt-5.2";
  const timeoutMs = Number(process.env.AI_API_TIMEOUT || 60000);
  if (!apiKey) {
    throw new Error(
      "AI_API_KEY is not set. Copy .env.example to .env and set your OpenAI API key.",
    );
  }
  return { endpoint, apiKey, model, timeoutMs };
}

export async function translateSiteCopy(
  source: SiteCopy,
  target: Locale,
): Promise<SiteCopy> {
  const { endpoint, apiKey, model, timeoutMs } = aiConfig();
  const languageName = LOCALE_LABELS[target];

  const system = [
    "You are a professional website translator for a Japanese real-estate / construction developer.",
    "Return ONLY a single JSON object with the exact same keys and nesting as the input.",
    'Translate ALL fields, including brand ("建創 KENSŌ") and footer company name ("建創 KENSŌ Development Co., Ltd.") into the target language with a natural localized form.',
    "Preserve tone: confident, calm, architectural — not marketing-hype.",
    "Do not wrap the answer in markdown unless necessary; prefer raw JSON.",
  ].join(" ");

  const user = [
    `Translate the following JSON site copy from Japanese into ${languageName} (${target}).`,
    "",
    JSON.stringify(source, null, 2),
  ].join("\n");

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`OpenAI API timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  const requestPromise = (async () => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const raw = await res.text();
    if (!res.ok) {
      let detail = raw;
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string } };
        detail = parsed.error?.message || raw;
      } catch {
        /* keep raw */
      }
      throw new Error(`OpenAI API ${res.status}: ${detail}`);
    }

    const data = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI returned an empty translation");
    }
    return extractJsonObject(text);
  })();

  return Promise.race([requestPromise, timeoutPromise]);
}
