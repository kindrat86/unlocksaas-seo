/**
 * Recursively strip undefined, null, empty-string, and empty-array values.
 *
 * Why this exists
 * ---------------
 * Schema.org JSON-LD validators (Google Rich Results Test, Bing Markup
 * Validator, Schema.org's own validator) treat `null` and `""` very
 * differently from "field absent." A field that's present with an empty
 * value is read as "the publisher claims this field, value unknown" —
 * which downgrades the entity confidence score on the whole block. A
 * field that's absent is read as "the publisher doesn't claim this
 * field" — which is the honest signal for env-driven slots that
 * haven't been populated yet.
 *
 * Brunson Hard-Rule reconciliation: every empty slot in the JSON-LD
 * we emit is either filled with a real, verifiable value or absent
 * entirely. We never ship `"telephone": ""` or `"sameAs": []` —
 * absence is the correct signal.
 *
 * The function is intentionally narrow: it strips, it does not transform.
 * - Objects: drop keys whose values are undefined, null, "", or [].
 * - Arrays: drop undefined/null elements; do NOT drop empty strings
 *   inside arrays (they may be legitimate values like in `keywords`).
 *   Caller is responsible for filtering arrays before passing them.
 * - Other primitives (number, boolean, non-empty string): pass through.
 * - Nested objects/arrays: recurse.
 *
 * Functions, symbols, and class instances are passed through unchanged
 * (the caller is doing something weird and we shouldn't second-guess).
 */

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

/**
 * Recursively omit empty values from a JSON-LD-shaped object. Returns a
 * NEW object — does not mutate the input. Safe to call on frozen objects.
 */
export function omitEmpty<T extends Record<string, unknown>>(input: T): T {
  return omitEmptyInner(input) as T;
}

function omitEmptyInner(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    return value.length === 0 ? undefined : value;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((v) => omitEmptyInner(v))
      .filter((v) => v !== undefined);
    return cleaned.length === 0 ? undefined : cleaned;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let hasAny = false;
    for (const key of Object.keys(obj)) {
      const cleaned = omitEmptyInner(obj[key]);
      if (cleaned !== undefined) {
        out[key] = cleaned;
        hasAny = true;
      }
    }
    return hasAny ? out : undefined;
  }
  return value;
}
