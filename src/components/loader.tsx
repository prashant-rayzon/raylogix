import { IconLoader2 } from '@tabler/icons-react'

import { cn } from '@/lib/utils'

type LoaderIconProps = {
  className?: string
}

export function LoaderIcon({ className }: LoaderIconProps) {
  return <IconLoader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden="true" />
}

type LoaderProps = {
  className?: string
  label?: string
}

export function PageLoader({
  className,
  label = 'Loading...',
}: LoaderProps) {
  return (
    <div className={cn('flex min-h-[50vh] w-full items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <LoaderIcon className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function SectionLoader({
  className,
  label = 'Loading...',
}: LoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <LoaderIcon className="h-6 w-6 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export default function Loader() {
  return <PageLoader label="Loading..." />
}
