'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore, useAppStore } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LayoutDashboard, MessageSquare, FileText, Wrench, Settings,
  LogOut, Plus, Clock, CheckCircle, AlertTriangle, DollarSign,
  Package, ChevronRight, Phone, Mail, MapPin, Building2
} from 'lucide-react'
import { toast } from 'sonner'

type PortalView = 'dashboard' | 'complaints' | 'new-complaint' | 'invoices' | 'work-orders' | 'equipment' | 'profile'

const NAV_ITEMS: { id: PortalView; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'complaints', label: 'Complaints', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'invoices', label: 'Invoices', icon: <FileText className="h-4 w-4" /> },
  { id: 'work-orders', label: 'Work Orders', icon: <Wrench className="h-4 w-4" /> },
  { id: 'equipment', label: 'Equipment', icon: <Package className="h-4 w-4" /> },
  { id: 'profile', label: 'Profile', icon: <Settings className="h-4 w-4" /> },
]

function SecureFetch() {
  const token = useAuthStore(s => s.token)
  return useCallback(async (url: string, opts: RequestInit = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...opts.headers,
      },
    })
    if (res.status === 401) {
      useAuthStore.getState().secureLogout('Session expired. Please login again.')
      throw new Error('Unauthorized')
    }
    return res
  }, [token])
}

/* ─── Stat Card ─── */
function StatCard({ title, value, icon, color, onClick }: {
  title: string; value: string | number; icon: React.ReactNode; color: string; onClick?: () => void
}) {
  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`} onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{title}</div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─── Dashboard Home ─── */
function DashboardHome({ onNavigate }: { onNavigate: (v: PortalView) => void }) {
  const user = useAuthStore(s => s.user)
  const fetch = SecureFetch()
  const [stats, setStats] = useState({ complaints: 0, workOrders: 0, invoices: 0, invoiceTotal: 0, equipment: 0 })
  const [recent, setRecent] = useState<Array<{ id: string; title: string; status: string; type: string; createdAt: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [compRes, woRes, invRes] = await Promise.allSettled([
          fetch('/api/complaints?page=1&pageSize=5'),
          fetch('/api/work-orders?page=1&pageSize=5'),
          fetch('/api/invoices?page=1&pageSize=5'),
        ])
        const comps = compRes.status === 'fulfilled' && compRes.value.ok ? await compRes.value.json() : { data: [], total: 0 }
        const wos = woRes.status === 'fulfilled' && woRes.value.ok ? await woRes.value.json() : { data: [], total: 0 }
        const invs = invRes.status === 'fulfilled' && invRes.value.ok ? await invRes.value.json() : { data: [], total: 0 }

        const openComps = (comps.data || []).filter((c: { status: string }) => !['CLOSED', 'PAID'].includes(c.status))
        const openWos = (wos.data || []).filter((w: { status: string }) => w.status === 'PENDING' || w.status === 'IN_PROGRESS')
        const pendingInvs = (invs.data || []).filter((i: { status: string }) => ['PENDING', 'APPROVED', 'OVERDUE'].includes(i.status))

        setStats({
          complaints: openComps.length,
          workOrders: openWos.length,
          invoices: pendingInvs.length,
          invoiceTotal: pendingInvs.reduce((s: number, i: { total: number }) => s + (i.total || 0), 0),
          equipment: comps.total || 0,
        })

        const combined = [
          ...(comps.data || []).map((c: { id: string; title: string; status: string; createdAt: string }) => ({ ...c, type: 'complaint' })),
          ...(wos.data || []).map((w: { id: string; title: string; status: string; createdAt: string }) => ({ ...w, type: 'work-order' })),
        ].sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
        setRecent(combined)
      } catch { /* use defaults */ }
      setLoading(false)
    }
    load()
  }, [fetch])

  const firstName = user?.name?.split(' ')[0] || 'Customer'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome, {firstName}</h2>
        <p className="text-muted-foreground">Your facility maintenance overview</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active Complaints" value={stats.complaints} icon={<AlertTriangle className="h-5 w-5 text-white" />} color="bg-amber-500" onClick={() => onNavigate('complaints')} />
          <StatCard title="Open Work Orders" value={stats.workOrders} icon={<Wrench className="h-5 w-5 text-white" />} color="bg-blue-500" onClick={() => onNavigate('work-orders')} />
          <StatCard title="Pending Invoices" value={stats.invoices} icon={<FileText className="h-5 w-5 text-white" />} color="bg-orange-500" onClick={() => onNavigate('invoices')} />
          <StatCard title="Total Due" value={`B$${stats.invoiceTotal.toLocaleString()}`} icon={<DollarSign className="h-5 w-5 text-white" />} color="bg-emerald-500" />
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => onNavigate('new-complaint')} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> New Complaint
        </Button>
        <Button variant="outline" onClick={() => onNavigate('complaints')}>
          <MessageSquare className="h-4 w-4 mr-2" /> View All Complaints
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {recent.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => onNavigate(item.type === 'complaint' ? 'complaints' : 'work-orders')}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${item.type === 'complaint' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {item.type === 'complaint' ? <MessageSquare className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === 'CLOSED' || item.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">{item.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Profile View ─── */
function ProfileView() {
  const user = useAuthStore(s => s.user)
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/auth/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token}` },
        body: JSON.stringify({ name, email, phone }),
      })
      if (res.ok) {
        useAuthStore.getState().updateProfile({ name, email, phone })
        toast.success('Profile updated')
      }
    } catch { toast.error('Failed to update profile') }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Profile</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div>
              <div className="text-lg font-semibold">{user?.name}</div>
              <Badge className="bg-emerald-100 text-emerald-700">{user?.role}</Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Full Name</label>
              <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={email} onChange={e => setEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role</label>
              <input className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm" value={user?.role || 'customer'} disabled />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Simple List View (complaints, invoices, etc.) ─── */
function SimpleListView({ title, icon, apiPath }: { title: string; icon: React.ReactNode; apiPath: string }) {
  const fetch = SecureFetch()
  const [data, setData] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${apiPath}?page=1&pageSize=20`).then(r => r.json()).then(d => { setData(d.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [fetch, apiPath])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2">{icon} {title}</h2>
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : data.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No {title.toLowerCase()} found</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((item: Record<string, unknown>) => (
            <Card key={item.id as string} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{item.title as string || item.invoiceNumber as string || item.name as string}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.status && <Badge variant="secondary" className="mr-2 text-xs">{item.status as string}</Badge>}
                    {item.createdAt && new Date(item.createdAt as string).toLocaleDateString()}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Main Customer Portal ─── */
export function CustomerPortal() {
  const user = useAuthStore(s => s.user)
  const setAppView = useAppStore(s => s.setView)
  const logout = useAuthStore(s => s.secureLogout)
  const [portalView, setPortalView] = useState<PortalView>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleLogout = () => {
    fetch('/api/auth/whatsapp/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
    }).catch(() => {})
    logout('Signed out')
  }

  const handleInternalNav = (view: PortalView) => {
    if (view === 'new-complaint' || view === 'complaints') {
      setAppView(view)
    } else {
      setPortalView(view)
    }
    setMobileNavOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-1.5 rounded-lg hover:bg-muted" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-emerald-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9z" /></svg>
                </div>
                <span className="font-bold text-sm">MOHD.HMS</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleInternalNav(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${portalView === item.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.phone || 'Customer'}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* Mobile Nav */}
        {mobileNavOpen && (
          <div className="md:hidden border-t bg-background p-2 space-y-1">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => handleInternalNav(item.id)} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm ${portalView === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
        {portalView === 'dashboard' && <DashboardHome onNavigate={handleInternalNav} />}
        {portalView === 'complaints' && <SimpleListView title="My Complaints" icon={<MessageSquare className="h-6 w-6" />} apiPath="/api/complaints" />}
        {portalView === 'invoices' && <SimpleListView title="My Invoices" icon={<FileText className="h-6 w-6" />} apiPath="/api/invoices" />}
        {portalView === 'work-orders' && <SimpleListView title="My Work Orders" icon={<Wrench className="h-6 w-6" />} apiPath="/api/work-orders" />}
        {portalView === 'equipment' && <SimpleListView title="My Equipment" icon={<Package className="h-6 w-6" />} apiPath="/api/equipment" />}
        {portalView === 'profile' && <ProfileView />}
      </main>
    </div>
  )
}