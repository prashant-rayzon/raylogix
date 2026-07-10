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
import { getApiErrorMessage } from '@/lib/api-error'
import { load as loadApi } from '@/api/services'
import type { Load } from '@/api/services/load/loads.service'
import { DateTimePicker } from '@/components/ui/date-time-picker'

const schema = z.object({
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  tat: z.string().optional(),
  notes: z.string().optional(),
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

function parseTatDays(tatValue?: string) {
  const normalizedTat = tatValue?.trim()
  if (!normalizedTat) return null
  const tatDays = Number(normalizedTat)
  if (!Number.isFinite(tatDays) || tatDays <= 0) return null
  return tatDays
}

function getCurrentDatetimeLocal() {
  const now = new Date()
  const tzOffsetMs = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

function calculateDeliveryDatetimeLocal(pickupDate?: string, tatValue?: string) {
  if (!pickupDate) return ''
  const tatDays = parseTatDays(tatValue)
  if (!tatDays) return ''
  const pickup = new Date(pickupDate)
  if (Number.isNaN(pickup.getTime())) return ''
  return new Date(pickup.getTime() + tatDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
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
      tat: '',
      notes: '',
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
          tat: String((res.data.load as any).tat || ''),
          notes: (res.data.load as any).notes || '',
        })
      } catch (e: any) {
        if (!mounted) return
        setError(getApiErrorMessage(e, 'Failed to load'))
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
    return (role === 'company_admin' || role === 'company_user') && load.status === 'open'
  }, [load, role])

  const pickupDate = form.watch('pickupDate')
  const tat = form.watch('tat')

  useEffect(() => {
    const deliveryDate = calculateDeliveryDatetimeLocal(pickupDate, tat)
    form.setValue('deliveryDate', deliveryDate, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    })
  }, [form, pickupDate, tat])

  const onSubmit = async (data: FormData) => {
    if (!id) return
    try {
      if (!data.pickupDate) {
        toast({ title: 'Validation Error', description: 'Loading date is required', variant: 'destructive' })
        return
      }
      if (new Date(data.pickupDate).getTime() < Date.now()) {
        toast({ title: 'Validation Error', description: 'Loading date cannot be in the past', variant: 'destructive' })
        return
      }
      if (!data.tat?.trim()) {
        toast({ title: 'Validation Error', description: 'TAT (Days) is required', variant: 'destructive' })
        return
      }
      if (!parseTatDays(data.tat)) {
        toast({ title: 'Validation Error', description: 'TAT (Days) must be greater than 0', variant: 'destructive' })
        return
      }

      const calculatedDeliveryDate = calculateDeliveryDatetimeLocal(data.pickupDate, data.tat)
      if (!calculatedDeliveryDate) {
        toast({ title: 'Validation Error', description: 'Delivery date could not be calculated from Loading Date and TAT', variant: 'destructive' })
        return
      }

      setLoading(true)
      const payload: any = {
        tat: data.tat.trim(),
        deliveryDate: new Date(calculatedDeliveryDate).toISOString(),
        notes: data.notes || undefined,
      }

      if (data.pickupDate) payload.pickupDate = new Date(data.pickupDate).toISOString()

      await loadApi.updateLoad(id, payload)
      toast({ title: 'Load updated', description: 'Changes saved successfully.' })
      navigate('/load')
    } catch (e: any) {
      toast({ title: 'Update failed', description: getApiErrorMessage(e, 'Unknown error'), variant: 'destructive' })
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
                  Edit is restricted. Only company-side users can edit loads while status is <span className="font-medium">open</span>.
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="pickupDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loading Date</FormLabel>
                          <FormControl>
                            <DateTimePicker
                              value={field.value}
                              onChange={field.onChange}
                              min={getCurrentDatetimeLocal()}
                              disabled={!canEdit || loading}
                              placeholder="Select loading date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TAT (Days)</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} step={1} {...field} disabled={!canEdit || loading} />
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

