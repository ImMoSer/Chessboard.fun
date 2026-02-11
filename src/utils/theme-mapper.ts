// src/utils/theme-mapper.ts

/**
 * Returns the translation key for a given theme.
 * Since the backend and frontend now use unified camelCase theme names,
 * and en.json keys are also camelCase, we can simply return the theme name.
 */
export const getThemeTranslationKey = (theme: string): string => {
  return theme
}
