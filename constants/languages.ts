export type TextDirection = 'ltr' | 'rtl';

export interface LanguageSpec {
  /** BCP-47 language code, e.g. "en", "es", "pt-BR" */
  code: string;
  englishName: string;
  nativeName: string;
  direction: TextDirection;
}

export interface LanguageOption extends LanguageSpec {
  count: number;
}

/**
 * Registry of languages the UI can present nicely. The library itself decides
 * which of these actually appear — only languages with content are listed.
 * Adding a language to the library does not require touching this file: unknown
 * values fall back to a generated spec (see getLanguageSpec).
 */
const LANGUAGE_REGISTRY: LanguageSpec[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', englishName: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'pt-BR', englishName: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', direction: 'ltr' },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'nl', englishName: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
  { code: 'sv', englishName: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
  { code: 'no', englishName: 'Norwegian', nativeName: 'Norsk', direction: 'ltr' },
  { code: 'da', englishName: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
  { code: 'fi', englishName: 'Finnish', nativeName: 'Suomi', direction: 'ltr' },
  { code: 'is', englishName: 'Icelandic', nativeName: 'Íslenska', direction: 'ltr' },
  { code: 'pl', englishName: 'Polish', nativeName: 'Polski', direction: 'ltr' },
  { code: 'cs', englishName: 'Czech', nativeName: 'Čeština', direction: 'ltr' },
  { code: 'sk', englishName: 'Slovak', nativeName: 'Slovenčina', direction: 'ltr' },
  { code: 'hu', englishName: 'Hungarian', nativeName: 'Magyar', direction: 'ltr' },
  { code: 'ro', englishName: 'Romanian', nativeName: 'Română', direction: 'ltr' },
  { code: 'bg', englishName: 'Bulgarian', nativeName: 'Български', direction: 'ltr' },
  { code: 'el', englishName: 'Greek', nativeName: 'Ελληνικά', direction: 'ltr' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'uk', englishName: 'Ukrainian', nativeName: 'Українська', direction: 'ltr' },
  { code: 'sr', englishName: 'Serbian', nativeName: 'Српски', direction: 'ltr' },
  { code: 'hr', englishName: 'Croatian', nativeName: 'Hrvatski', direction: 'ltr' },
  { code: 'sl', englishName: 'Slovenian', nativeName: 'Slovenščina', direction: 'ltr' },
  { code: 'bs', englishName: 'Bosnian', nativeName: 'Bosanski', direction: 'ltr' },
  { code: 'mk', englishName: 'Macedonian', nativeName: 'Македонски', direction: 'ltr' },
  { code: 'sq', englishName: 'Albanian', nativeName: 'Shqip', direction: 'ltr' },
  { code: 'lt', englishName: 'Lithuanian', nativeName: 'Lietuvių', direction: 'ltr' },
  { code: 'lv', englishName: 'Latvian', nativeName: 'Latviešu', direction: 'ltr' },
  { code: 'et', englishName: 'Estonian', nativeName: 'Eesti', direction: 'ltr' },
  { code: 'tr', englishName: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'az', englishName: 'Azerbaijani', nativeName: 'Azərbaycan', direction: 'ltr' },
  { code: 'kk', englishName: 'Kazakh', nativeName: 'Қазақша', direction: 'ltr' },
  { code: 'hy', englishName: 'Armenian', nativeName: 'Հայերեն', direction: 'ltr' },
  { code: 'ka', englishName: 'Georgian', nativeName: 'ქართული', direction: 'ltr' },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'he', englishName: 'Hebrew', nativeName: 'עברית', direction: 'rtl' },
  { code: 'fa', englishName: 'Persian', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', direction: 'rtl' },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', direction: 'ltr' },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr' },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', direction: 'ltr' },
  { code: 'ml', englishName: 'Malayalam', nativeName: 'മലയാളം', direction: 'ltr' },
  { code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ', direction: 'ltr' },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी', direction: 'ltr' },
  { code: 'gu', englishName: 'Gujarati', nativeName: 'ગુજરાતી', direction: 'ltr' },
  { code: 'pa', englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', direction: 'ltr' },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'zh', englishName: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'zh-Hant', englishName: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr' },
  { code: 'th', englishName: 'Thai', nativeName: 'ไทย', direction: 'ltr' },
  { code: 'vi', englishName: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr' },
  { code: 'id', englishName: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
  { code: 'ms', englishName: 'Malay', nativeName: 'Bahasa Melayu', direction: 'ltr' },
  { code: 'tl', englishName: 'Filipino', nativeName: 'Filipino', direction: 'ltr' },
  { code: 'sw', englishName: 'Swahili', nativeName: 'Kiswahili', direction: 'ltr' },
  { code: 'am', englishName: 'Amharic', nativeName: 'አማርኛ', direction: 'ltr' },
  { code: 'ha', englishName: 'Hausa', nativeName: 'Hausa', direction: 'ltr' },
  { code: 'yo', englishName: 'Yoruba', nativeName: 'Yorùbá', direction: 'ltr' },
  { code: 'ig', englishName: 'Igbo', nativeName: 'Igbo', direction: 'ltr' },
  { code: 'zu', englishName: 'Zulu', nativeName: 'isiZulu', direction: 'ltr' },
  { code: 'af', englishName: 'Afrikaans', nativeName: 'Afrikaans', direction: 'ltr' },
  { code: 'ca', englishName: 'Catalan', nativeName: 'Català', direction: 'ltr' },
  { code: 'eu', englishName: 'Basque', nativeName: 'Euskara', direction: 'ltr' },
  { code: 'gl', englishName: 'Galician', nativeName: 'Galego', direction: 'ltr' },
  { code: 'cy', englishName: 'Welsh', nativeName: 'Cymraeg', direction: 'ltr' },
  { code: 'ga', englishName: 'Irish', nativeName: 'Gaeilge', direction: 'ltr' },
  { code: 'mt', englishName: 'Maltese', nativeName: 'Malti', direction: 'ltr' },
];

const BY_CODE = new Map<string, LanguageSpec>();
const BY_ALIAS = new Map<string, LanguageSpec>();

for (const spec of LANGUAGE_REGISTRY) {
  BY_CODE.set(spec.code.toLowerCase(), spec);
  BY_ALIAS.set(spec.code.toLowerCase(), spec);
  BY_ALIAS.set(spec.englishName.toLowerCase(), spec);
  BY_ALIAS.set(spec.nativeName.toLowerCase(), spec);
}

/** Common alternative spellings and region variants mapped to a registry code. */
const LANGUAGE_ALIASES: Record<string, string> = {
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'es-419': 'es',
  'es-mx': 'es',
  'es-es': 'es',
  castellano: 'es',
  'fr-fr': 'fr',
  'fr-ca': 'fr',
  'pt-pt': 'pt',
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  mandarin: 'zh',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  cantonese: 'zh-Hant',
  farsi: 'fa',
  tagalog: 'tl',
  filipino: 'tl',
  nb: 'no',
  nn: 'no',
  'no-no': 'no',
};

function slugifyLanguage(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9À-ɏͰ-῿Ⰰ-퟿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Accepts names ("English", "日本語"), codes ("en", "ja"), or regional codes
 * ("en-US", "pt-BR") and returns the canonical registry code.
 */
export function normalizeLanguage(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return null;

  const exact = BY_ALIAS.get(cleaned);
  if (exact) return exact.code;

  const base = cleaned.split(/[-_]/)[0];
  const baseSpec = BY_ALIAS.get(base);
  if (baseSpec) return baseSpec.code;

  const alias = LANGUAGE_ALIASES[cleaned] ?? LANGUAGE_ALIASES[base];
  if (alias) return alias;

  return null;
}

/**
 * Resolves any language value to a display-ready spec. Unknown languages get a
 * generated spec so a new language in the library never breaks the UI.
 */
export function getLanguageSpec(value?: string | null): LanguageSpec {
  const normalized = normalizeLanguage(value);
  if (normalized) {
    const spec = BY_CODE.get(normalized.toLowerCase());
    if (spec) return spec;
  }

  const raw = (value || '').trim();
  const code = normalized ?? (raw ? slugifyLanguage(raw) : 'unknown');
  const display = raw ? titleCase(raw) : 'Unknown';

  return {
    code,
    englishName: display,
    nativeName: display,
    direction: 'ltr',
  };
}

/**
 * Builds the language picker list from actual content. Languages are ordered by
 * how much content they contain, so the richest language comes first.
 */
export function buildLanguageOptions(
  items: Array<{ language?: string | null }>
): LanguageOption[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const raw = item.language;
    if (!raw || !raw.trim()) continue;

    const code = normalizeLanguage(raw) ?? slugifyLanguage(raw);
    if (!code) continue;

    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([code, count]) => ({ ...getLanguageSpec(code), count }))
    .sort((a, b) => b.count - a.count || a.englishName.localeCompare(b.englishName));
}

/** True when an item belongs to the selected language. A null selection matches everything. */
export function matchesLanguage(
  item: { language?: string | null },
  code?: string | null
): boolean {
  if (!code) return true;

  const target = normalizeLanguage(code) ?? code.toLowerCase();
  const raw = item.language;
  const itemCode = normalizeLanguage(raw) ?? (raw ? slugifyLanguage(raw) : null);

  return itemCode === target;
}
