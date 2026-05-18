/**
 * Organization JSON-LD builder.
 *
 * Honesty defaults:
 *   - sameAs is filtered to absolute https URLs only.
 *   - aggregateRating is intentionally not supported on this builder.
 *     Use Product/SoftwareApplication for the page-level review block,
 *     and only when verified reviews exist.
 *   - Undefined / empty fields are omitted, not nulled.
 */

import { omitEmpty } from "../honesty/omit-empty.js";

export interface OrganizationInput {
  /** @id anchor — recommended: `${origin}/#organization` */
  id?: string;
  /** Display name. */
  name: string;
  /** Legal name (only set if different from name). */
  legalName?: string;
  /** Canonical homepage URL. */
  url: string;
  /** Public-facing logo URL. */
  logo?: string;
  /** Public-facing email. */
  email?: string;
  /** One-line slogan. */
  slogan?: string;
  /** ISO 8601 founding date. */
  foundingDate?: string;
  /** One-paragraph description. */
  description?: string;
  /** Free-text geographic area. */
  areaServed?: string;
  /** Alternate spellings, abbreviations, brand variants. */
  alternateName?: ReadonlyArray<string>;
  /**
   * Off-platform identity anchors (Wikidata, Wikipedia, X, LinkedIn, etc.).
   * MUST be absolute https URLs. Non-https or unparseable entries are silently
   * filtered out — never shipped to the validator.
   */
  sameAs?: ReadonlyArray<string>;
  /** Topical-authority anchors. */
  knowsAbout?: ReadonlyArray<string>;
  /** URL of the page documenting editorial standards. */
  publishingPrinciples?: string;
  /** Wikipedia URL when available — stronger than sameAs alone. */
  mainEntityOfPage?: string;
  /** Founder/owner Person @id or full Person object. */
  founder?: { "@id": string } | Record<string, unknown>;
  /** Entities the organization discusses (third-party products, books, people). */
  mentions?: ReadonlyArray<{
    type: "Person" | "Organization" | "Book" | "SoftwareApplication";
    name: string;
    url?: string;
  }>;
}

function filterSameAs(
  sameAs: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!sameAs || sameAs.length === 0) return undefined;
  const out: string[] = [];
  for (const entry of sameAs) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed.startsWith("https://")) continue;
    try {
      new URL(trimmed);
      out.push(trimmed);
    } catch {
      // skip
    }
  }
  return out.length > 0 ? Array.from(new Set(out)) : undefined;
}

export function buildOrganization(
  input: OrganizationInput,
): Record<string, unknown> {
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": input.id,
    name: input.name,
    legalName: input.legalName,
    url: input.url,
    logo: input.logo,
    email: input.email,
    slogan: input.slogan,
    foundingDate: input.foundingDate,
    description: input.description,
    areaServed: input.areaServed,
    alternateName: input.alternateName,
    sameAs: filterSameAs(input.sameAs),
    knowsAbout: input.knowsAbout,
    publishingPrinciples: input.publishingPrinciples,
    mainEntityOfPage: input.mainEntityOfPage,
    founder: input.founder,
    mentions: input.mentions?.map(
      (m) =>
        ({
          "@type": m.type,
          name: m.name,
          url: m.url,
        }) as Record<string, unknown>,
    ),
  } as Record<string, unknown>);
}
