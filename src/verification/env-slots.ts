/**
 * Search-engine and platform ownership verification — env-driven slots.
 *
 * Most verification consoles (Google Search Console, Bing Webmaster,
 * Yandex, Pinterest, Facebook, Naver) require a meta tag with a
 * specific name and the operator's account-specific code as content.
 * The honest pattern is to keep the code in an env var, read it at
 * build time, and omit the meta tag entirely when the env is unset.
 *
 *   - GoogleSiteVerification:   <meta name="google-site-verification">
 *   - BingSiteVerification:     <meta name="msvalidate.01">
 *   - YandexVerification:       <meta name="yandex-verification">
 *   - Pinterest:                <meta name="p:domain_verify">
 *   - Facebook:                 <meta name="facebook-domain-verification">
 *   - Naver:                    <meta name="naver-site-verification">
 *
 * The output is shape-compatible with Next.js's `Metadata['verification']`
 * type so callers can drop it directly into a Next.js layout. If you're
 * not on Next.js, treat the return value as a plain meta-tag descriptor.
 */

export interface VerificationBlock {
  google?: string;
  yahoo?: string;
  yandex?: string;
  me?: string | ReadonlyArray<string>;
  other?: Record<string, string | ReadonlyArray<string>>;
}

export interface VerificationEnvKeys {
  google?: string;
  yandex?: string;
  bing?: string;
  pinterest?: string;
  facebook?: string;
  naver?: string;
  /** Free-form additions: name -> env var key. */
  other?: Record<string, string>;
}

/** Default env-var names matching the unlocksaas.com convention. */
export const DEFAULT_ENV_KEYS: VerificationEnvKeys = {
  google: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
  yandex: "NEXT_PUBLIC_YANDEX_VERIFICATION",
  bing: "NEXT_PUBLIC_BING_SITE_VERIFICATION",
  pinterest: "NEXT_PUBLIC_PINTEREST_SITE_VERIFICATION",
  facebook: "NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION",
  naver: "NEXT_PUBLIC_NAVER_SITE_VERIFICATION",
};

function readEnv(
  key: string | undefined,
  env: Record<string, string | undefined>,
): string | undefined {
  if (!key) return undefined;
  const raw = env[key];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Build the verification block from env. Returns undefined when no slot
 * is set so callers can omit the field entirely from their metadata.
 *
 * Pass `env` explicitly for test isolation; defaults to process.env.
 */
export function buildVerification(
  keys: VerificationEnvKeys = DEFAULT_ENV_KEYS,
  env: Record<string, string | undefined> = process.env,
): VerificationBlock | undefined {
  const google = readEnv(keys.google, env);
  const yandex = readEnv(keys.yandex, env);
  const bing = readEnv(keys.bing, env);
  const pinterest = readEnv(keys.pinterest, env);
  const facebook = readEnv(keys.facebook, env);
  const naver = readEnv(keys.naver, env);

  const other: Record<string, string> = {};
  if (bing) other["msvalidate.01"] = bing;
  if (pinterest) other["p:domain_verify"] = pinterest;
  if (facebook) other["facebook-domain-verification"] = facebook;
  if (naver) other["naver-site-verification"] = naver;

  if (keys.other) {
    for (const [metaName, envKey] of Object.entries(keys.other)) {
      const value = readEnv(envKey, env);
      if (value) other[metaName] = value;
    }
  }

  const hasAny =
    google !== undefined ||
    yandex !== undefined ||
    Object.keys(other).length > 0;
  if (!hasAny) return undefined;

  const block: VerificationBlock = {};
  if (google) block.google = google;
  if (yandex) block.yandex = yandex;
  if (Object.keys(other).length > 0) block.other = other;
  return block;
}
