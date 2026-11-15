/**
 * Flag resolution and local assets for Ask Zaen languages.
 * Provides instant offline local PNG flags for common languages,
 * with CDN fallback for extended languages.
 */

export const LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  en: 'gb',
  es: 'es',
  fr: 'fr',
  pt: 'pt',
  'pt-br': 'br',
  de: 'de',
  it: 'it',
  nl: 'nl',
  sv: 'se',
  no: 'no',
  da: 'dk',
  fi: 'fi',
  is: 'is',
  pl: 'pl',
  cs: 'cz',
  sk: 'sk',
  hu: 'hu',
  ro: 'ro',
  bg: 'bg',
  el: 'gr',
  ru: 'ru',
  uk: 'ua',
  tr: 'tr',
  ar: 'sa',
  he: 'il',
  hi: 'in',
  ja: 'jp',
  ko: 'kr',
  zh: 'cn',
  'zh-hant': 'tw',
  th: 'th',
  vi: 'vn',
  id: 'id',
};

// Static local assets bundled for instant, offline, zero-flicker display
export const LOCAL_FLAGS: Record<string, any> = {
  gb: require('@/assets/flags/gb.png'),
  us: require('@/assets/flags/us.png'),
  no: require('@/assets/flags/no.png'),
  es: require('@/assets/flags/es.png'),
  de: require('@/assets/flags/de.png'),
  in: require('@/assets/flags/in.png'),
  jp: require('@/assets/flags/jp.png'),
  se: require('@/assets/flags/se.png'),
  fr: require('@/assets/flags/fr.png'),
  it: require('@/assets/flags/it.png'),
  pt: require('@/assets/flags/pt.png'),
  br: require('@/assets/flags/br.png'),
  nl: require('@/assets/flags/nl.png'),
  il: require('@/assets/flags/il.png'),
  dk: require('@/assets/flags/dk.png'),
  fi: require('@/assets/flags/fi.png'),
  pl: require('@/assets/flags/pl.png'),
  ru: require('@/assets/flags/ru.png'),
  cn: require('@/assets/flags/cn.png'),
  sa: require('@/assets/flags/sa.png'),
  kr: require('@/assets/flags/kr.png'),
};

/**
 * Returns an Image source (local require or remote URI) for the given language code.
 */
export function getLanguageFlagSource(languageCode?: string | null): any {
  if (!languageCode) return null;
  const cleaned = languageCode.trim().toLowerCase();
  const country =
    LANGUAGE_COUNTRY_MAP[cleaned] ??
    LANGUAGE_COUNTRY_MAP[cleaned.split('-')[0]] ??
    cleaned.slice(0, 2);

  if (LOCAL_FLAGS[country]) {
    return LOCAL_FLAGS[country];
  }

  return { uri: `https://flagcdn.com/w80/${country}.png` };
}
