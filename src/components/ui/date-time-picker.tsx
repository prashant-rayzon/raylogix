import { useEffect, useMemo, useRef, useState } from 'react'
import { format, isValid, parseISO, startOfDay, isSameDay, isBefore, isToday as dateIsToday } from 'date-fns'
import { CalendarIcon, Clock2, X, ChevronLeft, ChevronRight, Check } from 'lucide-react'

import { Button } from '@/components/custom/button'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
    value?: string
    onChange: (value: string) => void
    min?: string
    label?: string
    placeholder?: string
    disabled?: boolean
    className?: string
    buttonClassName?: string
    required?: boolean
    error?: string
    description?: string
}

const MINUTE_STEP = 15
const SLOTS_PER_DAY = (24 * 60) / MINUTE_STEP

const TIME_SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
    const totalMinutes = i * MINUTE_STEP
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const minutes = String(totalMinutes % 60).padStart(2, '0')
    return `${hours}:${minutes}`
})

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const toDatetimeLocal = (date: Date) => {
    const tzOffsetMs = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

const parseDatetimeLocal = (datetimeLocal?: string) => {
    if (!datetimeLocal) return null
    const parsed = parseISO(datetimeLocal)
    return isValid(parsed) ? parsed : null
}

const formatDisplayDate = (value?: string) => {
    if (!value) return ''
    const date = parseDatetimeLocal(value)
    if (!date) return ''
    return format(date, 'dd MMM yyyy, hh:mm a')
}

const formatTimeLabel = (slot: string) => {
    const [h, m] = slot.split(':').map(Number)
    const d = new Date(2000, 0, 1, h, m)
    return format(d, 'hh:mm a')
}

const getCurrentTimeSlot = () => {
    const now = new Date()
    const minutes = Math.ceil(now.getMinutes() / MINUTE_STEP) * MINUTE_STEP
    now.setMinutes(minutes, 0, 0)
    return format(now, 'HH:mm')
}

const isTimeSlotInPast = (slot: string, date: Date = new Date()): boolean => {
    const [hours, minutes] = slot.split(':').map(Number)
    const slotTime = new Date(date)
    slotTime.setHours(hours, minutes, 0, 0)
    const now = new Date()
    return isBefore(slotTime, now)
}

// Custom Calendar Component
function CustomCalendar({
    selectedDate,
    onSelect,
    minDate,
    defaultMonth,
}: {
    selectedDate?: Date
    onSelect: (date: Date) => void
    minDate: Date
    defaultMonth: Date
}) {
    const [viewDate, setViewDate] = useState(defaultMonth)
    const [isYearView, setIsYearView] = useState(false)

    useEffect(() => {
        setViewDate(defaultMonth)
    }, [defaultMonth])

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month, 1).getDay()
    }

    const isDateDisabled = (date: Date) => {
        if (isBefore(date, startOfDay(minDate))) return true
        return false
    }

    const isToday = (date: Date) => {
        return dateIsToday(date)
    }

    const isSelected = (date: Date) => {
        if (!selectedDate) return false
        return date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
    }

    const handleDayClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
        if (!isDateDisabled(newDate)) {
            onSelect(newDate)
        }
    }

    const changeMonth = (delta: number) => {
        try {
            const newDate = new Date(viewDate)
            newDate.setMonth(newDate.getMonth() + delta)
            setViewDate(newDate)
            setIsYearView(false)
        } catch (error) {
            console.error('Error changing month:', error)
        }
    }

    const handleYearSelect = () => {
        setIsYearView(!isYearView)
    }

    const handleYearClick = (year: number) => {
        try {
            const newDate = new Date(year, viewDate.getMonth(), 1)
            setViewDate(newDate)
            setIsYearView(false)
        } catch (error) {
            console.error('Error selecting year:', error)
        }
    }

    const renderDays = () => {
        const days: JSX.Element[] = []
        const firstDay = getFirstDayOfMonth(viewDate)
        const daysInMonth = getDaysInMonth(viewDate)

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8" />)
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
            const disabled = isDateDisabled(dateObj)
            const today = isToday(dateObj)
            const selected = isSelected(dateObj)

            days.push(
                <button
                    key={`day-${day}`}
                    onClick={() => handleDayClick(day)}
                    disabled={disabled}
                    className={cn(
                        'h-8 w-8 rounded-full text-xs font-medium transition-all duration-200 relative flex items-center justify-center',
                        disabled && 'cursor-not-allowed text-gray-300 dark:text-gray-600',
                        today && !selected && !disabled && 'border-2 border-teal-400 text-teal-600 dark:border-teal-500 dark:text-teal-400',
                        selected && 'bg-teal-600 text-white shadow-md shadow-teal-200/50 dark:shadow-teal-900/30 hover:bg-teal-700',
                        !disabled && !selected && 'hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400',
                        !disabled && 'cursor-pointer',
                        today && selected && 'bg-teal-600 text-white border-teal-600'
                    )}
                    type="button"
                    aria-label={`Select ${day}`}
                >
                    <span>{day}</span>
                    {today && !selected && (
                        <span className="absolute bottom-0.5 h-0.5 w-0.5 rounded-full bg-teal-500 dark:bg-teal-400" />
                    )}
                </button>
            )
        }

        return days
    }

    const renderYearView = () => {
        const years: JSX.Element[] = []
        const currentYear = viewDate.getFullYear()
        const startYear = currentYear - 6
        const endYear = currentYear + 5

        for (let year = startYear; year <= endYear; year++) {
            const disabled = year < minDate.getFullYear()
            const selected = selectedDate && year === selectedDate.getFullYear()

            years.push(
                <button
                    key={`year-${year}`}
                    onClick={() => handleYearClick(year)}
                    disabled={disabled}
                    type="button"
                    className={cn(
                        'rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200',
                        selected && 'bg-teal-600 text-white shadow-md dark:bg-teal-700 hover:bg-teal-700',
                        !selected && !disabled && 'hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/30 dark:hover:text-teal-400',
                        disabled && 'cursor-not-allowed text-gray-300 dark:text-gray-600',
                        !disabled && 'cursor-pointer'
                    )}
                    aria-label={`Select year ${year}`}
                >
                    {year}
                </button>
            )
        }

        return (
            <div className="grid grid-cols-4 gap-1 p-1">
                {years}
            </div>
        )
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
                <button
                    onClick={() => changeMonth(-1)}
                    className="rounded-lg p-1.5 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    aria-label="Previous month"
                    type="button"
                >
                    <ChevronLeft className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                </button>

                <button
                    onClick={handleYearSelect}
                    className="text-xs font-semibold text-gray-800 transition-colors hover:text-teal-600 dark:text-gray-200 dark:hover:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1"
                    type="button"
                    aria-label={`${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
                >
                    {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </button>

                <button
                    onClick={() => changeMonth(1)}
                    className="rounded-lg p-1.5 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    aria-label="Next month"
                    type="button"
                >
                    <ChevronRight className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                </button>
            </div>

            {/* Day names */}
            <div className="mb-1.5 grid grid-cols-7 gap-0.5">
                {DAYS_OF_WEEK.map(day => (
                    <div key={`dayname-${day}`} className="text-center text-xs font-medium uppercase text-gray-400 dark:text-gray-500 h-6">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid or Year view */}
            {isYearView ? (
                renderYearView()
            ) : (
                <div className="grid grid-cols-7 gap-0.5">
                    {renderDays()}
                </div>
            )}
        </div>
    )
}

export function DateTimePicker({
    value,
    onChange,
    min,
    label,
    placeholder,
    disabled,
    className,
    buttonClassName,
    required,
    error,
    description,
}: DateTimePickerProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const timeListRef = useRef<HTMLDivElement>(null)
    const activeTimeRef = useRef<HTMLButtonElement>(null)

    // Close on outside click
    useEffect(() => {
        if (!open) return

        const handleClick = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleKey)

        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleKey)
        }
    }, [open])

    // Scroll active time into view
    useEffect(() => {
        if (!open) return

        const raf = requestAnimationFrame(() => {
            activeTimeRef.current?.scrollIntoView({ block: 'center' })
        })

        return () => cancelAnimationFrame(raf)
    }, [open])

    // Parse dates
    const minDate = useMemo(() => {
        try {
            const parsed = parseDatetimeLocal(min || '')
            return parsed || new Date()
        } catch (error) {
            console.error('Error parsing min date:', error)
            return new Date()
        }
    }, [min])

    const minDateOnly = useMemo(() => startOfDay(minDate), [minDate])
    const parsedValue = useMemo(() => parseDatetimeLocal(value), [value])

    const selectedDate = parsedValue ? format(parsedValue, 'yyyy-MM-dd') : ''
    const selectedTime = parsedValue ? format(parsedValue, 'HH:mm') : ''
    const selectedDayIsMin = parsedValue ? isSameDay(parsedValue, minDate) : false
    const dateMinValue = format(minDateOnly, 'yyyy-MM-dd')
    const activeDay = parsedValue || minDate

    // Calculate available time slots
    const availableSlots = useMemo(() => {
        try {
            const dateValue = selectedDate || dateMinValue
            const selectedDateObj = new Date(dateValue)
            let slots = [...TIME_SLOTS]

            // Filter past slots for today
            if (dateIsToday(selectedDateObj)) {
                const currentSlot = getCurrentTimeSlot()
                slots = slots.filter(slot => slot >= currentSlot)
            }

            // Filter based on min date/time
            if (selectedDate && selectedDayIsMin) {
                const floor = format(minDate, 'HH:mm')
                slots = slots.filter(slot => slot >= floor)
            }

            return slots
        } catch (error) {
            console.error('Error calculating available slots:', error)
            return TIME_SLOTS
        }
    }, [selectedDate, selectedDayIsMin, minDate, dateMinValue])

    // Check if time slot is disabled
    const isTimeSlotDisabled = (slot: string): boolean => {
        try {
            const dateValue = selectedDate || dateMinValue
            const selectedDateObj = new Date(dateValue)

            if (dateIsToday(selectedDateObj)) {
                return isTimeSlotInPast(slot, selectedDateObj)
            }

            return false
        } catch (error) {
            console.error('Error checking time slot:', error)
            return false
        }
    }

    // Commit datetime selection
    const commit = (candidate: Date) => {
        try {
            onChange(toDatetimeLocal(candidate))
            setOpen(false)
        } catch (error) {
            console.error('Error committing datetime:', error)
        }
    }

    // Handle day selection
    const handleDaySelect = (date: Date | undefined) => {
        try {
            if (!date) return

            const dateValue = format(date, 'yyyy-MM-dd')
            const dateObj = new Date(dateValue)

            let timeToUse = ''

            if (dateIsToday(dateObj)) {
                const currentSlot = getCurrentTimeSlot()
                const validSlots = TIME_SLOTS.filter(slot => slot >= currentSlot)
                timeToUse = validSlots[0] || currentSlot
            } else if (selectedDayIsMin || isSameDay(date, minDate)) {
                timeToUse = format(minDate, 'HH:mm')
            } else {
                timeToUse = TIME_SLOTS[0]
            }

            const [hours, minutes] = timeToUse.split(':').map(Number)
            const selectedDateTime = new Date(dateValue)
            selectedDateTime.setHours(hours, minutes, 0, 0)

            commit(selectedDateTime)
        } catch (error) {
            console.error('Error handling day select:', error)
        }
    }

    // Handle time selection
    const handleTimeSelect = (slot: string) => {
        try {
            if (isTimeSlotDisabled(slot)) return

            const dateValue = selectedDate || dateMinValue
            const date = new Date(dateValue)
            const [hours, minutes] = slot.split(':').map(Number)
            const selectedDateTime = new Date(date)
            selectedDateTime.setHours(hours, minutes, 0, 0)

            commit(selectedDateTime)
        } catch (error) {
            console.error('Error handling time select:', error)
        }
    }

    // Clear selection
    const handleClear = (event: React.MouseEvent) => {
        try {
            event.stopPropagation()
            onChange('')
        } catch (error) {
            console.error('Error clearing datetime:', error)
        }
    }

    const showPlaceholder = !value
    const hasError = !!error

    return (
        <div className={cn('relative w-full max-w-md', className)} ref={containerRef}>
            {label && (
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                    {required && <span className="ml-1 text-red-500">*</span>}
                </label>
            )}

            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={cn(
                    'w-full justify-between px-4 py-2 text-left font-normal transition-all duration-200',
                    'border border-gray-200  hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
                    open && 'border-teal-500 ring-2 ring-teal-500/20 dark:border-teal-600',
                    hasError && 'border-red-500 ring-2 ring-red-500/20 dark:border-red-600',
                    disabled && 'cursor-not-allowed opacity-60',
                    buttonClassName
                )}
                disabled={disabled}
            >
                <span className={cn(
                    'flex items-center gap-2 truncate text-sm text-gray-700 dark:text-gray-200',
                    showPlaceholder && 'text-gray-400 dark:text-gray-500'
                )}>
                    <CalendarIcon className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                    <span className="truncate">
                        {showPlaceholder ? placeholder || 'Select date & time' : formatDisplayDate(value)}
                    </span>
                </span>
                {!showPlaceholder && !disabled && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleClear(e as unknown as React.MouseEvent)
                        }}
                        aria-label="Clear date and time"
                        className="ml-2 flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                        <X className="h-3.5 w-3.5" />
                    </span>
                )}
            </Button>

            {description && !hasError && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}

            {hasError && (
                <p className="mt-0.5 text-xs text-red-500 dark:text-red-400">{error}</p>
            )}

            {open && !disabled && (
                <div
                    role="dialog"
                    aria-label="Choose date and time"
                    className="absolute left-0 right-0 top-full z-50 mt-2 w-full min-w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
                >
                    <div className="flex h-72">
                        {/* Calendar */}
                        <div className="flex-1 overflow-y-auto p-3 border-r border-gray-200 dark:border-gray-700">
                            <CustomCalendar
                                selectedDate={parsedValue || undefined}
                                onSelect={handleDaySelect}
                                minDate={minDateOnly}
                                defaultMonth={activeDay}
                            />
                        </div>

                        {/* Time slots */}
                        <div className="w-40 flex flex-col border-l border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                                <Clock2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Time
                                </span>
                            </div>
                            <div ref={timeListRef} className="flex-1 overflow-y-auto px-2 py-2">
                                {availableSlots.length === 0 ? (
                                    <p className="px-1 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                                        No times available
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-0.5">
                                        {availableSlots.map((slot) => {
                                            const isActive = slot === selectedTime
                                            const isDisabled = isTimeSlotDisabled(slot)

                                            return (
                                                <button
                                                    key={`time-${slot}`}
                                                    ref={isActive ? activeTimeRef : undefined}
                                                    type="button"
                                                    onClick={() => handleTimeSelect(slot)}
                                                    disabled={isDisabled}
                                                    className={cn(
                                                        'relative rounded-md px-2 py-1 text-left text-xs transition-all duration-200',
                                                        'focus:outline-none focus:ring-1 focus:ring-teal-500',
                                                        isActive && 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
                                                        !isActive && !isDisabled && 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer',
                                                        isDisabled && 'cursor-not-allowed text-gray-300 dark:text-gray-600 bg-gray-50/50 dark:bg-gray-800/30 opacity-50'
                                                    )}
                                                    aria-label={`Select ${formatTimeLabel(slot)}`}
                                                >
                                                    <span className="flex items-center justify-between gap-1">
                                                        <span className={isDisabled ? 'line-through' : ''}>
                                                            {formatTimeLabel(slot)}
                                                        </span>
                                                        {isActive && (
                                                            <Check className="h-3 w-3 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                                        )}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}