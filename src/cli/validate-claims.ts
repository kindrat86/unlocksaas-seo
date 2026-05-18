/**
 * validate-claims subcommand.
 *
 *   unlocksaas-seo validate-claims https://example.com/foo
 *
 * What it does:
 *   1. Fetches the URL.
 *   2. Extracts every JSON-LD block plus meta tags and visible text.
 *   3. Runs every honesty rule against the parsed JSON-LD graph
 *      (fabricated aggregateRating, malformed ISO dates, bad sameAs URLs).
 *   4. Diffs key schema fields against the visible HTML — flags drift
 *      between FAQPage questions and the rendered question text, between
 *      Article headline and the page title, between Product price and
 *      the visible price string.
 *   5. Prints a structured report and exits non-zero on violations.
 *
 * This is the centerpiece. The other tools omit fabricated fields at
 * build time; this one tells you whether a deployed page actually
 * passes the discipline.
 */

import {
  color,
  EXIT_FETCH_FAILED,
  EXIT_OK,
  EXIT_VIOLATIONS,
  printErr,
  printOut,
} from "./shared.js";
import {
  extractFromHtml,
  normalizeForMatch,
  summarizeJsonLd,
} from "./extract.js";
import { auditJsonLd } from "../honesty/rules.js";
import type { HonestyViolation } from "../honesty/rules.js";

export interface ValidateOptions {
  /** URL or local file path to validate. */
  target: string;
  /** Emit machine-readable JSON instead of human-readable output. */
  json?: boolean;
  /** Strict mode: every honesty violation AND every drift is an error. */
  strict?: boolean;
  /** HTTP request timeout in milliseconds. Defaults to 15000. */
  timeoutMs?: number;
}

export interface ValidateReport {
  target: string;
  fetchedAt: string;
  statusCode?: number;
  contentLength?: number;
  schemaSummary: ReturnType<typeof summarizeJsonLd>;
  parseErrors: Array<{ index: number; message: string }>;
  honestyViolations: HonestyViolation[];
  driftFindings: Array<{ path: string; reason: string }>;
  recommendations: string[];
  exitCode: number;
}

async function fetchTarget(
  target: string,
  timeoutMs: number,
): Promise<{ statusCode: number; body: string }> {
  // If the target looks like a local file, read it directly.
  if (target.startsWith("file://") || target.startsWith("./") || target.startsWith("/")) {
    const path = target.startsWith("file://") ? target.slice(7) : target;
    const { readFile } = await import("node:fs/promises");
    const body = await readFile(path, "utf8");
    return { statusCode: 200, body };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "unlocksaas-seo-validate-claims/0.1 (+https://unlocksaas.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    const body = await res.text();
    return { statusCode: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function findDriftFindings(
  jsonLd: ReadonlyArray<unknown>,
  visibleText: string,
  meta: Record<string, string>,
  title: string | undefined,
): Array<{ path: string; reason: string }> {
  const findings: Array<{ path: string; reason: string }> = [];
  const visibleNorm = normalizeForMatch(visibleText);

  function visibleContains(needle: string): boolean {
    return visibleNorm.includes(normalizeForMatch(needle));
  }

  jsonLd.forEach((node, idx) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const typeRaw = obj["@type"];
    const types = Array.isArray(typeRaw)
      ? typeRaw.map(String)
      : [String(typeRaw ?? "")];
    const path = `jsonLd[${idx}](${types.join("|") || "?"})`;

    // FAQPage: every question must appear in visible HTML.
    if (types.includes("FAQPage")) {
      const mainEntity = obj["mainEntity"];
      if (Array.isArray(mainEntity)) {
        mainEntity.forEach((q, qIdx) => {
          if (q && typeof q === "object") {
            const name = (q as { name?: unknown }).name;
            if (typeof name === "string" && name.length > 0) {
              if (!visibleContains(name.slice(0, Math.min(60, name.length)))) {
                findings.push({
                  path: `${path}.mainEntity[${qIdx}].name`,
                  reason: `FAQ question "${name.slice(0, 80)}..." is not present in visible HTML. Drift between JSON-LD and rendered text.`,
                });
              }
            }
          }
        });
      }
    }

    // Article headline must equal or be a prefix of the page title.
    if (
      types.includes("Article") ||
      types.includes("BlogPosting") ||
      types.includes("NewsArticle") ||
      types.includes("TechArticle")
    ) {
      const headline = obj["headline"];
      if (typeof headline === "string" && title) {
        const normH = normalizeForMatch(headline);
        const normT = normalizeForMatch(title);
        if (!normT.includes(normH) && !normH.includes(normT)) {
          findings.push({
            path: `${path}.headline`,
            reason: `Article.headline "${headline}" does not appear in <title> "${title}". Drift between schema and page title.`,
          });
        }
      }
    }

    // Product / SoftwareApplication: offers.price must appear in visible text.
    if (
      types.includes("Product") ||
      types.includes("SoftwareApplication") ||
      types.includes("WebApplication")
    ) {
      const offers = obj["offers"];
      const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
      offerList.forEach((offer, oIdx) => {
        if (offer && typeof offer === "object") {
          const price = (offer as { price?: unknown }).price;
          if (price !== undefined && price !== null) {
            const priceStr = String(price);
            if (!visibleNorm.includes(priceStr.toLowerCase())) {
              findings.push({
                path: `${path}.offers[${oIdx}].price`,
                reason: `Offer.price "${priceStr}" is not visible on the page. Schema-to-rendered drift.`,
              });
            }
          }
        }
      });
    }
  });

  // NOTE: The meta.description vs visible-body literal-prefix check was
  // moved out of drift findings in 0.1.1. A good meta description is
  // deliberately a different framing than the visible H1 — that's the
  // entire purpose of the field. Surfacing it as drift (and failing
  // --strict on it) flagged every SEO-optimized page as broken when in
  // fact they were doing the right thing. The signal is preserved as a
  // lower-tier "meta description shares no content words with body"
  // recommendation in generateRecommendations() instead.

  return findings;
}

/**
 * English stopword list for the meta-description-overlap check below.
 * Intentionally short — the goal is to drop high-frequency function words
 * that would inflate overlap scores without saying anything about topical
 * alignment. Lowercased; the matcher lowercases input before lookup.
 */
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "are",
  "but",
  "not",
  "into",
  "have",
  "has",
  "was",
  "will",
  "can",
  "their",
  "them",
  "what",
  "when",
  "which",
  "than",
  "then",
  "more",
  "most",
  "some",
  "any",
  "all",
]);

/** Extract content words (≥4 chars, not stopwords) from a string. */
function contentWords(s: string): string[] {
  const words: string[] = [];
  for (const raw of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 4) continue;
    if (STOPWORDS.has(raw)) continue;
    words.push(raw);
  }
  return words;
}

function generateRecommendations(
  schemaSummary: ReturnType<typeof summarizeJsonLd>,
  meta: Record<string, string>,
  visibleText?: string,
): string[] {
  const recs: string[] = [];
  if (!schemaSummary.hasOrganization) {
    recs.push(
      "Missing Organization JSON-LD. Add a single root-layout block so every page inherits the entity anchor.",
    );
  }
  if (!schemaSummary.hasWebSite) {
    recs.push(
      "Missing WebSite JSON-LD. Add one with a potentialAction.SearchAction (and AskAction if you expose an interactive surface).",
    );
  }
  if (!schemaSummary.hasBreadcrumb && schemaSummary.typesPresent.length > 0) {
    recs.push(
      "Missing BreadcrumbList. Without it, Google falls back to the raw URL in the SERP — lower CTR.",
    );
  }
  if (!meta["og:title"]) {
    recs.push("Missing og:title meta tag. Social previews will fall back to <title>.");
  }
  if (!meta["og:image"]) {
    recs.push("Missing og:image. Twitter/LinkedIn previews will be text-only.");
  }
  if (!meta["twitter:card"]) {
    recs.push('Missing twitter:card meta. Set to "summary_large_image" for hero-image previews.');
  }

  // Soft meta-description-vs-body alignment check. Recommendation tier,
  // not drift — a meta description SHOULD be reframed for SERP CTR, but
  // if it shares zero content words with the body the page is probably
  // miscategorized in indexes. Threshold: < 25% overlap (out of meta
  // description's own content words). Skips when no description or no
  // visible text. Replaces the brittle literal-60-char-prefix drift
  // check that lived here through 0.1.0.
  const metaDesc = meta["description"];
  if (visibleText && metaDesc && metaDesc.length > 20) {
    const metaWords = contentWords(metaDesc);
    if (metaWords.length >= 4) {
      const bodyWords = new Set(contentWords(visibleText));
      const overlap = metaWords.filter((w) => bodyWords.has(w)).length;
      const ratio = overlap / metaWords.length;
      if (ratio < 0.25) {
        recs.push(
          `Meta description shares only ${Math.round(ratio * 100)}% of content words with the visible body. ` +
            "Reframing is fine for SERP CTR, but zero topical overlap usually means the description is stale.",
        );
      }
    }
  }

  return recs;
}

export async function validateClaims(
  opts: ValidateOptions,
): Promise<ValidateReport> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  let statusCode: number | undefined;
  let body: string;
  try {
    const fetched = await fetchTarget(opts.target, timeoutMs);
    statusCode = fetched.statusCode;
    body = fetched.body;
  } catch (err) {
    return {
      target: opts.target,
      fetchedAt: new Date().toISOString(),
      schemaSummary: {
        typesPresent: [],
        hasFaq: false,
        hasArticle: false,
        hasOrganization: false,
        hasWebSite: false,
        hasBreadcrumb: false,
        hasProduct: false,
      },
      parseErrors: [],
      honestyViolations: [],
      driftFindings: [],
      recommendations: [
        `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
      exitCode: EXIT_FETCH_FAILED,
    };
  }

  const extracted = extractFromHtml(body);
  const schemaSummary = summarizeJsonLd(extracted.jsonLd);
  const honestyViolations = auditJsonLd(extracted.jsonLd);
  const driftFindings = findDriftFindings(
    extracted.jsonLd,
    extracted.visibleText,
    extracted.meta,
    extracted.title,
  );
  const recommendations = generateRecommendations(
    schemaSummary,
    extracted.meta,
    extracted.visibleText,
  );

  const hasErrors =
    honestyViolations.length > 0 ||
    extracted.parseErrors.length > 0 ||
    (opts.strict && driftFindings.length > 0);

  return {
    target: opts.target,
    fetchedAt: new Date().toISOString(),
    statusCode,
    contentLength: body.length,
    schemaSummary,
    parseErrors: extracted.parseErrors,
    honestyViolations,
    driftFindings,
    recommendations,
    exitCode: hasErrors ? EXIT_VIOLATIONS : EXIT_OK,
  };
}

export function printReport(report: ValidateReport, asJson: boolean): void {
  if (asJson) {
    printOut(JSON.stringify(report, null, 2));
    return;
  }

  printOut("");
  printOut(color.bold(`validate-claims: ${report.target}`));
  printOut(
    color.dim(
      `  fetched: ${report.fetchedAt}${report.statusCode ? ` (HTTP ${report.statusCode})` : ""}${report.contentLength ? `, ${report.contentLength.toLocaleString()} bytes` : ""}`,
    ),
  );
  printOut("");

  printOut(color.bold("Schema graph:"));
  if (report.schemaSummary.typesPresent.length === 0) {
    printOut(`  ${color.yellow("None.")} No JSON-LD blocks found.`);
  } else {
    printOut(
      `  ${color.green(report.schemaSummary.typesPresent.join(", "))}`,
    );
  }
  printOut("");

  if (report.parseErrors.length > 0) {
    printOut(color.bold(color.red("JSON-LD parse errors:")));
    for (const e of report.parseErrors) {
      printOut(`  [block #${e.index}] ${e.message}`);
    }
    printOut("");
  }

  printOut(color.bold("Honesty violations:"));
  if (report.honestyViolations.length === 0) {
    printOut(`  ${color.green("None.")} The Brunson Hard-Rule holds.`);
  } else {
    for (const v of report.honestyViolations) {
      printOut(`  ${color.red(v.rule)}  ${v.path ?? ""}`);
      printOut(`    ${v.reason}`);
    }
  }
  printOut("");

  printOut(color.bold("Schema-to-rendered drift:"));
  if (report.driftFindings.length === 0) {
    printOut(
      `  ${color.green("None.")} JSON-LD claims match visible HTML.`,
    );
  } else {
    for (const d of report.driftFindings) {
      printOut(`  ${color.yellow(d.path)}`);
      printOut(`    ${d.reason}`);
    }
  }
  printOut("");

  if (report.recommendations.length > 0) {
    printOut(color.bold("Recommendations:"));
    for (const r of report.recommendations) {
      printOut(`  ${color.cyan("→")} ${r}`);
    }
    printOut("");
  }

  if (report.exitCode === EXIT_OK) {
    printOut(color.green("PASS"));
  } else {
    printErr(color.red("FAIL"));
  }
}
