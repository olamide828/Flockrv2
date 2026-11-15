import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Empty, Grid, Meter, PageHeader, Pager, Pill, Stat, StatGrid, UserCell, useAdmin } from '@/Components/Admin/ui'
import { BarChart } from '@/Components/Admin/charts'
import { errMsg, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/people'
const ratio = (u) => (u.shown_count ? u.continued_count / u.shown_count : 0)

export default function FlaggedSellers() {
  const list = useAdminList(`${API}/flagged`, {})
  const { toast, confirm, refreshBadges } = useAdmin()
  const [busy, setBusy] = useState(null)

  const run = async (id, fn, ok) => {
    setBusy(id)
    try { const r = await fn(); toast(r?.data?.message || ok); list.reload(); refreshBadges() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(null) }
  }
  const clear = async (u) => {
    if (await confirm({ title: `Clear the flag on ${u.name}?`, message: 'They leave the review queue. They will be flagged again if they keep pushing buyers off the platform.', confirmLabel: 'Clear flag', danger: false }))
      run(u.id, () => axios.post(`${API}/users/${u.id}/clear-flag`), 'Flag cleared')
  }
  const suspend = async (u) => {
    const v = await confirm({ title: `Suspend ${u.name}?`, message: 'They are signed out and blocked until you unsuspend them.', confirmLabel: 'Suspend', fields: [{ key: 'reason', label: 'Reason (shown in the audit log)', multiline: true, required: true, value: 'Repeatedly steering buyers off-platform' }] })
    if (v) run(u.id, () => axios.post(`${API}/users/${u.id}/suspend`, v), 'User suspended')
  }

  const rows = list.rows
  const worst = [...rows].filter((u) => u.continued_count > 0).sort((a, b) => b.continued_count - a.continued_count).slice(0, 8)
  const continued = rows.reduce((a, u) => a + (u.continued_count || 0), 0)
  const shown = rows.reduce((a, u) => a + (u.shown_count || 0), 0)

  return (
    <>
      <Head title="Flagged sellers · Admin" />
      <PageHeader title="Flagged sellers" sub="Sellers who keep trying to take buyers off Flockr after seeing the warning" />

      <StatGrid>
        <Stat label="Awaiting review" value={list.meta ? num(list.meta.total) : '—'} tone={list.meta?.total ? 'warn' : undefined} />
        <Stat label="Warnings shown" value={num(shown)} sub="this page" />
        <Stat label="Ignored the warning" value={num(continued)} sub={shown ? `${Math.round((continued / shown) * 100)}% of warnings` : 'this page'} tone={continued ? 'bad' : undefined} />
      </StatGrid>

      {worst.length > 0 && (
        <Card title="Most persistent" sub="Times each seller continued past the warning">
          <BarChart horizontal valueFormat={num} color="#d95926" data={worst.map((u) => ({ label: u.name, value: u.continued_count, sub: `@${u.username} · shown ${num(u.shown_count)}×` }))} />
        </Card>
      )}

      <div style={{ height: 16 }} />
      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} onRowClick={(u) => { window.location.href = `/admin/users/${u.id}` }}
          empty={<Empty title="Queue is clear" sub="No sellers are flagged for review." />}
          rowActions={(u) => <>
            <Btn size="sm" onClick={() => clear(u)} busy={busy === u.id}>Clear flag</Btn>
            {u.is_active && <Btn size="sm" kind="danger" onClick={() => suspend(u)} busy={busy === u.id}>Suspend</Btn>}
          </>}
          columns={[
            { key: 'user', label: 'Seller', mobile: 'title', render: (u) => <UserCell user={u} sub={u.email} /> },
            { key: 'shown_count', label: 'Warned', align: 'right', render: (u) => num(u.shown_count) },
            { key: 'continued_count', label: 'Continued', align: 'right', render: (u) => <Pill tone={u.continued_count ? 'bad' : 'mute'}>{num(u.continued_count)}</Pill> },
            { key: 'ratio', label: 'Ignore rate', mobile: 'hide', render: (u) => <div style={{ minWidth: 90 }}><Meter value={ratio(u)} tone={ratio(u) > 0.5 ? 'bad' : 'warn'} /></div> },
            { key: 'status', label: 'Status', render: (u) => u.is_active ? <Pill tone="good">Active</Pill> : <Pill tone="bad">Suspended</Pill> },
            { key: 'flagged_at', label: 'Flagged', render: (u) => timeAgo(u.flagged_at) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
FlaggedSellers.layout = (page) => <AdminShell>{page}</AdminShell>
