import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Drawer, Empty, ErrorBox, Grid, KV, PageHeader, Pager, Pill, SearchInput, Skeleton, Stat, StatGrid, StatusPill, Tabs, Toolbar, UserCell, useAdmin,
} from '@/Components/Admin/ui'
import { BarChart, Donut, SERIES } from '@/Components/Admin/charts'
import { errMsg, fmtDate, naira, num, timeAgo, useAdminFetch, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/disputes'
const CLOSED = ['resolved_buyer', 'resolved_seller', 'closed']

function Thread({ id, onChanged }) {
  const { data, loading, error, reload } = useAdminFetch(`${API}/${id}`, {}, [id])
  const { toast, confirm, refreshBadges } = useAdmin()
  const [busy, setBusy] = useState(false)
  if (loading && !data) return <Skeleton rows={7} />
  if (error || !data) return <ErrorBox error={error || 'Dispute not found'} onRetry={reload} />
  const d = data.dispute
  const closed = CLOSED.includes(d.status)
  const o = d.order

  const run = async (fn, ok) => {
    setBusy(true)
    try { const r = await fn(); toast(r?.data?.message || ok); reload(); onChanged(); refreshBadges() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }
  const reply = async () => {
    const v = await confirm({ title: 'Reply in this dispute', message: 'Both the buyer and seller can see admin replies.', confirmLabel: 'Send reply', danger: false, fields: [{ key: 'message', label: 'Message', multiline: true, required: true }] })
    if (v) run(() => axios.post(`${API}/${id}/messages`, v), 'Reply sent')
  }
  const resolve = async () => {
    const v = await confirm({
      title: 'Resolve this dispute',
      message: `Refund buyer: the order is marked refunded, the seller credit is reversed and ${naira(o?.total)} goes back through Paystack. Release to seller: escrow is released to the seller now. Both are final.`,
      confirmLabel: 'Resolve dispute',
      fields: [
        { key: 'outcome', label: 'Outcome', value: 'refund_buyer', options: [{ value: 'refund_buyer', label: 'Refund the buyer' }, { value: 'release_seller', label: 'Release money to the seller' }] },
        { key: 'resolution_note', label: 'Resolution note (sent to both parties)', multiline: true, required: true },
      ],
    })
    if (v) run(() => axios.post(`${API}/${id}/resolve`, v), 'Dispute resolved')
  }

  return (
    <div className="a-stack">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <StatusPill status={d.status} />
        {o?.refund_status && <Pill tone={{ succeeded: 'good', failed: 'bad' }[o.refund_status] || 'warn'}>Refund {o.refund_status}</Pill>}
        {o && <a className="a-btn sm" href={`/admin/orders/${o.id}`}>Open order {o.reference}</a>}
      </div>
      {o?.refund_status === 'failed' && <div className="a-error"><span>{o.refund_error || 'The refund failed.'} Retry it from the order page.</span></div>}

      <KV items={[
        ['Reason', d.reason], ['Order total', o ? naira(o.total) : null], ['Opened', fmtDate(d.created_at, true)],
        ['Order status', o?.status], ['Delivered', o?.delivered_at ? fmtDate(o.delivered_at) : null],
        d.resolved_at && ['Resolved', `${fmtDate(d.resolved_at, true)}${d.resolvedBy || d.resolved_by ? ` by ${d.resolvedBy?.name ?? 'admin'}` : ''}`],
        d.resolution_note && ['Resolution', d.resolution_note],
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><small className="a-mute">Buyer</small><UserCell user={d.buyer} sub={d.buyer?.email} /></div>
        <div><small className="a-mute">Seller</small><UserCell user={d.seller} sub={d.seller?.email} /></div>
      </div>

      <h4 style={{ margin: '6px 0 0' }}>Conversation</h4>
      {(d.messages ?? []).length === 0 ? <Empty title="No messages" /> : (d.messages ?? []).map((m) => {
        const role = m.user?.role === 'admin' ? 'Admin' : m.user_id === d.buyer_id ? 'Buyer' : m.user_id === d.seller_id ? 'Seller' : 'User'
        const att = Array.isArray(m.attachments) ? m.attachments.length : 0
        return (
          <div key={m.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px', background: role === 'Admin' ? 'rgba(255,255,255,.04)' : 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b style={{ fontSize: 13 }}>{m.user?.name ?? 'User'} <Pill tone={role === 'Admin' ? 'violet' : role === 'Buyer' ? 'info' : 'mute'}>{role}</Pill></b>
              <small className="a-mute">{timeAgo(m.created_at)}</small>
            </div>
            <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13.5 }}>{m.message}</p>
            {att > 0 && <small className="a-mute">{att} attachment{att === 1 ? '' : 's'} (photos or video)</small>}
          </div>
        )
      })}

      {!closed ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn kind="primary" busy={busy} onClick={reply}>Reply</Btn>
          <Btn kind="danger" busy={busy} onClick={resolve}>Resolve…</Btn>
        </div>
      ) : <small className="a-mute">This dispute is closed.</small>}
    </div>
  )
}

export default function Disputes() {
  const list = useAdminList(API, { search: '', status: 'open' })
  const [sel, setSel] = useState(null)
  const { counts = {} } = list.extra
  const rows = list.rows

  const reasons = Object.entries(rows.reduce((a, d) => { const k = (d.reason || 'Other').slice(0, 28); a[k] = (a[k] || 0) + 1; return a }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value], i) => ({ label, value, color: SERIES[i % SERIES.length] }))
  const awaiting = rows.filter((d) => d.status === 'awaiting_admin').length

  return (
    <>
      <Head title="Disputes · Admin" />
      <PageHeader title="Disputes" sub="Buyer and seller disagreements. Read the thread, reply, then refund the buyer or release money to the seller." />

      <StatGrid>
        <Stat label="Open" value={num(counts.open)} tone={counts.open ? 'warn' : undefined} onClick={() => list.setParam('status', 'open')} />
        <Stat label="Waiting on you" value={num(awaiting)} sub="On this page" tone={awaiting ? 'bad' : undefined} onClick={() => list.setParam('status', 'awaiting_admin')} />
        <Stat label="Resolved" value={num(counts.resolved)} />
        <Stat label="All time" value={num(counts.all)} onClick={() => list.setParam('status', 'all')} />
      </StatGrid>

      <Grid cols={2}>
        <Card title="Open vs resolved">
          <Donut valueFormat={num} center={{ value: num(counts.all), label: 'Disputes' }} data={[
            { label: 'Open', value: counts.open ?? 0, color: SERIES[3] }, { label: 'Resolved', value: counts.resolved ?? 0, color: SERIES[2] },
          ]} />
        </Card>
        <Card title="Top reasons" sub="In the current list">
          <BarChart horizontal data={reasons} valueFormat={num} />
        </Card>
      </Grid>

      <Tabs tabs={[['open', 'Open', counts.open], ['awaiting_admin', 'Waiting on admin'], ['awaiting_seller', 'Waiting on seller'], ['resolved_buyer', 'Buyer won'], ['resolved_seller', 'Seller won'], ['all', 'All']]}
        value={list.params.status} onChange={(v) => list.setParam('status', v)} />
      <Toolbar><SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Order reference, buyer or seller…" /></Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} onRowClick={(d) => setSel(d.id)}
          empty={<Empty title="No disputes here" sub="Good news, or try another tab." />}
          columns={[
            { key: 'order', label: 'Order', mobile: 'title', render: (d) => <><b style={{ fontFamily: 'monospace' }}>{d.order?.reference ?? `#${d.order_id}`}</b><br /><small className="a-mute">{d.reason}</small></> },
            { key: 'buyer', label: 'Buyer', render: (d) => <UserCell user={d.buyer} sub={null} /> },
            { key: 'seller', label: 'Seller', render: (d) => <UserCell user={d.seller} sub={null} /> },
            { key: 'total', label: 'Amount', align: 'right', render: (d) => d.order ? naira(d.order.total) : '—' },
            { key: 'status', label: 'Status', render: (d) => <StatusPill status={d.status} /> },
            { key: 'messages_count', label: 'Msgs', align: 'right', mobile: 'hide' },
            { key: 'created_at', label: 'Opened', render: (d) => timeAgo(d.created_at) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={`Dispute #${sel ?? ''}`} width={600}>
        {sel && <Thread id={sel} onChanged={list.reload} />}
      </Drawer>
    </>
  )
}
Disputes.layout = (page) => <AdminShell>{page}</AdminShell>
