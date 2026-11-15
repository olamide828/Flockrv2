import { Head } from '@inertiajs/react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Empty, Grid, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, StatusPill, Tabs, Toolbar, UserCell,
} from '@/Components/Admin/ui'
import { BarChart, Donut, SERIES } from '@/Components/Admin/charts'
import { fmtDate, naira, nairaCompact, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const TABS = [
  ['all', 'All'], ['todo', 'To ship'], ['transit', 'In transit'], ['delivered', 'Delivered'],
  ['issues', 'Issues'], ['closed', 'Closed'], ['pending', 'Unpaid'],
]
const ESCROW = [['all', 'Any escrow'], ['held', 'Held by Flockr'], ['released', 'Released']]
const REFUND_TONE = { succeeded: 'good', failed: 'bad', pending: 'warn' }

export default function Orders() {
  const list = useAdminList('/api/admin/orders', { search: '', tab: 'all', escrow: 'all', from: '', to: '', refund_failed: '' })
  const { counts = {}, stats } = list.extra
  const p = list.params
  const go = (o) => { window.location.href = `/admin/orders/${o.id}` }
  const filtered = p.search || p.escrow !== 'all' || p.from || p.to || p.refund_failed

  const mix = [
    { label: 'To ship', value: counts.todo, color: SERIES[3] }, { label: 'In transit', value: counts.transit, color: SERIES[0] },
    { label: 'Delivered', value: counts.delivered, color: SERIES[2] }, { label: 'Issues', value: counts.issues, color: SERIES[7] },
    { label: 'Closed', value: counts.closed, color: SERIES[6] }, { label: 'Unpaid', value: counts.pending, color: SERIES[4] },
  ].filter((d) => Number(d.value) > 0)

  return (
    <>
      <Head title="Orders · Admin" />
      <PageHeader title="Orders" sub="Every order on Flockr. Open one to cancel, refund, release escrow or add a note." />

      <StatGrid>
        <Stat label="Sales (30 days)" value={stats ? nairaCompact(stats.gmv_30d) : '—'} />
        <Stat label="Flockr fees (30 days)" value={stats ? nairaCompact(stats.flockr_fees_30d) : '—'} />
        <Stat label="Held in escrow" value={stats ? nairaCompact(stats.in_escrow) : '—'} sub="Owed to sellers" tone="warn" onClick={() => list.setParam('escrow', p.escrow === 'held' ? 'all' : 'held')} />
        <Stat label="Failed refunds" value={stats ? num(stats.refund_failed) : '—'} tone={stats?.refund_failed ? 'bad' : undefined}
          sub={stats?.refund_failed ? 'Buyer not repaid yet' : 'None'} onClick={() => list.setParam('refund_failed', p.refund_failed ? '' : '1')} />
      </StatGrid>

      <Grid cols={2}>
        <Card title="Orders by stage" sub="All time">
          {mix.length ? <Donut data={mix} center={{ value: num(counts.all), label: 'Orders' }} valueFormat={num} /> : <Empty title="No orders yet" />}
        </Card>
        <Card title="Needs action" sub="Open items right now">
          <BarChart horizontal valueFormat={num} data={[
            { label: 'To ship', value: counts.todo ?? 0, color: SERIES[3] },
            { label: 'Issues (disputed, failed, returned)', value: counts.issues ?? 0, color: SERIES[7] },
            { label: 'Failed refunds', value: stats?.refund_failed ?? 0, color: SERIES[4] },
          ]} />
        </Card>
      </Grid>

      <Tabs tabs={TABS.map(([k, l]) => [k, l, k === 'all' ? 0 : counts[k]])} value={p.tab} onChange={(v) => list.setParam('tab', v)} />

      <Toolbar>
        <SearchInput value={p.search} onChange={(v) => list.setParam('search', v)} placeholder="Reference, tracking #, buyer or seller…" />
        <Select value={p.escrow} onChange={(v) => list.setParam('escrow', v)} options={ESCROW} />
        <label className="a-select"><span>From</span><input type="date" value={p.from} onChange={(e) => list.setParam('from', e.target.value)} /></label>
        <label className="a-select"><span>To</span><input type="date" value={p.to} onChange={(e) => list.setParam('to', e.target.value)} /></label>
        {p.refund_failed && <Pill tone="bad">Failed refunds only</Pill>}
        {filtered && <Btn size="sm" onClick={() => ['search', 'from', 'to', 'refund_failed'].forEach((k) => list.setParam(k, '')) || list.setParam('escrow', 'all')}>Clear filters</Btn>}
      </Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} onRowClick={go}
          empty={<Empty title="No orders match" sub="Try another tab or clear the filters." />}
          columns={[
            { key: 'reference', label: 'Order', mobile: 'title', render: (o) => <><b style={{ fontFamily: 'monospace' }}>{o.reference}</b><br /><small className="a-mute">{timeAgo(o.created_at)}</small></> },
            { key: 'buyer', label: 'Buyer', render: (o) => <UserCell user={o.buyer} sub={null} href={`/admin/users/${o.buyer?.id}`} /> },
            { key: 'seller', label: 'Seller', render: (o) => <UserCell user={o.seller} sub={null} href={`/admin/users/${o.seller?.id}`} /> },
            { key: 'items_count', label: 'Items', align: 'right', mobile: 'hide' },
            { key: 'total', label: 'Total', align: 'right', render: (o) => <b>{naira(o.payment_total ?? o.total)}</b> },
            { key: 'status', label: 'Status', render: (o) => (
              <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
                <StatusPill status={o.status} />
                {o.refund_status && <Pill tone={REFUND_TONE[o.refund_status] || 'mute'}>Refund {o.refund_status}</Pill>}
              </span>) },
            { key: 'created_at', label: 'Placed', mobile: 'hide', render: (o) => fmtDate(o.created_at) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Orders.layout = (page) => <AdminShell>{page}</AdminShell>
