'use client'

import { Laptop, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type Language, useI18n } from '@/lib/i18n'
import { getMessages } from '@/lib/messages'

function isLanguage(value: string): value is Language {
  return value === 'en' || value === 'ru'
}

type ThemeMode = 'light' | 'dark' | 'system'

const themeOrder: ThemeMode[] = ['system', 'light', 'dark']

function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { language, setLanguage } = useI18n()
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = getMessages(language).appShell

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = useMemo<ThemeMode>(() => {
    if (!mounted || !isThemeMode(theme)) {
      return 'system'
    }

    return theme
  }, [mounted, theme])

  const resolvedSystemTheme = mounted ? resolvedTheme : undefined

  const themeLabel =
    activeTheme === 'light'
      ? t.themeLight
      : activeTheme === 'dark'
        ? t.themeDark
        : resolvedSystemTheme === 'dark'
          ? `${t.themeAuto} (${t.themeDark})`
          : resolvedSystemTheme === 'light'
            ? `${t.themeAuto} (${t.themeLight})`
            : t.themeAuto

  const themeIcon =
    activeTheme === 'light' ? (
      <Sun className="size-4" />
    ) : activeTheme === 'dark' ? (
      <Moon className="size-4" />
    ) : (
      <Laptop className="size-4" />
    )

  function cycleTheme() {
    const index = themeOrder.indexOf(activeTheme)
    const nextTheme = themeOrder[(index + 1) % themeOrder.length]
    setTheme(nextTheme)
  }

  const navItems = [
    { href: '/', label: t.navHome },
    { href: '/market', label: t.navMarket },
    { href: '/opportunities', label: t.navOpportunities },
  ]

  return (
    <div className="min-h-screen">
      <header className="bg-background/85 sticky top-0 z-50 border-b border-border/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <Link className="text-foreground text-sm font-semibold tracking-tight" href="/">
              {t.brand}
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map(item => {
                const isActive = pathname === item.href

                return (
                  <Button asChild key={item.href} size="sm" variant={isActive ? 'default' : 'ghost'}>
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button
              aria-label={`${t.theme}: ${themeLabel}`}
              onClick={cycleTheme}
              size="icon-sm"
              title={`${t.theme}: ${themeLabel}`}
              type="button"
              variant="ghost"
            >
              {themeIcon}
            </Button>
            <span className="text-muted-foreground text-xs">{t.language}</span>
            <Select
              onValueChange={value => {
                if (isLanguage(value)) {
                  setLanguage(value)
                }
              }}
              value={language}
            >
              <SelectTrigger className="h-8 min-w-36" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="en">{t.langEn}</SelectItem>
                <SelectItem value="ru">{t.langRu}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <nav className="flex w-full items-center gap-1 md:hidden">
            {navItems.map(item => {
              const isActive = pathname === item.href

              return (
                <Button asChild className="flex-1" key={item.href} size="sm" variant={isActive ? 'default' : 'ghost'}>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              )
            })}
          </nav>
        </div>
      </header>

      {children}
    </div>
  )
}
