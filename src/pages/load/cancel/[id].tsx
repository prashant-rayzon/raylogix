import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'

import { Layout } from '@/components/custom/layout'
import { Button } from '@/components/custom/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

import { getAuthStore } from '@/lib/auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { load as loadApi } from '@/api/services'
import { hasPermission, ALL_PERMISSIONS } from '@/lib/permissions'
import type { Load } from '@/api/services/load/loads.service'

export default function CancelLoad() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [load, setLoad] = useState<Load | null>(null)
  const [error, setError] = useState<string | null>(null)

  const auth = getAuthStore()
  const user = auth?.user

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        if (!id) return
        setLoading(true)
        setError(null)
        const res = await loadApi.getLoad(id)
        if (!mounted) return
        setLoad(res.data.load)
      } catch (e: any) {
        if (!mounted) return
        setError(getApiErrorMessage(e, 'Failed to load'))
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [id])

  const canCancel = useMemo(() => {
    return Boolean(user && hasPermission(user, ALL_PERMISSIONS.LOAD_DELETE) && load?.status === 'open')
  }, [user, load?.status])

  const handleCancelLoad = async () => {
    if (!id) return
    try {
      setLoading(true)
      await loadApi.deleteLoad(id)
      toast({ title: 'Load canceled', description: 'Load and related bids updated.' })
      navigate('/load')
    } catch (e: any) {
      toast({
        title: 'Cancel failed',
        description: getApiErrorMessage(e, 'Unknown error'),
        variant: 'destructive',
      })
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
            <h1 className="text-2xl font-semibold">Cancel Load</h1>
            <p className="text-sm text-muted-foreground">Only open loads with cancel permission can be canceled.</p>
          </div>
        </div>
      </Layout.Header>

      <Layout.Body>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Confirm cancellation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {load && (
              <div className="text-sm text-muted-foreground">
                Load <span className="font-medium text-foreground">{load.loadNumber}</span> will be set to <span className="font-medium text-foreground">canceled</span>.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => navigate('/load')} disabled={loading}>
                Never mind
              </Button>
              <Button variant="destructive" onClick={handleCancelLoad} disabled={!canCancel || loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Canceling...
                  </>
                ) : (
                  'Cancel Load'
                )}
              </Button>
            </div>

            {!canCancel && (
              <div className="text-xs text-muted-foreground">
                Cancellation restricted. Need <span className="font-medium">{ALL_PERMISSIONS.LOAD_DELETE}</span> permission and load status <span className="font-medium">open</span>.
              </div>
            )}
          </CardContent>
        </Card>
      </Layout.Body>
    </Layout>
  )
}

