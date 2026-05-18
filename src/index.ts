/**
 * @unlocksaas/seo — honesty-first JSON-LD, llms.txt, and verification
 * primitives for AI-discoverable websites.
 *
 * Extracted from https://unlocksaas.com — the production codebase that
 * shipped these primitives first. The Brunson Hard-Rule discipline this
 * package enforces is documented at https://unlocksaas.com/editorial-policy.
 *
 * Module entry points:
 *   - `@unlocksaas/seo`             Re-exports the most-used primitives
 *   - `@unlocksaas/seo/jsonld`      JSON-LD builders (Organization, FAQ, ...)
 *   - `@unlocksaas/seo/llms`        /llms.txt + /llms-feed.json generators
 *   - `@unlocksaas/seo/honesty`     Audit rules + ISO date helpers
 *   - `@unlocksaas/seo/verification` Search-console env-driven slots
 *   - `@unlocksaas/seo/freshness`   lastVerified / nextReview helpers
 *   - `@unlocksaas/seo/review`      Honest rating-from-comparison
 *   - `@unlocksaas/seo/next`        Next.js App Router adapter
 */

export * from "./jsonld/index.js";
export * from "./honesty/index.js";
export * from "./verification/index.js";
export * from "./freshness/index.js";
export * from "./review/index.js";
export * from "./llms/index.js";
