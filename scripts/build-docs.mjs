import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const documentDefinitions = [
  {
    source: "docs/ALICE_BOB_CLARA_COMPOSITE_ARCHITECTURE.md",
    output: "docs/alice-bob-clara-architecture.html",
    description:
      "Permio composite architecture for Alice, Bob, and Clara across Midnight and Monad, with a condensed Chinese summary",
    summaries: {
      en: "A complete English architecture for the Alice, Bob, and Clara scenario, with a condensed Chinese summary covering the core information flows, zero-knowledge circuits, public attestations, trust boundaries, and delivery sequence.",
      "zh-CN":
        "Alice、Bob 与 Clara 场景的中文摘要，涵盖核心信息流、零知识电路、公开证明、信任边界与交付顺序。完整规范请切换至英文。",
    },
    chineseContent: "summary",
    about: [
      "Midnight",
      "Monad",
      "zero-knowledge proofs",
      "recipient-bound attestations",
    ],
  },
  {
    source: "docs/DETERMINISTIC_MILESTONES.md",
    output: "docs/deterministic-milestones.html",
    description:
      "Permio deterministic implementation milestones and binary acceptance gates",
    summaries: {
      en: "A bilingual execution contract that fixes milestone order, artifacts, privacy invariants, tests, evidence, and binary completion gates for the Permio build.",
      "zh-CN":
        "一份完整的双语执行契约，固定 Permio 构建的里程碑顺序、产物、隐私不变量、测试、证据与二元完成门槛。",
    },
    chineseContent: "complete",
    about: [
      "Midnight",
      "Monad",
      "software milestones",
      "acceptance tests",
    ],
  },
];

const checkOnly = process.argv.includes("--check");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function headingText(value) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[\\*_~]/g, "")
    .trim();
}

function createSlug(value, occurrences) {
  const base = headingText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const occurrence = occurrences.get(base) ?? 0;
  occurrences.set(base, occurrence + 1);
  return occurrence === 0 ? base : `${base}-${occurrence + 1}`;
}

function prepareMarkdown(source) {
  const occurrences = new Map();
  const headings = [];
  let title = "Permio Architecture";
  let removedFirstTitle = false;

  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const preparedLines = lines.map((line) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match === null) {
      return line;
    }

    const depth = match[1].length;
    const rawText = match[2];
    const text = headingText(rawText);
    const id = createSlug(rawText, occurrences);

    if (depth === 1 && !removedFirstTitle) {
      title = text;
      removedFirstTitle = true;
      return "";
    }

    headings.push({ depth, id, text });
    return `<h${depth} id="${escapeHtml(id)}">${escapeHtml(text)}</h${depth}>`;
  });

  return { headings, markdown: preparedLines.join("\n"), title };
}

function splitLanguageSources(source, sourcePath) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const titleIndexes = lines.flatMap((line, index) =>
    /^#\s+/.test(line) ? [index] : [],
  );

  if (titleIndexes.length !== 2 || titleIndexes[0] !== 0) {
    throw new Error(
      `${sourcePath} must contain exactly two top-level titles: English first and Chinese second.`,
    );
  }

  const chineseStart = titleIndexes[1];
  const englishLines = lines.slice(0, chineseStart);
  while (englishLines.at(-1)?.trim() === "") {
    englishLines.pop();
  }
  if (englishLines.at(-1)?.trim() === "---") {
    englishLines.pop();
  }
  while (englishLines.at(-1)?.trim() === "") {
    englishLines.pop();
  }

  return {
    en: englishLines.join("\n"),
    "zh-CN": lines.slice(chineseStart).join("\n"),
  };
}

function buildNavigation(headings) {
  return headings
    .filter(({ depth }) => depth <= 2)
    .map(
      ({ id, text }) =>
        `<li><a href="#${escapeHtml(id)}">${escapeHtml(text)}</a></li>`,
    )
    .join("\n          ");
}

function wrapSections(renderedMarkdown) {
  let openedSection = false;
  const withSections = renderedMarkdown.replace(
    /<h([12]) id="([^"]+)">/g,
    (heading, depth, id) => {
      const closePrevious = openedSection ? "</section>\n" : "";
      if (depth === "1") {
        openedSection = false;
        return `${closePrevious}${heading}`;
      }
      openedSection = true;
      return `${closePrevious}<section aria-labelledby="${id}">\n${heading}`;
    },
  );
  return openedSection ? `${withSections}</section>` : withSections;
}

function renderLanguage(source) {
  const { headings, markdown, title } = prepareMarkdown(source);
  const renderedMarkdown = marked.parse(markdown, {
    async: false,
    gfm: true,
  });
  const article = wrapSections(
    renderedMarkdown.replace(
      /<table>[\s\S]*?<\/table>/g,
      (table) => `<div class="table-wrap">${table}</div>`,
    ),
  );

  return {
    article,
    navigation: buildNavigation(headings),
    title,
  };
}

function generateHtml(source, definition) {
  const normalizedSource = source.replaceAll("\r\n", "\n");
  const sourceHash = createHash("sha256")
    .update(normalizedSource)
    .digest("hex");
  const languageSources = splitLanguageSources(
    normalizedSource,
    definition.source,
  );
  const english = renderLanguage(languageSources.en);
  const chinese = renderLanguage(languageSources["zh-CN"]);
  const chineseChoiceLabel =
    definition.chineseContent === "summary" ? "中文摘要" : "中文";
  const chineseNotice =
    definition.chineseContent === "summary"
      ? `<aside class="translation-notice" role="note">
          本页为中文摘要，并非英文规范的逐节完整翻译。完整内容请参阅英文版本。
        </aside>`
      : "";

  return `<!doctype html>
<!--
  GENERATED FILE — DO NOT EDIT DIRECTLY.
  Source: ${definition.source}
  Source SHA-256: ${sourceHash}
  Regenerate with: npm run docs:build
-->
<html lang="en" data-language="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(definition.description)}">
  <meta name="source-sha256" content="${sourceHash}">
  <title>${escapeHtml(english.title)}</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "name": ${JSON.stringify(english.title)},
    "dateModified": "2026-10-09",
    "version": "1.1",
    "inLanguage": ["en", "zh-CN"],
    "about": ${JSON.stringify(definition.about)}
  }
  </script>
  <script>document.documentElement.classList.add("js");</script>
  <style>
    :root {
      color-scheme: light dark;
      --bg: light-dark(#f4f6f8, #0d1117);
      --surface: light-dark(#ffffff, #161b22);
      --surface-2: light-dark(#edf3f7, #1f2630);
      --text: light-dark(#17202a, #e6edf3);
      --muted: light-dark(#52616f, #9ba8b4);
      --border: light-dark(#d5dde4, #30363d);
      --midnight: light-dark(#5b3fd3, #a792ff);
      --monad: light-dark(#2867b2, #70b7ff);
      --code: light-dark(#f2f5f7, #0d1117);
      --shadow: light-dark(0 12px 30px rgba(31, 45, 61, .08), none);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--bg); color: var(--text); line-height: 1.62; }
    a { color: var(--monad); }
    code, pre { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
    code { font-size: .92em; }
    pre {
      margin: 1rem 0; padding: 1rem 1.1rem; border: 1px solid var(--border);
      border-radius: .65rem; background: var(--code); overflow-x: auto;
    }
    .shell { display: grid; grid-template-columns: 18rem minmax(0, 1fr); min-height: 100vh; }
    nav {
      position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 1.6rem 1.25rem;
      background: var(--surface); border-right: 1px solid var(--border);
    }
    nav strong { display: block; margin-bottom: .25rem; font-size: 1.1rem; }
    nav small { color: var(--muted); }
    .language-switcher {
      display: none; grid-template-columns: 1fr 1fr; gap: .35rem; margin: 1rem 0 .35rem;
      padding: .3rem; border: 1px solid var(--border); border-radius: .65rem;
      background: var(--surface-2);
    }
    .js .language-switcher { display: grid; }
    .language-switcher button {
      border: 0; border-radius: .4rem; padding: .5rem .6rem; background: transparent;
      color: var(--muted); cursor: pointer; font: inherit; font-size: .88rem;
    }
    .language-switcher button[aria-pressed="true"] {
      background: var(--surface); color: var(--text); box-shadow: var(--shadow); font-weight: 700;
    }
    nav ul { list-style: none; margin: 1.4rem 0 0; padding: 0; }
    nav li { margin: .15rem 0; }
    nav a {
      display: block; padding: .42rem .55rem; border-radius: .4rem;
      color: var(--muted); text-decoration: none;
    }
    nav a:hover, nav a:focus { color: var(--text); background: var(--surface-2); }
    main { min-width: 0; }
    header, article { width: min(72rem, calc(100% - 3rem)); margin-inline: auto; }
    header { padding: 4rem 0 2rem; border-bottom: 1px solid var(--border); }
    .eyebrow {
      color: var(--midnight); font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; font-size: .78rem;
    }
    h1 { margin: .55rem 0 1rem; font-size: clamp(2.2rem, 5vw, 4.4rem); line-height: 1.04; letter-spacing: -.04em; }
    header p { max-width: 58rem; color: var(--muted); font-size: 1.08rem; }
    article { padding: 1rem 0 5rem; }
    section { scroll-margin-top: 1rem; margin: 3.5rem 0; }
    h2 { margin: 0 0 1rem; font-size: clamp(1.55rem, 3vw, 2.3rem); line-height: 1.16; letter-spacing: -.025em; }
    h3 { margin: 1.8rem 0 .65rem; font-size: 1.18rem; }
    article > h1 { margin-top: 4rem; font-size: clamp(2rem, 4vw, 3.2rem); }
    p { max-width: 82ch; }
    blockquote {
      margin: 1.25rem 0; padding: .35rem 1rem; color: var(--muted);
      border-left: 4px solid var(--midnight); background: var(--surface-2);
    }
    .translation-notice {
      margin: 2rem 0 1rem; padding: .85rem 1rem; border: 1px solid var(--border);
      border-left: 4px solid var(--midnight); border-radius: .45rem; background: var(--surface-2);
    }
    .table-wrap { overflow-x: auto; margin: 1rem 0 1.5rem; border-radius: .7rem; box-shadow: var(--shadow); }
    table { width: 100%; border-collapse: collapse; background: var(--surface); font-size: .94rem; }
    th, td { padding: .7rem .8rem; border: 1px solid var(--border); text-align: left; vertical-align: top; }
    th { background: var(--surface-2); }
    hr { margin: 4rem 0; border: 0; border-top: 1px solid var(--border); }
    footer {
      width: min(72rem, calc(100% - 3rem)); margin: 0 auto 3rem; padding-top: 1.2rem;
      color: var(--muted); border-top: 1px solid var(--border); font-size: .88rem;
    }
    html[data-language="en"] [data-language-panel="zh-CN"],
    html[data-language="zh-CN"] [data-language-panel="en"] { display: none; }
    @media (max-width: 880px) {
      .shell { display: block; }
      nav { position: static; width: auto; height: auto; border-right: 0; border-bottom: 1px solid var(--border); }
      nav ul { columns: 2; }
      header { padding-top: 2.5rem; }
    }
    @media (max-width: 560px) {
      nav ul { columns: 1; }
      header, article, footer { width: min(100% - 1.5rem, 72rem); }
      th, td { min-width: 9rem; }
    }
    @media print {
      :root { color-scheme: light; }
      nav { display: none; }
      .shell { display: block; }
      header, article, footer { width: 100%; }
      section { break-inside: avoid-page; }
      a { color: inherit; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <nav aria-label="Document navigation">
      <strong>Permio</strong>
      <small data-language-panel="en">Generated from canonical Markdown</small>
      <small data-language-panel="zh-CN" lang="zh-CN">由规范 Markdown 自动生成</small>
      <div class="language-switcher" role="group" aria-label="Document language">
        <button type="button" data-language-choice="en" aria-pressed="true">English</button>
        <button type="button" data-language-choice="zh-CN" aria-pressed="false"${
          definition.chineseContent === "summary"
            ? ' aria-label="Condensed Chinese summary" title="Condensed Chinese summary"'
            : ""
        }>${chineseChoiceLabel}</button>
      </div>
      <div data-language-panel="en" lang="en">
        <ul aria-label="English sections">
          ${english.navigation}
        </ul>
      </div>
      <div data-language-panel="zh-CN" lang="zh-CN">
        <ul aria-label="中文章节">
          ${chinese.navigation}
        </ul>
      </div>
    </nav>
    <main>
      <div data-language-panel="en" data-document-title="${escapeHtml(english.title)}" lang="en">
        <header>
          <div class="eyebrow">Midnight × Monad</div>
          <h1>${escapeHtml(english.title)}</h1>
          <p>${escapeHtml(definition.summaries.en)}</p>
        </header>
        <article>
${english.article}
        </article>
        <footer>
          Generated from <code>${escapeHtml(definition.source)}</code>.
          Source SHA-256: <code>${sourceHash}</code>.
        </footer>
      </div>
      <div data-language-panel="zh-CN" data-document-title="${escapeHtml(chinese.title)}" lang="zh-CN">
        <header>
          <div class="eyebrow">Midnight × Monad</div>
          <h1>${escapeHtml(chinese.title)}</h1>
          <p>${escapeHtml(definition.summaries["zh-CN"])}</p>
        </header>
        <article>
${chineseNotice}
${chinese.article}
        </article>
        <footer>
          由 <code>${escapeHtml(definition.source)}</code> 自动生成。
          源文件 SHA-256：<code>${sourceHash}</code>。
        </footer>
      </div>
    </main>
  </div>
  <script>
    (() => {
      const storageKey = "permio-doc-language";
      const supportedLanguages = new Set(["en", "zh-CN"]);
      const buttons = [...document.querySelectorAll("[data-language-choice]")];

      function languageFromHash() {
        if (!window.location.hash) return null;
        try {
          const target = document.getElementById(
            decodeURIComponent(window.location.hash.slice(1)),
          );
          return target?.closest("[data-language-panel]")?.dataset.languagePanel ?? null;
        } catch {
          return null;
        }
      }

      function storedLanguage() {
        try {
          const stored = window.localStorage.getItem(storageKey);
          return supportedLanguages.has(stored) ? stored : null;
        } catch {
          return null;
        }
      }

      function selectLanguage(language, persist = false) {
        if (!supportedLanguages.has(language)) return;
        document.documentElement.lang = language;
        document.documentElement.dataset.language = language;
        for (const button of buttons) {
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.languageChoice === language),
          );
        }
        const panel = document.querySelector(
          '[data-language-panel="' + language + '"][data-document-title]',
        );
        if (panel) document.title = panel.dataset.documentTitle;
        if (persist) {
          try {
            window.localStorage.setItem(storageKey, language);
          } catch {
            // The page still works when browser privacy settings disable storage.
          }
        }
      }

      const initialLanguage =
        languageFromHash() ??
        storedLanguage() ??
        (window.navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en");
      selectLanguage(initialLanguage);

      for (const button of buttons) {
        button.addEventListener("click", () => {
          selectLanguage(button.dataset.languageChoice, true);
        });
      }
      window.addEventListener("hashchange", () => {
        const language = languageFromHash();
        if (language) selectLanguage(language);
      });
    })();
  </script>
</body>
</html>
`;
}

for (const definition of documentDefinitions) {
  const sourcePath = path.join(repositoryRoot, definition.source);
  const outputPath = path.join(repositoryRoot, definition.output);
  const source = await readFile(sourcePath, "utf8");
  const generated = generateHtml(source, definition);

  if (checkOnly) {
    let existing;
    try {
      existing = await readFile(outputPath, "utf8");
    } catch {
      console.error(
        `Generated HTML is missing for ${definition.source}. Run: npm run docs:build`,
      );
      process.exitCode = 1;
      continue;
    }

    if (existing.replaceAll("\r\n", "\n") !== generated) {
      console.error(
        `Generated HTML is stale for ${definition.source}. Run: npm run docs:build`,
      );
      process.exitCode = 1;
    } else {
      console.log(`Generated HTML is current for ${definition.source}.`);
    }
  } else {
    await writeFile(outputPath, generated, "utf8");
    console.log(`Generated ${path.relative(repositoryRoot, outputPath)}`);
  }
}
