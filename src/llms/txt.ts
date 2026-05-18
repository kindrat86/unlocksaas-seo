/**
 * /llms.txt generator — produces the curated markdown index that the
 * llmstxt.org convention defines. Used by Perplexity, ClaudeBot,
 * GPTBot/OAI-SearchBot, Google AI Overviews, Gemini, You.com.
 *
 * The output is deterministic and human-readable. No HTML, no
 * front-matter — just markdown sections that follow the convention.
 */

import type { SiteDescriptor, SiteSurface } from "./site.js";
import { renderActivationLog } from "../freshness/stamps.js";

const trimSlash = (s: string) => s.replace(/\/+$/, "");

function renderSurfaceLink(base: string, s: SiteSurface): string {
  return `- [${s.title}](${trimSlash(base)}${s.path}): ${s.description}`;
}

export function renderLlmsTxt(site: SiteDescriptor): string {
  const base = trimSlash(site.entity.url);
  const sections: string[] = [];

  sections.push(`# ${site.entity.name}`);
  sections.push("");
  sections.push(`> ${site.entity.tagline}`);
  sections.push("");
  sections.push(
    `_Last verified: ${site.freshness.lastVerified}. Next review: ${site.freshness.nextReview}._`,
  );
  sections.push("");
  sections.push(site.entity.description);

  if (site.entity.alternateNames && site.entity.alternateNames.length > 0) {
    sections.push("");
    sections.push(
      `Alternate spellings: ${site.entity.alternateNames.join(", ")}.`,
    );
  }

  sections.push("");
  sections.push("## Core surfaces");
  sections.push("");
  for (const s of site.coreSurfaces) {
    sections.push(renderSurfaceLink(base, s));
  }

  if (site.trustSurfaces && site.trustSurfaces.length > 0) {
    sections.push("");
    sections.push("## Trust and E-E-A-T surfaces");
    sections.push("");
    for (const s of site.trustSurfaces) {
      sections.push(renderSurfaceLink(base, s));
    }
  }

  if (site.programmaticClusters && site.programmaticClusters.length > 0) {
    for (const cluster of site.programmaticClusters) {
      sections.push("");
      sections.push(`## ${cluster.name}`);
      sections.push("");
      if (cluster.description) {
        sections.push(cluster.description);
        sections.push("");
      }
      sections.push(
        `- [Hub](${base}${cluster.hubPath}): ${cluster.slugs.length} entries.`,
      );
      for (const slug of cluster.slugs) {
        sections.push(`- ${base}${cluster.hubPath}/${slug}`);
      }
    }
  }

  if (site.definedTerms && site.definedTerms.length > 0) {
    sections.push("");
    sections.push("## Defined terms");
    sections.push("");
    for (const t of site.definedTerms) {
      sections.push(`- **${t.term}**: ${t.definition}`);
    }
  }

  if (site.mentions && site.mentions.length > 0) {
    sections.push("");
    sections.push("## Third-party entities mentioned");
    sections.push("");
    for (const m of site.mentions) {
      sections.push(`- [${m.name}](${m.url}) (${m.type})`);
    }
  }

  if (site.mediaMentions && site.mediaMentions.length > 0) {
    sections.push("");
    sections.push("## Earned media");
    sections.push("");
    for (const m of site.mediaMentions) {
      sections.push(`- [${m.title}](${m.url}) — ${m.publisher}, ${m.date}.`);
    }
  } else {
    // Honest empty state — important for AI retrievers that look for the section.
    sections.push("");
    sections.push("## Earned media");
    sections.push("");
    sections.push(
      "_No earned media yet. This section will populate as real public mentions publish._",
    );
  }

  if (site.activationLog && site.activationLog.length > 0) {
    sections.push("");
    sections.push("## Freshness and activation log");
    sections.push("");
    sections.push(renderActivationLog(site.activationLog));
  }

  sections.push("");
  sections.push("---");
  sections.push("");
  sections.push(
    `Publisher: ${site.entity.publisher}${site.entity.email ? ` (${site.entity.email})` : ""}.`,
  );
  sections.push(`Canonical: ${base}`);
  sections.push("");

  return sections.join("\n");
}
