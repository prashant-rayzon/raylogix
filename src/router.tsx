import { createBrowserRouter } from 'react-router-dom'
import GeneralError from './pages/errors/general-error'

import RedirectIfAuth from '@/components/redirect-if-auth'
import RequireAuth from '@/components/require-auth'
import { ProtectedRoute } from '@/components/route-guards'
import { ALL_PERMISSIONS } from '@/lib/permissions'

const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { default: AppShell } = await import('./components/app-shell')
      return {
        Component: () => (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
      }
    },
    errorElement: <GeneralError />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('./pages/dashboard')).default,
        }),
      },
      {
        path: 'dashboard',
        lazy: async () => ({
          Component: (await import('@/pages/dashboard')).default,
        }),
      },
      {
        path: 'companies',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/companies')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.COMPANY_READ}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'create',
            lazy: async () => {
              const { default: Component } = await import('@/pages/companies/create')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.COMPANY_CREATE}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },
      {
        path: 'analytics',
        lazy: async () => ({
          Component: (await import('@/pages/dashboard/analytics')).default,
        }),
      },
      {
        path: 'chats',
        lazy: async () => ({
          Component: (await import('@/pages/chats')).default,
        }),
      },
      {
        path: 'branches',
        lazy: async () => {
          const { default: Component } = await import('@/pages/branches')
          return {
            Component: () => (
              <ProtectedRoute requiredPermission={ALL_PERMISSIONS.BRANCH_READ}>
                <Component />
              </ProtectedRoute>
            ),
          }
        },
      },
      {
        path: 'transport-requests/outbound',
        lazy: async () => {
          const { default: Component } = await import('@/pages/branches')
          return {
            Component: () => (
              <ProtectedRoute requiredPermission={ALL_PERMISSIONS.BRANCH_READ}>
                <Component />
              </ProtectedRoute>
            ),
          }
        },
      },
      {
        path: 'transport-requests/inbound',
        lazy: async () => {
          const { default: Component } = await import('@/pages/branches')
          return {
            Component: () => (
              <ProtectedRoute requiredPermission={ALL_PERMISSIONS.BRANCH_READ}>
                <Component />
              </ProtectedRoute>
            ),
          }
        },
      },
      {
        path: 'notifications',
        lazy: async () => ({
          Component: (await import('@/pages/notifications')).default,
        }),
      },
      {
        path: 'activity-log',
        lazy: async () => {
          const { default: Component } = await import('@/pages/activity-log')
          return {
            Component: () => (
              // <ProtectedRoute requiredPermission={ALL_PERMISSIONS.AUDIT_VIEW}>
                <Component />
              // </ProtectedRoute>
            ),
          }
        },
      },
      {
        path: 'emails',
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/pages/email/list')).default,
            }),
          },
          {
            path: 'send',
            lazy: async () => ({
              Component: (await import('@/pages/email/send')).default,
            }),
          },
        ],
      },
      // USER MANAGEMENT - Requires admin
      {
        path: 'users',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/users')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.USER_READ}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },

        ],
      },
      // TRANSPORTER MANAGEMENT - Requires admin
      {
        path: 'transporters',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/transporters')
              return {
                Component: () => (
                  <ProtectedRoute requiredAnyPermission={[
                    ALL_PERMISSIONS.TRANSPORTER_READ,
                    ALL_PERMISSIONS.TRANSPORTER_WRITE
                  ]}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },
      // LOAD MANAGEMENT - Role-based access
      {
        path: 'load',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/load')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.LOAD_READ}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: ':id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/load/details/[id]')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.LOAD_READ}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: ':id/manage',
            lazy: async () => {
              const { default: Component } = await import('@/pages/load/manage/[id]')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.LOAD_MANAGE}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'edit/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/load/edit/[id]')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.LOAD_UPDATE}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'cancel/:id',
            lazy: async () => {
              const { default: Component } = await import('@/pages/load/cancel/[id]')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.LOAD_CANCEL}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },

      {
        path: 'settings',
        lazy: async () => ({
          Component: (await import('@/pages/settings')).default,
        }),
      },
    ],
  },
  {
    path: '/sign-in-2',
    lazy: async () => {
      const { default: SignIn } = await import('./pages/auth/sign-in')
      return {
        Component: () => (
          <RedirectIfAuth>
            <SignIn />
          </RedirectIfAuth>
        ),
      }
    },
  },
  {
    path: '/sign-in',
    lazy: async () => {
      const { default: SignIn2 } = await import('./pages/auth/sign-in-2')
      return {
        Component: () => (
          <RedirectIfAuth>
            <SignIn2 />
          </RedirectIfAuth>
        ),
      }
    },
  },
  {
    path: '/forgot-password',
    lazy: async () => {
      const { default: ForgotPassword } = await import('./pages/auth/forgot-password')
      return {
        Component: () => (
          <RedirectIfAuth>
            <ForgotPassword />
          </RedirectIfAuth>
        ),
      }
    },
  },
  {
    path: '/otp',
    lazy: async () => ({
      Component: (await import('./pages/auth/otp')).default,
    }),
  },
  {
    path: '/reset-password',
    lazy: async () => ({
      Component: (await import('./pages/auth/reset-password')).default,
    }),
  },
])

export default router
