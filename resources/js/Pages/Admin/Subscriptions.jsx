import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Empty, Grid, PageHeader, Pager, Pill, Select, SearchInput, Stat, StatGrid, StatusPill, Tabs, Toolbar, UserCell, useAdmin,
} from '@/Components/Admin/ui'
import { BarChart, Donut, SERIES } from '@/Components/Admin/charts'
import { errMsg, fmtDate, naira, nairaCompact, num, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/people/subscriptions'

export default function Subscriptions() {
  const list = useAdminList(API, { search: '', status: 'active', plan: 'all' })
  const { stats } = list.extra
  const { toast, confirm } = useAdmin()
  const [busyId, setBusyId] = useState(null)

  const run = async (id, fn, ok) => {
    setBusyId(id)
    try { const r = await fn(); toast(r?.data?.message || ok); list.reload() } catch (e) { toast(errMsg(e), 'error') } finally { setBusyId(null) }
  }

  const grant = async () => {
    const v = await confirm({
      title: 'Grant Flockr Pro', message: 'Free access, no payment taken. It is added on top of any time they already have.', confirmLabel: 'Grant Pro', danger: false,
      fields: [
        { key: 'who', label: 'User (exact username or email)', required: true },
        { key: 'plan', label: 'Plan', value: 'monthly', options: ['monthly', 'yearly'] },
        { key: 'days', label: 'Days (blank = plan default)', type: 'number' },
        { key: 'note', label: 'Note', value: 'Goodwill' },
      ],
    })
    if (!v) return
    run('new', async () => {
      const q = v.who.trim().replace(/^@/, '')
      const { data } = await axios.get('/api/admin/people/users', { params: { search: q } })
      const users = data?.data?.data ?? data?.data ?? data?.rows?.data ?? []
      const u = users.find((x) => x.username?.toLowerCase() === q.toLowerCase() || x.email?.toLowerCase() === q.toLowerCase())
      if (!u) throw new Error(`No user with exactly that username or email: ${q}`)
      return axios.post(`${API}/grant`, { user_id: u.id, plan: v.plan, days: v.days ? Number(v.days) : undefined, note: v.note })
    }, 'Pro granted')
  }
  const extend = async (s) => {
    const v = await confirm({ title: 'Extend subscription', confirmLabel: 'Extend', danger: false, fields: [{ key: 'days', label: 'Add days', type: 'number', value: '30', required: true }] })
    if (v) run(s.id, () => axios.post(`${API}/${s.id}/extend`, { days: Number(v.days) }), 'Subscription extended')
  }
  const cancel = async (s) => {
    if (await confirm({ title: `Cancel Pro for ${s.user?.name ?? 'this user'}?`, message: 'Access ends now. Any payment refund is handled in Paystack, not here.', confirmLabel: 'Cancel subscription' }))
      run(s.id, () => axios.post(`${API}/${s.id}/cancel`), 'Subscription cancelled')
  }

  const plans = list.rows.reduce((a, s) => { a[s.plan] = (a[s.plan] || 0) + 1; return a }, {})

  return (
    <>
      <Head title="Subscriptions · Admin" />
      <PageHeader title="Subscriptions" sub="Flockr Pro members. Paid amounts are read-only; you can grant, extend or cancel access."
        actions={<Btn kind="primary" size="sm" busy={busyId === 'new'} onClick={grant}>Grant Pro</Btn>} />

      <StatGrid>
        <Stat label="Active members" value={stats ? num(stats.active) : '—'} sub={stats ? `${num(stats.granted)} granted free` : null} onClick={() => list.setParam('status', 'active')} />
        <Stat label="Monthly recurring revenue" value={stats ? nairaCompact(stats.mrr) : '—'} sub="Paid plans only" tone="good" />
        <Stat label="Revenue (30 days)" value={stats ? nairaCompact(stats.revenue_30d) : '—'} />
        <Stat label="Expiring in 7 days" value={stats ? num(stats.expiring) : '—'} tone={stats?.expiring ? 'warn' : undefined} onClick={() => list.setParam('status', 'expiring')} />
      </StatGrid>

      {stats && (
        <Grid cols={2}>
          <Card title="Paid vs granted" sub="Currently active members">
            <Donut valueFormat={num} center={{ value: num(stats.active), label: 'Active' }} data={[
              { label: 'Paid', value: Math.max(0, stats.active - stats.granted), color: SERIES[2] }, { label: 'Granted free', value: stats.granted, color: SERIES[6] },
            ]} />
          </Card>
          <Card title="Plan mix" sub="In the current list">
            <BarChart horizontal valueFormat={num} data={Object.entries(plans).map(([label, value], i) => ({ label, value, color: SERIES[i] }))} />
          </Card>
        </Grid>
      )}

      <Tabs tabs={[['active', 'Active'], ['expiring', 'Expiring soon'], ['expired', 'Expired'], ['cancelled', 'Cancelled'], ['all', 'All']]} value={list.params.status} onChange={(v) => list.setParam('status', v)} />
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Member name, email or payment reference…" />
        <Select value={list.params.plan} onChange={(v) => list.setParam('plan', v)} options={[['all', 'Any plan'], ['monthly', 'Monthly'], ['yearly', 'Yearly']]} />
      </Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload}
          empty={<Empty title="No subscriptions here" sub="Try another tab." />}
          columns={[
            { key: 'user', label: 'Member', mobile: 'title', render: (s) => <UserCell user={s.user} sub={s.user?.email} /> },
            { key: 'plan', label: 'Plan', render: (s) => <span style={{ textTransform: 'capitalize' }}>{s.plan}{s.granted && <> <Pill tone="violet">Granted</Pill></>}</span> },
            { key: 'amount_paid', label: 'Paid', align: 'right', render: (s) => (s.granted ? '—' : naira(s.amount_paid)) },
            { key: 'status', label: 'Status', render: (s) => <StatusPill status={s.status} /> },
            { key: 'starts_at', label: 'Started', mobile: 'hide', render: (s) => fmtDate(s.starts_at) },
            { key: 'expires_at', label: 'Expires', render: (s) => fmtDate(s.expires_at) },
            { key: 'reference', label: 'Reference', mobile: 'hide', render: (s) => <small style={{ fontFamily: 'monospace' }}>{s.reference}</small> },
          ]}
          rowActions={(s) => (
            <>
              {s.status !== 'cancelled' && <Btn size="sm" disabled={busyId === s.id} onClick={() => extend(s)}>Extend</Btn>}
              {s.status !== 'cancelled' && s.status !== 'expired' && <Btn size="sm" kind="danger" disabled={busyId === s.id} onClick={() => cancel(s)}>Cancel</Btn>}
            </>
          )}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Subscriptions.layout = (page) => <AdminShell>{page}</AdminShell>
