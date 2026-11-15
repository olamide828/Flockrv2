import { Head } from '@inertiajs/react'
import axios from 'axios'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Empty, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, Toolbar, UserCell, useAdmin } from '@/Components/Admin/ui'
import { errMsg, fmtDate, num, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/videos'
const TONE = { active: 'good', pending: 'warn', processing: 'warn', archived: 'mute', failed: 'bad', deleted: 'bad' }

export default function Videos() {
  const list = useAdminList(API, { search: '', status: '' })
  const counts = list.extra.counts || {}
  const { toast, confirm } = useAdmin()

  const act = async (v, action, needReason) => {
    let reason
    if (needReason) {
      const f = await confirm({ title: `${action === 'reject' ? 'Reject' : 'Hide'} this video?`, message: 'The creator is not told automatically. Give a reason for the audit log.', confirmLabel: 'Continue', fields: [{ key: 'reason', label: 'Reason', multiline: true, required: true }] })
      if (!f?.reason) return
      reason = f.reason
    }
    try { const r = await axios.post(`${API}/${v.id}/moderate`, { action, reason }); toast(r.data.message || 'Done'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }
  const del = async (v) => {
    const f = await confirm({ title: 'Delete video?', message: 'Soft-deletes the video. It can be restored.', confirmLabel: 'Delete', fields: [{ key: 'reason', label: 'Reason', multiline: true, required: true }] })
    if (!f?.reason) return
    try { await axios.delete(`${API}/${v.id}`, { data: { reason: f.reason } }); toast('Video deleted'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }

  return (
    <>
      <Head title="Videos · Admin" />
      <PageHeader title="Videos" sub="Moderate, feature or remove videos" />
      <StatGrid>
        {['active', 'pending', 'archived', 'deleted'].map((s) => <Stat key={s} label={s[0].toUpperCase() + s.slice(1)} value={num(counts[s] || 0)} onClick={() => list.setParam('status', list.params.status === s ? '' : s)} />)}
      </StatGrid>
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search title, @creator or video id…" />
        <Select value={list.params.status} onChange={(v) => list.setParam('status', v)} options={[['', 'Any status'], ['active', 'Active'], ['pending', 'Pending'], ['archived', 'Hidden'], ['deleted', 'Deleted']]} />
      </Toolbar>
      <Card pad={false}>
        <DataTable {...list} onRetry={list.reload} empty={<Empty title="No videos" sub="Nothing matches these filters." />}
          columns={[
            { key: 'v', label: 'Video', mobile: 'title', render: (v) => (
              <a href={v.watch_url || '#'} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
                {v.thumbnail ? <img src={v.thumbnail} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 8 }} /> : <div style={{ width: 40, height: 56, borderRadius: 8, background: 'rgba(255,255,255,.06)' }} />}
                <span>{v.title || 'Untitled'}{v.is_featured && <> <Pill tone="violet">Featured</Pill></>}</span>
              </a>) },
            { key: 'u', label: 'Creator', render: (v) => v.user ? <UserCell user={v.user} /> : '—' },
            { key: 's', label: 'Status', render: (v) => <Pill tone={TONE[v.status] || 'mute'}>{v.status}</Pill> },
            { key: 'e', label: 'Likes / comments', mobile: 'hide', render: (v) => `${num(v.likes_count)} / ${num(v.comments_count)}` },
            { key: 'c', label: 'Posted', render: (v) => fmtDate(v.created_at) },
            { key: 'a', label: '', render: (v) => (
              <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                {v.status === 'deleted' || v.status === 'archived' ? <Btn size="sm" onClick={() => act(v, 'restore')}>Restore</Btn> : <Btn size="sm" onClick={() => act(v, 'hide', true)}>Hide</Btn>}
                {v.status === 'pending' && <Btn size="sm" kind="primary" onClick={() => act(v, 'approve')}>Approve</Btn>}
                {v.status === 'active' && <Btn size="sm" onClick={() => act(v, v.is_featured ? 'unfeature' : 'feature')}>{v.is_featured ? 'Unfeature' : 'Feature'}</Btn>}
                {v.status !== 'deleted' && <Btn size="sm" kind="danger" onClick={() => del(v)}>Delete</Btn>}
              </span>) },
          ]} />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Videos.layout = (page) => <AdminShell>{page}</AdminShell>
