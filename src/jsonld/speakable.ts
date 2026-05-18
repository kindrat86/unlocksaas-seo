/**
 * SpeakableSpecification — the Schema.org primitive that tells voice
 * engines (Google Assistant, Alexa, Siri Reader Mode, ChatGPT Voice,
 * Perplexity Voice) which DOM nodes are safe to read aloud.
 *
 * Two conventions ship:
 *   1. CSS-class selectors (".aeo-q", ".aeo-a")
 *   2. xpath / data-attribute opt-ins
 *
 * Both resolve to a SpeakableSpecification object; consumers pick based
 * on whether they have stable class names or prefer data-* attributes.
 */

export function speakableFromClass(
  cssSelectors: ReadonlyArray<string>,
): Record<string, unknown> {
  return {
    "@type": "SpeakableSpecification",
    cssSelector: Array.from(cssSelectors),
  };
}

export function speakableFromXpath(
  xpaths: ReadonlyArray<string>,
): Record<string, unknown> {
  return {
    "@type": "SpeakableSpecification",
    xpath: Array.from(xpaths),
  };
}
