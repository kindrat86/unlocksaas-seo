/**
 * Brunson Hard-Rule honesty rules — the editorial discipline this whole
 * package exists to enforce.
 *
 * Each rule is a pure predicate plus a violation reason. The rules are
 * applied at build time (by builders that refuse to serialize fabricated
 * fields) and at audit time (by the validate-claims CLI).
 *
 * The rules below are NOT subjective. Each one corresponds to a concrete
 * Schema.org or LLM-pipeline failure mode where a fabricated field
 * provably hurts the publisher more than helps.
 */

import { isIsoDate } from "./dates.js";

export interface HonestyViolation {
  /** Stable machine-readable rule key. */
  readonly rule: string;
  /** Human-readable reason. */
  readonly reason: string;
  /** Optional JSON path where the violation was found. */
  readonly path?: string;
}

/**
 * aggregateRating MUST cite a reviewCount, AND reviewCount MUST be > 0.
 * A zero-review aggregateRating is the most common LLM-pipeline penalty
 * trigger: Google demotes the entire structured-data block for the page.
 *
 * If you do not yet have verified reviews, OMIT the aggregateRating field
 * entirely. It is not required by Schema.org.
 */
export function checkAggregateRating(
  obj: Record<string, unknown>,
  path = "",
): HonestyViolation[] {
  const violations: HonestyViolation[] = [];
  const rating = obj["aggregateRating"];
  if (rating === undefined || rating === null) return violations;
  if (typeof rating !== "object") return violations;
  const r = rating as Record<string, unknown>;
  const reviewCount = r["reviewCount"];
  const ratingCount = r["ratingCount"];
  const declaredCount =
    typeof reviewCount === "number"
      ? reviewCount
      : typeof ratingCount === "number"
        ? ratingCount
        : undefined;

  if (declaredCount === undefined) {
    violations.push({
      rule: "aggregateRating.requires-count",
      reason:
        "aggregateRating is declared but neither reviewCount nor ratingCount is set. Omit aggregateRating until verified reviews exist.",
      path: `${path}.aggregateRating`,
    });
  } else if (declaredCount <= 0) {
    violations.push({
      rule: "aggregateRating.requires-nonzero-count",
      reason: `aggregateRating declares ${declaredCount} reviews. Omit aggregateRating until at least one verified review exists.`,
      path: `${path}.aggregateRating`,
    });
  }
  return violations;
}

/**
 * dateModified, datePublished, dateCreated, and lastReviewed MUST be ISO
 * 8601 dates. Free-text dates ("recently", "May 2026") are silently
 * dropped by every major validator.
 */
export function checkIsoDates(
  obj: Record<string, unknown>,
  path = "",
): HonestyViolation[] {
  const violations: HonestyViolation[] = [];
  const dateFields = [
    "datePublished",
    "dateModified",
    "dateCreated",
    "lastReviewed",
    "uploadDate",
    "validFrom",
    "validThrough",
    "foundingDate",
  ];
  for (const field of dateFields) {
    const value = obj[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      violations.push({
        rule: `${field}.must-be-iso-string`,
        reason: `${field} must be an ISO 8601 string; got ${typeof value}.`,
        path: `${path}.${field}`,
      });
      continue;
    }
    // Allow full ISO datetime as well.
    const dateOnly = value.length >= 10 ? value.slice(0, 10) : value;
    if (!isIsoDate(dateOnly)) {
      violations.push({
        rule: `${field}.must-be-iso-date`,
        reason: `${field} must be a valid YYYY-MM-DD ISO date; got "${value}".`,
        path: `${path}.${field}`,
      });
    }
  }
  return violations;
}

/**
 * sameAs entries MUST be absolute https URLs. http URLs, relative paths,
 * and free-text strings all trip the same Knowledge Graph deduplication
 * heuristic that drops the whole sameAs array.
 */
export function checkSameAs(
  obj: Record<string, unknown>,
  path = "",
): HonestyViolation[] {
  const violations: HonestyViolation[] = [];
  const sameAs = obj["sameAs"];
  if (sameAs === undefined || sameAs === null) return violations;
  const arr = Array.isArray(sameAs) ? sameAs : [sameAs];
  arr.forEach((entry, idx) => {
    if (typeof entry !== "string") {
      violations.push({
        rule: "sameAs.must-be-string",
        reason: `sameAs[${idx}] is not a string.`,
        path: `${path}.sameAs[${idx}]`,
      });
      return;
    }
    if (!entry.startsWith("https://")) {
      violations.push({
        rule: "sameAs.must-be-https",
        reason: `sameAs[${idx}] is not an absolute https URL: "${entry}".`,
        path: `${path}.sameAs[${idx}]`,
      });
      return;
    }
    try {
      new URL(entry);
    } catch {
      violations.push({
        rule: "sameAs.must-parse",
        reason: `sameAs[${idx}] is not a parseable URL: "${entry}".`,
        path: `${path}.sameAs[${idx}]`,
      });
    }
  });
  return violations;
}

/**
 * Run every honesty rule against a single JSON-LD object. Recurses into
 * objects but does NOT recurse into arrays of strings or numbers.
 */
export function auditJsonLd(
  obj: unknown,
  path = "",
): HonestyViolation[] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== "object") return [];
  if (Array.isArray(obj)) {
    return obj.flatMap((item, idx) => auditJsonLd(item, `${path}[${idx}]`));
  }
  const record = obj as Record<string, unknown>;
  const local = [
    ...checkAggregateRating(record, path),
    ...checkIsoDates(record, path),
    ...checkSameAs(record, path),
  ];
  const nested: HonestyViolation[] = [];
  for (const key of Object.keys(record)) {
    const v = record[key];
    if (v && typeof v === "object") {
      nested.push(...auditJsonLd(v, path ? `${path}.${key}` : key));
    }
  }
  return [...local, ...nested];
}
