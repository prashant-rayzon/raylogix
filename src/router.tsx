import { createBrowserRouter } from 'react-router-dom'
import { PageLoader } from '@/components/loader'
import RedirectIfAuth from '@/components/redirect-if-auth'
import RequireAuth from '@/components/require-auth'
import { ProtectedRoute } from '@/components/route-guards'
import { ALL_PERMISSIONS } from '@/lib/permissions'

const router = createBrowserRouter([
  {
    path: '/',
    HydrateFallback: () => <PageLoader label='Loading page...' />,
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
    children: [
      // ─── Dashboard ─────────────────────────────────────────────────────────
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
        path: 'analytics',
        lazy: async () => ({
          Component: (await import('@/pages/dashboard/analytics')).default,
        }),
      },

      // ─── Companies (super_admin) ────────────────────────────────────────────
      {
        path: 'companies',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/companies')
              return {
                Component: () => (
                  <ProtectedRoute requiredRole='super_admin' requiredPermission={ALL_PERMISSIONS.COMPANY_READ}>
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
                  <ProtectedRoute requiredRole='super_admin' requiredPermission={ALL_PERMISSIONS.COMPANY_CREATE}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },

      // ─── Masters ───────────────────────────────────────────────────────────
      {
        path: 'master-groups',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/master-groups')
              return {
                Component: () => (
                  <ProtectedRoute requiredRoles={['super_admin', 'company_admin']} requiredPermission={ALL_PERMISSIONS.MASTER_GROUP_READ}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },
      {
        path: 'masters',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/masters')
              return {
                Component: () => (
                  <ProtectedRoute requiredRoles={['super_admin', 'company_admin']} requiredPermission={ALL_PERMISSIONS.MASTER_READ}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },

      // ─── Communication ─────────────────────────────────────────────────────
      {
        path: 'chats',
        lazy: async () => {
          const { default: Component } = await import('@/pages/chats')
          return {
            Component: () => (
              <ProtectedRoute requiredPermission={ALL_PERMISSIONS.CHAT_READ}>
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

      // ─── Branches ──────────────────────────────────────────────────────────
      {
        path: 'branches',
        lazy: async () => {
          const { default: Component } = await import('@/pages/branches')
          return {
            Component: () => (
              <ProtectedRoute requiredRoles={['super_admin', 'company_admin']} requiredPermission={ALL_PERMISSIONS.BRANCH_READ}>
                <Component />
              </ProtectedRoute>
            ),
          }
        },
      },

      // ─── Transport Requests — Outbound & Inbound Vehicle Flow ──────────────
      {
        path: 'transport-requests',
        children: [
          {
            path: 'outbound',
            lazy: async () => {
              const { default: Component } = await import('@/pages/transport-requests/outbound')
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
            path: 'inbound',
            lazy: async () => {
              const { default: Component } = await import('@/pages/transport-requests/inbound')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.BRANCH_READ}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },

      // ─── Emails ────────────────────────────────────────────────────────────
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

      // ─── Audit / Activity Log ──────────────────────────────────────────────
      {
        path: 'activity-log',
        lazy: async () => {
          const { default: Component } = await import('@/pages/activity-log')
          return {
            Component: () => (
              <ProtectedRoute requiredPermission={ALL_PERMISSIONS.AUDIT_VIEW}>
                <Component />
              </ProtectedRoute>
            ),
          }
        },
      },

      // ─── Reports ────────────────────────────────────────────────────────────
      {
        path: 'reports',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/reports')
              return {
                Component: () => (
                  <ProtectedRoute
                    requiredAnyPermission={[
                      ALL_PERMISSIONS.REPORT_VIEW,
                      ALL_PERMISSIONS.AUDIT_VIEW,
                      ALL_PERMISSIONS.BILLING_VIEW,
                    ]}
                  >
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'billing',
            lazy: async () => {
              const { default: Component } = await import('@/pages/reports/billing')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.BILLING_VIEW}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'audit',
            lazy: async () => {
              const { default: Component } = await import('@/pages/reports/audit')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.AUDIT_VIEW}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'savings',
            lazy: async () => {
              const { default: Component } = await import('@/pages/reports/saving')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.REPORT_VIEW}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'vendors',
            lazy: async () => {
              const { default: Component } = await import('@/pages/reports/vendor')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.REPORT_VIEW}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
          {
            path: 'allotments',
            lazy: async () => {
              const { default: Component } = await import('@/pages/reports/allotment')
              return {
                Component: () => (
                  <ProtectedRoute requiredPermission={ALL_PERMISSIONS.REPORT_VIEW}>
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },

      // ─── User Management ───────────────────────────────────────────────────
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

      // ─── Transporter Management ────────────────────────────────────────────
      {
        path: 'transporters',
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/pages/transporters')
              return {
                Component: () => (
                  <ProtectedRoute
                    requiredRoles={['super_admin', 'company_admin']}
                    requiredAnyPermission={[
                      ALL_PERMISSIONS.TRANSPORTER_READ,
                      ALL_PERMISSIONS.TRANSPORTER_WRITE,
                    ]}
                  >
                    <Component />
                  </ProtectedRoute>
                ),
              }
            },
          },
        ],
      },

      // ─── Load Management ───────────────────────────────────────────────────
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

      // ─── Settings ──────────────────────────────────────────────────────────
      {
        path: 'settings',
        lazy: async () => ({
          Component: (await import('@/pages/settings')).default,
        }),
      },

      // ─── Billing Verification (finance role) ─────────────────────────
      {
        path: 'billing',
        lazy: async () => {
          const { default: Component } = await import('@/pages/billing')
          return {
            Component: () => (
              <ProtectedRoute requiredAnyPermission={['billing.read', 'billing.verify', ALL_PERMISSIONS.BILLING_VIEW]}>
                <Component />
              </ProtectedRoute>
            ),
          }
        },
      },

      // ─── Freight Rate Master ──────────────────────────────────────
      {
        path: 'freight-rates',
        lazy: async () => {
          const { default: Component } = await import('@/pages/freight-rates')
          return {
            Component: () => (
              <ProtectedRoute requiredAnyPermission={[ALL_PERMISSIONS.MASTER_READ, 'billing.read']}>
                <Component />
              </ProtectedRoute>
            ),
          }
        },
      },
      // ─── FASTag Toll Tracking (static, must come before :id) ──────────────
      {
        path: 'tracking/fastag',
        lazy: async () => ({
          Component: (await import('@/pages/tracking/fastag')).default,
        }),
      },
      // ─── Sim-based Live Tracking ───────────────────────────────────────────
      {
        path: 'tracking/:id',
        lazy: async () => ({
          Component: (await import('@/pages/tracking')).default,
        }),
      },
    ],
  },

  // ─── Auth routes (unauthenticated) ─────────────────────────────────────────
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
