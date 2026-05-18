/**
 * Person JSON-LD builder. Used for founder / author / editor / contributor
 * entities. Most pages will reference this entity by @id rather than
 * inline-expand it.
 */

import { omitEmpty } from "../honesty/omit-empty.js";

export interface PersonInput {
  id?: string;
  name: string;
  givenName?: string;
  familyName?: string;
  jobTitle?: string;
  email?: string;
  url?: string;
  image?: string;
  description?: string;
  worksFor?: { "@id": string } | Record<string, unknown>;
  knowsAbout?: ReadonlyArray<string>;
  sameAs?: ReadonlyArray<string>;
}

export function buildPerson(input: PersonInput): Record<string, unknown> {
  const sameAs = input.sameAs?.filter(
    (s) => typeof s === "string" && s.startsWith("https://"),
  );
  return omitEmpty({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": input.id,
    name: input.name,
    givenName: input.givenName,
    familyName: input.familyName,
    jobTitle: input.jobTitle,
    email: input.email,
    url: input.url,
    image: input.image,
    description: input.description,
    worksFor: input.worksFor,
    knowsAbout: input.knowsAbout,
    sameAs: sameAs && sameAs.length > 0 ? Array.from(new Set(sameAs)) : undefined,
  } as Record<string, unknown>);
}
