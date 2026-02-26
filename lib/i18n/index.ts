import { locales, defaultLocale, type Locale } from "./config"
import en from "./translations/en"
import th from "./translations/th"

const translations = { en, th }

export function getTranslations(locale: Locale) {
  return translations[locale] ?? translations[defaultLocale]
}

export function detectLocale(cookieValue?: string): Locale {
  if (cookieValue && locales.includes(cookieValue as Locale)) {
    return cookieValue as Locale
  }
  return defaultLocale
}

export type { Locale }
export { locales, defaultLocale }
