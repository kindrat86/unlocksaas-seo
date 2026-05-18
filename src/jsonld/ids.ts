/**
 * Stable fragment-style @id anchors. Lets every entity in a multi-block
 * graph reference the same Organization/Person/WebSite node by string
 * identifier instead of duplicating the object. Google's Knowledge Graph
 * uses these as candidate keys.
 */

export interface EntityIds {
  organization: string;
  person: string;
  website: string;
  product?: string;
  service?: string;
}

/**
 * Build a standard @id anchor set rooted at the given origin.
 *
 *   buildIds("https://example.com") -> {
 *     organization: "https://example.com/#organization",
 *     person:       "https://example.com/#founder",
 *     website:      "https://example.com/#website",
 *   }
 */
export function buildIds(origin: string): EntityIds {
  const o = origin.replace(/\/+$/, "");
  return {
    organization: `${o}/#organization`,
    person: `${o}/#founder`,
    website: `${o}/#website`,
    product: `${o}/#product`,
    service: `${o}/#service`,
  };
}
