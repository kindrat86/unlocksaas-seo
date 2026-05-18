/**
 * FAQPage JSON-LD builder.
 *
 * Honesty rule: the questions and answers passed in MUST be the same
 * strings rendered on the page. The validate-claims CLI diffs them.
 * If your accordion-collapse hides the answer behind JS, that's fine —
 * the rendered HTML still needs to contain the text.
 */

import { omitEmpty } from "../honesty/omit-empty.js";
import { speakableFromClass } from "./speakable.js";

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FaqPageInput {
  entries: ReadonlyArray<FaqEntry>;
  /**
   * Optional CSS-class selectors for SpeakableSpecification. Pass the
   * stable class names you put on the question and answer DOM nodes
   * (e.g. ".aeo-q", ".aeo-a") so text-to-speech engines know which
   * regions to read aloud.
   */
  speakableSelectors?: ReadonlyArray<string>;
  inLanguage?: string;
}

export function buildFaqPage(input: FaqPageInput): Record<string, unknown> {
  if (input.entries.length === 0) {
    throw new Error(
      "buildFaqPage: entries[] is empty. Omit the FAQPage block instead of shipping an empty one.",
    );
  }
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: input.inLanguage,
    speakable: input.speakableSelectors
      ? speakableFromClass(input.speakableSelectors)
      : undefined,
    mainEntity: input.entries.map((e) => ({
      "@type": "Question",
      name: e.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  } as Record<string, unknown>);
}
