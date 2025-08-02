// src/core/i18n.service.ts
import logger from '../utils/logger';

type Translations = {
  [key: string]: string | Translations;
};

type LanguageStore = {
  [lang: string]: Translations;
};

const SUPPORTED_LANGS = ['en', 'ru', 'de']; // <<< ИЗМЕНЕНО: Добавлен 'de'
const LANG_STORAGE_KEY = 'user_preferred_language';

let translations: LanguageStore = {};
let currentLang = 'en'; // Default language
const subscribers = new Set<() => void>();

function resolveKey(obj: Translations, keyPath: string): string | undefined {
  const keys = keyPath.split('.');
  let current: string | Translations | undefined = obj;
  for (const k of keys) {
    if (typeof current === 'object' && current !== null && k in current) {
      current = (current as Translations)[k];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function t(key: string, replacements?: Record<string, string | number>): string {
  const langTranslations = translations[currentLang];
  if (!langTranslations) {
    logger.warn(`[i18n] No translations loaded for current language: ${currentLang}`);
    return key;
  }

  let translatedString = resolveKey(langTranslations, key);

  if (translatedString === undefined) {
    // Fallback to English if key not found in current language
    const englishTranslations = translations['en'];
    if (englishTranslations) {
      translatedString = resolveKey(englishTranslations, key);
    }
  }
  
  if (translatedString === undefined) {
    logger.warn(`[i18n] Translation key not found in any language: "${key}"`);
    return key;
  }

  if (replacements) {
    for (const placeholder in replacements) {
      translatedString = translatedString.replace(
        new RegExp(`\\{${placeholder}\\}`, 'g'),
        String(replacements[placeholder])
      );
    }
  }
  return translatedString;
}

export async function loadTranslations(lang: string): Promise<boolean> {
  if (translations[lang] && Object.keys(translations[lang]).length > 0) {
    logger.debug(`[i18n] Translations for "${lang}" already loaded.`);
    return true;
  }
  try {
    const response = await fetch(`/locales/${lang}.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for /locales/${lang}.json`);
    }
    const data = await response.json();
    translations[lang] = data;
    logger.info(`[i18n] Translations for "${lang}" loaded successfully.`);
    return true;
  } catch (error) {
    logger.error(`[i18n] Failed to load translations for language: ${lang}`, error);
    return false;
  }
}

export async function changeLang(lang: string): Promise<void> {
  if (!SUPPORTED_LANGS.includes(lang)) {
    logger.warn(`[i18n] Unsupported language "${lang}" selected. Defaulting to 'en'.`);
    lang = 'en';
  }

  const loaded = await loadTranslations(lang);

  if (loaded) {
    currentLang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    logger.info(`[i18n] Language changed to: ${lang}`);
    subscribers.forEach(fn => {
      try {
        fn();
      } catch (e) {
        logger.error(`[i18n] Error in language change subscriber:`, e)
      }
    });
  } else {
    logger.error(`[i18n] Could not change to language "${lang}" because its translations failed to load.`);
  }
}

export function subscribeToLangChange(fn: () => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getCurrentLang(): string {
  return currentLang;
}

export async function initI18nService(): Promise<void> {
    // 1. Check localStorage for a saved language preference.
    let preferredLang = localStorage.getItem(LANG_STORAGE_KEY);
    
    // 2. If not found, try to detect browser language.
    if (!preferredLang) {
      const browserLang = navigator.language.split('-')[0];
      if (SUPPORTED_LANGS.includes(browserLang)) {
        preferredLang = browserLang;
      }
    }

    // 3. Fallback to 'en' if no preference is found or supported.
    const langToLoad = preferredLang || 'en';

    // 4. Load the base 'en' translations first as a fallback.
    await loadTranslations('en');

    // 5. If the target language is different, load it as well.
    if (langToLoad !== 'en') {
        await loadTranslations(langToLoad);
    }
    
    currentLang = langToLoad;
    logger.info(`[i18n] Service initialized with language: ${currentLang}`);
}
