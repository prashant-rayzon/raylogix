import { useCallback, useEffect, useState } from 'react'
import {
  IconActivity,
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react'
import { Layout } from '@/components/custom/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/custom/button'
import { Input } from '@/components/ui/input'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { auditService, AuditLogEntry } from '@/api/services/audit/audit.service'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

const actions = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'STATUS_CHANGE', 'ASSIGN', 'APPROVE', 'REJECT']
const resources = ['', 'USER', 'TENANT', 'LOAD', 'BID', 'TRANSPORTER', 'CONVERSATION', 'MESSAGE', 'COMPANY']
const statuses = ['', 'success', 'failure', 'partial']

const getStatusClass = (status: string) =>
  cn(
    status === 'success' && 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300',
    status === 'failure' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
    status === 'partial' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
  )

const formatAction = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [action, setAction] = useState('')
  const [resource, setResource] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      const response = await auditService.list({
        page,
        limit: 25,
        search: debouncedSearch.trim() || undefined,
        action: action || undefined,
        resource: resource || undefined,
        status: status || undefined,
      })
      setLogs(response.data || [])
      setPages(response.pagination?.pages || 1)
      setTotal(response.pagination?.total || 0)
    } catch (error: any) {
      toast({
        title: 'Failed to load activity log',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [action, page, resource, debouncedSearch, status])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  return (
    <Layout>
      <Layout.Header sticky>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body>
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[1.75rem] border bg-gradient-to-br from-primary/10 via-background to-muted/30 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <IconActivity className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track user actions, security events, and operational changes.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={loadLogs} disabled={loading}>
                <IconRefresh className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>{total} matching log entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_160px]">
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setPage(1)
                      setSearch(event.target.value)
                    }}
                    placeholder="Search user, resource, path..."
                    className="pl-9"
                  />
                </div>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={action} onChange={(event) => { setPage(1); setAction(event.target.value) }}>
                  {actions.map((item) => <option key={item} value={item}>{item ? formatAction(item) : 'All actions'}</option>)}
                </select>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={resource} onChange={(event) => { setPage(1); setResource(event.target.value) }}>
                  {resources.map((item) => <option key={item} value={item}>{item ? formatAction(item) : 'All resources'}</option>)}
                </select>
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}>
                  {statuses.map((item) => <option key={item} value={item}>{item ? formatAction(item) : 'All statuses'}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Newest actions are shown first</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} / {pages}</span>
                <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((prev) => prev + 1)}>
                  <IconChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center">
                  <IconAlertCircle className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-medium">No activity found</p>
                  <p className="text-xs text-muted-foreground">Try changing filters or perform a new action.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log._id} className="rounded-2xl border p-4 transition-colors hover:bg-muted/30">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{formatAction(log.action)}</Badge>
                            <Badge variant="secondary">{log.resource}</Badge>
                            <Badge variant="outline" className={getStatusClass(log.status)}>{log.status}</Badge>
                          </div>
                          <p className="mt-2 font-semibold">
                            {log.resourceName || `${formatAction(log.action)} ${log.resource}`}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            By {log.userName || 'Unknown'} · {log.userRole?.replace(/_/g, ' ') || '-'}
                          </p>
                          <p className="mt-2 truncate text-xs text-muted-foreground">
                            {log.requestMethod || '-'} {log.requestPath || '-'} · IP {log.ipAddress || '-'}
                          </p>
                          {log.errorMessage && (
                            <p className="mt-2 text-xs text-red-600">{log.errorMessage}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-left text-xs text-muted-foreground lg:text-right">
                          <p>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</p>
                          {log.responseStatusCode ? <p className="mt-1">HTTP {log.responseStatusCode}</p> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout.Body>
    </Layout>
  )
}
