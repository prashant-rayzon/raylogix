import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Loader2, Truck } from 'lucide-react'

import { Layout } from '@/components/custom/layout'
import { Button } from '@/components/custom/button'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

import { getAuthStore } from '@/lib/auth'
import { load as loadApi } from '@/api/services'
import type { Load } from '@/api/services/load/loads.service'

const schema = z.object({
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  specialRequirements: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
})

type FormData = z.infer<typeof schema>

function toDatetimeLocal(v?: string | Date | null) {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export default function EditLoad() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [load, setLoad] = useState<Load | null>(null)
  const [error, setError] = useState<string | null>(null)

  const auth = getAuthStore()
  const role = auth?.user?.role

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      pickupDate: '',
      deliveryDate: '',
      specialRequirements: '',
      notes: '',
      priority: undefined,
    },
  })

  useEffect(() => {
    let mounted = true
    async function run() {
      if (!id) return
      try {
        setLoading(true)
        setError(null)
        const res = await loadApi.getLoad(id)
        if (!mounted) return
        setLoad(res.data.load)
        form.reset({
          pickupDate: toDatetimeLocal(res.data.load.pickupDate),
          deliveryDate: toDatetimeLocal(res.data.load.deliveryDate),
          specialRequirements: (res.data.load as any).specialRequirements || '',
          notes: (res.data.load as any).notes || '',
          priority: (res.data.load as any).priority,
        })
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Failed to load')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const canEdit = useMemo(() => {
    if (!load) return false
    // backend allows update only if Load.status === 'open'
    return role === 'company_admin' && load.status === 'open'
  }, [load, role])

  const onSubmit = async (data: FormData) => {
    if (!id) return
    try {
      setLoading(true)
      const payload: any = {
        specialRequirements: data.specialRequirements || undefined,
        notes: data.notes || undefined,
        priority: data.priority || undefined,
      }

      if (data.pickupDate) payload.pickupDate = new Date(data.pickupDate).toISOString()
      if (data.deliveryDate) payload.deliveryDate = new Date(data.deliveryDate).toISOString()

      await loadApi.updateLoad(id, payload)
      toast({ title: 'Load updated', description: 'Changes saved successfully.' })
      navigate('/load')
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !load) {
    return (
      <Layout>
        <Layout.Header>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading load...</span>
            </div>
          </div>
        </Layout.Header>
        <Layout.Body>
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </Layout.Body>
      </Layout>
    )
  }

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/load')} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Edit Load</h1>
            <p className="text-sm text-muted-foreground">Update details (only when status is open)</p>
          </div>
        </div>
      </Layout.Header>

      <Layout.Body>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-destructive">{error}</div>
        )}

        {load && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Load details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!canEdit && (
                <div className="mb-4 text-sm text-muted-foreground">
                  Edit is restricted. Only <span className="font-medium">company_admin</span> can edit loads while status is <span className="font-medium">open</span>.
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pickupDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} disabled={!canEdit || loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Date & Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} disabled={!canEdit || loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!canEdit || loading} placeholder="low/medium/high/urgent" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="specialRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requirements</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!canEdit || loading} placeholder="Any special requirements" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={!canEdit || loading} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => navigate('/load')} disabled={loading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!canEdit || loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </Layout.Body>
    </Layout>
  )
}

