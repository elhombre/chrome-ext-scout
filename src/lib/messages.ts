import type { Language } from '@/lib/i18n'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'

export type Messages = typeof en

const messagesByLanguage: Record<Language, Messages> = {
  en,
  ru,
}

export function getMessages(language: Language): Messages {
  return messagesByLanguage[language]
}
