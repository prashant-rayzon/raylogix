import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  format,
  isValid,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  parseISO,
  addMonths,
  isSameDay,
  isSameMonth,
  isWithinInterval,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DateRange {
  from?: Date
  to?: Date
}

interface DatePickerWithRangeProps {
  value?: { from?: string; to?: string }
  onChange: (value: { from: string; to: string }) => void
  className?: string
  buttonClassName?: string
  placeholder?: string
}

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Today', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  {
    label: 'Yesterday',
    getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }),
  },
  {
    label: 'Last 7 Days',
    getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }),
  },
  {
    label: 'This Week',
    getValue: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: 'This Month',
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: 'Last Month',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  {
    label: 'Last 30 Days',
    getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }),
  },
  {
    label: 'Last 90 Days',
    getValue: () => ({ from: startOfDay(subDays(new Date(), 89)), to: endOfDay(new Date()) }),
  },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseDate(value?: string): Date | undefined {
  if (!value) return undefined
  try {
    const d = parseISO(value)
    if (isValid(d)) return d
  } catch {
    // Ignore parse error
  }
  try {
    const d = new Date(value)
    if (isValid(d)) return d
  } catch {
    // Ignore
  }
  return undefined
}

function formatDisplayDate(date?: Date) {
  if (!date || !isValid(date)) return ''
  return format(date, 'dd MMM yyyy')
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// ─── Mini Calendar ────────────────────────────────────────────────────────────
// NOTE: month navigation is no longer rendered inside MiniCalendar. It now
// only renders the weekday header + day grid, so the prev/next buttons can
// live in a single header row alongside the "Month Year" label (see
// popupContent below). Previously the arrows sat beside the *whole* calendar
// column and were vertically centered against its full height, which is why
// they looked disconnected / oddly positioned relative to the popup.

function MiniCalendar({
  month,
  range,
  hoverDate,
  onDayClick,
  onDayHover,
}: {
  month: Date
  range: DateRange
  hoverDate?: Date
  onDayClick: (d: Date) => void
  onDayHover: (d: Date | undefined) => void
}) {
  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const totalDays = 42 // 6 weeks
  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const effectiveTo = range.to ?? hoverDate

  const isRangeStart = (d: Date) => !!range.from && isSameDay(d, range.from)
  const isRangeEnd = (d: Date) => !!effectiveTo && isSameDay(d, effectiveTo)
  const isInRange = (d: Date) => {
    if (!range.from || !effectiveTo) return false
    const lo = range.from <= effectiveTo ? range.from : effectiveTo
    const hi = range.from <= effectiveTo ? effectiveTo : range.from
    return isWithinInterval(d, { start: lo, end: hi }) && !isSameDay(d, lo) && !isSameDay(d, hi)
  }
  const isToday = (d: Date) => isSameDay(d, new Date())

  return (
    <div className='w-[260px] px-3 pb-3'>
      {/* Weekday headers */}
      <div className='grid grid-cols-7 mb-1'>
        {WEEK_DAYS.map((d) => (
          <div key={d} className='text-center text-[10px] font-semibold uppercase text-slate-400 py-1'>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className='grid grid-cols-7 gap-y-0.5'>
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, month)
          const start = isRangeStart(day)
          const end = isRangeEnd(day)
          const inRange = isInRange(day)
          const today = isToday(day)

          return (
            <div
              key={idx}
              className={cn(
                'relative flex h-9 cursor-pointer items-center justify-center',
                inRange && 'bg-teal-50',
                start && effectiveTo && !isSameDay(range.from!, effectiveTo) && 'rounded-l-full bg-teal-50',
                end && range.from && !isSameDay(range.from, effectiveTo!) && 'rounded-r-full bg-teal-50',
              )}
              onClick={() => inMonth && onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              onMouseLeave={() => onDayHover(undefined)}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  !inMonth && 'text-slate-300',
                  inMonth && !start && !end && !today && 'text-slate-700 hover:bg-teal-100 hover:text-teal-800',
                  inRange && inMonth && 'text-teal-800',
                  today && !start && !end && 'font-bold text-teal-600 ring-1 ring-teal-300',
                  (start || end) && 'bg-teal-600 text-white shadow-sm hover:bg-teal-700',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DatePickerWithRange({
  value,
  onChange,
  className,
  buttonClassName,
  placeholder = 'Select date range',
}: DatePickerWithRangeProps) {
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()))

  const [range, setRange] = useState<DateRange>(() => ({
    from: safeParseDate(value?.from),
    to: safeParseDate(value?.to),
  }))
  const [hoverDate, setHoverDate] = useState<Date | undefined>()
  const [picking, setPicking] = useState<'from' | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null)

  const updatePopupPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      let top = rect.bottom + 6 + scrollY
      let left = rect.left + scrollX

      // Actual popup dimensions (single month, ~260px calendar + header/footer)
      const popupWidth = 300
      const popupHeight = 380

      if (left + popupWidth > window.innerWidth + scrollX) {
        left = window.innerWidth + scrollX - popupWidth - 10
      }
      if (left < scrollX) {
        left = scrollX + 10
      }

      if (top + popupHeight > window.innerHeight + scrollY) {
        top = rect.top + scrollY - popupHeight - 6
      }
      if (top < scrollY) {
        top = scrollY + 10
      }

      setPopupPosition({ top, left })
    }
  }

  const toggleOpen = () => {
    if (!open) {
      setTimeout(updatePopupPosition, 0)
    }
    setOpen((v) => !v)
    if (open) {
      setPicking(null)
      setHoverDate(undefined)
    }
  }

  useEffect(() => {
    const from = safeParseDate(value?.from)
    const to = safeParseDate(value?.to)
    setRange({ from, to })
    if (from && isValid(from)) {
      setCurrentMonth(startOfMonth(from))
    }
  }, [value?.from, value?.to])

  useEffect(() => {
    if (!open) return

    const handler = (e: MouseEvent) => {
      const popupEl = popupRef.current
      const triggerEl = triggerRef.current
      const isInsidePopup = popupEl?.contains(e.target as Node)
      const isInsideTrigger = triggerEl?.contains(e.target as Node)

      if (!isInsidePopup && !isInsideTrigger) {
        setOpen(false)
        setPicking(null)
        setHoverDate(undefined)
      }
    }

    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setPicking(null)
        setHoverDate(undefined)
      }
    }

    const handleUpdate = () => {
      if (open) {
        updatePopupPosition()
      }
    }

    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escapeHandler)
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escapeHandler)
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [open])

  const fromDate = safeParseDate(value?.from)
  const toDate = safeParseDate(value?.to)
  const hasRange = fromDate && isValid(fromDate)

  const triggerLabel = hasRange
    ? toDate && isValid(toDate)
      ? `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`
      : formatDisplayDate(fromDate)
    : undefined

  const handleDayClick = (day: Date) => {
    if (picking === 'from' && range.from) {
      let newFrom = range.from
      let newTo = day
      if (newTo < newFrom) {
        ;[newFrom, newTo] = [newTo, newFrom]
      }
      const finalRange = { from: startOfDay(newFrom), to: endOfDay(newTo) }
      setRange(finalRange)
      onChange({
        from: finalRange.from.toISOString(),
        to: finalRange.to.toISOString(),
      })
      setPicking(null)
      setHoverDate(undefined)
      setOpen(false)
    } else {
      setRange({ from: startOfDay(day), to: undefined })
      onChange({ from: startOfDay(day).toISOString(), to: '' })
      setPicking('from')
      setHoverDate(undefined)
    }
  }

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const { from, to } = preset.getValue()
    const finalRange = { from, to }
    setRange(finalRange)
    setCurrentMonth(startOfMonth(from))
    onChange({ from: from.toISOString(), to: to.toISOString() })
    setPicking(null)
    setHoverDate(undefined)
    setOpen(false)
  }

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRange({})
    onChange({ from: '', to: '' })
    setPicking(null)
    setHoverDate(undefined)
    setOpen(false)
  }

  const dayCount =
    range.from && range.to
      ? Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1
      : null

  const goToPreviousMonth = () => {
    setCurrentMonth((m) => subMonths(m, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((m) => addMonths(m, 1))
  }

  const goToToday = () => {
    setCurrentMonth(startOfMonth(new Date()))
  }

  const isCurrentMonthToday = isSameMonth(currentMonth, new Date())

  // Popup content
  const popupContent = open && popupPosition ? (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: popupPosition.top,
        left: popupPosition.left,
        zIndex: 9999,
      }}
      className='flex w-[265px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40'
    >
      {/* Header: month label with prev/next arrows inline, plus a "jump to today" shortcut.
          This replaces the old side-by-side [<] [calendar] [>] layout, where the arrows
          were vertically centered against the whole calendar height and ended up looking
          detached from the popup rather than anchored to the month title. */}
      <div className='flex items-center justify-between border-b border-slate-100 px-3 py-2.5'>
        <button
          type='button'
          onClick={goToPreviousMonth}
          aria-label='Previous month'
          className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
        >
          <ChevronLeft className='h-3.5 w-3.5' />
        </button>

        <div className='flex flex-col items-center'>
          <span className='text-sm font-semibold text-slate-700'>{format(currentMonth, 'MMMM yyyy')}</span>
          {!isCurrentMonthToday && (
            <button
              type='button'
              onClick={goToToday}
              className='text-[10px] font-medium text-teal-600 hover:text-teal-700 hover:underline'
            >
              Jump to today
            </button>
          )}
        </div>

        <button
          type='button'
          onClick={goToNextMonth}
          aria-label='Next month'
          className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
        >
          <ChevronRight className='h-3.5 w-3.5' />
        </button>
      </div>

      {/* Calendar grid */}
      <MiniCalendar
        month={currentMonth}
        range={range}
        hoverDate={picking === 'from' ? hoverDate : undefined}
        onDayClick={handleDayClick}
        onDayHover={(d) => picking === 'from' && setHoverDate(d)}
      />

      {/* Footer: selection summary */}
      {(range.from || dayCount) && (
        <div className='flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500'>
          <span>
            {range.from ? formatDisplayDate(range.from) : ''}
            {range.to ? ` – ${formatDisplayDate(range.to)}` : picking === 'from' ? ' – …' : ''}
          </span>
          {dayCount && (
            <span className='font-medium text-teal-600'>
              {dayCount} day{dayCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  ) : null

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {/* ── Trigger Button ── */}
      <button
        ref={triggerRef}
        type='button'
        onClick={toggleOpen}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-[#f6f7f9] px-3 text-sm font-normal text-slate-700 shadow-sm transition-all',
          'hover:border-teal-400 hover:shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400',
          open && 'border-teal-500 ring-2 ring-teal-500/20',
          buttonClassName
        )}
      >
        <CalendarDays className='h-3.5 w-3.5 shrink-0 text-teal-600' />
        <span className={cn('max-w-[220px] truncate', !triggerLabel && 'text-slate-400')}>
          {triggerLabel ?? placeholder}
        </span>
        {hasRange && (
          <button
            type='button'
            onClick={handleClear}
            className='ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-red-100 hover:text-red-500'
          >
            <X className='h-2.5 w-2.5' />
          </button>
        )}
      </button>

      {/* ── Dropdown Panel — portaled to body so it escapes overflow containers ── */}
      {typeof document !== 'undefined' && createPortal(popupContent, document.body)}
    </div>
  )
}