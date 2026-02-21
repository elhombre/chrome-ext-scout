'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type ActiveFilterChip = {
  key: string
  label: string
  value: string
}

type ActiveFilterChipsProps = {
  clearAllLabel: string
  items: ActiveFilterChip[]
  onClearAll: () => void
  onClearOne: (key: string) => void
  title: string
}

export function ActiveFilterChips({ clearAllLabel, items, onClearAll, onClearOne, title }: ActiveFilterChipsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="col-span-full border-t pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
        <Button onClick={onClearAll} size="sm" type="button" variant="ghost">
          {clearAllLabel}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <Button
            className="max-w-full gap-1 px-2"
            key={item.key}
            onClick={() => onClearOne(item.key)}
            size="sm"
            title={`${item.label}: ${item.value}`}
            type="button"
            variant="secondary"
          >
            <span className="truncate text-xs">
              {item.label}: {item.value}
            </span>
            <X aria-hidden="true" className="size-3 shrink-0" />
          </Button>
        ))}
      </div>
    </div>
  )
}
