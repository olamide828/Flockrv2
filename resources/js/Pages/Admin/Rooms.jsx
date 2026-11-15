import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Drawer, Empty, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, Toolbar, UserCell, useAdmin } from '@/Components/Admin/ui'
import { errMsg, fmtDate, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/rooms'

function Messages({ room, onClose }) {
  const [rows, setRows] = useState(null)
  const { toast, confirm } = useAdmin()
  const load = () => axios.get(`${API}/${room.id}/messages`).then((r) => setRows(r.data.rows || r.data.data || r.data.messages || [])).catch((e) => toast(errMsg(e), 'error'))
  if (rows === null) load()
  const remove = async (m) => {
    const f = await confirm({ title: 'Remove message?', confirmLabel: 'Remove', fields: [{ key: 'reason', label: 'Reason', required: true }] })
    if (!f?.reason) return
    try { await axios.delete(`${API}/${room.id}/messages/${m.id}`, { data: { reason: f.reason } }); toast('Message removed'); load() } catch (e) { toast(errMsg(e), 'error') }
  }
  return (
    <Drawer open title={room.name} onClose={onClose}>
      {rows === null ? 'Loading…' : rows.length === 0 ? <Empty title="No messages" sub="This room is quiet." /> : rows.map((m) => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <div><b>@{m.user?.username ?? m.username ?? 'user'}</b> <small>{timeAgo(m.created_at)}</small><div style={{ opacity: m.is_deleted ? .4 : 1 }}>{m.is_deleted ? '(removed)' : (m.body ?? m.content ?? '[media]')}</div></div>
          {!m.is_deleted && <Btn size="sm" kind="danger" onClick={() => remove(m)}>Remove</Btn>}
        </div>))}
    </Drawer>
  )
}

export default function Rooms() {
  const list = useAdminList(API, { search: '', visibility: '', status: '' })
  const st = list.extra.stats
  const { toast, confirm } = useAdmin()
  const [view, setView] = useState(null)

  const close = async (r) => {
    const f = await confirm({ title: `Close “${r.name}”?`, message: 'Members can no longer post. You can restore it later.', confirmLabel: 'Close room', fields: [{ key: 'reason', label: 'Reason', multiline: true, required: true }] })
    if (!f?.reason) return
    try { await axios.post(`${API}/${r.id}/close`, { reason: f.reason }); toast('Room closed'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }
  const restore = async (r) => { try { await axios.post(`${API}/${r.id}/restore`); toast('Room restored'); list.reload() } catch (e) { toast(errMsg(e), 'error') } }

  return (
    <>
      <Head title="Rooms · Admin" />
      <PageHeader title="Community rooms" sub="Seller rooms and their conversations" />
      <StatGrid>
        <Stat label="Rooms" value={st ? num(st.total) : '—'} />
        <Stat label="Private" value={st ? num(st.private) : '—'} onClick={() => list.setParam('visibility', 'private')} />
        <Stat label="Closed" value={st ? num(st.closed) : '—'} tone={st?.closed ? 'warn' : undefined} onClick={() => list.setParam('status', 'closed')} />
        <Stat label="Messages (24h)" value={st ? num(st.messages_24h) : '—'} />
      </StatGrid>
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search room or owner…" />
        <Select value={list.params.visibility} onChange={(v) => list.setParam('visibility', v)} options={[['', 'All'], ['public', 'Public'], ['private', 'Private']]} />
        <Select value={list.params.status} onChange={(v) => list.setParam('status', v)} options={[['', 'Any status'], ['open', 'Open'], ['closed', 'Closed']]} />
      </Toolbar>
      <Card pad={false}>
        <DataTable {...list} onRetry={list.reload} onRowClick={setView} empty={<Empty title="No rooms" sub="Nothing matches these filters." />}
          columns={[
            { key: 'n', label: 'Room', mobile: 'title', render: (r) => <span>{r.name} {r.is_private && <Pill tone="mute">Private</Pill>} {r.closed && <Pill tone="bad">Closed</Pill>}</span> },
            { key: 'o', label: 'Owner', render: (r) => r.owner?.username ? <UserCell user={r.owner} /> : '—' },
            { key: 'm', label: 'Members', render: (r) => num(r.members_count) },
            { key: 'd', label: 'Msgs 24h', mobile: 'hide', render: (r) => num(r.messages_24h) },
            { key: 'x', label: 'Removed', mobile: 'hide', render: (r) => num(r.removed_total) },
            { key: 'c', label: 'Created', mobile: 'hide', render: (r) => fmtDate(r.created_at) },
            { key: 'a', label: '', render: (r) => (list.extra.can_close !== false) && (
              <span onClick={(e) => e.stopPropagation()}>{r.closed ? <Btn size="sm" onClick={() => restore(r)}>Restore</Btn> : <Btn size="sm" kind="danger" onClick={() => close(r)}>Close</Btn>}</span>) },
          ]} />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
      {view && <Messages room={view} onClose={() => setView(null)} />}
    </>
  )
}
Rooms.layout = (page) => <AdminShell>{page}</AdminShell>
