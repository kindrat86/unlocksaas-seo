/**
 * Article JSON-LD builder.
 *
 * Honesty defaults:
 *   - datePublished and dateModified are required when set. Free-text
 *     dates are silently rejected by Google's Article validator, so we
 *     refuse to ship them at all.
 *   - author and publisher should reference @id anchors when possible.
 */

import { omitEmpty } from "../honesty/omit-empty.js";
import { isIsoDate } from "../honesty/dates.js";

export interface ArticleInput {
  /** Canonical URL of the article page. */
  url: string;
  /** Article headline (use the H1 verbatim). */
  headline: string;
  /** Short description (matches the meta description). */
  description?: string;
  /** ISO 8601 publish date. Required. Throws if invalid. */
  datePublished: string;
  /** ISO 8601 last-modified date. Required. Throws if invalid. */
  dateModified: string;
  /** Author Person reference. */
  author?: { "@id": string } | Record<string, unknown>;
  /** Publisher Organization reference. */
  publisher?: { "@id": string } | Record<string, unknown>;
  /** Hero image URL (1200x630 recommended for OG parity). */
  image?: string | ReadonlyArray<string>;
  /** Optional WebSite @id for isPartOf cross-reference. */
  isPartOf?: { "@id": string };
  /** Language code (e.g. "en-US"). */
  inLanguage?: string;
  /** Keywords (comma-separated string or array). */
  keywords?: string | ReadonlyArray<string>;
  /** Use "NewsArticle" / "BlogPosting" / "TechArticle" to specialize. */
  articleType?:
    | "Article"
    | "NewsArticle"
    | "BlogPosting"
    | "TechArticle"
    | "Report";
}

export function buildArticle(input: ArticleInput): Record<string, unknown> {
  if (!isIsoDate(input.datePublished.slice(0, 10))) {
    throw new Error(
      `buildArticle: datePublished must be ISO 8601, got "${input.datePublished}"`,
    );
  }
  if (!isIsoDate(input.dateModified.slice(0, 10))) {
    throw new Error(
      `buildArticle: dateModified must be ISO 8601, got "${input.dateModified}"`,
    );
  }
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": input.articleType ?? "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: input.author,
    publisher: input.publisher,
    image: input.image,
    isPartOf: input.isPartOf,
    inLanguage: input.inLanguage,
    keywords: input.keywords,
  } as Record<string, unknown>);
}
