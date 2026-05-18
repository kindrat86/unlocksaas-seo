# Changelog

## 0.1.1 — 2026-05-18

Tuning release after running `validate-claims --strict` against 7 production surfaces on https://unlocksaas.com. The Brunson Hard-Rule held 100% (zero honesty violations), but one drift check was over-eager and flagged every SEO-optimized curated page as failing.

### Changed

- **`validate-claims` no longer treats meta description ≠ visible body as a drift failure.** The previous "first 60 chars of meta description must appear in body" check was wrong as a strict-failing signal: a good meta description is deliberately a different framing than the visible H1, optimized for SERP CTR. The check is replaced with a smarter, lower-tier recommendation: if the meta description's content words have <25% overlap with the body's content words, surface as a recommendation (not a drift failure). Threshold-tuned, stopword-filtered, won't fire on legitimate reframing.

### Why this matters

Before 0.1.1: running `validate-claims --strict` against production unlocksaas.com surfaces FAILED 4 of 7 (`/`, `/diagnostic`, `/faq`, `/about`) on the meta-description drift check alone, despite the pages being correct.

After 0.1.1: same surfaces pass `--strict` cleanly. The recommendation tier still surfaces the signal if a meta description is genuinely stale (zero word overlap with body), so the diagnostic value is preserved.

### Migration

None required. Consumers using `validate-claims` in CI will see fewer false failures. The exit code for the same input is now more conservative — only true honesty violations and real schema-vs-rendered drift trigger non-zero exits under `--strict`.

## 0.1.0 — 2026-05-18

Initial public release. Extracted from the production codebase at https://unlocksaas.com.

### Included

- **JSON-LD builders** (framework-free): `Organization`, `Person`, `WebSite` (with `SearchAction` + `AskAction`), `Article`, `FAQPage`, `BreadcrumbList`, `HowTo`, `Product` / `SoftwareApplication`, `Review`, `SpeakableSpecification`.
- **Honesty primitives**: `omitEmpty`, `isIsoDate`, `formatVerifiedDate`, `addDaysIso`, `auditJsonLd`, `checkAggregateRating`, `checkIsoDates`, `checkSameAs`.
- **`validate-claims` CLI**: fetches a URL, extracts JSON-LD + meta + visible text, audits for honesty violations and schema-vs-rendered drift. Exits non-zero on failure.
- **`generate-llms-txt` CLI**: reads a `SiteDescriptor` JSON config and writes `/llms.txt` + `/llms-feed.json`.
- **`init` CLI**: scaffolds a starter `site.config.json`.
- **Next.js adapter**: `pageAlternates`, `markdownAlternate`, `serializeJsonLd`, `jsonLdScriptProps`. **Zero runtime peer deps** — the adapter exposes plain functions instead of a React component, so it works in any React-shaped framework (Next, Preact, Solid, Astro) without dragging React into the dependency tree.
- **Verification env slots**: Google, Bing, Yandex, Pinterest, Facebook, Naver — empty until env var is set.
- **Freshness primitives**: `createFreshness`, `renderActivationLog`.
- **Rating derivation**: `deriveComparisonRatings` for honest head-to-head Review ratings.
