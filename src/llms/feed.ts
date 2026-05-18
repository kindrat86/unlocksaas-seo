/**
 * /llms-feed.json generator — JSON sibling of /llms.txt for retrievers
 * that prefer JSON over markdown. Same facts, machine-typed shape.
 *
 * Schema is permissive by design: every field is optional, additive
 * fields do not bump the version. Breaking changes increment `version`
 * and ship a migration note in the changelog.
 */

import type { SiteDescriptor } from "./site.js";
import { omitEmpty } from "../honesty/omit-empty.js";

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export interface LlmsFeed {
  version: 1;
  meta: {
    generator: string;
    lastVerified: string;
    nextReview: string;
    cadenceDays: number;
  };
  entity: Record<string, unknown>;
  surfaces: {
    core: ReadonlyArray<unknown>;
    trust?: ReadonlyArray<unknown>;
    programmatic?: ReadonlyArray<unknown>;
  };
  mentions?: ReadonlyArray<unknown>;
  definedTerms?: ReadonlyArray<unknown>;
  mediaMentions: ReadonlyArray<unknown>;
  activationLog?: ReadonlyArray<unknown>;
}

export function renderLlmsFeed(site: SiteDescriptor): LlmsFeed {
  const base = trimSlash(site.entity.url);
  const absolutize = (path: string) => `${base}${path}`;

  const feed: LlmsFeed = {
    version: 1,
    meta: {
      generator: "@unlocksaas/seo",
      lastVerified: site.freshness.lastVerified,
      nextReview: site.freshness.nextReview,
      cadenceDays: site.freshness.cadenceDays,
    },
    entity: omitEmpty({
      name: site.entity.name,
      tagline: site.entity.tagline,
      url: site.entity.url,
      description: site.entity.description,
      publisher: site.entity.publisher,
      email: site.entity.email,
      alternateNames: site.entity.alternateNames,
      sameAs: site.entity.sameAs?.filter(
        (s) => typeof s === "string" && s.startsWith("https://"),
      ),
      knowsAbout: site.entity.knowsAbout,
    }) as Record<string, unknown>,
    surfaces: {
      core: site.coreSurfaces.map((s) => ({
        path: s.path,
        url: absolutize(s.path),
        title: s.title,
        description: s.description,
        markdownMirror: s.markdownMirror
          ? absolutize(s.markdownMirror)
          : undefined,
      })),
      trust: site.trustSurfaces?.map((s) => ({
        path: s.path,
        url: absolutize(s.path),
        title: s.title,
        description: s.description,
        markdownMirror: s.markdownMirror
          ? absolutize(s.markdownMirror)
          : undefined,
      })),
      programmatic: site.programmaticClusters?.map((c) => ({
        name: c.name,
        hubPath: c.hubPath,
        hubUrl: absolutize(c.hubPath),
        description: c.description,
        slugs: c.slugs,
        urls: c.slugs.map((slug) => `${base}${c.hubPath}/${slug}`),
      })),
    },
    mentions: site.mentions?.map((m) => ({
      "@type": m.type,
      name: m.name,
      url: m.url,
    })),
    definedTerms: site.definedTerms?.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.definition,
    })),
    mediaMentions: site.mediaMentions ?? [],
    activationLog: site.activationLog,
  };

  return omitEmpty(feed as unknown as Record<string, unknown>) as unknown as LlmsFeed;
}
