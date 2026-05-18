/**
 * HTML extraction utilities for the validate-claims CLI.
 *
 * Zero-dependency: works on raw HTML strings. We do regex extraction for
 * JSON-LD script blocks (the schema is well-bounded and regex is fine
 * for the well-formed script tags every framework emits) and a
 * conservative tag-stripper for visible text.
 *
 * These are not general-purpose HTML parsers. They are tuned for the
 * structured-data audit case: extract JSON-LD blocks, get the visible
 * text approximately right, return both for diff.
 */

const SCRIPT_REGEX =
  /<script\b[^>]*type\s*=\s*['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/gi;

const META_REGEX = /<meta\b[^>]*?>/gi;
const META_ATTR_REGEX = /(\w[\w:-]*)\s*=\s*"([^"]*)"|(\w[\w:-]*)\s*=\s*'([^']*)'/g;

export interface ExtractedHtml {
  /** Raw JSON-LD strings, one per <script type="application/ld+json"> block. */
  jsonLdBlocks: string[];
  /** Parsed JSON-LD objects (failed parses recorded in `parseErrors`). */
  jsonLd: unknown[];
  /** Parse errors, one per failing block (aligned with jsonLdBlocks indices). */
  parseErrors: Array<{ index: number; message: string }>;
  /** Meta tag attributes, e.g. { description, "og:title", twitter:card }. */
  meta: Record<string, string>;
  /** Title text from <title>...</title>. */
  title?: string;
  /** Approximate visible text — tags stripped, whitespace collapsed. */
  visibleText: string;
}

export function extractFromHtml(html: string): ExtractedHtml {
  const jsonLdBlocks: string[] = [];
  const jsonLd: unknown[] = [];
  const parseErrors: Array<{ index: number; message: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = SCRIPT_REGEX.exec(html)) !== null) {
    const body = (match[1] ?? "").trim();
    const index = jsonLdBlocks.length;
    jsonLdBlocks.push(body);
    try {
      const parsed = JSON.parse(body);
      // A @graph wrapper expands to multiple entities.
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { "@graph"?: unknown[] })["@graph"])
      ) {
        for (const node of (parsed as { "@graph": unknown[] })["@graph"]) {
          jsonLd.push(node);
        }
      } else if (Array.isArray(parsed)) {
        for (const node of parsed) jsonLd.push(node);
      } else {
        jsonLd.push(parsed);
      }
    } catch (err) {
      parseErrors.push({
        index,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Meta tags
  const meta: Record<string, string> = {};
  const metaMatches = html.match(META_REGEX) ?? [];
  for (const tag of metaMatches) {
    const attrs: Record<string, string> = {};
    META_ATTR_REGEX.lastIndex = 0;
    let am: RegExpExecArray | null;
    while ((am = META_ATTR_REGEX.exec(tag)) !== null) {
      const key = (am[1] ?? am[3] ?? "").toLowerCase();
      const value = am[2] ?? am[4] ?? "";
      if (key) attrs[key] = value;
    }
    const name = attrs["name"] ?? attrs["property"] ?? attrs["itemprop"];
    const content = attrs["content"];
    if (name && content !== undefined) {
      meta[name] = content;
    }
  }

  // Title
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1] ?? "").trim() : undefined;

  // Visible text (rough). Strip <script>, <style>, <noscript>, then tags.
  const noScript = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ");
  const tagsStripped = noScript.replace(/<[^>]+>/g, " ");
  const visibleText = decodeEntities(tagsStripped)
    .replace(/\s+/g, " ")
    .trim();

  const result: ExtractedHtml = {
    jsonLdBlocks,
    jsonLd,
    parseErrors,
    meta,
    visibleText,
  };
  if (title !== undefined) {
    result.title = title;
  }
  return result;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  hellip: "...",
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
}

/** Normalize a string for fuzzy substring search inside visible text. */
export function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Find the @id-anchored entities expected on the page and return a
 * flat list of unique @types present in the JSON-LD graph.
 */
export function summarizeJsonLd(graph: ReadonlyArray<unknown>): {
  typesPresent: string[];
  hasFaq: boolean;
  hasArticle: boolean;
  hasOrganization: boolean;
  hasWebSite: boolean;
  hasBreadcrumb: boolean;
  hasProduct: boolean;
} {
  const types = new Set<string>();
  for (const node of graph) {
    if (node && typeof node === "object") {
      const t = (node as { "@type"?: unknown })["@type"];
      if (typeof t === "string") types.add(t);
      else if (Array.isArray(t))
        for (const tt of t) if (typeof tt === "string") types.add(tt);
    }
  }
  return {
    typesPresent: Array.from(types).sort(),
    hasFaq: types.has("FAQPage"),
    hasArticle:
      types.has("Article") ||
      types.has("BlogPosting") ||
      types.has("NewsArticle") ||
      types.has("TechArticle"),
    hasOrganization: types.has("Organization"),
    hasWebSite: types.has("WebSite"),
    hasBreadcrumb: types.has("BreadcrumbList"),
    hasProduct:
      types.has("Product") ||
      types.has("SoftwareApplication") ||
      types.has("WebApplication") ||
      types.has("MobileApplication"),
  };
}
