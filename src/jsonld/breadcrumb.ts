/**
 * BreadcrumbList JSON-LD builder.
 *
 * Renders the path from the homepage to the current page. Google uses
 * this to replace the URL in the SERP with the breadcrumb trail, which
 * lifts CTR for pSEO surfaces with deep hierarchies.
 */

import { omitEmpty } from "../honesty/omit-empty.js";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbList(
  items: ReadonlyArray<BreadcrumbItem>,
): Record<string, unknown> {
  if (items.length === 0) {
    throw new Error("buildBreadcrumbList: items[] is empty");
  }
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  } as Record<string, unknown>);
}
