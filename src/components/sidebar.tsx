import { useEffect, useState } from 'react'
import { IconChevronsLeft, IconMenu2, IconX } from '@tabler/icons-react'
import { Layout } from './custom/layout'
import { Button } from './custom/button'
import Nav from './nav'
import { cn } from '@/lib/utils'
import { getFilteredSideLinks } from '@/data/sidelinks'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  isCollapsed: boolean
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Sidebar({
  className,
  isCollapsed,
  setIsCollapsed,
}: SidebarProps) {
  const [navOpened, setNavOpened] = useState(false)
  const user = useSelector((state: RootState) => state.auth.user)

  // Filter sidebar links based on user role
    const filteredLinks = getFilteredSideLinks(user?.role, user?.permissions, user?.accessLevel)


  /* Make body not scrollable when navbar is opened */
  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', navOpened)

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [navOpened])

  return (
    <aside
      className={cn(
        'fixed left-0 right-0 top-0 z-50 w-full border-r-2 border-r-muted bg-background transition-[width] md:bottom-0 md:right-auto md:h-svh',
        isCollapsed ? 'md:w-14' : 'md:w-64',
        className
      )}
    >
      {/* Overlay in mobile */}
      <div
        aria-hidden='true'
        onClick={() => navOpened && setNavOpened(false)}
        className={cn(
          'absolute inset-0 w-full bg-black transition-[opacity] delay-100 duration-700 md:hidden',
          navOpened ? 'h-svh opacity-50' : 'pointer-events-none h-0 opacity-0'
        )}
      />

      <Layout fixed className={cn(navOpened && 'h-svh')}>
        {/* Header */}
        <Layout.Header
          sticky
          className='z-50 flex justify-between items-center px-4 py-3 shadow-sm md:px-4'
        >
          <div
            className={cn('flex min-w-0 items-center', isCollapsed && 'gap-2')}
          >
            {!isCollapsed ? <img
              alt='Raylogix'
              className={cn('mx-auto h-auto object-contain transition-[width]', isCollapsed ? 'md:w-8' : 'w-[120px]')}
              src='/images/logo.png'
            /> : <img
              alt='Raylogix'
              className={cn('mx-auto h-auto object-contain transition-[width]', isCollapsed ? 'md:w-8' : 'w-[120px]')}
              src='/images/favicon.ico'
            />}
          </div>

          <div className='flex items-center gap-2'>
            {/* Notification Icon */}

            {/* Toggle Button in mobile */}
            <Button
              variant='ghost'
              size='icon'
              className='md:hidden'
              aria-label='Toggle Navigation'
              aria-controls='sidebar-menu'
              aria-expanded={navOpened}
              onClick={() => setNavOpened((prev) => !prev)}
            >
              {navOpened ? <IconX /> : <IconMenu2 />}
            </Button>
          </div>
        </Layout.Header>

        {/* Navigation links */}
        <Nav
          id='sidebar-menu'
          className={cn(
            'z-40 h-full flex-1 overflow-auto',
            navOpened ? 'max-h-screen' : 'max-h-0 py-0 md:max-h-screen md:py-2'
          )}
          closeNav={() => setNavOpened(false)}
          isCollapsed={isCollapsed}
          links={filteredLinks}
        />

        {/* Scrollbar width toggle button */}
        <Button
          onClick={() => setIsCollapsed((prev) => !prev)}
          size='icon'
          variant='outline'
          className='absolute -right-5 top-1/2 z-50 hidden rounded-full md:inline-flex'
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <IconChevronsLeft
            stroke={1.5}
            className={cn(
              'h-5 w-5 transition-transform',
              isCollapsed && 'rotate-180'
            )}
          />
        </Button>
      </Layout>
    </aside>
  )
}
