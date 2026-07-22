import { useEffect, useState, useTransition } from "react";
import type { ContentMode, Locale, SiteCopy } from "../../shared/types";
import { LOCALES, LOCALE_LABELS } from "../../shared/types";

function formatResult(mode: ContentMode, copy: SiteCopy | null): string {
  if (!copy) return "";
  if (mode === "yaml") {
    const lines: string[] = [];
    const walk = (obj: unknown, indent = 0) => {
      if (obj === null || typeof obj !== "object") {
        lines[lines.length - 1] += ` ${JSON.stringify(obj)}`;
        return;
      }
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (value !== null && typeof value === "object") {
          lines.push(`${"  ".repeat(indent)}${key}:`);
          walk(value, indent + 1);
        } else {
          const text = String(value);
          const needsQuote = /[:#\n]|^\s|\s$/.test(text);
          lines.push(
            `${"  ".repeat(indent)}${key}: ${needsQuote ? JSON.stringify(text) : text}`,
          );
        }
      }
    };
    walk(copy);
    return lines.join("\n");
  }
  return JSON.stringify(copy, null, 2);
}

export default function App() {
  const [mode, setMode] = useState<ContentMode>("json");
  const [lang, setLang] = useState<Locale>("ja");
  const [copy, setCopy] = useState<SiteCopy | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setError("");
    setBusy(true);

    (async () => {
      try {
        if (mode === "wordpress") {
          const res = await fetch(`/api/wp/v2/pages?lang=${lang}`);
          if (res.status === 404) {
            if (!cancelled) {
              setCopy(null);
              setError("WordPress locale missing — run MT translate.");
            }
            return;
          }
          if (!res.ok) throw new Error(await res.text());
          const pages = await res.json();
          if (!cancelled) setCopy(pages[0].acf as SiteCopy);
          return;
        }

        const res = await fetch(`/api/content?mode=${mode}&lang=${lang}`);
        if (res.status === 404) {
          if (!cancelled) {
            setCopy(null);
            setError("Locale not found for this mode.");
          }
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || res.statusText);
        }
        const data = await res.json();
        if (!cancelled) {
          startTransition(() => setCopy(data.copy));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, lang]);

  const resultText = formatResult(mode, copy);
  const resultExt =
    mode === "yaml" ? "yaml" : mode === "wordpress" ? "wp.json" : mode === "hardcoded" ? "ts→json" : "json";

  return (
    <div className="app">
      {(busy || pending) && <div className="loading-veil">Loading…</div>}

      <header className="topbar">
        <div className="brand-mark">{copy?.brand ?? "建創 KENSŌ"}</div>
        <nav className="nav-links" aria-label="Primary">
          <a href="#projects">{copy?.nav.projects ?? "…"}</a>
          <a href="#about">{copy?.nav.about ?? "…"}</a>
          <a href="#contact">{copy?.nav.contact ?? "…"}</a>
        </nav>
        <div className="controls">
          <label>
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ContentMode)}
              aria-label="Content storage mode"
            >
              <option value="json">JSON (React)</option>
              <option value="yaml">YAML (backend)</option>
              <option value="hardcoded">Hard-coded</option>
              <option value="wordpress">WordPress</option>
            </select>
          </label>
          <label>
            Lang
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Locale)}
              aria-label="Language"
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="workspace">
        <main className="preview-pane">
          <section className="hero">
            <div className="hero-inner">
              <h1 className="hero-brand">{copy?.brand ?? "建創 KENSŌ"}</h1>
              <p className="hero-tag">{copy?.tagline ?? ""}</p>
              <p className="hero-lead">{copy?.heroLead ?? ""}</p>
              <div className="cta-row">
                <a className="btn btn-primary" href="#projects">
                  {copy?.ctaPrimary ?? "…"}
                </a>
                <a
                  className="btn btn-ghost"
                  href="#about"
                  style={{ color: "#f3f6f1", borderColor: "rgba(243,246,241,0.35)" }}
                >
                  {copy?.ctaSecondary ?? "…"}
                </a>
              </div>
            </div>
          </section>

          {error ? (
            <div className="panel">
              <div className="status-err">{error}</div>
            </div>
          ) : null}

          <section className="section" id="projects">
            <h2>{copy?.sectionProjects.title ?? "…"}</h2>
            <p>{copy?.sectionProjects.body ?? ""}</p>
          </section>

          <section className="section" id="about">
            <h2>{copy?.sectionAbout.title ?? "…"}</h2>
            <p>{copy?.sectionAbout.body ?? ""}</p>
          </section>

          <section className="section" id="contact">
            <h2>{copy?.sectionContact.title ?? "…"}</h2>
            <p style={{ marginBottom: "1rem" }}>{copy?.sectionContact.body ?? ""}</p>
            <button className="btn btn-primary" type="button">
              {copy?.sectionContact.button ?? "…"}
            </button>
          </section>

          <footer className="site-footer">{copy?.footer ?? ""}</footer>
        </main>

        <aside className="result-pane" aria-label="Translation result">
          <div className="result-header">
            <h2>Translate result</h2>
            <span className="result-meta">
              {mode} · {lang}.{resultExt}
            </span>
          </div>
          {error && !copy ? (
            <p className="status-err result-empty">{error}</p>
          ) : copy ? (
            <pre className="result-code">{resultText}</pre>
          ) : (
            <p className="result-empty">Select Mode and Lang to load translation.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
