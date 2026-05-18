# @unlocksaas/seo

**Honesty-first JSON-LD, llms.txt, and verification primitives for AI-discoverable websites.**

[![npm](https://img.shields.io/npm/v/@unlocksaas/seo.svg)](https://www.npmjs.com/package/@unlocksaas/seo)
[![types](https://img.shields.io/badge/types-included-blue.svg)](#api)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Extracted from the production codebase at **[unlocksaas.com](https://unlocksaas.com)** — the post-launch playbook for non-engineer founders shipping with AI tools. The Brunson Hard-Rule discipline this package enforces is documented at [unlocksaas.com/editorial-policy](https://unlocksaas.com/editorial-policy).

---

## Why another SEO package?

Most JSON-LD libraries ship every possible field. This one **refuses to ship fabricated fields**.

The three failure modes that demote a site from Google AI Overviews, Perplexity citations, and Bing Copilot answers are:

1. **Fabricated `aggregateRating`** — a star rating with `reviewCount: 0` (or no count at all)
2. **Drift between JSON-LD and rendered HTML** — schema says one price, the page shows another
3. **Stale or missing date stamps** — `datePublished: "soon"` is the canonical example

`@unlocksaas/seo` enforces all three at build time, and ships a `validate-claims` CLI that audits a deployed page in one shot.

---

## Install

```bash
npm install @unlocksaas/seo
```

CLI (no install required):

```bash
npx @unlocksaas/seo validate-claims https://yoursite.com/pricing
```

---

## The killer feature: `validate-claims`

Point it at a URL (or a local HTML file). It extracts every `<script type="application/ld+json">` block, every `<meta>`, and the visible HTML. Then it diffs.

```
$ npx @unlocksaas/seo validate-claims https://yoursite.com/pricing

validate-claims: https://yoursite.com/pricing
  fetched: 2026-05-18T19:12:32Z (HTTP 200), 24,118 bytes

Schema graph:
  Article, BreadcrumbList, FAQPage, Organization, SoftwareApplication, WebSite

Honesty violations:
  aggregateRating.requires-nonzero-count  [3].aggregateRating
    aggregateRating declares 0 reviews. Omit aggregateRating until at least one verified review exists.
  datePublished.must-be-iso-date  [1].datePublished
    datePublished must be a valid YYYY-MM-DD ISO date; got "soon".
  sameAs.must-be-https  [0].sameAs[2]
    sameAs[2] is not an absolute https URL: "twitter.com/yourhandle".

Schema-to-rendered drift:
  jsonLd[3](SoftwareApplication).offers[1].price
    Offer.price "$29/mo" is not visible on the page. Schema-to-rendered drift.
  jsonLd[4](FAQPage).mainEntity[1].name
    FAQ question "..." is not present in visible HTML.

Recommendations:
  → Missing BreadcrumbList. Without it, Google falls back to the raw URL in the SERP — lower CTR.
  → Missing og:image. Twitter/LinkedIn previews will be text-only.

FAIL
```

Exit code is non-zero on any violation. Wire it into CI and your pricing page can never silently drift from your Stripe checkout again.

---

## The Brunson Hard-Rule, in code

Every builder in this package is a **honesty-gated** function. The most consequential examples:

### `aggregateRating` is dropped if `reviewCount` is 0

```ts
import { buildProduct } from "@unlocksaas/seo/jsonld";

const product = buildProduct({
  name: "My SaaS",
  url: "https://example.com",
  offers: [{ price: 49, priceCurrency: "USD" }],
  aggregateRating: { ratingValue: 5, reviewCount: 0 },  // silently dropped
});

// Output omits the aggregateRating block entirely — no demotion trigger.
```

The `validate-claims` CLI flags any deployed page that ships an `aggregateRating` with `reviewCount === 0` so a teammate cannot bypass the rule by writing raw JSON-LD.

### `sameAs` filters non-https URLs

```ts
buildOrganization({
  name: "Demo",
  url: "https://demo.example",
  sameAs: [
    "http://insecure.example",        // dropped
    "https://github.com/demo",        // kept
    "twitter.com/demo",               // dropped (no scheme)
    "not-a-url",                      // dropped (unparseable)
  ],
});
```

### ISO 8601 dates are enforced

```ts
buildArticle({
  url: "https://demo.example/post",
  headline: "...",
  datePublished: "soon",   // throws at build time
  dateModified: "2026-05-17",
});
```

### Derived ratings, not invented ones

```ts
import { deriveComparisonRatings } from "@unlocksaas/seo/review";

const ratings = deriveComparisonRatings([
  { name: "Pricing", winner: "A" },
  { name: "Speed",   winner: "B" },
  { name: "Support", winner: "tie" },
  { name: "Free tier", winner: "different" },  // shrinks the denominator
]);
// → { aRating: 2.5, bRating: 2.5, aWins: 1, bWins: 1, ties: 1, differents: 1, total: 4 }
```

The reader can reproduce the math from the dimensions you render on the same page. No invented star ratings.

---

## llms.txt + llms-feed.json in one config file

`@unlocksaas/seo` ships a typed `SiteDescriptor` shape and two renderers — `renderLlmsTxt(site)` and `renderLlmsFeed(site)`. Both read from the same source, so the markdown and the JSON sibling cannot drift on freshness.

```bash
npx @unlocksaas/seo init ./site.config.json
# edit site.config.json
npx @unlocksaas/seo generate-llms-txt --config ./site.config.json --out ./public
# → ./public/llms.txt
# → ./public/llms-feed.json
```

Both files carry `Last verified` and `Next review` dates so a retrieval-augmented model that cached your content weeks ago can tell its snapshot is stale.

---

## Next.js App Router adapter

If you're on Next.js 14+:

```ts
// app/layout.tsx
import type { Metadata } from "next";
import { buildVerification } from "@unlocksaas/seo/verification";
import { pageAlternates } from "@unlocksaas/seo/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://yoursite.com"),
  title: { default: "Your Site", template: "%s — Your Site" },
  verification: buildVerification(),  // env-driven, empty until you paste codes into Vercel
  alternates: pageAlternates({ canonical: "/" }),
};
```

```tsx
// app/page.tsx
import { jsonLdScriptProps } from "@unlocksaas/seo/next";
import { buildOrganization, buildWebSite, buildIds } from "@unlocksaas/seo/jsonld";

const ids = buildIds("https://yoursite.com");

const jsonLd = [
  buildOrganization({ id: ids.organization, name: "Your Co", url: "https://yoursite.com" }),
  buildWebSite({
    id: ids.website,
    name: "Your Co",
    url: "https://yoursite.com",
    publisher: { "@id": ids.organization },
    potentialAction: [{
      type: "SearchAction",
      target: "https://yoursite.com/search?q={search_term_string}",
      queryInput: "search_term_string",
    }],
  }),
];

export default function Page() {
  return (
    <>
      <script {...jsonLdScriptProps(jsonLd)} />
      <h1>...</h1>
    </>
  );
}
```

This package has **zero runtime dependencies** — including no React peer dep. The Next.js adapter exposes plain functions (`pageAlternates`, `markdownAlternate`, `serializeJsonLd`, `jsonLdScriptProps`) that work in any React-shaped framework. The core JSON-LD / llms / honesty modules are framework-free.

---

## Module map

| Entry | What it gives you |
|---|---|
| `@unlocksaas/seo` | Re-exports the most-used primitives |
| `@unlocksaas/seo/jsonld` | `buildOrganization`, `buildPerson`, `buildWebSite`, `buildArticle`, `buildFaqPage`, `buildBreadcrumbList`, `buildHowTo`, `buildProduct`, `buildReview`, `speakableFromClass`, `buildIds` |
| `@unlocksaas/seo/llms` | `renderLlmsTxt`, `renderLlmsFeed`, types |
| `@unlocksaas/seo/honesty` | `auditJsonLd`, `omitEmpty`, `isIsoDate`, `formatVerifiedDate`, `addDaysIso` |
| `@unlocksaas/seo/verification` | `buildVerification` (Google/Bing/Yandex/Pinterest/Facebook/Naver env slots) |
| `@unlocksaas/seo/freshness` | `createFreshness`, `renderActivationLog` |
| `@unlocksaas/seo/review` | `deriveComparisonRatings` |
| `@unlocksaas/seo/next` | `pageAlternates`, `markdownAlternate`, `serializeJsonLd`, `jsonLdScriptProps` |

---

## CLI reference

```
unlocksaas-seo validate-claims <url|file>  # audit a deployed page
  --json                                   # machine-readable output
  --strict                                 # treat drift as errors
  --timeout=15000                          # fetch timeout in ms

unlocksaas-seo init [./site.config.json]   # scaffold a SiteDescriptor
unlocksaas-seo generate-llms-txt --config FILE --out DIR
unlocksaas-seo help
```

Exit codes: `0` clean · `1` violations · `2` invalid args · `3` fetch failed.

Add to your CI:

```yaml
- run: npx @unlocksaas/seo validate-claims https://${{ secrets.PREVIEW_URL }}/pricing --strict
```

---

## Who built this

[**Unlock SaaS**](https://unlocksaas.com) — a playbook that turns an already-shipped product into a verified paying customer in 60 days. Built for non-engineer founders who shipped with Lovable, Claude, Replit, v0, or Cursor and now have a flat Stripe line.

The discipline this package enforces is documented at:

- [unlocksaas.com/editorial-policy](https://unlocksaas.com/editorial-policy) — the Brunson Hard-Rule
- [unlocksaas.com/press](https://unlocksaas.com/press) — press kit, brand facts, fast facts
- [unlocksaas.com/llms.txt](https://unlocksaas.com/llms.txt) — this package eats its own dogfood

If you use this package and want to credit it:

```html
<a href="https://unlocksaas.com" rel="external">Powered by @unlocksaas/seo</a>
```

---

## License

MIT — use freely. Attribution to [unlocksaas.com](https://unlocksaas.com) appreciated but not required.

## Contributing

Issues and PRs welcome at [github.com/kindrat86/unlocksaas](https://github.com/kindrat86/unlocksaas/issues) — the package lives at `packages/seo/` in the Unlock SaaS monorepo. A standalone mirror at `github.com/unlocksaas/seo` is planned but the monorepo is the canonical source.

The single non-negotiable rule: **no fabricated examples in tests or docs**. Every code sample in this README runs against the actual published API, end-to-end. If you submit a PR, the example you add must pass `npx @unlocksaas/seo validate-claims` against itself.
