import { Head } from '@inertiajs/react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Empty, Grid, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, Toolbar, UserCell,
} from '@/Components/Admin/ui'
import { BarChart, Donut, SERIES } from '@/Components/Admin/charts'
import { fmtDate, naira, nairaCompact, useAdminList } from '@/Components/Admin/lib'

const TYPES = [['all', 'Credits and debits'], ['credit', 'Credits only'], ['debit', 'Debits only']]
const label = (s) => String(s ?? '').replace(/_/g, ' ')

export default function Ledger() {
  const list = useAdminList('/api/admin/ledger', { search: '', type: 'all', source: 'all', from: '', to: '' })
  const { totals, sources = [] } = list.extra
  const p = list.params

  // CSV export uses the same filters (session cookie authenticates the download).
  const exportCsv = () => {
    const qs = new URLSearchParams(Object.entries({ search: p.search, type: p.type, source: p.source, from: p.from, to: p.to })
      .filter(([, v]) => v && v !== 'all'))
    window.location.href = `/api/admin/ledger/export?${qs}`
  }

  const bySource = Object.entries(list.rows.reduce((a, t) => { a[t.source] = (a[t.source] || 0) + (t.type === 'credit' ? 1 : -1) * Number(t.amount); return a }, {}))
    .map(([s, v]) => ({ label: label(s), value: Math.abs(v), color: v >= 0 ? SERIES[2] : SERIES[1] }))
    .sort((a, b) => b.value - a.value).slice(0, 7)

  return (
    <>
      <Head title="Ledger · Admin" />
      <PageHeader title="Ledger" sub="Every wallet movement on Flockr. Read-only: nothing on this page can change a balance."
        actions={<Btn size="sm" onClick={exportCsv}>Export CSV</Btn>} />

      <StatGrid>
        <Stat label="Credits" value={totals ? nairaCompact(totals.credits) : '—'} sub="Money into wallets (filtered)" tone="good" />
        <Stat label="Debits" value={totals ? nairaCompact(totals.debits) : '—'} sub="Money out of wallets (filtered)" />
        <Stat label="Net" value={totals ? nairaCompact(totals.net) : '—'} sub="Credits minus debits" />
        <Stat label="Owed to sellers" value={totals ? nairaCompact(totals.wallet_liability) : '—'} sub="Sum of every wallet balance, all time" tone="warn" />
      </StatGrid>

      <Grid cols={2}>
        <Card title="Credits vs debits" sub="For the current filters">
          <Donut valueFormat={nairaCompact} center={{ value: totals ? nairaCompact(totals.net) : '—', label: 'Net' }} data={[
            { label: 'Credits', value: totals?.credits ?? 0, color: SERIES[2] }, { label: 'Debits', value: totals?.debits ?? 0, color: SERIES[1] },
          ]} />
        </Card>
        <Card title="Net by source" sub="On this page. Green = money in, orange = money out">
          <BarChart horizontal data={bySource} valueFormat={nairaCompact} />
        </Card>
      </Grid>

      <Toolbar>
        <SearchInput value={p.search} onChange={(v) => list.setParam('search', v)} placeholder="User, order reference or description…" />
        <Select value={p.type} onChange={(v) => list.setParam('type', v)} options={TYPES} />
        <Select value={p.source} onChange={(v) => list.setParam('source', v)} options={[['all', 'Any source'], ...sources.map((s) => [s, label(s)])]} />
        <label className="a-select"><span>From</span><input type="date" value={p.from} onChange={(e) => list.setParam('from', e.target.value)} /></label>
        <label className="a-select"><span>To</span><input type="date" value={p.to} onChange={(e) => list.setParam('to', e.target.value)} /></label>
      </Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload}
          empty={<Empty title="No transactions match" sub="Try widening the dates or clearing a filter." />}
          columns={[
            { key: 'user', label: 'Wallet owner', mobile: 'title', render: (t) => <UserCell user={t.user} sub={null} /> },
            { key: 'type', label: 'Type', render: (t) => <Pill tone={t.type === 'credit' ? 'good' : 'warn'}>{t.type}</Pill> },
            { key: 'amount', label: 'Amount', align: 'right', render: (t) => <b style={{ color: t.type === 'credit' ? 'var(--good)' : undefined }}>{t.type === 'credit' ? '+' : '-'}{naira(t.amount, 2)}</b> },
            { key: 'source', label: 'Source', render: (t) => <span style={{ textTransform: 'capitalize' }}>{label(t.source)}</span> },
            { key: 'order', label: 'Order', render: (t) => t.order ? <a href={`/admin/orders/${t.order.id}`} style={{ fontFamily: 'monospace' }}>{t.order.reference}</a> : '—' },
            { key: 'description', label: 'Description', mobile: 'hide', render: (t) => <small className="a-mute">{t.description || '—'}</small> },
            { key: 'balance_after', label: 'Balance after', align: 'right', mobile: 'hide', render: (t) => naira(t.balance_after, 2) },
            { key: 'created_at', label: 'When', render: (t) => fmtDate(t.created_at, true) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Ledger.layout = (page) => <AdminShell>{page}</AdminShell>
