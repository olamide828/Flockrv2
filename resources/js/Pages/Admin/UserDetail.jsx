import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Avatar, Btn, Card, DataTable, Empty, ErrorBox, Grid, KV, PageHeader, Pill, Skeleton, Stat, StatGrid, StatusPill, Tabs, useAdmin,
} from '@/Components/Admin/ui'
import { errMsg, fmtDate, naira, num, timeAgo, useAdminFetch } from '@/Components/Admin/lib'

const id = () => window.location.pathname.split('/').filter(Boolean).pop()
const API = '/api/admin/people/users'

export default function UserDetail() {
  const uid = id()
  const { data, loading, error, reload } = useAdminFetch(`${API}/${uid}`, {}, [uid])
  const { toast, confirm, refreshBadges } = useAdmin()
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)

  if (loading && !data) return <><PageHeader title="User" back={{ href: '/admin/users', label: 'Users' }} /><Card><Skeleton rows={8} /></Card></>
  if (error || !data) return <><PageHeader title="User" back={{ href: '/admin/users', label: 'Users' }} /><ErrorBox error={error || 'User not found'} onRetry={reload} /></>

  const u = data.user
  const run = async (fn, ok) => {
    setBusy(true)
    try { await fn(); toast(ok); reload(); refreshBadges() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }
  const post = (path, body) => axios.post(`${API}/${uid}/${path}`, body)

  const suspend = async () => {
    const v = await confirm({ title: `Suspend ${u.name}?`, message: 'They will be signed out and blocked until you unsuspend them.', confirmLabel: 'Suspend', fields: [{ key: 'reason', label: 'Reason (shown in the audit log)', multiline: true, required: true }] })
    if (v) run(() => post('suspend', v), 'User suspended')
  }
  const unsuspend = async () => { if (await confirm({ title: `Unsuspend ${u.name}?`, confirmLabel: 'Unsuspend', danger: false })) run(() => post('unsuspend'), 'User unsuspended') }
  const verify = () => run(() => post('verify'), u.is_verified ? 'Verification removed' : 'User verified')
  const clearFlag = () => run(() => post('clear-flag'), 'Flag cleared')
  const terminal = () => run(() => post('terminal-cleared'), u.terminal_sender_verified_at ? 'Marked NOT cleared' : 'Marked as Terminal-cleared')
  const changeRole = async () => {
    const v = await confirm({ title: `Change role for ${u.name}`, confirmLabel: 'Change role', danger: false, fields: [{ key: 'role', label: 'New role', value: u.role, options: ['buyer', 'seller', 'admin'] }] })
    if (!v || v.role === u.role) return
    if (v.role === 'admin' && !(await confirm({ title: 'Make this person an admin?', message: 'Admins can see and change almost everything in this dashboard.', confirmLabel: 'Yes, make admin' }))) return
    run(() => post('role', { role: v.role, confirm_admin: v.role === 'admin' }), 'Role updated')
  }
  const remove = async () => { if (await confirm({ title: `Delete ${u.name}?`, message: 'The account is soft-deleted and can be restored.', confirmLabel: 'Delete' })) run(() => axios.delete(`${API}/${uid}`), 'User deleted') }
  const restore = () => run(() => post('restore'), 'User restored')

  const grant = async () => {
    const v = await confirm({ title: `Give ${u.name} Flockr Pro`, danger: false, confirmLabel: 'Grant', fields: [
      { key: 'plan', label: 'Plan', value: 'monthly', options: ['monthly', 'yearly'] },
      { key: 'days', label: 'Days (leave blank for the plan default)', type: 'number' },
      { key: 'note', label: 'Note', value: 'Goodwill' }] })
    if (v) run(() => axios.post('/api/admin/people/subscriptions/grant', { user_id: u.id, plan: v.plan, days: v.days ? Number(v.days) : undefined, note: v.note }), 'Subscription granted')
  }
  const extend = async (s) => {
    const v = await confirm({ title: 'Extend subscription', danger: false, confirmLabel: 'Extend', fields: [{ key: 'days', label: 'Add days', value: '30', type: 'number', required: true }] })
    if (v) run(() => axios.post(`/api/admin/people/subscriptions/${s.id}/extend`, { days: Number(v.days) }), 'Subscription extended')
  }
  const cancelSub = async (s) => { if (await confirm({ title: 'Cancel this subscription?', confirmLabel: 'Cancel subscription' })) run(() => axios.post(`/api/admin/people/subscriptions/${s.id}/cancel`), 'Subscription cancelled') }

  const w = data.wallet
  const tabs = [['overview', 'Overview'], ['orders', 'Orders', data.orders.length], ['content', 'Products & videos'], ['wallet', 'Wallet'], ['sub', 'Subscription'], ['reports', 'Reports', data.reports.length + data.warnings.length], ['activity', 'Activity']]

  return (
    <>
      <Head title={`${u.name} · Admin`} />
      <PageHeader back={{ href: '/admin/users', label: 'Users' }} title={u.name}
        sub={`@${u.username ?? '—'} · ${u.email}`}
        actions={<>
          <Btn size="sm" onClick={verify} busy={busy}>{u.is_verified ? 'Remove verified' : 'Verify'}</Btn>
          <Btn size="sm" onClick={changeRole} busy={busy}>Role</Btn>
          {u.is_flagged && <Btn size="sm" onClick={clearFlag} busy={busy}>Clear flag</Btn>}
          {u.role === 'seller' && <Btn size="sm" onClick={terminal} busy={busy}>{u.terminal_sender_verified_at ? 'Terminal ✓' : 'Mark Terminal-cleared'}</Btn>}
          {u.is_active ? <Btn size="sm" kind="danger" onClick={suspend} busy={busy}>Suspend</Btn> : <Btn size="sm" kind="good" onClick={unsuspend} busy={busy}>Unsuspend</Btn>}
          {u.deleted_at ? <Btn size="sm" kind="good" onClick={restore} busy={busy}>Restore</Btn> : <Btn size="sm" kind="danger" onClick={remove} busy={busy}>Delete</Btn>}
        </>} />

      <Card>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar src={u.avatar_url} name={u.name} size={64} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Pill tone={u.role === 'admin' ? 'violet' : u.role === 'seller' ? 'info' : 'mute'}>{u.role}</Pill>
            {u.deleted_at && <Pill tone="bad">Deleted</Pill>}
            {!u.is_active && !u.deleted_at && <Pill tone="bad">Suspended</Pill>}
            {u.is_verified && <Pill tone="good">Verified</Pill>}
            {u.is_flagged && <Pill tone="warn">Flagged</Pill>}
            {u.is_pro && <Pill tone="violet">Pro</Pill>}
            {u.badges?.map((b) => <Pill key={b.id} tone="info">{b.label}</Pill>)}
          </div>
        </div>
        {!u.is_active && u.suspension_reason && <p className="a-mute" style={{ margin: '12px 0 0' }}>Suspended {timeAgo(u.suspended_at)}: “{u.suspension_reason}”</p>}
      </Card>

      <StatGrid>
        <Stat label="Wallet balance" value={naira(w.balance)} />
        <Stat label="Earned (as seller)" value={naira(data.totals.earned)} />
        <Stat label="Spent (as buyer)" value={naira(data.totals.spent)} />
        <Stat label="Followers" value={num(u.followers_count)} sub={`${num(u.following_count)} following`} />
        <Stat label="Videos / Products" value={`${num(u.videos_count)} / ${num(u.products_count)}`} />
      </StatGrid>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <Grid cols={2}>
          <Card title="Profile"><KV items={[['Email', u.email], ['Phone', u.phone], ['Location', [u.location, u.country].filter(Boolean).join(', ')], ['Joined', fmtDate(u.created_at)], ['Last seen', timeAgo(u.last_seen_at)], ['Email verified', u.email_verified_at ? fmtDate(u.email_verified_at) : 'No'], ['Bio', u.bio]]} /></Card>
          <Card title="Seller details"><KV items={[['Pickup address', u.pickup?.filter(Boolean).join(', ')], ['Total sales', u.total_sales], ['Bank', w.bank?.bank_name ? `${w.bank.bank_name} · ${w.bank.account_name} · ••••${w.bank.account_last4 ?? ''}` : 'Not added'], ['Terminal sender cleared', u.terminal_sender_verified_at ? fmtDate(u.terminal_sender_verified_at) : 'No']]} /></Card>
        </Grid>
      )}

      {tab === 'orders' && (
        <Card pad={false}>
          <DataTable rows={data.orders} columns={[
            { key: 'reference', label: 'Order', mobile: 'title', render: (o) => <b className="mono">{o.reference}</b> },
            { key: 'as', label: 'Role', render: (o) => <Pill tone={o.as === 'seller' ? 'info' : 'mute'}>{o.as}</Pill> },
            { key: 'status', label: 'Status', render: (o) => <StatusPill status={o.status} /> },
            { key: 'total', label: 'Total', align: 'right', render: (o) => naira(o.total) },
            { key: 'created_at', label: 'Date', render: (o) => fmtDate(o.created_at) },
          ]} onRowClick={(o) => { window.location.href = `/admin/orders/${o.id}` }} empty={<Empty title="No orders" />} />
        </Card>
      )}

      {tab === 'content' && (
        <Grid cols={2}>
          <Card title="Products" pad={false}>
            <DataTable rows={data.products} columns={[
              { key: 'name', label: 'Product', mobile: 'title', render: (p) => <span>{p.name}{p.deleted_at && <Pill tone="bad"> deleted</Pill>}</span> },
              { key: 'price', label: 'Price', render: (p) => naira(p.price) },
              { key: 'stock', label: 'Stock', render: (p) => p.stock ?? '—' },
            ]} empty={<Empty title="No products" />} />
          </Card>
          <Card title="Videos" pad={false}>
            <DataTable rows={data.videos} columns={[
              { key: 'title', label: 'Video', mobile: 'title', render: (v) => v.title || v.caption || `Video #${v.id}` },
              { key: 'status', label: 'Status', render: (v) => <StatusPill status={v.status} /> },
              { key: 'views_count', label: 'Views', render: (v) => num(v.views_count) },
            ]} empty={<Empty title="No videos" />} />
          </Card>
        </Grid>
      )}

      {tab === 'wallet' && (
        <Grid cols={2}>
          <Card title="Recent wallet activity" sub="Read-only. Money movements are never edited from here." pad={false}>
            <DataTable rows={w.transactions} columns={[
              { key: 'source', label: 'Source', mobile: 'title', render: (t) => <span style={{ textTransform: 'capitalize' }}>{String(t.source).replace(/_/g, ' ')}</span> },
              { key: 'type', label: 'Type', render: (t) => <Pill tone={t.type === 'credit' ? 'good' : 'warn'}>{t.type}</Pill> },
              { key: 'amount', label: 'Amount', align: 'right', render: (t) => naira(t.amount) },
              { key: 'balance_after', label: 'Balance', mobile: 'hide', align: 'right', render: (t) => naira(t.balance_after) },
              { key: 'created_at', label: 'Date', render: (t) => fmtDate(t.created_at) },
            ]} empty={<Empty title="No wallet activity" />} />
          </Card>
          <Card title="Payout requests" pad={false}>
            <DataTable rows={w.payouts} columns={[
              { key: 'amount', label: 'Amount', mobile: 'title', render: (p) => naira(p.amount) },
              { key: 'status', label: 'Status', render: (p) => <StatusPill status={p.status} /> },
              { key: 'created_at', label: 'Requested', render: (p) => fmtDate(p.created_at) },
            ]} empty={<Empty title="No payouts" />} />
          </Card>
        </Grid>
      )}

      {tab === 'sub' && (
        <Card title="Subscriptions" actions={<Btn size="sm" kind="primary" onClick={grant} busy={busy}>Grant Pro</Btn>} pad={false}>
          <DataTable rows={data.subscriptions} columns={[
            { key: 'plan', label: 'Plan', mobile: 'title', render: (s) => <span style={{ textTransform: 'capitalize' }}>{s.plan}</span> },
            { key: 'status', label: 'Status', render: (s) => <StatusPill status={s.status} /> },
            { key: 'amount_paid', label: 'Paid', render: (s) => naira(s.amount_paid) },
            { key: 'expires_at', label: 'Expires', render: (s) => fmtDate(s.expires_at) },
            { key: 'paystack_reference', label: 'Reference', mobile: 'hide', render: (s) => <span className="mono">{s.paystack_reference}</span> },
          ]} rowActions={(s) => s.status !== 'cancelled' && <><Btn size="sm" onClick={() => extend(s)}>Extend</Btn><Btn size="sm" kind="danger" onClick={() => cancelSub(s)}>Cancel</Btn></>}
            empty={<Empty title="No subscriptions" sub="Use “Grant Pro” to give this user a free plan." />} />
        </Card>
      )}

      {tab === 'reports' && (
        <Grid cols={2}>
          <Card title="Reports against this user" pad={false}>
            <DataTable rows={data.reports} columns={[
              { key: 'reason', label: 'Reason', mobile: 'title', render: (r) => r.reason },
              { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
              { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
            ]} empty={<Empty title="No reports" />} />
          </Card>
          <Card title="Off-platform warnings" pad={false}>
            <DataTable rows={data.warnings} columns={[
              { key: 'id', label: '#', mobile: 'title', render: (w2) => `Warning #${w2.id}` },
              { key: 'created_at', label: 'Date', render: (w2) => fmtDate(w2.created_at) },
            ]} empty={<Empty title="No warnings" />} />
          </Card>
        </Grid>
      )}

      {tab === 'activity' && (
        <Grid cols={2}>
          <Card title="Admin actions on this user" pad={false}>
            <DataTable rows={data.audit} columns={[
              { key: 'action', label: 'Action', mobile: 'title', render: (a) => <b>{a.action}</b> },
              { key: 'admin', label: 'By', render: (a) => a.admin?.name ?? 'System' },
              { key: 'created_at', label: 'When', render: (a) => timeAgo(a.created_at) },
            ]} empty={<Empty title="Nothing yet" />} />
          </Card>
          <Card title="Recent logins" pad={false}>
            <DataTable rows={data.logins} columns={[
              { key: 'ip_address', label: 'IP', mobile: 'title', render: (l) => l.ip_address ?? '—' },
              { key: 'user_agent', label: 'Device', mobile: 'hide', render: (l) => String(l.user_agent ?? '').slice(0, 40) },
              { key: 'created_at', label: 'When', render: (l) => timeAgo(l.created_at) },
            ]} empty={<Empty title="No login history" />} />
          </Card>
        </Grid>
      )}
      <style>{`.mono{font-family:monospace}`}</style>
    </>
  )
}
UserDetail.layout = (page) => <AdminShell>{page}</AdminShell>
