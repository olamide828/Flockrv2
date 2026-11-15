import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Drawer, Empty, Grid, PageHeader, Pager, Pill, SearchInput, Skeleton, Stat, StatGrid, Toolbar, UserCell, ErrorBox, useAdmin } from '@/Components/Admin/ui'
import { BarChart } from '@/Components/Admin/charts'
import { errMsg, num, useAdminFetch, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/people/badges'

const BadgeImg = ({ b, size = 36 }) => {
  const [bad, setBad] = useState(false)
  return bad || !b.image_path
    ? <span className="a-av ph" style={{ width: size, height: size, borderRadius: 10, fontSize: size * 0.4 }}>{(b.label || '?').slice(0, 1)}</span>
    : <img src={`/${String(b.image_path).replace(/^\//, '')}`} alt="" onError={() => setBad(true)} style={{ width: size, height: size, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }} />
}
const BadgeCell = ({ b }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
    <BadgeImg b={b} />
    <span><b>{b.label}</b><br /><small className="a-mute">{b.description || b.key}</small></span>
  </span>
)

function Holders({ badge, onChanged }) {
  const { data, loading, error, reload } = useAdminFetch(`${API}/${badge.id}/holders`, {}, [badge.id])
  const { toast, confirm } = useAdmin()
  const [busy, setBusy] = useState(false)
  const run = async (fn, ok) => {
    setBusy(true)
    try { const r = await fn(); toast(r?.data?.message || ok); reload(); onChanged() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }
  const award = async () => {
    const v = await confirm({ title: `Award “${badge.label}”`, message: 'Enter the numeric user ID (visible in the user’s admin URL).', confirmLabel: 'Award', danger: false, fields: [{ key: 'user_id', label: 'User ID', type: 'number', required: true }] })
    if (v) run(() => axios.post(`${API}/${badge.id}/award`, { user_id: Number(v.user_id) }), 'Badge awarded')
  }
  const revoke = async (u) => { if (await confirm({ title: `Revoke from ${u.name}?`, message: 'They lose this badge immediately.', confirmLabel: 'Revoke' })) run(() => axios.delete(`${API}/${badge.id}/holders/${u.id}`), 'Badge revoked') }
  if (loading && !data) return <Skeleton />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  const holders = data?.holders || []
  return (
    <div className="a-stack">
      <BadgeCell b={badge} />
      <div><Btn kind="primary" size="sm" onClick={award} busy={busy}>Award to a user</Btn></div>
      {holders.length === 0 ? <Empty title="No holders yet" sub="Nobody has this badge." /> : holders.map((u) => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <UserCell user={u} />
          <Btn size="sm" kind="danger" onClick={() => revoke(u)} busy={busy}>Revoke</Btn>
        </div>
      ))}
      {holders.length >= 100 && <small className="a-mute">Showing the 100 most recent holders.</small>}
    </div>
  )
}

export default function Badges() {
  const list = useAdminList(API, { search: '' })
  const { toast, confirm } = useAdmin()
  const [sel, setSel] = useState(null)

  const fields = (b = {}) => [
    { key: 'label', label: 'Name', value: b.label, required: true },
    { key: 'description', label: 'Description', value: b.description, multiline: true },
    { key: 'image_path', label: 'Image path (e.g. badges/custom.png)', value: b.image_path },
  ]
  const save = async (b) => {
    const v = await confirm({ title: b ? `Edit “${b.label}”` : 'Create a badge', confirmLabel: b ? 'Save' : 'Create', danger: false, fields: fields(b || {}) })
    if (!v) return
    try {
      const r = b ? await axios.put(`${API}/${b.id}`, v) : await axios.post(API, v)
      toast(r.data?.message || 'Saved'); list.reload()
    } catch (e) { toast(errMsg(e), 'error') }
  }

  const total = list.meta?.total
  const awarded = list.rows.reduce((a, b) => a + (b.users_count || 0), 0)
  const custom = list.rows.filter((b) => String(b.key).startsWith('custom_')).length
  const topBadges = [...list.rows].sort((a, b) => (b.users_count || 0) - (a.users_count || 0)).slice(0, 8).filter((b) => b.users_count > 0)

  return (
    <>
      <Head title="Badges · Admin" />
      <PageHeader title="Badges" sub="Catalog of badges and who holds them. Event champion badges are still awarded automatically."
        actions={<Btn kind="primary" onClick={() => save(null)}>New badge</Btn>} />

      <StatGrid>
        <Stat label="Badges" value={total != null ? num(total) : '—'} />
        <Stat label="Awarded (this page)" value={num(awarded)} />
        <Stat label="Custom (this page)" value={num(custom)} />
      </StatGrid>

      <Card title="Most awarded" sub="Holders per badge, current page" >
        <BarChart horizontal valueFormat={num} data={topBadges.map((b) => ({ label: b.label, value: b.users_count }))} />
      </Card>

      <div style={{ height: 16 }} />
      <Toolbar><SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search badge name or key…" /></Toolbar>
      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} onRowClick={setSel}
          empty={<Empty title="No badges" sub="Create the first one." action={<Btn kind="primary" onClick={() => save(null)}>New badge</Btn>} />}
          rowActions={(b) => <Btn size="sm" onClick={() => save(b)}>Edit</Btn>}
          columns={[
            { key: 'label', label: 'Badge', mobile: 'title', render: (b) => <BadgeCell b={b} /> },
            { key: 'key', label: 'Key', mobile: 'hide', render: (b) => <span className="mono a-mute">{b.key}</span> },
            { key: 'kind', label: 'Type', render: (b) => <Pill tone={String(b.key).startsWith('custom_') ? 'violet' : 'info'}>{String(b.key).startsWith('custom_') ? 'custom' : 'system'}</Pill> },
            { key: 'users_count', label: 'Holders', align: 'right', render: (b) => num(b.users_count) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>

      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.label} · holders` : ''}>
        {sel && <Holders badge={sel} onChanged={list.reload} />}
      </Drawer>
    </>
  )
}
Badges.layout = (page) => <AdminShell>{page}</AdminShell>
