import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useEffect, useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Drawer, Empty, PageHeader, Pager, Pill, SearchInput, Stat, StatGrid, Tabs, Toolbar, UserCell, useAdmin } from '@/Components/Admin/ui'
import { errMsg, fmtDate, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const SCOPES = [{ value: 'all', label: 'Everything (DMs and rooms)' }, { value: 'dm', label: 'Direct messages only' }, { value: 'rooms', label: 'Community rooms only' }]

function useRestrict(onDone) {
  const { toast, confirm } = useAdmin()
  return async (user) => {
    const f = await confirm({
      title: `Restrict @${user.username}?`, message: 'They will not be able to send messages. They see the reason you give.', confirmLabel: 'Restrict', danger: true,
      fields: [
        { key: 'scope', label: 'What to restrict', value: 'all', options: SCOPES },
        { key: 'days', label: 'For how many days (leave empty = until you lift it)', type: 'number' },
        { key: 'reason', label: 'Reason', multiline: true, required: true },
      ],
    })
    if (!f?.reason) return
    try {
      await axios.post('/api/admin/chats/restrict', { user_id: user.id, scope: f.scope, days: f.days ? Number(f.days) : null, reason: f.reason })
      toast('Chat restricted'); onDone?.()
    } catch (e) { toast(errMsg(e), 'error') }
  }
}

function Thread({ chat, onClose, onChanged }) {
  const { toast, confirm } = useAdmin()
  const [rows, setRows] = useState(null)
  const [more, setMore] = useState(false)
  const restrict = useRestrict(onChanged)

  const load = (before) => axios.get(`/api/admin/chats/${chat.id}/messages`, { params: before ? { before } : {} })
    .then((r) => { const m = r.data.messages || []; setMore(m.length === 40); setRows((p) => (before ? [...(p || []), ...m] : m)) })
    .catch((e) => toast(errMsg(e), 'error'))
  useEffect(() => { load() }, [chat.id]) // eslint-disable-line

  const remove = async (m) => {
    const f = await confirm({ title: 'Remove this message?', confirmLabel: 'Remove', fields: [{ key: 'reason', label: 'Reason', required: true }] })
    if (!f?.reason) return
    try { await axios.delete(`/api/admin/chats/${chat.id}/messages/${m.id}`, { data: { reason: f.reason } }); toast('Message removed'); load() } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <Drawer open title={chat.people.map((p) => '@' + p.username).join(' · ')} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {chat.people.map((p) => <Btn key={p.id} size="sm" kind="danger" onClick={() => restrict(p)}>Restrict @{p.username}</Btn>)}
      </div>
      <p style={{ opacity: .55, fontSize: 12, margin: '0 0 10px' }}>Opening a conversation is recorded in the audit log.</p>
      {rows === null ? 'Loading…' : rows.length === 0 ? <Empty title="No messages" /> : rows.map((m) => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <b>@{m.username ?? 'user'}</b> <small>{timeAgo(m.created_at)}</small>
            {m.is_deleted ? <Pill tone="mute">removed</Pill> : null}
            <div style={{ opacity: m.is_deleted ? .55 : 1, wordBreak: 'break-word' }}>{m.body || (m.media_url ? '' : '—')}</div>
            {m.media_url && (m.media_type === 'video'
              ? <video src={m.media_url} controls style={{ maxWidth: 220, borderRadius: 10, marginTop: 6 }} />
              : <img src={m.media_url} alt="" style={{ maxWidth: 220, borderRadius: 10, marginTop: 6 }} />)}
          </div>
          {!m.is_deleted && <Btn size="sm" kind="danger" onClick={() => remove(m)}>Remove</Btn>}
        </div>))}
      {more && <div style={{ textAlign: 'center', marginTop: 12 }}><Btn onClick={() => load(rows[rows.length - 1]?.id)}>Older messages</Btn></div>}
    </Drawer>
  )
}

function Conversations() {
  const list = useAdminList('/api/admin/chats', { search: '', filter: '' })
  const st = list.extra.stats
  const [view, setView] = useState(null)
  return (
    <>
      <StatGrid>
        <Stat label="Conversations" value={st ? num(st.conversations) : '—'} />
        <Stat label="Messages (24h)" value={st ? num(st.messages_24h) : '—'} />
        <Stat label="Restricted people" value={st ? num(st.restricted) : '—'} tone={st?.restricted ? 'warn' : undefined} onClick={() => list.setParam('filter', 'restricted')} />
      </StatGrid>
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search a username or name…" />
        {list.params.filter ? <Btn size="sm" onClick={() => list.setParam('filter', '')}>Clear filter</Btn> : null}
      </Toolbar>
      <Card pad={false}>
        <DataTable {...list} onRetry={list.reload} onRowClick={setView} empty={<Empty title="No conversations" sub="Nothing matches." />}
          columns={[
            { key: 'p', label: 'People', mobile: 'title', render: (r) => <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{r.people.map((p) => <UserCell key={p.id} user={p} />)}</span> },
            { key: 'm', label: 'Messages', render: (r) => num(r.messages) },
            { key: 'x', label: 'Removed', mobile: 'hide', render: (r) => num(r.removed) },
            { key: 'l', label: 'Last activity', render: (r) => timeAgo(r.last_at) },
          ]} />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
      {view && <Thread chat={view} onClose={() => setView(null)} onChanged={list.reload} />}
    </>
  )
}

function Restrictions() {
  const list = useAdminList('/api/admin/chats/restrictions', {})
  const { toast, confirm } = useAdmin()
  const lift = async (r) => {
    const f = await confirm({ title: `Lift the restriction on @${r.user?.username}?`, confirmLabel: 'Lift', danger: false })
    if (!f) return
    try { await axios.post(`/api/admin/chats/restrictions/${r.id}/lift`); toast('Restriction lifted'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }
  return (
    <Card pad={false}>
      <DataTable {...list} onRetry={list.reload} empty={<Empty title="No restrictions" sub="Open a conversation to restrict someone." />}
        columns={[
          { key: 'u', label: 'Person', mobile: 'title', render: (r) => <UserCell user={r.user} /> },
          { key: 's', label: 'Scope', render: (r) => r.scope === 'all' ? 'Everything' : r.scope === 'dm' ? 'DMs' : 'Rooms' },
          { key: 'r', label: 'Reason', mobile: 'hide', render: (r) => r.reason },
          { key: 'e', label: 'Until', render: (r) => r.until ? fmtDate(r.until) : 'Until lifted' },
          { key: 'a', label: 'Status', render: (r) => r.active ? <Pill tone="bad">Active</Pill> : <Pill tone="mute">{r.lifted_at ? 'Lifted' : 'Expired'}</Pill> },
          { key: 'b', label: '', render: (r) => r.active && <Btn size="sm" onClick={() => lift(r)}>Lift</Btn> },
        ]} />
      <Pager meta={list.meta} onPage={list.setPage} />
    </Card>
  )
}

export default function Chats() {
  const [tab, setTab] = useState('chats')
  return (
    <>
      <Head title="Direct messages · Admin" />
      <PageHeader title="Direct messages" sub="Read reported conversations, remove messages, and restrict chat" />
      <Tabs tabs={[['chats', 'Conversations'], ['restrictions', 'Restrictions']]} value={tab} onChange={setTab} />
      {tab === 'chats' ? <Conversations /> : <Restrictions />}
    </>
  )
}
Chats.layout = (page) => <AdminShell>{page}</AdminShell>
