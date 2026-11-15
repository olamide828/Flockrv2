import { Head } from '@inertiajs/react'
import axios from 'axios'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Empty, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, Toolbar, UserCell, useAdmin } from '@/Components/Admin/ui'
import { errMsg, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/reports'
const TONE = { pending: 'warn', actioned: 'good', dismissed: 'mute' }
const TYPES = [['', 'All types'], ['user', 'Users'], ['video', 'Videos'], ['product', 'Products'], ['chat', 'Chats'], ['order', 'Orders'], ['appeal', 'Suspension appeals']]

export default function Reports() {
  const list = useAdminList(API, { search: '', status: 'pending', type: '', sort: 'count' })
  const counts = list.extra.counts || {}
  const { toast, confirm } = useAdmin()

  const resolve = async (r, status) => {
    const f = await confirm({ title: status === 'actioned' ? 'Mark as actioned?' : 'Dismiss report?', message: 'This closes the report. Take any action on the user/content first from their page.', confirmLabel: 'Confirm', danger: status !== 'actioned', fields: [{ key: 'note', label: 'Note (optional)', multiline: true }] })
    if (!f) return
    try { await axios.post(`${API}/${r.id}/resolve`, { status, note: f.note || null }); toast('Report updated'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }
  const open = (r) => {
    if (r.kind === 'order' && r.order_id) window.location.href = `/admin/orders/${r.order_id}`
    else if (r.reported?.id) window.location.href = `/admin/users/${r.reported.id}`
  }

  return (
    <>
      <Head title="Reports · Admin" />
      <PageHeader title="Reports" sub="User reports and suspension appeals" />
      <StatGrid>
        {['pending', 'actioned', 'dismissed'].map((s) => <Stat key={s} label={s[0].toUpperCase() + s.slice(1)} value={num(counts[s] || 0)} tone={s === 'pending' && counts.pending ? 'warn' : undefined} onClick={() => list.setParam('status', s)} />)}
      </StatGrid>
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search reason or @username…" />
        <Select value={list.params.type} onChange={(v) => list.setParam('type', v)} options={TYPES} />
        <Select value={list.params.sort} onChange={(v) => list.setParam('sort', v)} options={[['count', 'Most reported'], ['', 'Newest'], ['oldest', 'Oldest']]} />
      </Toolbar>
      <Card pad={false}>
        <DataTable {...list} onRetry={list.reload} onRowClick={open} empty={<Empty title="Nothing to review" sub="No reports match these filters." />}
          columns={[
            { key: 'r', label: 'Report', mobile: 'title', render: (r) => <span><Pill tone="info">{r.kind}</Pill> {r.reason}{r.report_count > 1 && <> <Pill tone="bad">×{r.report_count}</Pill></>}</span> },
            { key: 'd', label: 'Reported', render: (r) => r.reported ? <UserCell user={r.reported} /> : '—' },
            { key: 'b', label: 'By', mobile: 'hide', render: (r) => r.reporter ? `@${r.reporter.username}` : '—' },
            { key: 's', label: 'Status', render: (r) => <Pill tone={TONE[r.status] || 'mute'}>{r.status}</Pill> },
            { key: 'u', label: 'Updated', mobile: 'hide', render: (r) => timeAgo(r.updated_at) },
            { key: 'a', label: '', render: (r) => r.status === 'pending' && (
              <span style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <Btn size="sm" kind="primary" onClick={() => resolve(r, 'actioned')}>Actioned</Btn>
                <Btn size="sm" onClick={() => resolve(r, 'dismissed')}>Dismiss</Btn>
              </span>) },
          ]} />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Reports.layout = (page) => <AdminShell>{page}</AdminShell>
