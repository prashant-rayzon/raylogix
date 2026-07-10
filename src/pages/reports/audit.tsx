import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/custom/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/custom/button'
import { Input } from '@/components/ui/input'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { toast } from '@/components/ui/use-toast'
import {
  IconArrowLeft,
  IconDownload,
  IconActivity,
  IconRefresh,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { auditService, AuditLogEntry } from '@/api/services/audit/audit.service'
import { exportToExcel } from '@/lib/export'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'STATUS_CHANGE', 'ASSIGN', 'APPROVE', 'REJECT']
const RESOURCES = ['', 'USER', 'TENANT', 'LOAD', 'BID', 'TRANSPORTER', 'CONVERSATION', 'MESSAGE', 'COMPANY']

export default function AuditReport() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [resource, setResource] = useState('')
  const [status, setStatus] = useState('')

  // Expand state
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await auditService.list({
        page,
        limit: 25,
        search: search.trim() || undefined,
        action: action || undefined,
        resource: resource || undefined,
        status: status || undefined,
      })
      setLogs(res.data || [])
      setPages(res.pagination?.pages || 1)
      setTotal(res.pagination?.total || 0)
    } catch (error: any) {
      toast({
        title: 'Failed to load audit logs',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, search, action, resource, status])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Aggregate metrics for visualization from current list of logs
  const actionAggMap: Record<string, number> = {}
  const resourceAggMap: Record<string, number> = {}
  let successCount = 0

  logs.forEach(log => {
    actionAggMap[log.action] = (actionAggMap[log.action] || 0) + 1
    resourceAggMap[log.resource] = (resourceAggMap[log.resource] || 0) + 1
    if (log.status === 'success') successCount++
  })

  const actionAggData = Object.entries(actionAggMap).map(([name, value]) => ({ name, value }))
  const resourceAggData = Object.entries(resourceAggMap).map(([name, value]) => ({ name, value }))
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100

  const handleExport = async () => {
    if (logs.length === 0) return
    try {
      const columns = [
        { header: 'Timestamp', key: 'timestamp', width: 22 },
        { header: 'User Name', key: 'userName', width: 20 },
        { header: 'User Role', key: 'userRole', width: 15 },
        { header: 'Action', key: 'action', width: 15 },
        { header: 'Resource', key: 'resource', width: 15 },
        { header: 'Resource Name', key: 'resourceName', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'IP Address', key: 'ipAddress', width: 18 }
      ]

      const formattedData = logs.map(log => ({
        timestamp: new Date(log.timestamp).toLocaleString('en-IN'),
        userName: log.userName,
        userRole: log.userRole,
        action: log.action,
        resource: log.resource,
        resourceName: log.resourceName || 'N/A',
        status: log.status.toUpperCase(),
        ipAddress: log.ipAddress || 'N/A'
      }))

      await exportToExcel('Audit_Logs_Report', [
        {
          name: 'Audit Logs',
          columns,
          data: formattedData
        }
      ])
      toast({ title: 'Audit log report exported successfully' })
    } catch (e: any) {
      toast({
        title: 'Export failed',
        description: e.message,
        variant: 'destructive'
      })
    }
  }

  return (
    <Layout>
      <Layout.Header sticky>
        <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} className="gap-1">
          <IconArrowLeft className="h-4 w-4" /> Back to Hub
        </Button>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body className="space-y-6">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Banner */}
          <div className="rounded-[1.75rem] border bg-gradient-to-br from-violet-500/10 via-background to-muted/30 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-600">
                  <IconActivity className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Security Audit Log Report</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Inspect user actions, login activities, resource creation, and data change audit logs.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport} disabled={loading || logs.length === 0}>
                  <IconDownload className="mr-2 h-4 w-4" /> Export
                </Button>
                <Button variant="outline" onClick={loadLogs} disabled={loading}>
                  <IconRefresh className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total Events (Page)</CardDescription>
                <CardTitle className="text-2xl font-bold">{logs.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Overall Matches</CardDescription>
                <CardTitle className="text-2xl font-bold text-violet-600">{total}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Success Rate (Page)</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">{successRate}%</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Failures (Page)</CardDescription>
                <CardTitle className="text-2xl font-bold text-red-600">{logs.length - successCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Charts */}
          {logs.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Events by Resource Type</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] pb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resourceAggData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Events by Action Type</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[250px] flex-col justify-center pb-6 sm:flex-row">
                  <div className="h-full w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={actionAggData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="name">
                          {actionAggData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center gap-2 pl-4">
                    {actionAggData.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="capitalize">{item.name.toLowerCase().replace('_', ' ')}:</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter Panel */}
          <Card className="rounded-3xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Filter Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Action</label>
                  <select
                    value={action}
                    onChange={(e) => { setPage(1); setAction(e.target.value); }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {ACTIONS.map((a, idx) => (
                      <option key={idx} value={a}>{a || 'All Actions'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Resource</label>
                  <select
                    value={resource}
                    onChange={(e) => { setPage(1); setResource(e.target.value); }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {RESOURCES.map((r, idx) => (
                      <option key={idx} value={r}>{r || 'All Resources'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failure">Failure</option>
                  </select>
                </div>
                <div className="relative flex flex-col justify-end md:col-span-2">
                  <IconSearch className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search user, resource name, path..."
                    value={search}
                    onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Table */}
          <Card className="rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Security Logs</CardTitle>
              <CardDescription>Showing entries {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Resource</th>
                      <th className="p-4">Target Name</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">IP Address</th>
                      <th className="p-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          Loading audit records...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No audit records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <>
                          <tr key={log._id} className="hover:bg-muted/30">
                            <td className="p-4 text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString('en-IN')}
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-foreground">{log.userName}</div>
                              <div className="text-[10px] text-muted-foreground uppercase">{log.userRole.replace('_', ' ')}</div>
                            </td>
                            <td className="p-4 font-mono font-semibold">{log.action}</td>
                            <td className="p-4">{log.resource}</td>
                            <td className="p-4 font-medium">{log.resourceName || log.resourceId || 'N/A'}</td>
                            <td className="p-4">
                              <span className={cn(
                                'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase',
                                log.status === 'success' && 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900',
                                log.status === 'failure' && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900'
                              )}>
                                {log.status}
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground">{log.ipAddress || 'N/A'}</td>
                            <td className="p-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)}
                              >
                                {expandedLogId === log._id ? 'Hide' : 'View'}
                              </Button>
                            </td>
                          </tr>
                          
                          {/* Expanded detail row */}
                          {expandedLogId === log._id && (
                            <tr className="bg-muted/10">
                              <td colSpan={8} className="p-4 border-b">
                                <div className="space-y-3 rounded-2xl border bg-background p-4 shadow-inner">
                                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                                    <div>
                                      <p className="font-bold text-muted-foreground">HTTP Query Path:</p>
                                      <p className="font-mono mt-0.5">{log.requestMethod || 'N/A'} {log.requestPath || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="font-bold text-muted-foreground">User Agent:</p>
                                      <p className="mt-0.5 text-muted-foreground leading-normal">{log.userAgent || 'N/A'}</p>
                                    </div>
                                  </div>
                                  
                                  {log.context && Object.keys(log.context).length > 0 && (
                                    <div className="text-xs">
                                      <p className="font-bold text-muted-foreground">Context Metadata:</p>
                                      <pre className="mt-1 max-h-[150px] overflow-auto rounded-lg border bg-muted/30 p-2 font-mono text-[10px]">
                                        {JSON.stringify(log.context, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.errorMessage && (
                                    <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                                      <p className="font-bold">Error Message:</p>
                                      <p className="mt-0.5 font-mono">{log.errorMessage}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {pages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <IconChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next <IconChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout.Body>
    </Layout>
  )
}
