/**
 * HowTo JSON-LD builder.
 *
 * Used for step-by-step procedural content. Google's HowTo rich result
 * was narrowed in 2023 but the schema still feeds AI Overviews and
 * Perplexity step extraction.
 */

import { omitEmpty } from "../honesty/omit-empty.js";

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export interface HowToInput {
  name: string;
  description?: string;
  totalTime?: string;
  estimatedCost?: { currency: string; value: number };
  supply?: ReadonlyArray<string>;
  tool?: ReadonlyArray<string>;
  steps: ReadonlyArray<HowToStep>;
}

export function buildHowTo(input: HowToInput): Record<string, unknown> {
  if (input.steps.length === 0) {
    throw new Error("buildHowTo: steps[] is empty");
  }
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    totalTime: input.totalTime,
    estimatedCost: input.estimatedCost
      ? {
          "@type": "MonetaryAmount",
          currency: input.estimatedCost.currency,
          value: input.estimatedCost.value,
        }
      : undefined,
    supply: input.supply?.map((name) => ({
      "@type": "HowToSupply",
      name,
    })),
    tool: input.tool?.map((name) => ({
      "@type": "HowToTool",
      name,
    })),
    step: input.steps.map((s, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: s.name,
      text: s.text,
      url: s.url,
      image: s.image,
    })),
  } as Record<string, unknown>);
}
