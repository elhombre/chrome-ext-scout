'use client'

import { Pin, PinOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FilterPanelCardProps = {
  children: React.ReactNode
  pinLabel: string
  storageKey?: string
  unpinLabel: string
}

const defaultStorageKey = 'chrome-ext-scout:filters:sticky'

export function FilterPanelCard({
  children,
  pinLabel,
  storageKey = defaultStorageKey,
  unpinLabel,
}: FilterPanelCardProps) {
  const [isSticky, setIsSticky] = useState(true)

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey)

    if (raw === '0') {
      setIsSticky(false)
      return
    }

    if (raw === '1') {
      setIsSticky(true)
    }
  }, [storageKey])

  function onToggleSticky() {
    setIsSticky(prev => {
      const next = !prev
      window.localStorage.setItem(storageKey, next ? '1' : '0')
      return next
    })
  }

  return (
    <Card className={cn(isSticky && 'bg-background/95 sticky top-20 z-40 border-border/80 backdrop-blur-sm md:top-14')}>
      <CardContent className="space-y-2">
        <div className="flex justify-end">
          <Button
            aria-label={isSticky ? unpinLabel : pinLabel}
            onClick={onToggleSticky}
            size="icon-sm"
            title={isSticky ? unpinLabel : pinLabel}
            type="button"
            variant="ghost"
          >
            {isSticky ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          </Button>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
