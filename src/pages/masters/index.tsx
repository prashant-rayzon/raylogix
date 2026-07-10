import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconListDetails,
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
import { mastersService } from '@/api/services/masters/masters.service'
import { masterGroupsService } from '@/api/services/master-groups/master-groups.service'
import type { Master, MasterGroup, PaginationResponse } from '@/api/types'
import { useForm } from 'react-hook-form'

const slugifyCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)

const emptyForm = {
  groupId: '',
  name: '',
}

export default function MastersPage() {
  const [masters, setMasters] = useState<Master[]>([])
  const [masterGroups, setMasterGroups] = useState<MasterGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all')
  const [pagination, setPagination] = useState<PaginationResponse<Master>['pagination']>({
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

  // Load static master groups once on mount
  useEffect(() => {
    const loadMasterGroups = async () => {
      try {
        const groupsData = await masterGroupsService.list({ limit: 100 })
        setMasterGroups(groupsData.data || [])
        if (!form.getValues('groupId') && groupsData.data?.[0]?._id) {
          form.setValue('groupId', groupsData.data[0]._id)
        }
      } catch (error) {
        console.error('Failed to load master groups:', error)
      }
    }
    loadMasterGroups()
  }, [form])

  const activeGroups = useMemo(
    () => masterGroups.filter((group) => group.status === 'active'),
    [masterGroups]
  )

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const mastersData = await mastersService.list({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch.trim() || undefined,
        groupId: selectedGroupFilter === 'all' ? undefined : selectedGroupFilter,
      })
      setMasters(mastersData.data || [])
      setPagination(mastersData.pagination)
    } catch (error: any) {
      toast({
        title: 'Failed to load masters',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, debouncedSearch, selectedGroupFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = async (values: typeof emptyForm) => {
    if (!values.groupId || !values.name.trim()) {
      toast({
        title: 'Missing details',
        description: 'Master group and master name are required.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        await mastersService.update(editingId, {
          groupId: values.groupId,
          name: values.name.trim(),
          code: slugifyCode(values.name),
          value: values.name.trim(),
          description: '',
        })
        toast({ title: 'Master updated' })
      } else {
        await mastersService.create({
          groupId: values.groupId,
          name: values.name.trim(),
          code: slugifyCode(values.name),
          value: values.name.trim(),
          description: '',
        })
        toast({ title: 'Master created' })
      }
      form.reset({ ...emptyForm, groupId: values.groupId })
      setEditingId(null)
      setPagination((prev) => ({ ...prev, page: 1 }))
      await loadData()
    } catch (error: any) {
      toast({
        title: `Failed to ${editingId ? 'update' : 'create'} master`,
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: Master) => {
    const group = typeof item.groupId === 'string' ? item.groupId : item.groupId?._id || ''
    setEditingId(item._id)
    form.reset({
      groupId: group,
      name: item.name || '',
    })
  }

  const handleDelete = async (item: Master) => {
    if (!window.confirm(`Delete master "${item.name}"?`)) return

    try {
      setDeletingId(item._id)
      await mastersService.delete(item._id)
      if (editingId === item._id) {
        setEditingId(null)
        form.reset({ ...emptyForm, groupId: form.getValues('groupId') })
      }
      toast({ title: 'Master deleted' })
      await loadData()
    } catch (error: any) {
      toast({
        title: 'Failed to delete master',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (item: Master) => {
    try {
      setTogglingId(item._id)
      const updated = await mastersService.toggle(item._id)
      setMasters((prev) => prev.map((master) => (master._id === updated._id ? { ...master, ...updated } : master)))
    } catch (error: any) {
      toast({
        title: 'Failed to update master',
        description: error?.response?.data?.message || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const startItem = masters.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total)
  const currentGroupId = form.watch('groupId')
  const currentMasterName = form.watch('name')

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
                <h1 className="text-2xl font-bold tracking-tight">Masters</h1>
                <p className="text-sm text-muted-foreground">
                  Add and manage master values grouped under your active master groups.
                </p>
              </div>
            </div>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingId ? <IconEdit className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
                  {editingId ? 'Edit Master' : 'Create Master'}
                </CardTitle>
                <CardDescription>
                  Use your active master groups and keep master names standardized for downstream load forms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
                    <FormField
                      control={form.control}
                      name="groupId"
                      rules={{ required: 'Master group is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Master Group</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeGroups.map((group) => (
                                <SelectItem key={group._id} value={group._id}>
                                  {group.name} ({group.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Only active groups are available for new masters.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: 'Master name is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Master Name</FormLabel>
                          <FormControl>
                            <Input id="master-name" placeholder="40 Ft. Trailer" {...field} />
                          </FormControl>
                          <FormDescription>
                            Code preview: <span className="font-mono text-slate-700">{slugifyCode(currentMasterName) || 'MASTER_CODE'}</span>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={saving} className="w-full">
                      {saving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingId ? 'Save Changes' : 'Create Master'}
                    </Button>
                    {editingId ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setEditingId(null)
                          form.reset({ ...emptyForm, groupId: currentGroupId || activeGroups[0]?._id || '' })
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
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="relative ">
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search by name, code, value, or description"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value)
                        setPagination((prev) => ({ ...prev, page: 1 }))
                      }}
                    />
                  </div>
                  <Select
                    value={selectedGroupFilter}
                    onValueChange={(value) => {
                      setSelectedGroupFilter(value)
                      setPagination((prev) => ({ ...prev, page: 1 }))
                    }}
                  >
                    <SelectTrigger className="min-w-[100px]">
                      <SelectValue placeholder="All groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All groups</SelectItem>
                      {masterGroups.map((group) => (
                        <SelectItem key={group._id} value={group._id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <SectionLoader className="rounded-xl border border-dashed" label="Loading masters..." />
                ) : masters.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-12 text-center">
                    <IconListDetails className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <p className="mt-2 text-sm font-medium">No masters found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Create a record or adjust the current filters.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="overflow-x-auto">
                      <table className="min-w-[980px] w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Group</th>
                            <th className="px-4 py-3">Value</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {masters.map((item) => {
                            const group = typeof item.groupId === 'string' ? null : item.groupId
                            return (
                              <tr key={item._id} className="border-t align-top">
                                <td className="px-4 py-3 font-medium">{item.name}</td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {item.code}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">{group?.name || '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.value || '—'}</td>
                                <td className="px-4 py-3 text-muted-foreground">{item.description || '—'}</td>
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
                            )
                          })}
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
