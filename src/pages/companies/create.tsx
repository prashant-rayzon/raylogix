import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconBuilding, IconLoader2 } from '@tabler/icons-react'
import { Layout } from '@/components/custom/layout'
import { Button } from '@/components/custom/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { companiesService } from '@/api/services/companies/companies.service'
import { toast } from '@/components/ui/use-toast'

export default function CreateCompanyPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: '',
    plan: 'free' as 'free' | 'pro' | 'enterprise',
    maxUsers: 5,
  })

  const updateField = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.companyName.trim() || !form.subdomain.trim() || !form.adminEmail.trim() || !form.adminPassword) {
      toast({
        title: 'Missing details',
        description: 'Company name, subdomain, admin email, and password are required.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      await companiesService.create({
        ...form,
        companyName: form.companyName.trim(),
        subdomain: form.subdomain.trim().toLowerCase(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
      })
      toast({
        title: 'Company created',
        description: `${form.companyName} is ready. Admin can now sign in from the company subdomain.`,
      })
      navigate('/companies')
    } catch (error: any) {
      toast({
        title: 'Failed to create company',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
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
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Add Company</h1>
              <p className="text-sm text-muted-foreground">
                Create a tenant and its first company admin.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/companies">
                <IconArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconBuilding className="h-5 w-5" />
                Company details
              </CardTitle>
              <CardDescription>
                The subdomain is used for company-specific login and data isolation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Company name</span>
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary"
                      value={form.companyName}
                      onChange={(event) => updateField('companyName', event.target.value)}
                      placeholder="Tech Logistics Pvt Ltd"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Subdomain</span>
                    <input
                      className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary"
                      value={form.subdomain}
                      onChange={(event) => updateField('subdomain', event.target.value)}
                      placeholder="tech-logistics"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Admin email</span>
                    <input
                      type="email"
                      className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary"
                      value={form.adminEmail}
                      onChange={(event) => updateField('adminEmail', event.target.value)}
                      placeholder="admin@company.com"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Admin password</span>
                    <input
                      type="password"
                      className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary"
                      value={form.adminPassword}
                      onChange={(event) => updateField('adminPassword', event.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Plan</span>
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary"
                      value={form.plan}
                      onChange={(event) => updateField('plan', event.target.value)}
                    >
                      <option value="free">Free</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Max users</span>
                    <input
                      type="number"
                      min={1}
                      className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary"
                      value={form.maxUsers}
                      onChange={(event) => updateField('maxUsers', Number(event.target.value))}
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button asChild type="button" variant="outline">
                    <Link to="/companies">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Company
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout.Body>
    </Layout>
  )
}
