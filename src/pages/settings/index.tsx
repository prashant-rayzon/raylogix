/**
 * Settings Page - Clean Layout
 * ✅ Profile management
 * ✅ Password change
 * ✅ Session management
 * ✅ Privacy settings
 * ✅ Help & Support
 * ✅ Logout
 */

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconBuilding,
  IconCheck,
  IconCopy,
  IconDeviceDesktop,
  IconKey,
  IconLoader2,
  IconLock,
  IconRefresh,
  IconShieldLock,
  IconSparkles,
  IconTrash,
  IconUserCircle,
  IconAlertCircle,
  IconX,
  IconHelp,
  IconLogout,
  IconShield,
} from '@tabler/icons-react'
import { Layout } from '@/components/custom/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/custom/button'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { useAppSelector } from '@/store'
import { logoutUser } from '@/lib/auth'
import { getRoleDisplayName, getUserPermissions } from '@/lib/permissions'
import {
  ActiveSession,
  changePassword,
  getActiveSessions,
  getCompanyProfile,
  getMe,
  logoutAllSessions,
  revokeSession,
  updateCompanySettings,
} from '@/api/services/auth'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSettings, ThemeColor, GlowSystem } from '@/components/settings-provider'

// ===== CONSTANTS =====
const PASSWORD_MIN_LENGTH = 8
const SESSION_OLD_THRESHOLD_DAYS = 30

// ===== UTILITY FUNCTIONS =====
const getCompanyValue = (company: any, keys: string[], fallback = '-') => {
  for (const key of keys) {
    const value = company?.[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value)
    }
  }
  return fallback
}

const getBrowserName = (userAgent?: string) => {
  const ua = userAgent || ''
  if (!ua) return 'Unknown device'
  if (ua.includes('Edg/')) return 'Microsoft Edge'
  if (ua.includes('Chrome/')) return 'Google Chrome'
  if (ua.includes('Firefox/')) return 'Mozilla Firefox'
  if (ua.includes('Safari/')) return 'Safari'
  return 'Browser session'
}

const getSessionAge = (createdAt: string): number => {
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(days)
}

// ===== PASSWORD STRENGTH CHECKER =====
function getPasswordStrength(password: string) {
  const checks = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length

  return {
    checks,
    score,
    level: Math.max(0, Math.min(4, Math.floor((score / 5) * 4))),
    label:
      score === 0 ? 'Too weak' :
        score === 1 ? 'Very weak' :
          score === 2 ? 'Weak' :
            score === 3 ? 'Good' :
              score === 4 ? 'Strong' :
                'Very strong',
    color:
      score <= 1 ? 'bg-red-500' :
        score === 2 ? 'bg-amber-500' :
          score === 3 ? 'bg-blue-500' :
            'bg-green-500',
  }
}

// ===== SKELETON LOADERS =====
function ProfileCardSkeleton() {
  return (
    <Card className="rounded-3xl shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-2xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <Separator />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SessionCardSkeleton() {
  return (
    <div className="rounded-3xl border bg-card p-4 space-y-3">
      <div className="h-5 w-40 bg-muted animate-pulse rounded" />
      <div className="h-4 w-full bg-muted animate-pulse rounded" />
      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
    </div>
  )
}

// ===== COMPONENTS =====

interface DetailRowProps {
  label: string
  value?: string | React.ReactNode
  children?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  copyable?: boolean
}

function DetailRow({ label, value, children, icon: Icon, copyable = false }: DetailRowProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Copied to clipboard' })
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-right text-sm font-semibold text-foreground whitespace-nowrap flex items-center gap-2">
        {children || value || '-'}
        {copyable && value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleCopy(String(value))}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            <IconCopy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ===== SIDEBAR NAVIGATION =====
interface SettingsNavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}

function SettingsSidebar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (value: string) => void }) {
  const navigate = useNavigate()
  
  const navItems: SettingsNavItem[] = [
    { icon: IconUserCircle, label: 'Profile', value: 'profile' },
    { icon: IconSparkles, label: 'Appearance & Locale', value: 'appearance' },
    { icon: IconKey, label: 'Password', value: 'password' },
    { icon: IconDeviceDesktop, label: 'Sessions', value: 'sessions' },
    { icon: IconShield, label: 'Privacy', value: 'privacy' },
    { icon: IconHelp, label: 'Help & Support', value: 'help' },
    { icon: IconLogout, label: 'Logout', value: 'logout' },
  ]

  return (
    <Card className="rounded-3xl shadow-sm">
      <CardContent className="p-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.value
            const isLogout = item.value === 'logout'

            return (
              <button
                key={item.value}
                onClick={() => {
                  if (isLogout) {
                    logoutUser()
                    navigate('/sign-in', { replace: true })
                  } else {
                    onTabChange(item.value)
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  isLogout && 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5 shrink-0',
                  isActive && 'text-primary',
                  isLogout && 'text-red-600'
                )} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const authUser = useAppSelector((state) => (state.auth as any).user)
  const [profile, setProfile] = useState<any>(authUser)
  const [companyProfile, setCompanyProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [deletingOldSessions, setDeletingOldSessions] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const user = profile || authUser
  const permissions = useMemo(() => getUserPermissions(user as any), [user])
  const isTenantUser = !!user?.tenantId
  const displayName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User'
  const roleLabel = user?.role ? getRoleDisplayName(user.role as any) : 'Unknown'
  const companyName = getCompanyValue(companyProfile, ['companyName', 'name', 'businessName'], user?.tenantName || 'Platform')

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    return getPasswordStrength(passwordForm.newPassword)
  }, [passwordForm.newPassword])

  // Old sessions filter
  const oldSessions = useMemo(() => {
    return sessions.filter((s, idx) => {
      const daysOld = getSessionAge(s.createdAt)
      return daysOld > SESSION_OLD_THRESHOLD_DAYS && idx !== 0
    })
  }, [sessions])

  // Get current session (first one or latest)
  const currentSession = useMemo(() => {
    return sessions.length > 0 ? sessions[0] : null
  }, [sessions])

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true)
      const data = await getActiveSessions()
      const sorted = data.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setSessions(sorted)
    } catch (error: any) {
      toast({
        title: 'Failed to load sessions',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const me = await getMe()
      setProfile(me.user)

      if (me.user?.tenantId) {
        try {
          const company = await getCompanyProfile()
          setCompanyProfile(company)
        } catch {
          setCompanyProfile(null)
        }
      }

      await loadSessions()
    } finally {
      setLoading(false)
    }
  }, [loadSessions])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // ===== FORM VALIDATION =====
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }
    if (passwordForm.newPassword.length < PASSWORD_MIN_LENGTH) {
      errors.newPassword = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validatePasswordForm()) {
      return
    }

    try {
      setPasswordSaving(true)
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      toast({
        title: 'Password changed successfully',
        description: 'Please sign in again with your new password.',
      })
      logoutUser()
      navigate('/sign-in', { replace: true })
    } catch (error: any) {
      toast({
        title: 'Failed to change password',
        description: error?.response?.data?.error || error?.message || 'Please check your current password.',
        variant: 'destructive',
      })
      setFormErrors({ submit: error?.response?.data?.error || 'Password change failed' })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId)
      await revokeSession(sessionId)
      setSessions((prev) => prev.filter((session) => session.id !== sessionId))
      toast({ title: 'Session deleted', description: 'That device must sign in again.' })
    } catch (error: any) {
      toast({
        title: 'Failed to delete session',
        description: error?.response?.data?.error || error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setRevokingId(null)
    }
  }

  const handleDeleteOldSessions = async () => {
    if (oldSessions.length === 0) return

    try {
      setDeletingOldSessions(true)
      const deleteCount = oldSessions.length

      for (const session of oldSessions) {
        await revokeSession(session.id)
      }

      setSessions((prev) => prev.filter((s) => !oldSessions.some((old) => old.id === s.id)))
      toast({
        title: `${deleteCount} session${deleteCount !== 1 ? 's' : ''} deleted`,
        description: 'Old sessions have been removed.',
      })
    } catch (error: any) {
      toast({
        title: 'Failed to delete sessions',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeletingOldSessions(false)
    }
  }

  const handleLogoutAll = async () => {
    try {
      await logoutAllSessions()
      toast({ title: 'All sessions deleted', description: 'Please sign in again.' })
      logoutUser()
      navigate('/sign-in', { replace: true })
    } catch (error: any) {
      toast({
        title: 'Failed to delete sessions',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  // ===== RENDER CONTENT BASED ON ACTIVE TAB =====
  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab()
      case 'appearance':
        return renderAppearanceTab()
      case 'password':
        return renderPasswordTab()
      case 'sessions':
        return renderSessionsTab()
      case 'privacy':
        return renderPrivacyTab()
      case 'help':
        return renderHelpTab()
      default:
        return renderProfileTab()
    }
  }

  const renderProfileTab = () => (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          <>
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
          </>
        ) : (
          <>
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconUserCircle className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="rounded-2xl border bg-muted/10 px-4">
                  <DetailRow label="Name" value={displayName} copyable />
                  <DetailRow label="Email" value={user?.email || '-'} copyable />
                  <DetailRow label="Username" value={user?.username || user?.email?.split('@')[0] || '-'} copyable />
                  <DetailRow label="Role">
                    <Badge variant="secondary">{roleLabel}</Badge>
                  </DetailRow>
                  <DetailRow label="Tenant" value={user?.tenantName || user?.tenantId || 'Platform'} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconBuilding className="h-5 w-5" />
                  {isTenantUser ? 'Company Details' : 'Platform Access'}
                </CardTitle>
                <CardDescription>
                  {isTenantUser ? 'Your organization information' : 'Super admin privileges'}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="rounded-2xl border bg-muted/10 px-4">
                  {isTenantUser ? (
                    <>
                      <DetailRow label="Company" value={companyName} copyable />
                      <DetailRow label="Email" value={getCompanyValue(companyProfile, ['email', 'companyEmail'])} copyable />
                      <DetailRow label="Mobile" value={getCompanyValue(companyProfile, ['mobile', 'phone'])} copyable />
                      <DetailRow label="GST No" value={getCompanyValue(companyProfile, ['gstNo', 'gstNumber'])} copyable />
                      <DetailRow label="Status">
                        <Badge variant="outline">{getCompanyValue(companyProfile, ['status'], 'Active')}</Badge>
                      </DetailRow>
                    </>
                  ) : (
                    <>
                      <DetailRow label="Access Level" value="Full Platform Access" />
                      <DetailRow label="Permissions" value="Manage all companies and users" />
                      <div className="py-3 px-4">
                        <Button size="sm" variant="outline" onClick={() => navigate('/companies')}>
                          Manage Companies
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* PERMISSIONS CARD */}
      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconShieldLock className="h-5 w-5" />
            Permissions
          </CardTitle>
          <CardDescription>{permissions.length} permission{permissions.length !== 1 ? 's' : ''} granted</CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <IconShieldLock className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No permissions granted yet</p>
            </div>
          ) : (
            <div className="flex max-h-44 flex-wrap gap-2 overflow-auto pr-1">
              {permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="font-mono text-[11px]">
                  {permission}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderPasswordTab = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconLock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className={cn(
                'relative rounded-lg border transition-colors',
                formErrors.currentPassword ? 'border-red-500 bg-red-50/20' : 'border-input'
              )}>
                <Input
                  id="currentPassword"
                  type="password"
                  className="h-11 border-0 bg-transparent"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))
                    if (formErrors.currentPassword) {
                      setFormErrors(prev => ({ ...prev, currentPassword: '' }))
                    }
                  }}
                />
              </div>
              {formErrors.currentPassword && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <IconAlertCircle className="h-3 w-3" />
                  {formErrors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className={cn(
                'relative rounded-lg border transition-colors',
                formErrors.newPassword ? 'border-red-500 bg-red-50/20' : 'border-input'
              )}>
                <Input
                  id="newPassword"
                  type="password"
                  className="h-11 border-0 bg-transparent"
                  placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))
                    if (formErrors.newPassword) {
                      setFormErrors(prev => ({ ...prev, newPassword: '' }))
                    }
                  }}
                />
              </div>
              {formErrors.newPassword && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <IconAlertCircle className="h-3 w-3" />
                  {formErrors.newPassword}
                </p>
              )}

              {passwordForm.newPassword && (
                <div className="space-y-2 pt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i < passwordStrength.level
                            ? passwordStrength.color
                            : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Strength: <span className={passwordStrength.color}>{passwordStrength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className={cn(
                'relative rounded-lg border transition-colors',
                formErrors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-input'
              )}>
                <Input
                  id="confirmPassword"
                  type="password"
                  className="h-11 border-0 bg-transparent"
                  placeholder="Repeat new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                    if (formErrors.confirmPassword) {
                      setFormErrors(prev => ({ ...prev, confirmPassword: '' }))
                    }
                  }}
                />
                {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && (
                  <IconCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              {formErrors.confirmPassword && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <IconAlertCircle className="h-3 w-3" />
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={passwordSaving} className="h-11">
                {passwordSaving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
              <p className="text-xs text-muted-foreground">You'll be redirected to login after.</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-amber-200 bg-amber-50/70 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 h-fit">
        <CardHeader>
          <CardTitle className="text-base text-amber-900 dark:text-amber-100">Password requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
          <div className="flex gap-2">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Minimum {PASSWORD_MIN_LENGTH} characters</span>
          </div>
          <div className="flex gap-2">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Include uppercase & lowercase letters</span>
          </div>
          <div className="flex gap-2">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Include numbers and special characters</span>
          </div>
          <div className="flex gap-2">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>All sessions will be revoked after update</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSessionsTab = () => (
    <Card className="rounded-3xl shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <IconDeviceDesktop className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active login sessions across devices</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadSessions} disabled={sessionsLoading} className="h-9">
            {sessionsLoading ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconRefresh className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          {oldSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteOldSessions}
              disabled={deletingOldSessions}
              className="h-9 text-amber-600 hover:text-amber-700"
            >
              {deletingOldSessions ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconTrash className="mr-2 h-4 w-4" />
              )}
              Delete Old ({oldSessions.length})
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleLogoutAll} className="h-9">
            <IconX className="mr-2 h-4 w-4" />
            Delete All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <SessionCardSkeleton key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <IconDeviceDesktop className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">No active sessions</p>
            <p className="text-xs text-muted-foreground">You may need to sign in again.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentSession && (
              <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-primary text-primary-foreground">
                    <IconCheck className="mr-1 h-3 w-3" />
                    Current Session
                  </Badge>
                  <span className="text-xs text-muted-foreground">You are here</span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3 flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                      <IconDeviceDesktop className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-primary">{getBrowserName(currentSession.userAgent)}</p>
                        <Badge variant="secondary" className="bg-primary/10">Active Now</Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {currentSession.userAgent || 'No user agent saved'}
                      </p>
                      <Separator className="my-3" />
                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                        <span>IP: {currentSession.ip || '-'}</span>
                        <span>Login: {currentSession.createdAt ? new Date(currentSession.createdAt).toLocaleDateString() : '-'}</span>
                        <span>{getSessionAge(currentSession.createdAt)} day{getSessionAge(currentSession.createdAt) !== 1 ? 's' : ''} old</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-9 self-start sm:self-center" disabled>
                    <IconCheck className="mr-2 h-4 w-4" />
                    Active
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Other Devices ({sessions.length - 1})
              </p>
              {sessions.slice(1).map((session) => {
                const daysOld = getSessionAge(session.createdAt)
                const isOld = daysOld > SESSION_OLD_THRESHOLD_DAYS

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'rounded-3xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/20 hover:bg-muted/20',
                      isOld && 'border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10'
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3 flex-1">
                        <div className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                          isOld ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-muted text-muted-foreground'
                        )}>
                          <IconDeviceDesktop className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{getBrowserName(session.userAgent)}</p>
                            <Badge variant={isOld ? 'outline' : 'secondary'}>
                              {isOld ? `${daysOld} days old` : 'Active'}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {session.userAgent || 'No user agent saved'}
                          </p>
                          <Separator className="my-3" />
                          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                            <span>IP: {session.ip || '-'}</span>
                            <span>Login: {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '-'}</span>
                            <span>{daysOld} day{daysOld !== 1 ? 's' : ''} old</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 h-9 self-start sm:self-center"
                        disabled={revokingId === session.id}
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        {revokingId === session.id ? (
                          <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <IconTrash className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderPrivacyTab = () => (
    <Card className="rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconShield className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>Manage your privacy and data preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <h3 className="font-medium mb-2">Data Privacy</h3>
            <p className="text-sm text-muted-foreground">
              Your data is stored securely and encrypted. You can request data export or deletion at any time.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" size="sm">
                Request Data Export
              </Button>
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <h3 className="font-medium mb-2">Activity Log</h3>
            <p className="text-sm text-muted-foreground">
              View your recent account activity and login history.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/activity-log')}>
              View Activity Log
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderHelpTab = () => (
    <Card className="rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconHelp className="h-5 w-5" />
          Help & Support
        </CardTitle>
        <CardDescription>Get assistance and find helpful resources</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <h3 className="font-medium mb-2">Documentation</h3>
            <p className="text-sm text-muted-foreground">
              Browse our comprehensive documentation and user guides.
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              View Documentation
            </Button>
          </div>
          <div className="rounded-2xl border p-4">
            <h3 className="font-medium mb-2">Contact Support</h3>
            <p className="text-sm text-muted-foreground">
              Need help? Our support team is ready to assist you.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" size="sm">
                Email Support
              </Button>
              <Button variant="outline" size="sm">
                Knowledge Base
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <h3 className="font-medium mb-2">FAQ</h3>
            <p className="text-sm text-muted-foreground">
              Find answers to commonly asked questions.
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              View FAQ
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderAppearanceTab = () => {
    const {
      themeColor,
      setThemeColor,
      glowSystem,
      setGlowSystem,
      lightLogo,
      setLightLogo,
      darkLogo,
      setDarkLogo,
      resetLogos,
    } = useSettings()

    const colors: { name: string; value: ThemeColor; class: string }[] = [
      { name: 'Teal', value: 'teal', class: 'bg-[#005f59]' },
      { name: 'Blue', value: 'blue', class: 'bg-[#3b82f6]' },
      { name: 'Indigo', value: 'indigo', class: 'bg-[#6366f1]' },
      { name: 'Purple', value: 'purple', class: 'bg-[#8b5cf6]' },
      { name: 'Emerald', value: 'emerald', class: 'bg-[#10b981]' },
      { name: 'Orange', value: 'orange', class: 'bg-[#f97316]' },
    ]

    const handleThemeColorSelect = async (color: ThemeColor) => {
      setThemeColor(color)
      try {
        await updateCompanySettings({ themeColor: color })
        toast({ title: 'Theme color saved to database' })
      } catch (err: any) {
        toast({ title: 'Failed to save to database', description: err?.response?.data?.error || err.message, variant: 'destructive' })
      }
    }

    const handleGlowSystemSelect = async (glow: GlowSystem) => {
      setGlowSystem(glow)
      try {
        await updateCompanySettings({ glowSystem: glow })
        toast({ title: 'Glow preference saved to database' })
      } catch (err: any) {
        toast({ title: 'Failed to save to database', description: err?.response?.data?.error || err.message, variant: 'destructive' })
      }
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark') => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file type', description: 'Please select an image file.', variant: 'destructive' })
        return
      }

      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        try {
          if (type === 'light') {
            setLightLogo(base64)
            await updateCompanySettings({ lightLogo: base64 })
            toast({ title: 'Light logo saved to database' })
          } else {
            setDarkLogo(base64)
            await updateCompanySettings({ darkLogo: base64 })
            toast({ title: 'Dark logo saved to database' })
          }
        } catch (err: any) {
          toast({ title: 'Failed to save logo to database', description: err?.response?.data?.error || err.message, variant: 'destructive' })
        }
      }
      reader.readAsDataURL(file)
    }

    const handleResetLogos = async () => {
      resetLogos()
      try {
        await updateCompanySettings({
          lightLogo: '/images/logo.png',
          darkLogo: '/images/logo.png'
        })
        toast({ title: 'Branding logos reset to default in database' })
      } catch (err: any) {
        toast({ title: 'Failed to reset logos in database', description: err?.response?.data?.error || err.message, variant: 'destructive' })
      }
    }

    return (
      <div className="space-y-6">
        {/* Theme Color Card */}
        <Card className="rounded-3xl shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSparkles className="h-5 w-5 text-primary animate-pulse" />
              Theme Accent Color
            </CardTitle>
            <CardDescription>
              Select the primary accent color for your workspace. This changes buttons, active links, and glows.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {colors.map((color) => {
                const isSelected = themeColor === color.value
                return (
                  <button
                    key={color.value}
                    onClick={() => handleThemeColorSelect(color.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all relative hover:scale-105 active:scale-95 duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-muted bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <div className={cn("h-10 w-10 rounded-full mb-2 shadow-inner", color.class)} />
                    <span className="text-sm font-semibold">{color.name}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                        <IconCheck className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* System Logo Customization Card */}
        <Card className="rounded-3xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconBuilding className="h-5 w-5 text-primary" />
                System Logo Customization
              </CardTitle>
              <CardDescription>
                Upload and configure the branding logos for Light and Dark themes.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetLogos}>
              Reset to Defaults
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Light Theme Logo */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">Light Theme Logo</Label>
                <div className="border border-dashed rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors h-48 relative">
                  <div className="h-16 w-full flex items-center justify-center mb-4 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                    <img src={lightLogo || '/images/logo.png'} alt="Light Logo Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'light')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="light-logo-input"
                  />
                  <span className="text-xs text-muted-foreground text-center">
                    Drag and drop or click to upload Light Mode logo
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    Supports PNG, JPG, SVG, WebP
                  </span>
                </div>
              </div>

              {/* Dark Theme Logo */}
              <div className="space-y-3">
                <Label className="font-semibold text-sm">Dark Theme Logo</Label>
                <div className="border border-dashed border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-900/60 hover:bg-slate-900/80 transition-colors h-48 relative">
                  <div className="h-16 w-full flex items-center justify-center mb-4 p-2 bg-slate-950 rounded-lg shadow-sm border border-slate-800">
                    <img src={darkLogo || '/images/logo.png'} alt="Dark Logo Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'dark')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="dark-logo-input"
                  />
                  <span className="text-xs text-slate-400 text-center">
                    Drag and drop or click to upload Dark Mode logo
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Supports PNG, JPG, SVG, WebP
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
        <div className="mx-auto max-w-7xl space-y-6">
          {/* HEADER */}
          <div className="overflow-hidden rounded-[1.75rem] shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <IconSparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <Badge variant="secondary">{roleLabel}</Badge>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Manage your account settings and preferences
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN LAYOUT */}
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* SIDEBAR */}
            <div className="lg:w-64 flex-shrink-0">
              <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* CONTENT */}
            <div className="flex-1 min-w-0">
              {renderContent()}
            </div>
          </div>
        </div>
      </Layout.Body>
    </Layout>
  )
}
