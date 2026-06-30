import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBuilding, IconLoader2, IconPlus, IconRefresh } from '@tabler/icons-react'
import { Layout } from '@/components/custom/layout'
import { Button } from '@/components/custom/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { companiesService } from '@/api/services/companies/companies.service'
import type { Company } from '@/api/types'
import { toast } from '@/components/ui/use-toast'

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const response = await companiesService.list({ limit: 100 })
      setCompanies(response.data || [])
    } catch (error: any) {
      toast({
        title: 'Failed to load companies',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const handleToggle = async (company: Company) => {
    try {
      setTogglingId(company._id)
      const updated = await companiesService.toggle(company._id)
      setCompanies((prev) =>
        prev.map((item) => (item._id === company._id ? { ...item, ...updated } : item))
      )
      toast({
        title: updated.isActive ? 'Company activated' : 'Company disabled',
        description: `${updated.name} status updated.`,
      })
    } catch (error: any) {
      toast({
        title: 'Failed to update company',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <Layout>
      <Layout.Header sticky>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Super Admin Panel</h1>
              <p className="text-sm text-muted-foreground">
                Add companies and monitor every tenant from one place.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadCompanies} disabled={loading}>
                <IconRefresh className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button asChild>
                <Link to="/companies/create">
                  <IconPlus className="mr-2 h-4 w-4" />
                  Add Company
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Companies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companies.length}</div>
                <p className="text-xs text-muted-foreground">Total tenants</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {companies.filter((company) => company.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">Running companies</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {companies.reduce((sum, company) => sum + (company.userCount || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">Across tenants</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
              <CardDescription>Tenant accounts available to this platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading companies...
                </div>
              ) : companies.length === 0 ? (
                <div className="rounded-xl border border-dashed py-12 text-center">
                  <IconBuilding className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-medium">No companies yet</p>
                  <p className="text-xs text-muted-foreground">Create your first company to start.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  <div className="grid grid-cols-12 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                    <span className="col-span-4">Company</span>
                    <span className="col-span-2">Subdomain</span>
                    <span className="col-span-2">Plan</span>
                    <span className="col-span-2">Users</span>
                    <span className="col-span-2 text-right">Action</span>
                  </div>
                  {companies.map((company) => (
                    <div
                      key={company._id}
                      className="grid grid-cols-12 items-center border-b px-4 py-3 text-sm last:border-b-0"
                    >
                      <div className="col-span-4 min-w-0">
                        <p className="truncate font-medium">{company.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{company._id}</p>
                      </div>
                      <span className="col-span-2 truncate">{company.subdomain}</span>
                      <span className="col-span-2">
                        <Badge variant="outline">{(company as any).plan || 'free'}</Badge>
                      </span>
                      <span className="col-span-2">{company.userCount || 0}</span>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Badge variant={company.isActive ? 'default' : 'secondary'}>
                          {company.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={togglingId === company._id}
                          onClick={() => handleToggle(company)}
                        >
                          {togglingId === company._id ? 'Saving...' : company.isActive ? 'Disable' : 'Activate'}
                        </Button>
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
