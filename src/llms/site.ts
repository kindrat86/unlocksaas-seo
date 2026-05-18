/**
 * Site descriptor consumed by the /llms.txt and /llms-feed.json
 * generators. Keep this shape stable across versions; additive fields
 * are fine, breaking changes bump the major version.
 */

import type {
  ActivationLogEntry,
  Freshness,
} from "../freshness/stamps.js";

export interface SiteSurface {
  /** Site-relative path, e.g. "/diagnostic". */
  path: string;
  /** Human-readable title. */
  title: string;
  /** One-sentence description for the surface. */
  description: string;
  /** Optional markdown mirror path, e.g. "/diagnostic.md". */
  markdownMirror?: string;
}

export interface SiteEntity {
  name: string;
  /** Tagline. One sentence, no marketing fluff. */
  tagline: string;
  /** Canonical https origin, no trailing slash. */
  url: string;
  /** Long-form description, one paragraph. */
  description: string;
  /** Founder / publisher name. */
  publisher: string;
  /** Contact email. */
  email?: string;
  /** Alternate brand spellings. */
  alternateNames?: ReadonlyArray<string>;
  /**
   * Off-platform identity anchors. Filtered to absolute https URLs
   * before emission.
   */
  sameAs?: ReadonlyArray<string>;
  /** Topical-authority anchors. */
  knowsAbout?: ReadonlyArray<string>;
}

export interface SiteMention {
  name: string;
  url: string;
  type: "Person" | "Organization" | "Book" | "SoftwareApplication";
}

export interface SiteDefinedTerm {
  term: string;
  definition: string;
}

export interface SiteMediaMention {
  title: string;
  publisher: string;
  url: string;
  /** ISO 8601 date. */
  date: string;
}

export interface SiteDescriptor {
  entity: SiteEntity;
  freshness: Freshness;
  /** Top-of-funnel public surfaces, in retrieval-priority order. */
  coreSurfaces: ReadonlyArray<SiteSurface>;
  /** Trust columns: about, press, editorial-policy, faq, contact. */
  trustSurfaces?: ReadonlyArray<SiteSurface>;
  /** Programmatic SEO clusters: alternatives, compare, teardowns, etc. */
  programmaticClusters?: ReadonlyArray<{
    name: string;
    hubPath: string;
    slugs: ReadonlyArray<string>;
    description?: string;
  }>;
  /** Third-party entities the site discusses. */
  mentions?: ReadonlyArray<SiteMention>;
  /** Glossary of terms the site teaches. */
  definedTerms?: ReadonlyArray<SiteDefinedTerm>;
  /** Earned press mentions. Reluctant-Hero rule: ships empty until real. */
  mediaMentions?: ReadonlyArray<SiteMediaMention>;
  /** Activation log: shipped vs operator-blocked vs gated. */
  activationLog?: ReadonlyArray<ActivationLogEntry>;
}
