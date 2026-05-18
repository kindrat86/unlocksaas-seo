/**
 * Honest review-rating derivation from declared comparison dimensions.
 *
 * The honesty rule: a Review.ratingValue must be derivable from facts
 * the reader can verify on the same page. Inventing a star rating from
 * thin air is the most common AI-Overview demotion trigger.
 *
 * The pattern: declare 6 to 9 dimensions per comparison page. Each
 * dimension carries a `winner` field — "A", "B", "tie", or "different"
 * (declared as not directly comparable). Counting dimensional wins is
 * deterministic; the algorithm renders the math on the same page so
 * the reader can reproduce the rating from the declared facts.
 *
 * Algorithm:
 *   - Each dimension contributes a fraction of a point to one side
 *     (winner = "A" or "B"), splits half-half (winner = "tie"), or
 *     contributes nothing (winner = "different").
 *   - The fraction sums to a 0..1 score per side. The two scores do
 *     NOT necessarily sum to 1 because "different" dimensions reduce
 *     both totals symmetrically.
 *   - 0..1 maps to 1..5 via `rating = 1 + score * 4` to match Google's
 *     Rating bestRating/worstRating convention.
 *   - Rounded to one decimal place to match Rich Result formatting.
 */

export type DimensionWinner = "A" | "B" | "tie" | "different";

export interface ComparisonDimension {
  name: string;
  winner: DimensionWinner;
}

export interface DerivedRatings {
  /** 1.0 to 5.0, one decimal place. */
  aRating: number;
  bRating: number;
  aWins: number;
  bWins: number;
  ties: number;
  /** Dimensions excluded from the rating math. */
  differents: number;
  total: number;
}

function roundTo1dp(n: number): number {
  return Math.round(n * 10) / 10;
}

export function deriveComparisonRatings(
  dimensions: ReadonlyArray<ComparisonDimension>,
): DerivedRatings {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let differents = 0;
  for (const d of dimensions) {
    switch (d.winner) {
      case "A":
        aWins++;
        break;
      case "B":
        bWins++;
        break;
      case "tie":
        ties++;
        break;
      case "different":
        differents++;
        break;
    }
  }
  const total = aWins + bWins + ties + differents;
  if (total === 0) {
    return {
      aRating: 3.0,
      bRating: 3.0,
      aWins: 0,
      bWins: 0,
      ties: 0,
      differents: 0,
      total: 0,
    };
  }
  const aScore = (aWins + ties * 0.5) / total;
  const bScore = (bWins + ties * 0.5) / total;
  return {
    aRating: roundTo1dp(1 + aScore * 4),
    bRating: roundTo1dp(1 + bScore * 4),
    aWins,
    bWins,
    ties,
    differents,
    total,
  };
}
