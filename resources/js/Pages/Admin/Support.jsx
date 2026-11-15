import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Drawer, Empty, Grid, KV, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, StatusPill, Tabs,
  Toolbar, UserCell, useAdmin,
} from '@/Components/Admin/ui'
import { Donut } from '@/Components/Admin/charts'
import { errMsg, fmtDate, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/people/support'
const TYPE_LABEL = { suspension_appeal: 'Suspension appeal', verification_request: 'Verification request' }
const typeLabel = (t) => TYPE_LABEL[t] || String(t || 'general').replace(/_/g, ' ')
const TYPE_TONE = { suspension_appeal: 'bad', verification_request: 'info' }

export default function Support() {
  const list = useAdminList(API, { search: '', type: 'all', status: 'open' })
  const { toast, confirm, refreshBadges } = useAdmin()
  const [sel, setSel] = useState(null)
  const [busy, setBusy] = useState(false)
  const st = list.extra.stats
  const types = list.extra.types || []

  const run = async (fn, ok) => {
    setBusy(true)
    try { const r = await fn(); toast(r?.data?.message || ok); setSel(null); list.reload(); refreshBadges() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }

  const resolve = async (t, outcome) => {
    const approve = outcome === 'approve'
    const effect = t.type === 'suspension_appeal' ? 'The account is reinstated.' : t.type === 'verification_request' ? 'The account is marked as verified.' : 'The ticket is closed.'
    const v = await confirm({
      title: approve ? `Approve this ${typeLabel(t.type).toLowerCase()}?` : 'Decline and close this ticket?',
      message: approve ? effect : 'Nothing changes on the account. The ticket is closed.',
      confirmLabel: approve ? 'Approve' : 'Decline', danger: !approve,
      fields: [{ key: 'note', label: 'Note (kept in the audit log)', multiline: true }],
    })
    if (v) run(() => axios.post(`${API}/${t.id}/resolve`, { outcome, note: v.note || null }), approve ? 'Approved' : 'Ticket closed')
  }
  const reopen = async (t) => { if (await confirm({ title: 'Reopen this ticket?', confirmLabel: 'Reopen', danger: false })) run(() => axios.post(`${API}/${t.id}/reopen`), 'Ticket reopened') }

  const other = st ? Math.max(0, st.open - st.appeals - st.verify) : 0
  const preview = (m) => (m || '').length > 90 ? m.slice(0, 90) + '…' : m
  const actions = (t) => t.status === 'resolved'
    ? <Btn size="sm" onClick={() => reopen(t)} busy={busy}>Reopen</Btn>
    : <>
        <Btn size="sm" kind="good" onClick={() => resolve(t, 'approve')} busy={busy}>Approve</Btn>
        <Btn size="sm" onClick={() => resolve(t, 'decline')} busy={busy}>Decline</Btn>
      </>

  return (
    <>
      <Head title="Support tickets · Admin" />
      <PageHeader title="Support tickets" sub="Suspension appeals, verification requests and general help" />

      <StatGrid>
        <Stat label="Open" value={st ? num(st.open) : '—'} tone={st?.open ? 'warn' : undefined} onClick={() => list.setParam('status', 'open')} />
        <Stat label="Suspension appeals" value={st ? num(st.appeals) : '—'} tone={st?.appeals ? 'bad' : undefined} onClick={() => { list.setParam('status', 'open'); list.setParam('type', 'suspension_appeal') }} />
        <Stat label="Verification requests" value={st ? num(st.verify) : '—'} onClick={() => { list.setParam('status', 'open'); list.setParam('type', 'verification_request') }} />
        <Stat label="Resolved" value={st ? num(st.resolved) : '—'} onClick={() => list.setParam('status', 'resolved')} />
      </StatGrid>

      <Grid cols={2}>
        <Card title="Open by type" sub="What is waiting for a decision">
          {st && st.open + 0 > 0 ? (
            <Donut center={{ value: num(st.open), label: 'open' }} valueFormat={num}
              data={[{ label: 'Appeals', value: st.appeals }, { label: 'Verification', value: st.verify }, { label: 'Other', value: other }].filter((d) => d.value > 0)} />
          ) : <Empty title="Inbox zero" sub="No tickets are waiting." />}
        </Card>
        <Card title="Resolved vs open" sub="All time">
          {st ? <Donut center={{ value: num(st.open + st.resolved), label: 'tickets' }} valueFormat={num}
            data={[{ label: 'Open', value: st.open, color: '#c98500' }, { label: 'Resolved', value: st.resolved, color: '#199e70' }].filter((d) => d.value > 0)} /> : null}
        </Card>
      </Grid>

      <div style={{ height: 16 }} />
      <Tabs value={list.params.status} onChange={(v) => list.setParam('status', v)} tabs={[['open', 'Open', st?.open], ['resolved', 'Resolved'], ['all', 'All']]} />
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search message, name or @username…" />
        <Select value={list.params.type} onChange={(v) => list.setParam('type', v)} options={[['all', 'All types'], ...types.map((t) => [t, typeLabel(t)])]} />
      </Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} onRowClick={setSel} rowActions={actions}
          empty={<Empty title="No tickets" sub="Nothing matches these filters." />}
          columns={[
            { key: 'user', label: 'From', mobile: 'title', render: (t) => <UserCell user={t.user} /> },
            { key: 'type', label: 'Type', render: (t) => <Pill tone={TYPE_TONE[t.type] || 'mute'}>{typeLabel(t.type)}</Pill> },
            { key: 'message', label: 'Message', mobile: 'hide', render: (t) => <span className="a-mute">{preview(t.message)}</span> },
            { key: 'status', label: 'Status', render: (t) => <StatusPill status={t.status} /> },
            { key: 'created_at', label: 'Sent', render: (t) => timeAgo(t.created_at) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? typeLabel(sel.type) : ''}>
        {sel && (
          <div className="a-stack">
            <UserCell user={sel.user} />
            <KV items={[
              ['Status', <StatusPill status={sel.status} />],
              ['Account', sel.user ? [sel.user.is_active ? 'Active' : 'Suspended', sel.user.is_verified ? 'Verified' : null].filter(Boolean).join(' · ') : '—'],
              ['Sent', fmtDate(sel.created_at, true)],
              sel.resolved_at && ['Resolved', fmtDate(sel.resolved_at, true)],
              sel.outcome && ['Outcome', sel.outcome],
              sel.admin_note && ['Admin note', sel.admin_note],
            ]} />
            <Card title="Message" pad><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{sel.message || '—'}</p></Card>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions(sel)}</div>
          </div>
        )}
      </Drawer>
    </>
  )
}
Support.layout = (page) => <AdminShell>{page}</AdminShell>
