/**
 * WebSite JSON-LD builder with potentialAction support.
 *
 * potentialAction is the Schema.org primitive that makes a site
 * agent-callable. Three common shapes:
 *   - SearchAction:  site-wide search box  /search?q={search_term_string}
 *   - AskAction:     ask the site a question
 *   - ReadAction:    read a specific item
 *
 * Google's sitelinks search box looks for SearchAction. Perplexity,
 * Claude, and ChatGPT inspect potentialAction when deciding whether a
 * site can be invoked as a tool.
 */

import { omitEmpty } from "../honesty/omit-empty.js";

export interface SearchActionInput {
  type: "SearchAction";
  /** URL template, e.g. "https://example.com/search?q={search_term_string}" */
  target: string;
  /** Name of the placeholder inside the target template. */
  queryInput: string;
}

export interface AskActionInput {
  type: "AskAction";
  target: string;
  queryInput: string;
}

export type PotentialAction = SearchActionInput | AskActionInput;

export interface WebSiteInput {
  id?: string;
  name: string;
  url: string;
  description?: string;
  /** Reference the Organization @id when set. */
  publisher?: { "@id": string } | Record<string, unknown>;
  /** Reference the Person/Org @id for the editor or content creator. */
  author?: { "@id": string } | Record<string, unknown>;
  inLanguage?: string;
  potentialAction?: ReadonlyArray<PotentialAction>;
}

function buildAction(a: PotentialAction): Record<string, unknown> {
  return {
    "@type": a.type,
    target: {
      "@type": "EntryPoint",
      urlTemplate: a.target,
    },
    "query-input": `required name=${a.queryInput}`,
  };
}

export function buildWebSite(input: WebSiteInput): Record<string, unknown> {
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": input.id,
    name: input.name,
    url: input.url,
    description: input.description,
    publisher: input.publisher,
    author: input.author,
    inLanguage: input.inLanguage,
    potentialAction: input.potentialAction?.map(buildAction),
  } as Record<string, unknown>);
}
