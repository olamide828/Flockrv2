import { Head } from '@inertiajs/react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Card, PageHeader, Toolbar, SearchInput, Select, DataTable, Pager, Pill, UserCell, Drawer, KV } from '@/Components/Admin/ui'
import { useAdminList, fmtDate, timeAgo } from '@/Components/Admin/lib'
import { useState } from 'react'

const TARGETS = [['all', 'All targets'], ['order', 'Orders'], ['user', 'Users'], ['video', 'Videos'], ['payout', 'Payouts'], ['dispute', 'Disputes'], ['product', 'Products']]
const LINK = { order: 'orders', user: 'users' }

export default function Audit() {
  const list = useAdminList('/api/admin/audit-logs', { search: '', action: 'all', target_type: 'all' })
  const [sel, setSel] = useState(null)
  const actions = [['all', 'All actions'], ...(list.extra.actions ?? []).map((a) => [a, a])]

  return (
    <>
      <Head title="Audit log · Admin" />
      <PageHeader title="Audit log" sub="Every action an admin takes, who did it and when" />
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search action or target id…" />
        <Select value={list.params.action} onChange={(v) => list.setParam('action', v)} options={actions} />
        <Select value={list.params.target_type} onChange={(v) => list.setParam('target_type', v)} options={TARGETS} />
      </Toolbar>
      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} onRowClick={setSel}
          columns={[
            { key: 'action', label: 'Action', mobile: 'title', render: (l) => <b>{l.action}</b> },
            { key: 'admin', label: 'Admin', render: (l) => l.admin ? <UserCell user={l.admin} /> : <span className="a-mute">System</span> },
            { key: 'target', label: 'Target', render: (l) => l.target_type ? (LINK[l.target_type] ? <a href={`/admin/${LINK[l.target_type]}/${l.target_id}`} onClick={(e) => e.stopPropagation()}><Pill tone="info">{l.target_type} #{l.target_id}</Pill></a> : <Pill tone="mute">{l.target_type} #{l.target_id}</Pill>) : '—' },
            { key: 'created_at', label: 'When', render: (l) => timeAgo(l.created_at) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.action ?? ''}>
        {sel && <>
          <KV items={[['Admin', sel.admin?.name ?? 'System'], ['When', fmtDate(sel.created_at, true)], ['Target', sel.target_type ? `${sel.target_type} #${sel.target_id}` : '—'], ['IP', sel.ip]]} />
          <h4 style={{ margin: '20px 0 8px' }}>Details</h4>
          <pre style={{ background: 'rgba(255,255,255,.05)', padding: 12, borderRadius: 10, overflow: 'auto', fontSize: 12 }}>{sel.meta ? JSON.stringify(sel.meta, null, 2) : 'No extra details.'}</pre>
        </>}
      </Drawer>
    </>
  )
}
Audit.layout = (page) => <AdminShell>{page}</AdminShell>
