/**
 * Product / SoftwareApplication JSON-LD builder.
 *
 * THE HONESTY RULE: aggregateRating is intentionally NOT supported on
 * this builder until you pass a non-zero, verified reviewCount. Pass
 * `aggregateRating: { ratingValue, reviewCount }` only when both are
 * truthfully derived from real reviews. A `reviewCount: 0` triggers
 * the entire structured-data block being demoted by Google.
 *
 * The package-level honesty audit will flag any block that ships an
 * aggregateRating with reviewCount === 0 or missing.
 */

import { omitEmpty } from "../honesty/omit-empty.js";
import { isIsoDate } from "../honesty/dates.js";

export interface OfferInput {
  price: string | number;
  priceCurrency: string;
  availability?:
    | "InStock"
    | "OutOfStock"
    | "PreOrder"
    | "Discontinued"
    | "LimitedAvailability";
  url?: string;
  priceValidUntil?: string;
  eligibleRegion?: string | Record<string, unknown>;
}

export interface AggregateRatingInput {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface ProductInput {
  /** @id anchor when set. */
  id?: string;
  /** Use SoftwareApplication or Product depending on the entity. */
  productType?:
    | "Product"
    | "SoftwareApplication"
    | "WebApplication"
    | "MobileApplication";
  name: string;
  description?: string;
  url?: string;
  image?: string | ReadonlyArray<string>;
  brand?: { "@id": string } | { name: string };
  offers?: ReadonlyArray<OfferInput>;
  /**
   * Honesty gate: this field is silently dropped if reviewCount is 0
   * or absent. The audit pass will flag the input separately.
   */
  aggregateRating?: AggregateRatingInput;
  applicationCategory?: string;
  operatingSystem?: string;
}

function buildOffer(o: OfferInput): Record<string, unknown> {
  if (o.priceValidUntil && !isIsoDate(o.priceValidUntil.slice(0, 10))) {
    throw new Error(
      `buildOffer: priceValidUntil must be ISO 8601, got "${o.priceValidUntil}"`,
    );
  }
  return omitEmpty({
    "@type": "Offer",
    price: typeof o.price === "number" ? o.price.toFixed(2) : o.price,
    priceCurrency: o.priceCurrency,
    availability: o.availability
      ? `https://schema.org/${o.availability}`
      : undefined,
    url: o.url,
    priceValidUntil: o.priceValidUntil,
    eligibleRegion: o.eligibleRegion,
  } as Record<string, unknown>) as Record<string, unknown>;
}

export function buildProduct(input: ProductInput): Record<string, unknown> {
  let aggregateRating: Record<string, unknown> | undefined;
  if (
    input.aggregateRating &&
    Number.isFinite(input.aggregateRating.reviewCount) &&
    input.aggregateRating.reviewCount > 0
  ) {
    aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue,
      reviewCount: input.aggregateRating.reviewCount,
      bestRating: input.aggregateRating.bestRating ?? 5,
      worstRating: input.aggregateRating.worstRating ?? 1,
    };
  }
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": input.productType ?? "SoftwareApplication",
    "@id": input.id,
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    brand: input.brand,
    offers: input.offers?.map(buildOffer),
    aggregateRating,
    applicationCategory: input.applicationCategory,
    operatingSystem: input.operatingSystem,
  } as Record<string, unknown>);
}
