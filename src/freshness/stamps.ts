/**
 * Freshness stamps and activation logs.
 *
 * Every LLM-readable surface ought to carry a `Last verified` date and
 * a `Next review` date. Without them, a retrieval-augmented answer
 * pipeline that caches your /llms.txt has no way to tell how stale its
 * snapshot is. With them, the model can hedge or downweight citations
 * after the documented review window has elapsed.
 *
 * Three primitives:
 *   - createFreshness({ lastVerified, cadenceDays }) → { lastVerified,
 *     nextReview, cadenceDays }. nextReview is computed by addDaysIso.
 *   - ActivationLogEntry / renderActivationLog → markdown bullet list
 *     of items with state (shipped / operator / gated).
 */

import { addDaysIso, isIsoDate } from "../honesty/dates.js";

export interface Freshness {
  /** ISO 8601 date this surface was last reviewed end-to-end by a human. */
  lastVerified: string;
  /** Computed: lastVerified + cadenceDays. */
  nextReview: string;
  /** How often the surface should be re-reviewed, in days. */
  cadenceDays: number;
}

export interface FreshnessInput {
  lastVerified: string;
  cadenceDays?: number;
}

const DEFAULT_CADENCE_DAYS = 90;

export function createFreshness(input: FreshnessInput): Freshness {
  if (!isIsoDate(input.lastVerified)) {
    throw new Error(
      `createFreshness: lastVerified must be ISO 8601, got "${input.lastVerified}"`,
    );
  }
  const cadenceDays = input.cadenceDays ?? DEFAULT_CADENCE_DAYS;
  if (!Number.isInteger(cadenceDays) || cadenceDays <= 0) {
    throw new Error(
      `createFreshness: cadenceDays must be a positive integer, got ${cadenceDays}`,
    );
  }
  return {
    lastVerified: input.lastVerified,
    nextReview: addDaysIso(input.lastVerified, cadenceDays),
    cadenceDays,
  };
}

/**
 * Activation log entry — distinguishes "shipped" (live in production)
 * from "operator" (code is live, blocked on an operator action like
 * pasting an env var) from "gated" (deliberately not shipped, waiting
 * on an evidence trigger).
 */
export interface ActivationLogEntry {
  /** snake_case stable key. */
  readonly item: string;
  readonly state: "shipped" | "operator" | "gated";
  readonly note: string;
}

export function renderActivationLog(
  log: ReadonlyArray<ActivationLogEntry>,
): string {
  return log
    .map((row) => `- \`${row.item}\` [${row.state}] – ${row.note}`)
    .join("\n");
}
