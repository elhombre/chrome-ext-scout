'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const supportedLanguages = ['en', 'ru'] as const
export type Language = (typeof supportedLanguages)[number]

const languageStorageKey = 'chrome-ext-scout:language'

type I18nContextValue = {
  language: Language
  setLanguage: (nextLanguage: Language) => void
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function normalizeLanguage(rawLanguage: string | null | undefined): Language | null {
  if (rawLanguage === null || rawLanguage === undefined) {
    return null
  }

  const lowered = rawLanguage.toLowerCase()

  if (lowered.startsWith('ru')) {
    return 'ru'
  }

  if (lowered.startsWith('en')) {
    return 'en'
  }

  return null
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const fromStorage = normalizeLanguage(window.localStorage.getItem(languageStorageKey))

    if (fromStorage !== null) {
      setLanguage(fromStorage)
      return
    }

    const fromNavigator = normalizeLanguage(window.navigator.language)

    if (fromNavigator !== null) {
      setLanguage(fromNavigator)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language)
    document.documentElement.lang = language
  }, [language])

  const contextValue = useMemo<I18nContextValue>(() => ({ language, setLanguage }), [language])

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}
