import { useCallback, useEffect, useState } from 'react'
import {
  IconCategory,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react'
import { Layout } from '@/components/custom/layout'
import { Button } from '@/components/custom/button'
import { LoaderIcon, SectionLoader } from '@/components/loader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { toast } from '@/components/ui/use-toast'
import { masterGroupsService } from '@/api/services/master-groups/master-groups.service'
import type { MasterGroup, PaginationResponse } from '@/api/types'

const slugifyCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

import { useForm } from 'react-hook-form'

const emptyForm = {
  name: '',
}

export default function MasterGroupsPage() {
  const [masterGroups, setMasterGroups] = useState<MasterGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationResponse<MasterGroup>['pagination']>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const form = useForm<typeof emptyForm>({
    defaultValues: emptyForm,
  })

  const loadMasterGroups = useCallback(async () => {
    try {
      setLoading(true)
      const response = await masterGroupsService.list({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch.trim() || undefined,
      })
      setMasterGroups(response.data)
      setPagination(response.pagination)
    } catch (error: any) {
      toast({
        title: 'Failed to load master groups',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch])

  useEffect(() => {
    loadMasterGroups()
  }, [loadMasterGroups])

  const handleSubmit = async (values: typeof emptyForm) => {
    if (!values.name.trim()) {
      toast({
        title: 'Missing details',
        description: 'Group name is required.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await masterGroupsService.update(editingId, {
          name: values.name.trim(),
          code: slugifyCode(values.name),
          description: '',
        })
        toast({ title: 'Master group updated' })
      } else {
        await masterGroupsService.create({
          name: values.name.trim(),
          code: slugifyCode(values.name),
          description: '',
        })
        toast({ title: 'Master group created' })
      }
      form.reset(emptyForm)
      setEditingId(null)
      setPagination((prev) => ({ ...prev, page: 1 }))
      await loadMasterGroups()
    } catch (error: any) {
      toast({
        title: `Failed to ${editingId ? 'update' : 'create'} master group`,
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: MasterGroup) => {
    setEditingId(item._id)
    form.reset({
      name: item.name || '',
    })
  }

  const handleDelete = async (item: MasterGroup) => {
    if (!window.confirm(`Delete master group "${item.name}"?`)) return

    try {
      setDeletingId(item._id)
      await masterGroupsService.delete(item._id)
      if (editingId === item._id) {
        setEditingId(null)
        form.reset(emptyForm)
      }
      toast({ title: 'Master group deleted' })
      await loadMasterGroups()
    } catch (error: any) {
      toast({
        title: 'Failed to delete master group',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (item: MasterGroup) => {
    try {
      setTogglingId(item._id)
      const updated = await masterGroupsService.toggle(item._id)
      setMasterGroups((prev) => prev.map((group) => (group._id === updated._id ? { ...group, ...updated } : group)))
    } catch (error: any) {
      toast({
        title: 'Failed to update master group',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const startItem = masterGroups.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)
  const groupName = form.watch('name')

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
              <h1 className="text-2xl font-bold tracking-tight">Master Groups</h1>
              <p className="text-sm text-muted-foreground">
                Create and manage the top-level groups used across your master data.
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingId ? <IconEdit className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
                {editingId ? 'Edit Master Group' : 'Create Master Group'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Update the group name below.' : 'Enter the group name. Code will be created automatically.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Group name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input id="master-group-name" placeholder="Vehicle Type" {...field} />
                        </FormControl>
                        <FormDescription>
                          The system will generate a clean group code from this name automatically.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Auto code preview: <span className="font-mono text-slate-700">{slugifyCode(groupName) || 'GROUP_CODE'}</span>
                  </div>
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingId ? 'Save Changes' : 'Create Group'}
                  </Button>
                  {editingId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setEditingId(null)
                        form.reset(emptyForm)
                      }}
                    >
                      Cancel Edit
                    </Button>
                  ) : null}
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-4">
              <div>
                <CardTitle>All Master Groups</CardTitle>
                <CardDescription>Search, review, and activate the groups used by your masters.</CardDescription>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name, code, or description"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="whitespace-nowrap text-muted-foreground">Rows per page</span>
                  <Select
                    value={String(pagination.limit)}
                    onValueChange={(value) =>
                      setPagination((prev) => ({
                        ...prev,
                        page: 1,
                        limit: Number(value),
                      }))
                    }
                  >
                    <SelectTrigger className="w-[88px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <SectionLoader className="rounded-xl border border-dashed" label="Loading master groups..." />
              ) : masterGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed py-12 text-center">
                  <IconCategory className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm font-medium">No master groups found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Create your first group to start organizing masters.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  <div className="overflow-x-auto">
                    <table className="min-w-[860px] w-full text-sm">
                      <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Masters</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {masterGroups.map((item) => (
                          <tr key={item._id} className="border-t align-top">
                            <td className="px-4 py-3">
                              <div className="min-w-0">
                                <p className="font-medium">{item.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{item._id}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-mono text-xs">
                                {item.code}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{item.description || '—'}</td>
                            <td className="px-4 py-3 font-medium">{item.masterCount || 0}</td>
                            <td className="px-4 py-3">
                              <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                                  <IconEdit className="mr-1 h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={deletingId === item._id}
                                  onClick={() => void handleDelete(item)}
                                >
                                  {deletingId === item._id ? (
                                    <><LoaderIcon className="mr-2" />Deleting...</>
                                  ) : (
                                    <>
                                      <IconTrash className="mr-1 h-4 w-4" />
                                      Delete
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={togglingId === item._id}
                                  onClick={() => handleToggle(item)}
                                >
                                  {togglingId === item._id ? <><LoaderIcon className="mr-2" />Saving...</> : item.status === 'active' ? 'Disable' : 'Activate'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">
                  Showing {startItem} to {endItem} of {pagination.total}
                </span>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[110px] text-center">
                    Page {pagination.page} of {Math.max(pagination.pages, 1)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= Math.max(pagination.pages, 1) || loading}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </Layout.Body>
    </Layout>
  )
}
