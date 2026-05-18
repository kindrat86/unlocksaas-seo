/**
 * Next.js adapter — opt-in helpers for App Router projects.
 *
 * The adapter is intentionally React-free. The original draft shipped a
 * `<JsonLdScript>` component, but that requires React as a peer
 * dependency and pulls a CommonJS `require()` into an ESM package. The
 * standard Next.js JSON-LD pattern is a one-line inline script tag
 * (`<script type="application/ld+json" dangerouslySetInnerHTML={...}>`),
 * so the helpers here return the data the script tag needs and let
 * consumers compose the tag themselves. Zero peer deps, ESM-safe.
 *
 * Functions exposed:
 *   - `pageAlternates(...)` — Next.js Metadata.alternates fragment
 *   - `markdownAlternate(...)` — same, plus the text/markdown mirror link
 *   - `serializeJsonLd(data)` — JSON.stringify with stable ordering
 *   - `jsonLdScriptProps(data)` — props object ready to spread onto
 *     `<script>` (`type` + `dangerouslySetInnerHTML`)
 */

export interface PageAlternatesInput {
  /** Site-relative canonical path, e.g. "/faq". */
  canonical: string;
  /** Absolute origin used to expand languages map (optional). */
  origin?: string;
  /**
   * Approved translation locales for this canonical path. The "en-US"
   * + "x-default" self-reference is always included.
   */
  approvedLocales?: ReadonlyArray<string>;
  /** Map a locale to a localized path. Defaults to "/{locale}{canonical}". */
  localizePath?: (canonical: string, locale: string) => string;
}

export function pageAlternates(
  input: PageAlternatesInput,
): Record<string, unknown> {
  const localize =
    input.localizePath ??
    ((canonical: string, locale: string) =>
      `/${locale}${canonical === "/" ? "" : canonical}`);
  const wrap = (p: string) => (input.origin ? `${input.origin}${p}` : p);

  const languages: Record<string, string> = {
    "en-US": wrap(input.canonical),
    "x-default": wrap(input.canonical),
  };
  for (const locale of input.approvedLocales ?? []) {
    languages[locale] = wrap(localize(input.canonical, locale));
  }
  return {
    canonical: input.canonical,
    languages,
  };
}

export interface MarkdownAlternateInput extends PageAlternatesInput {
  /** Site-relative path to the markdown mirror, e.g. "/faq.md". */
  mdPath: string;
  /** Absolute origin used to expand the markdown URL. Required for types map. */
  origin: string;
}

/**
 * Build an alternates fragment that declares the canonical, the
 * text/markdown mirror, AND self-referencing hreflang.
 */
export function markdownAlternate(
  input: MarkdownAlternateInput,
): Record<string, unknown> {
  const base = pageAlternates(input);
  return {
    ...base,
    types: {
      "text/markdown": `${input.origin}${input.mdPath}`,
    },
  };
}

/**
 * Serialize one or more JSON-LD blocks to a single string. Multiple
 * blocks are emitted as a JSON array; a single block is emitted as a
 * plain object. Pass the result as the `__html` of a
 * `dangerouslySetInnerHTML` prop on a `<script type="application/ld+json">`.
 */
export function serializeJsonLd(
  data: Record<string, unknown> | ReadonlyArray<Record<string, unknown>>,
  opts: { space?: string | number } = {},
): string {
  const payload = Array.isArray(data) ? Array.from(data) : data;
  return JSON.stringify(payload, null, opts.space);
}

/**
 * Build the props object a Next.js / React caller can spread onto a
 * `<script>` tag for JSON-LD output. Saves the consumer from typing the
 * `type` attribute and the `dangerouslySetInnerHTML` shape by hand.
 *
 *   <script {...jsonLdScriptProps(buildOrganization({...}))} />
 *
 * Returns a plain object — no React types, no React import. Spreadable
 * onto any framework's script tag (React, Preact, Solid, Svelte
 * `{@html}` is different, etc.).
 */
export function jsonLdScriptProps(
  data: Record<string, unknown> | ReadonlyArray<Record<string, unknown>>,
  opts: { space?: string | number } = {},
): { type: string; dangerouslySetInnerHTML: { __html: string } } {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: serializeJsonLd(data, opts),
    },
  };
}
