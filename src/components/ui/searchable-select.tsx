import React, { useState, useEffect, useRef, useCallback, useMemo, useId, useLayoutEffect } from 'react'

import { Check, ChevronsUpDown, Loader2, X, Search, RotateCcw, AlertCircle, PlusCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'

import { Badge } from '@/components/ui/badge'

import { ScrollArea } from '@/components/ui/scroll-area'

import { Skeleton } from '@/components/ui/skeleton'

export interface SearchableOption {
    value: string
    label: string
    description?: string
    icon?: React.ReactNode
    disabled?: boolean
    group?: string // Add group support
}

export interface SearchableOptionGroup {
    groupName: string
    groupLabel: string
    options: SearchableOption[]
}

export interface SearchableSelectProps {
    value?: string | string[]
    onChange: (value: string | string[]) => void
    options?: SearchableOption[]
    groups?: SearchableOptionGroup[] // Add groups support
    apiUrl?: string
    apiParams?: Record<string, any>
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    loadingMessage?: string
    disabled?: boolean
    className?: string
    multiple?: boolean
    /** Caps how many rows are rendered in the list at once (perf guard). */
    maxItems?: number
    /** Caps how many items can be selected when multiple is true. */
    maxSelections?: number
    renderOption?: (option: SearchableOption) => React.ReactNode
    renderChip?: (value: string, label: string) => React.ReactNode
    onSearch?: (query: string) => void
    debounceDelay?: number
    autoFetch?: boolean
    minSearchLength?: number
    enableCreate?: boolean
    onCreate?: (value: string) => void
    createLabel?: string
    enableSelectAll?: boolean // Enable "Select All" for groups
    /** Server already filtered these options — don't re-filter client-side. */
    optionsPreFiltered?: boolean
    /**
     * Minimum clearance (px) required below the trigger for the dropdown to
     * open downward. If the trigger's containing scroll area (or the
     * viewport, when it isn't scrollable) has less than this much room
     * below it, the dropdown flips and opens upward instead.
     */
    minSpaceBelow?: number
}

export function SearchableSelect({
    value,
    onChange,
    options: initialOptions = [],
    groups,
    apiUrl,
    apiParams = {},
    placeholder = 'Select an option...',
    searchPlaceholder = 'Search...',
    emptyMessage = 'No options found',
    loadingMessage = 'Loading...',
    disabled = false,
    className,
    multiple = false,
    maxItems = 50,
    maxSelections,
    renderOption,
    renderChip,
    onSearch,
    debounceDelay = 300,
    autoFetch = true,
    minSearchLength = 1,
    enableCreate = false,
    onCreate,
    createLabel = 'Create "{query}"',
    enableSelectAll = false,
    optionsPreFiltered = false,
    minSpaceBelow = 100,
}: SearchableSelectProps) {

    const [isOpen, setIsOpen] = useState(false)
    const [openUpward, setOpenUpward] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [options, setOptions] = useState<SearchableOption[]>(initialOptions)
    const [isLoading, setIsLoading] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [highlightedIndex, setHighlightedIndex] = useState(0)

    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

    const listboxId = useId()
    const inputId = useId()

    // Debounce timer for the internal apiUrl-based fetch
    const fetchDebounceRef = useRef<ReturnType<typeof setTimeout>>()
    // Debounce timer for the external onSearch callback (kept separate from
    // fetchDebounceRef so the two debounced paths never clobber each other)
    const onSearchDebounceRef = useRef<ReturnType<typeof setTimeout>>()
    const abortControllerRef = useRef<AbortController>()

    // Sync options when initialOptions prop changes (for external data management)
    useEffect(() => {
        if (!apiUrl) {
            setOptions(initialOptions)
        }
    }, [initialOptions, apiUrl])

    const selectedValues = useMemo(() => {
        if (multiple) {
            return Array.isArray(value) ? value : []
        }
        return value ? [value] : []
    }, [value, multiple])

    const selectedOptions = useMemo(() => {
        return options.filter(opt => selectedValues.includes(opt.value))
    }, [options, selectedValues])

    const selectionLimitReached =
        multiple && typeof maxSelections === 'number' && selectedValues.length >= maxSelections

    // When results already came back filtered from the server (apiUrl path,
    // or a caller-supplied optionsPreFiltered flag), don't filter again on
    // the client — searching twice can silently drop rows whose label
    // doesn't literally contain the query (e.g. server matched on an alias).
    const filteredOptions = useMemo(() => {
        if (apiUrl || optionsPreFiltered) return options
        if (!searchQuery.trim()) return options

        const query = searchQuery.toLowerCase().trim()
        return options.filter(opt =>
            opt.label.toLowerCase().includes(query) ||
            opt.description?.toLowerCase().includes(query)
        )
    }, [options, searchQuery, apiUrl, optionsPreFiltered])

    const visibleOptions = useMemo(
        () => filteredOptions.slice(0, maxItems),
        [filteredOptions, maxItems]
    )

    // Reset keyboard highlight whenever the visible list changes shape
    useEffect(() => {
        setHighlightedIndex(0)
    }, [visibleOptions.length, isOpen])

    // Decide whether the panel should drop down or flip upward. Measured
    // against the trigger's position in the viewport (getBoundingClientRect
    // already accounts for any scrollable ancestor's clipping — an element
    // scrolled out of a container's visible area reports a clientRect
    // outside the viewport too), so this works whether "the main container"
    // is the window or a scrolling panel inside the page.
    const updatePlacement = useCallback(() => {
        const trigger = triggerRef.current
        if (!trigger) return

        const rect = trigger.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        // Flip up only when there truly isn't room below AND flipping
        // actually helps (more room above than below) — otherwise a very
        // short container would flip back and forth for no benefit.
        setOpenUpward(spaceBelow < minSpaceBelow && spaceAbove > spaceBelow)
    }, [minSpaceBelow])

    // Recompute placement right when the dropdown opens, and keep it correct
    // if the page scrolls or resizes while it's open (e.g. the trigger is
    // inside a scrollable panel).
    useLayoutEffect(() => {
        if (!isOpen) return
        updatePlacement()

        window.addEventListener('resize', updatePlacement)
        window.addEventListener('scroll', updatePlacement, true)
        return () => {
            window.removeEventListener('resize', updatePlacement)
            window.removeEventListener('scroll', updatePlacement, true)
        }
    }, [isOpen, updatePlacement])

    // Outside click handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchQuery('')
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // API fetch with debounce
    const fetchOptions = useCallback(async (query: string) => {
        if (!apiUrl) return

        if (fetchDebounceRef.current) {
            clearTimeout(fetchDebounceRef.current)
        }

        if (query.length < minSearchLength) {
            if (autoFetch) {
                setIsLoading(false)
                setIsSearching(false)
                setError(null)
            }
            return
        }

        fetchDebounceRef.current = setTimeout(async () => {
            try {
                // Distinguish the very first load from a subsequent search so
                // the trigger's inline spinner (which only cares about the
                // initial load) doesn't flicker on every keystroke.
                if (options.length === 0) {
                    setIsLoading(true)
                } else {
                    setIsSearching(true)
                }
                setError(null)

                if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                }
                abortControllerRef.current = new AbortController()

                const url = new URL(apiUrl)
                Object.entries(apiParams).forEach(([key, val]) => {
                    if (val) url.searchParams.append(key, String(val))
                })
                url.searchParams.append('search', query)

                const response = await fetch(url.toString(), {
                    signal: abortControllerRef.current.signal,
                })

                if (!response.ok) throw new Error('Failed to fetch options')

                const data = await response.json()

                let fetchedOptions: SearchableOption[] = []
                if (Array.isArray(data)) {
                    fetchedOptions = data.map(item => ({
                        value: item.id || item._id || item.value,
                        label: item.name || item.label || item.title,
                        description: item.description || item.email || item.companyName,
                    }))
                } else if (data.data && Array.isArray(data.data)) {
                    fetchedOptions = data.data.map((item: any) => ({
                        value: item.id || item._id || item.value,
                        label: item.name || item.label || item.title,
                        description: item.description || item.email || item.companyName,
                    }))
                }

                setOptions(fetchedOptions)
                setIsLoading(false)
                setIsSearching(false)
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return
                }
                setIsLoading(false)
                setIsSearching(false)
                setError("Couldn't load options — check your connection and try again.")
                console.error('SearchableSelect fetch error:', err)
            }
        }, debounceDelay)
    }, [apiUrl, apiParams, debounceDelay, minSearchLength, autoFetch, options.length])

    // Initial fetch
    useEffect(() => {
        if (autoFetch && apiUrl && !initialOptions.length) {
            fetchOptions('')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFetch, apiUrl, initialOptions.length])

    // Handle search input — apiUrl path (self-debounced inside fetchOptions)
    useEffect(() => {
        if (apiUrl) {
            fetchOptions(searchQuery)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, apiUrl])

    // Handle search input — external onSearch callback path.
    // This must be debounced independently: consumers such as
    // LocationAutocompleteSelect rely entirely on onSearch (no apiUrl) and
    // pass debounceDelay expecting it to actually throttle calls (e.g. to the
    // Google Places API).
    useEffect(() => {
        if (!onSearch) return

        if (onSearchDebounceRef.current) {
            clearTimeout(onSearchDebounceRef.current)
        }
        onSearchDebounceRef.current = setTimeout(() => {
            onSearch(searchQuery)
        }, debounceDelay)

        return () => {
            if (onSearchDebounceRef.current) {
                clearTimeout(onSearchDebounceRef.current)
            }
        }
    }, [searchQuery, onSearch, debounceDelay])

    // Cleanup
    useEffect(() => {
        return () => {
            if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current)
            if (onSearchDebounceRef.current) clearTimeout(onSearchDebounceRef.current)
            if (abortControllerRef.current) abortControllerRef.current.abort()
        }
    }, [])

    const closeDropdown = useCallback((refocusTrigger = true) => {
        setIsOpen(false)
        setSearchQuery('')
        if (refocusTrigger) {
            // Return focus to the trigger so keyboard users don't lose their
            // place in the page when the list disappears.
            triggerRef.current?.focus()
        }
    }, [])

    const openDropdown = useCallback(() => {
        if (disabled) return
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
    }, [disabled])

    const handleSelect = useCallback((option: SearchableOption) => {
        if (option.disabled) return

        if (multiple) {
            const current = Array.isArray(value) ? value : []
            const alreadySelected = current.includes(option.value)
            if (!alreadySelected && selectionLimitReached) return

            const newValue = alreadySelected
                ? current.filter(v => v !== option.value)
                : [...current, option.value]
            onChange(newValue)
            // Keep the list open for multi-select so people can pick several
            // in a row, but clear the query so the just-picked item doesn't
            // stay filtered out of view.
            inputRef.current?.focus()
        } else {
            onChange(option.value)
            closeDropdown()
        }
    }, [multiple, value, onChange, selectionLimitReached, closeDropdown])

    // Handle group selection (select/deselect all items in a group)
    const handleGroupSelect = useCallback((group: SearchableOptionGroup) => {
        if (!multiple) return
        
        const groupValues = group.options.map(opt => opt.value)
        const current = Array.isArray(value) ? value : []
        
        // Check if all items in the group are selected
        const allSelected = groupValues.every(val => current.includes(val))
        
        if (allSelected) {
            // Deselect all items in the group
            const newValue = current.filter(val => !groupValues.includes(val))
            onChange(newValue)
        } else {
            // Select all items in the group (that aren't already selected)
            const newValue = [...new Set([...current, ...groupValues])]
            onChange(newValue)
        }
        
        inputRef.current?.focus()
    }, [multiple, value, onChange])
    
    // Check if all items in a group are selected
    const isGroupSelected = useCallback((group: SearchableOptionGroup) => {
        const groupValues = group.options.map(opt => opt.value)
        const current = Array.isArray(value) ? value : []
        return groupValues.length > 0 && groupValues.every(val => current.includes(val))
    }, [value])
    
    // Check if some (but not all) items in a group are selected
    const isGroupPartiallySelected = useCallback((group: SearchableOptionGroup) => {
        const groupValues = group.options.map(opt => opt.value)
        const current = Array.isArray(value) ? value : []
        const selectedCount = groupValues.filter(val => current.includes(val)).length
        return selectedCount > 0 && selectedCount < groupValues.length
    }, [value])

    const handleRemove = useCallback((valueToRemove: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (multiple) {
            const current = Array.isArray(value) ? value : []
            onChange(current.filter(v => v !== valueToRemove))
        } else {
            onChange('')
        }
    }, [multiple, value, onChange])

    const handleClearAll = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(multiple ? [] : '')
    }, [multiple, onChange])

    const handleCreate = useCallback(() => {
        if (!enableCreate || !onCreate || !searchQuery.trim()) return
        onCreate(searchQuery.trim())
        setSearchQuery('')
        closeDropdown(false)
        inputRef.current?.focus()
    }, [enableCreate, onCreate, searchQuery, closeDropdown])

    const canCreate = enableCreate && searchQuery.trim().length > 0

    // Keyboard navigation inside the search input: arrows move the
    // highlight, Enter commits it, Escape closes and returns focus.
    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        const total = visibleOptions.length + (canCreate && filteredOptions.length === 0 ? 1 : 0)

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (total > 0) {
                    setHighlightedIndex(prev => (prev + 1) % total)
                }
                break
            case 'ArrowUp':
                e.preventDefault()
                if (total > 0) {
                    setHighlightedIndex(prev => (prev - 1 + total) % total)
                }
                break
            case 'Enter':
                e.preventDefault()
                if (visibleOptions[highlightedIndex]) {
                    handleSelect(visibleOptions[highlightedIndex])
                } else if (canCreate && filteredOptions.length === 0) {
                    handleCreate()
                }
                break
            case 'Escape':
                e.preventDefault()
                closeDropdown()
                break
            case 'Backspace':
                break
            default:
                break
        }
    }, [visibleOptions, highlightedIndex, canCreate, filteredOptions.length, handleSelect, handleCreate, closeDropdown, multiple, searchQuery, selectedValues, handleRemove])

    // Keep the highlighted row scrolled into view
    useEffect(() => {
        const el = optionRefs.current.get(highlightedIndex)
        el?.scrollIntoView({ block: 'nearest' })
    }, [highlightedIndex])

    const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return
        if (!isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault()
            openDropdown()
        } else if (isOpen && e.key === 'Escape') {
            e.preventDefault()
            closeDropdown()
        }
    }, [disabled, isOpen, openDropdown, closeDropdown])

    // Default render functions
    const defaultRenderOption = (option: SearchableOption) => (
        <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span
                className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all duration-150',
                    selectedValues.includes(option.value)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-slate-300 bg-transparent'
                )}
            >
                <Check
                    className={cn(
                        'h-3 w-3 transition-opacity duration-150',
                        selectedValues.includes(option.value) ? 'opacity-100' : 'opacity-0'
                    )}
                    strokeWidth={3}
                />
            </span>
            {option.icon && <span className="shrink-0 text-slate-400">{option.icon}</span>}
            <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium leading-tight text-slate-900">{option.label}</span>
                {option.description && (
                    <span className="truncate text-xs leading-tight text-slate-500">{option.description}</span>
                )}
            </div>
        </div>
    )

    const defaultRenderChip = (val: string, label: string) => (
        <Badge
            variant="secondary"
            className="flex items-center gap-1 rounded-full border border-primary/15 bg-primary/8 py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-primary/12"
        >
            <span className="max-w-[160px] truncate">{label}</span>
            <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${label}`}
                onClick={(e) => handleRemove(val, e)}
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-900/10 hover:text-slate-900 cursor-pointer"
            >
                <X className="h-2.5 w-2.5" strokeWidth={2.5} />
            </span>
        </Badge>
    )

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {/* Trigger — a div (not a <button>) because it can contain the
                remove buttons on each chip; nesting interactive controls
                inside a <button> is invalid HTML and breaks keyboard/AT
                behavior. Roving tabIndex + explicit key handling keep it
                just as keyboard-accessible. */}
            <div
                ref={triggerRef}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => (isOpen ? closeDropdown(false) : openDropdown())}
                onKeyDown={handleTriggerKeyDown}
                className={cn(
                    'flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm ring-offset-background transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isOpen
                        ? 'border-ring/60 shadow-md shadow-slate-900/[0.03] ring-2 ring-ring/20'
                        : 'hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.02]',
                    disabled ? 'cursor-not-allowed bg-slate-50 opacity-60 shadow-none' : 'cursor-pointer'
                )}
            >
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map((opt, idx) => (
                            <React.Fragment key={`chip-${opt.value}-${idx}`}>
                                {renderChip
                                    ? renderChip(opt.value, opt.label)
                                    : defaultRenderChip(opt.value, opt.label)}
                            </React.Fragment>
                        ))
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                    {selectedOptions.length > 0 && !disabled && (
                        <span
                            role="button"
                            tabIndex={-1}
                            aria-label="Clear all selections"
                            onClick={handleClearAll}
                            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-slate-900/8 hover:text-foreground cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    {isLoading && !isOpen ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                        <ChevronsUpDown
                            className={cn(
                                'h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 ease-out',
                                isOpen && 'rotate-180 text-muted-foreground'
                            )}
                        />
                    )}
                </div>
            </div>

            {/* Dropdown — flips above the trigger via `openUpward` when
                there isn't enough room below (see updatePlacement). */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className={cn(
                        'absolute z-50 w-full min-w-[200px] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg shadow-slate-900/10 duration-150 animate-in fade-in-0 zoom-in-95',
                        openUpward
                            ? 'bottom-full mb-1.5 origin-bottom slide-in-from-bottom-1'
                            : 'top-full mt-1.5 origin-top slide-in-from-top-1'
                    )}
                >
                    <div className="flex items-center gap-2 border-b bg-slate-50/60 px-3 py-2">
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Input
                            id={inputId}
                            ref={inputRef}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder={searchPlaceholder}
                            disabled={disabled}
                            role="combobox"
                            aria-expanded={isOpen}
                            aria-controls={listboxId}
                            aria-activedescendant={
                                visibleOptions[highlightedIndex]
                                    ? `${listboxId}-opt-${highlightedIndex}`
                                    : undefined
                            }
                            aria-autocomplete="list"
                            className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            autoFocus
                        />
                        {isSearching && (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                        )}
                        {searchQuery && !isSearching && (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => {
                                    setSearchQuery('')
                                    inputRef.current?.focus()
                                }}
                                className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-slate-900/8 hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {multiple && typeof maxSelections === 'number' && (
                        <div
                            className={cn(
                                'flex items-center justify-between border-b px-3 py-1.5 text-xs transition-colors',
                                selectionLimitReached
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-slate-50/60 text-muted-foreground'
                            )}
                        >
                            <span>{selectedValues.length} of {maxSelections} selected</span>
                            {selectionLimitReached && (
                                <span className="flex items-center gap-1 font-medium">
                                    <AlertCircle className="h-3 w-3" /> Limit reached
                                </span>
                            )}
                        </div>
                    )}

                    <ScrollArea className="max-h-[240px] overflow-auto">
                        <div
                            id={listboxId}
                            role="listbox"
                            aria-multiselectable={multiple}
                            aria-label={searchPlaceholder}
                            className="p-1"
                        >
                            {isLoading ? (
                                <div className="space-y-1.5 p-1.5" aria-live="polite" aria-label={loadingMessage}>
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton
                                            key={i}
                                            className="h-9 w-full rounded-md"
                                            style={{ opacity: 1 - i * 0.18 }}
                                        />
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center gap-2.5 px-3 py-8 text-center text-sm">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                    </span>
                                    <span className="max-w-[220px] text-muted-foreground">{error}</span>
                                    <button
                                        type="button"
                                        onClick={() => fetchOptions(searchQuery)}
                                        className="flex items-center gap-1.5 rounded-md border border-destructive/20 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5 active:bg-destructive/10"
                                    >
                                        <RotateCcw className="h-3 w-3" /> Try again
                                    </button>
                                </div>
                            ) : filteredOptions.length === 0 ? (
                                <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center text-sm text-muted-foreground">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                        <Search className="h-3.5 w-3.5 text-slate-400" />
                                    </span>
                                    {canCreate ? (
                                        <button
                                            type="button"
                                            role="option"
                                            id={`${listboxId}-opt-0`}
                                            aria-selected={highlightedIndex === 0}
                                            onClick={handleCreate}
                                            className={cn(
                                                'mt-1 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-primary transition-colors hover:bg-primary/5',
                                                highlightedIndex === 0 && 'bg-primary/5'
                                            )}
                                        >
                                            <PlusCircle className="h-3.5 w-3.5" />
                                            {createLabel.replace('{query}', searchQuery)}
                                        </button>
                                    ) : (
                                        <span className="mt-1">{emptyMessage}</span>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {/* Render groups if provided */}
                                    {groups && groups.length > 0 ? (
                                        groups.map((group, groupIdx) => {
                                            const groupOptionsFiltered = group.options.filter(opt => {
                                                if (apiUrl || optionsPreFiltered) return true
                                                if (!searchQuery.trim()) return true
                                                const query = searchQuery.toLowerCase().trim()
                                                return opt.label.toLowerCase().includes(query) ||
                                                    opt.description?.toLowerCase().includes(query)
                                            })
                                            
                                            if (groupOptionsFiltered.length === 0) return null
                                            
                                            const groupFullySelected = isGroupSelected(group)
                                            const groupPartiallySelected = isGroupPartiallySelected(group)
                                            
                                            return (
                                                <div key={group.groupName || groupIdx} className="mb-2 last:mb-0">
                                                    {/* Group Header with Select All Checkbox */}
                                                    {enableSelectAll && multiple && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGroupSelect(group)}
                                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100/80"
                                                        >
                                                            <div className={cn(
                                                                "h-4 w-4 flex items-center justify-center rounded border-2 transition-colors",
                                                                groupFullySelected 
                                                                    ? "bg-primary border-primary" 
                                                                    : groupPartiallySelected
                                                                    ? "bg-primary/20 border-primary"
                                                                    : "border-slate-300 bg-white"
                                                            )}>
                                                                {groupFullySelected ? (
                                                                    <Check className="h-3 w-3 text-white" />
                                                                ) : groupPartiallySelected ? (
                                                                    <div className="h-2 w-2 bg-primary rounded-sm" />
                                                                ) : null}
                                                            </div>
                                                            <span className="flex-1 text-left uppercase tracking-wide">
                                                                {group.groupLabel}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                ({groupOptionsFiltered.length})
                                                            </span>
                                                        </button>
                                                    )}
                                                    
                                                    {/* Group Items */}
                                                    <div className={enableSelectAll && multiple ? "ml-4 mt-1 space-y-0.5" : "space-y-0.5"}>
                                                        {groupOptionsFiltered.slice(0, maxItems).map((option) => {
                                                            const isSelected = selectedValues.includes(option.value)
                                                            const isDisabledForLimit =
                                                                !isSelected && selectionLimitReached
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={isSelected}
                                                                    disabled={option.disabled || isDisabledForLimit}
                                                                    title={isDisabledForLimit ? `You can select up to ${maxSelections} items` : undefined}
                                                                    className={cn(
                                                                        'flex w-full items-center rounded-md text-left transition-colors duration-100',
                                                                        'disabled:cursor-not-allowed disabled:opacity-40',
                                                                        isSelected && 'bg-primary/5',
                                                                        'hover:bg-slate-50/80'
                                                                    )}
                                                                    onClick={() => handleSelect(option)}
                                                                >
                                                                    {renderOption
                                                                        ? renderOption(option)
                                                                        : defaultRenderOption(option)}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        /* Render flat options (original behavior) */
                                        visibleOptions.map((option, idx) => {
                                            const isSelected = selectedValues.includes(option.value)
                                            const isDisabledForLimit =
                                                !isSelected && selectionLimitReached
                                            return (
                                                <button
                                                    key={option.value}
                                                    ref={(el) => {
                                                        if (el) optionRefs.current.set(idx, el)
                                                        else optionRefs.current.delete(idx)
                                                    }}
                                                    id={`${listboxId}-opt-${idx}`}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    disabled={option.disabled || isDisabledForLimit}
                                                    title={isDisabledForLimit ? `You can select up to ${maxSelections} items` : undefined}
                                                    className={cn(
                                                        'flex w-full items-center rounded-md text-left transition-colors duration-100',
                                                        'disabled:cursor-not-allowed disabled:opacity-40',
                                                        isSelected && 'bg-primary/5',
                                                        idx === highlightedIndex && !option.disabled && !isDisabledForLimit && 'bg-slate-100'
                                                    )}
                                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                                    onClick={() => handleSelect(option)}
                                                >
                                                    {renderOption
                                                        ? renderOption(option)
                                                        : defaultRenderOption(option)}
                                                </button>
                                            )
                                        })
                                    )}
                                    {filteredOptions.length > maxItems && (
                                        <div className="mt-1 rounded-md bg-slate-50 px-2.5 py-2 text-center text-xs text-slate-500">
                                            Showing first {maxItems} of {filteredOptions.length} — keep typing to narrow it down
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    )
}