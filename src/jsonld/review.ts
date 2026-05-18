/**
 * Review + Rating builders.
 *
 * Use for honest, derived ratings (e.g. a head-to-head comparison page
 * where the rating is a deterministic function of declared dimensions).
 * For aggregate product ratings, use ProductInput.aggregateRating
 * instead.
 */

import { omitEmpty } from "../honesty/omit-empty.js";

export interface ReviewInput {
  /** What is being reviewed. Pass either an @id ref or an inline object. */
  itemReviewed: { "@id": string } | Record<string, unknown>;
  /** Rating value, 1..5 by default. */
  ratingValue: number;
  /** Reviewer @id or name. */
  author: { "@id": string } | { name: string };
  /** Free-text review body. */
  reviewBody?: string;
  bestRating?: number;
  worstRating?: number;
  /** ISO date the review was published. */
  datePublished?: string;
  /** Publisher Org reference. */
  publisher?: { "@id": string };
}

export function buildReview(input: ReviewInput): Record<string, unknown> {
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: input.itemReviewed,
    reviewRating: {
      "@type": "Rating",
      ratingValue: input.ratingValue,
      bestRating: input.bestRating ?? 5,
      worstRating: input.worstRating ?? 1,
    },
    author: input.author,
    reviewBody: input.reviewBody,
    datePublished: input.datePublished,
    publisher: input.publisher,
  } as Record<string, unknown>);
}
