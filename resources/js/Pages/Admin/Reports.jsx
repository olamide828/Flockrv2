import { Head } from '@inertiajs/react'
import axios from 'axios'
import AdminShell from '@/Components/Admin/AdminShell'
import { useState } from 'react'
import { Btn, Card, DataTable, Drawer, Empty, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, Toolbar, UserCell, useAdmin } from '@/Components/Admin/ui'
import { errMsg, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/reports'
const TONE = { pending: 'warn', actioned: 'good', dismissed: 'mute' }
const TYPES = [['', 'All types'], ['user', 'Users'], ['video', 'Videos'], ['comment', 'Comments'], ['product', 'Products'], ['chat', 'Chats'], ['order', 'Orders'], ['appeal', 'Suspension appeals']]

export default function Reports() {
  const list = useAdminList(API, { search: '', status: 'pending', type: '', sort: 'count' })
  const counts = list.extra.counts || {}
  const { toast, confirm } = useAdmin()

  const resolve = async (r, status) => {
    const f = await confirm({ title: status === 'actioned' ? 'Mark as actioned?' : 'Dismiss report?', message: 'This closes the report. Take any action on the user/content first from their page.', confirmLabel: 'Confirm', danger: status !== 'actioned', fields: [{ key: 'note', label: 'Note (optional)', multiline: true }] })
    if (!f) return
    try { await axios.post(`${API}/${r.id}/resolve`, { status, note: f.note || null }); toast('Report updated'); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }
  const [view, setView] = useState(null)     // the report whose content is open
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async (r) => {
    setLoading(true)
    try { const { data } = await axios.get(`${API}/${r.id}/content`); setContent(data) } catch (e) { toast(errMsg(e), 'error'); setContent(null) } finally { setLoading(false) }
  }
  const open = (r) => {
    if (r.kind === 'order' && r.order_id) { window.location.href = `/admin/orders/${r.order_id}`; return }
    setView(r); setContent(null); load(r)
  }

  const moderate = async (kind, id, action) => {
    const f = await confirm({ title: `${action === 'hide' ? 'Hide' : 'Delete'} this ${kind}?`, message: 'The owner is not emailed automatically — add a clear reason.', confirmLabel: action === 'hide' ? 'Hide' : 'Delete', fields: [{ key: 'reason', label: 'Reason', required: true, multiline: true }] })
    if (!f) return
    try {
      if (action === 'hide') await axios.post(`/api/admin/${kind}s/${id}/moderate`, { action: 'hide', reason: f.reason })
      else await axios.delete(`/api/admin/${kind}s/${id}`, { data: { reason: f.reason } })
      toast('Done'); load(view)
    } catch (e) { toast(errMsg(e), 'error') }
  }
  const delMsg = async (m) => {
    if (!(await confirm({ title: 'Remove this message?', message: 'It disappears from the conversation for both people.', confirmLabel: 'Remove' }))) return
    try { await axios.delete(`${API}/${view.id}/messages/${m.id}`); toast('Message removed'); load(view) } catch (e) { toast(errMsg(e), 'error') }
  }
  const delComment = async () => {
    const f = await confirm({ title: 'Remove this comment?', message: 'The comment and its replies are removed.', confirmLabel: 'Remove', fields: [{ key: 'reason', label: 'Reason (optional)', multiline: true }] })
    if (!f) return
    try { await axios.delete(`${API}/${view.id}/comment`, { data: { reason: f.reason || null } }); toast('Comment removed'); load(view) } catch (e) { toast(errMsg(e), 'error') }
  }
  const suspend = async (u) => {
    const f = await confirm({ title: `Suspend @${u.username}?`, message: 'They are signed out and emailed the reason.', confirmLabel: 'Suspend', fields: [{ key: 'reason', label: 'Reason', required: true, multiline: true }] })
    if (!f) return
    try { await axios.post(`/api/admin/users/${u.id}/suspend`, { reason: f.reason }); toast('User suspended') } catch (e) { toast(errMsg(e), 'error') }
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

      <Drawer open={!!view} onClose={() => { setView(null); setContent(null) }} title={view ? `Report #${view.id} · ${view.kind}` : ''} width={560}>
        {view && (
          <div className="a-stack">
            <Card title="Why it was reported" pad>
              <p style={{ margin: 0 }}>{view.reason}</p>
              <p style={{ margin: '8px 0 0', opacity: .6, fontSize: 12 }}>Reported by {view.reporter ? `@${view.reporter.username}` : 'unknown'}{view.report_count > 1 ? ` · ${view.report_count} reports` : ''}</p>
            </Card>

            {loading && <p>Loading what was reported…</p>}

            {content?.kind === 'video' && (content.video ? (
              <Card title="Reported video" pad>
                {content.video.video_url ? <video src={content.video.video_url} poster={content.video.thumbnail || undefined} controls playsInline style={{ width: '100%', maxHeight: 420, borderRadius: 12, background: '#000' }} /> : content.video.thumbnail && <img src={content.video.thumbnail} alt="" style={{ width: '100%', borderRadius: 12 }} />}
                <p style={{ margin: '10px 0 0' }}><b>{content.video.title}</b>{content.video.caption ? <><br />{content.video.caption}</> : null}</p>
                <p style={{ margin: '6px 0', opacity: .6, fontSize: 12 }}>Status: {content.video.status}{content.video.deleted ? ' · deleted' : ''} · by @{content.video.owner?.username}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {content.video.link && <Btn size="sm" onClick={() => window.open(content.video.link, '_blank')}>Open page</Btn>}
                  <Btn size="sm" kind="danger" onClick={() => moderate('video', content.video.id, 'hide')}>Hide video</Btn>
                  <Btn size="sm" kind="danger" onClick={() => moderate('video', content.video.id, 'delete')}>Delete video</Btn>
                </div>
              </Card>
            ) : <Empty title="Video not found" sub="It may have been permanently removed." />)}

            {content?.kind === 'product' && (content.product ? (
              <Card title="Reported product" pad>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10 }}>{(content.product.images || []).slice(0, 6).map((u, i) => <img key={i} src={u} alt="" style={{ height: 120, borderRadius: 10 }} />)}</div>
                <p style={{ margin: 0 }}><b>{content.product.name}</b> · ₦{Number(content.product.price).toLocaleString()}</p>
                <p style={{ margin: '6px 0', opacity: .75 }}>{content.product.description}</p>
                <p style={{ margin: '6px 0', opacity: .6, fontSize: 12 }}>Status: {content.product.status}{content.product.deleted ? ' · deleted' : ''} · seller @{content.product.seller?.username}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {content.product.link && <Btn size="sm" onClick={() => window.open(content.product.link, '_blank')}>Open page</Btn>}
                  <Btn size="sm" kind="danger" onClick={() => moderate('product', content.product.id, 'hide')}>Hide product</Btn>
                  <Btn size="sm" kind="danger" onClick={() => moderate('product', content.product.id, 'delete')}>Delete product</Btn>
                </div>
              </Card>
            ) : <Empty title="Product not found" sub="It may have been permanently removed." />)}

            {content?.kind === 'comment' && (content.comment ? (
              <Card title="Reported comment" pad>
                <p style={{ margin: 0, opacity: .6, fontSize: 12 }}>by @{content.comment.author?.username} · {timeAgo(content.comment.created_at)}{content.comment.deleted ? ' · already removed' : ''}</p>
                {content.comment.body && <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content.comment.body}</p>}
                {content.comment.image_url && <img src={content.comment.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 12, marginTop: 6 }} />}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {content.comment.link && <Btn size="sm" onClick={() => window.open(content.comment.link, '_blank')}>Open video</Btn>}
                  {!content.comment.deleted && <Btn size="sm" kind="danger" onClick={delComment}>Remove comment</Btn>}
                  {content.comment.author && <Btn size="sm" kind="danger" onClick={() => suspend(content.comment.author)}>Suspend @{content.comment.author.username}</Btn>}
                </div>
              </Card>
            ) : <Empty title="Comment not found" sub="It may have been permanently removed." />)}

            {content?.kind === 'chat' && (
              <Card title={`Conversation (${(content.messages || []).length} messages)`} pad>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                  {(content.messages || []).map((m) => (
                    <div key={m.id} style={{ padding: '8px 10px', borderRadius: 10, background: m.sender_id === view.reported?.id ? 'rgba(239,68,68,.10)' : 'rgba(255,255,255,.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, opacity: .6 }}>
                        <span>@{m.sender?.username || m.sender_id}{m.sender_id === view.reported?.id ? ' (reported)' : ''}</span>
                        <span>{timeAgo(m.created_at)}</span>
                      </div>
                      {m.body && <div style={{ margin: '4px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>}
                      {m.media_url && <a href={m.media_url} target="_blank" rel="noreferrer">Attachment</a>}
                      <div><button onClick={() => delMsg(m)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>Remove message</button></div>
                    </div>
                  ))}
                  {(content.messages || []).length === 0 && <Empty title="No messages" sub="The conversation is empty or was deleted." />}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {(content.participants || []).map((u) => <Btn key={u.id} size="sm" kind="danger" onClick={() => suspend(u)}>Suspend @{u.username}</Btn>)}
                </div>
              </Card>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {view.reported?.id && <Btn size="sm" onClick={() => { window.location.href = `/admin/users/${view.reported.id}` }}>Open @{view.reported.username}</Btn>}
              {view.status === 'pending' && <>
                <Btn size="sm" kind="primary" onClick={() => { resolve(view, 'actioned'); setView(null) }}>Mark actioned</Btn>
                <Btn size="sm" onClick={() => { resolve(view, 'dismissed'); setView(null) }}>Dismiss</Btn>
              </>}
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}
Reports.layout = (page) => <AdminShell>{page}</AdminShell>
