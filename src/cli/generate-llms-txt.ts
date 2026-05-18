/**
 * generate-llms-txt subcommand.
 *
 *   unlocksaas-seo generate-llms-txt --config site.config.json --out ./public
 *
 * Reads a JSON config matching SiteDescriptor and writes:
 *   - <out>/llms.txt
 *   - <out>/llms-feed.json
 *
 * Also supports `init` mode that writes a starter site.config.json
 * pre-populated with the unlocksaas convention so you can edit instead
 * of starting from a blank file.
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { renderLlmsTxt } from "../llms/txt.js";
import { renderLlmsFeed } from "../llms/feed.js";
import type { SiteDescriptor } from "../llms/site.js";
import {
  color,
  EXIT_INVALID_ARGS,
  EXIT_OK,
  printErr,
  printOut,
} from "./shared.js";
import { createFreshness } from "../freshness/stamps.js";

export async function generateLlmsTxt(opts: {
  config: string;
  out: string;
}): Promise<number> {
  let raw: string;
  try {
    raw = await readFile(resolve(opts.config), "utf8");
  } catch (err) {
    printErr(
      color.red(
        `Could not read config "${opts.config}": ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    return EXIT_INVALID_ARGS;
  }

  let descriptor: SiteDescriptor;
  try {
    const parsed = JSON.parse(raw) as Partial<SiteDescriptor> & {
      freshness?: { lastVerified: string; cadenceDays?: number };
    };
    if (!parsed.entity || !parsed.freshness || !parsed.coreSurfaces) {
      throw new Error(
        "config must include `entity`, `freshness`, and `coreSurfaces`",
      );
    }
    // If freshness was passed as input shape (lastVerified + cadenceDays),
    // expand to full Freshness via createFreshness.
    const fAny = parsed.freshness as {
      lastVerified: string;
      cadenceDays?: number;
      nextReview?: string;
    };
    const freshness =
      fAny.nextReview && typeof fAny.cadenceDays === "number"
        ? {
            lastVerified: fAny.lastVerified,
            nextReview: fAny.nextReview,
            cadenceDays: fAny.cadenceDays,
          }
        : createFreshness({
            lastVerified: fAny.lastVerified,
            ...(typeof fAny.cadenceDays === "number"
              ? { cadenceDays: fAny.cadenceDays }
              : {}),
          });
    descriptor = { ...parsed, freshness } as SiteDescriptor;
  } catch (err) {
    printErr(
      color.red(
        `Invalid config: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    return EXIT_INVALID_ARGS;
  }

  const outDir = resolve(opts.out);
  await mkdir(outDir, { recursive: true });

  const llmsTxtPath = resolve(outDir, "llms.txt");
  const llmsFeedPath = resolve(outDir, "llms-feed.json");

  const llmsTxt = renderLlmsTxt(descriptor);
  const llmsFeed = renderLlmsFeed(descriptor);

  await writeFile(llmsTxtPath, llmsTxt, "utf8");
  await writeFile(llmsFeedPath, JSON.stringify(llmsFeed, null, 2), "utf8");

  printOut(color.green("Wrote:"));
  printOut(`  ${llmsTxtPath}`);
  printOut(`  ${llmsFeedPath}`);
  return EXIT_OK;
}

const STARTER_CONFIG: SiteDescriptor = {
  entity: {
    name: "Your Site",
    tagline: "One sentence promise. No marketing fluff.",
    url: "https://example.com",
    description:
      "One-paragraph description of what your site does, who it serves, and the single result it produces.",
    publisher: "Your Name",
    email: "you@example.com",
    alternateNames: [],
    sameAs: [],
    knowsAbout: [],
  },
  // Use createFreshness at write-time so the file ships with a real nextReview.
  freshness: createFreshness({
    lastVerified: new Date().toISOString().slice(0, 10),
    cadenceDays: 90,
  }),
  coreSurfaces: [
    {
      path: "/",
      title: "Home",
      description: "Landing page. Premise, founder bio, primary calls to action.",
      markdownMirror: "/index.md",
    },
  ],
  trustSurfaces: [],
  programmaticClusters: [],
  mentions: [],
  definedTerms: [],
  mediaMentions: [],
  activationLog: [],
};

export async function initStarterConfig(target: string): Promise<number> {
  const path = resolve(target);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(STARTER_CONFIG, null, 2), "utf8");
  printOut(color.green(`Wrote starter config to ${path}`));
  printOut(
    color.dim(
      "Edit this file, then run: unlocksaas-seo generate-llms-txt --config " +
        target +
        " --out ./public",
    ),
  );
  return EXIT_OK;
}
