import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/custom/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useAppDispatch, useAppSelector } from '@/store'
import { logoutThunk } from '@/store/slices/authSlice'
import { NotificationIcon } from './notifications/NotificationIcon'

function getInitials(input: string | undefined | null) {
  const s = (input ?? '').trim()
  if (!s) return 'U'
  const parts = s.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second =
    parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? ''
  return (first + second).toUpperCase()
}

export function UserNav() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const auth = useAppSelector((s) => s.auth)

  const user = auth.user
  const [logoutOpen, setLogoutOpen] = useState(false)

  const displayName = user?.fullName?.trim() || user?.email?.trim() || 'User'
  const email = user?.email?.trim() || ''
  const initials = useMemo(() => getInitials(displayName), [displayName])

  const avatarUrl = (user as any)?.avatarUrl as string | undefined

  const handleConfirmLogout = async () => {
    setLogoutOpen(false)
    await dispatch(logoutThunk()).unwrap().catch(() => null)
    navigate('/sign-in', { replace: true })
  }

  return (
    <>
      <DropdownMenu>
        <NotificationIcon />
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>{displayName}</p>
              {email ? (
                <p className='text-xs leading-none text-muted-foreground'>{email}</p>
              ) : null}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate('/settings')}>
            Settings
            <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title='Are you sure?'
        desc='Do you really want to log out?'
        cancelBtnText='Cancel'
        confirmText='Log out'
        destructive
        handleConfirm={handleConfirmLogout}
      />
    </>
  )
}


