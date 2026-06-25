type LanguageRouteSource = {
  code: string;
  name: string;
  nativeName?: string | null;
};

export function slugifyLanguage(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function languageSlug(language: LanguageRouteSource) {
  return slugifyLanguage(language.name) || slugifyLanguage(language.code);
}

export function languageHref(language: LanguageRouteSource) {
  return `/app/${languageSlug(language)}`;
}

export function matchesLanguageSlug(language: LanguageRouteSource, slug: string) {
  const candidates = [language.name, language.nativeName, language.code].filter(Boolean).map((value) => slugifyLanguage(String(value)));
  return candidates.includes(slugifyLanguage(slug));
}
