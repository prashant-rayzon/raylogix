import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/custom/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/custom/button'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import {
  IconActivity,
  IconReceipt2,
  IconPigMoney,
  IconUsers,
  IconBookmark,
  IconChartBar,
} from '@tabler/icons-react'
import { usePermission } from '@/lib/hooks/usePermission'
import { ALL_PERMISSIONS } from '@/lib/permissions'

export default function ReportsHub() {
  const navigate = useNavigate()
  const canViewBilling = usePermission(ALL_PERMISSIONS.BILLING_VIEW)
  const canViewAudit = usePermission(ALL_PERMISSIONS.AUDIT_VIEW)
  const canViewReports = usePermission(ALL_PERMISSIONS.REPORT_VIEW)

  const reportCards = [
    {
      title: 'Billing Report',
      description: 'Analyze financial transactions, transporter cost allocations, and outstanding dues.',
      icon: <IconReceipt2 className="h-6 w-6 text-emerald-500" />,
      path: '/reports/billing',
      visible: canViewBilling,
      color: 'from-emerald-500/10 to-emerald-500/5',
      borderColor: 'hover:border-emerald-500/30'
    },
    {
      title: 'Audit Report',
      description: 'Audit system activity logs, security logins, and data modifications over time.',
      icon: <IconActivity className="h-6 w-6 text-violet-500" />,
      path: '/reports/audit',
      visible: canViewAudit,
      color: 'from-violet-500/10 to-violet-500/5',
      borderColor: 'hover:border-violet-500/30'
    },
    {
      title: 'Savings Report',
      description: 'Compare budget ceiling limits against actual winning bid values to track savings.',
      icon: <IconPigMoney className="h-6 w-6 text-amber-500" />,
      path: '/reports/savings',
      visible: canViewReports,
      color: 'from-amber-500/10 to-amber-500/5',
      borderColor: 'hover:border-amber-500/30'
    },
    {
      title: 'Vendor Report',
      description: 'Evaluate vendor bid success metrics, total allocations value, and scorecard ratings.',
      icon: <IconUsers className="h-6 w-6 text-blue-500" />,
      path: '/reports/vendors',
      visible: canViewReports,
      color: 'from-blue-500/10 to-blue-500/5',
      borderColor: 'hover:border-blue-500/30'
    },
    {
      title: 'Allotment Report',
      description: 'Review load allotment updates, accepted vs allocated counts, and confirmed rates.',
      icon: <IconBookmark className="h-6 w-6 text-rose-500" />,
      path: '/reports/allotments',
      visible: canViewReports,
      color: 'from-rose-500/10 to-rose-500/5',
      borderColor: 'hover:border-rose-500/30'
    }
  ]

  return (
    <Layout>
      <Layout.Header sticky>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body className="space-y-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Banner */}
          <div className="rounded-[1.75rem] border bg-gradient-to-br from-primary/10 via-background to-muted/30 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <IconChartBar className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics Hub</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a report section to track billing details, cost savings, vendor performance, or audit logs.
                </p>
              </div>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reportCards
              .filter(card => card.visible)
              .map((card, idx) => (
                <Card
                  key={idx}
                  className={`group relative overflow-hidden rounded-3xl transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer border-border/50 ${card.borderColor}`}
                  onClick={() => navigate(card.path)}
                >
                  <CardHeader className="relative z-10 flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div className={`rounded-2xl bg-gradient-to-br ${card.color} p-3 shadow-inner`}>
                      {card.icon}
                    </div>
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 pt-2">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                    <div className="mt-4 flex items-center justify-end">
                      <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
                        Open Report →
                      </Button>
                    </div>
                  </CardContent>
                  {/* Subtle hover effect background */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-muted/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </Card>
              ))}
          </div>
        </div>
      </Layout.Body>
    </Layout>
  )
}
