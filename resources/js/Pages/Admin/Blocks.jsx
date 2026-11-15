import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Empty, Grid, PageHeader, Pager, SearchInput, Stat, StatGrid, Toolbar, UserCell, useAdmin } from '@/Components/Admin/ui'
import { BarChart } from '@/Components/Admin/charts'
import { errMsg, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/people/blocks'
const mk = (r, p) => ({ id: r[`${p}_id`], name: r[`${p}_name`], username: r[`${p}_username`], avatar: r[`${p}_avatar`] })

export default function Blocks() {
  const list = useAdminList(API, { search: '' })
  const { toast, confirm } = useAdmin()
  const [busy, setBusy] = useState(null)
  const top = list.extra.top || []
  const total = list.extra.stats?.total

  const remove = async (r) => {
    const a = mk(r, 'blocker'), b = mk(r, 'blocked')
    if (!(await confirm({ title: 'Remove this block?', message: `${a.name} will no longer be blocking ${b.name}. They will be able to see and message each other again.`, confirmLabel: 'Remove block' }))) return
    const key = `${r.blocker_id}-${r.blocked_id}`
    setBusy(key)
    try { const res = await axios.delete(`${API}/${r.blocker_id}/${r.blocked_id}`); toast(res.data?.message || 'Block removed'); list.reload() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(null) }
  }

  return (
    <>
      <Head title="Blocks · Admin" />
      <PageHeader title="Blocks" sub="Who has blocked whom. Accounts blocked by many people are an abuse signal." />

      <StatGrid>
        <Stat label="Total blocks" value={total != null ? num(total) : '—'} />
        <Stat label="Most blocked" value={top[0] ? `@${top[0].username}` : '—'} sub={top[0] ? `${num(top[0].blocks)} blocks` : undefined} tone={top[0]?.blocks >= 10 ? 'warn' : undefined}
          onClick={top[0] ? () => { window.location.href = `/admin/users/${top[0].id}` } : undefined} />
      </StatGrid>

      <Grid cols={2}>
        <Card title="Most-blocked accounts" sub="Click a bar label’s owner in the table to review them">
          <BarChart horizontal valueFormat={num} data={top.map((u) => ({ label: `@${u.username}`, value: u.blocks, sub: u.name }))} />
        </Card>
        <Card title="How to read this" sub="Blocks are private; this is the only place they show together">
          <p className="a-mute" style={{ margin: 0 }}>One block is normal. A seller blocked by many different people is worth opening: check their reports, orders and warnings. Removing a block restores contact between the two accounts only.</p>
        </Card>
      </Grid>

      <div style={{ height: 16 }} />
      <Toolbar><SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search blocker or blocked name / @username…" /></Toolbar>
      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} rowKey={(r) => `${r.blocker_id}-${r.blocked_id}`}
          empty={<Empty title="No blocks" sub="Nobody has blocked anyone matching this search." />}
          rowActions={(r) => <Btn size="sm" kind="danger" busy={busy === `${r.blocker_id}-${r.blocked_id}`} onClick={() => remove(r)}>Remove</Btn>}
          columns={[
            { key: 'blocker', label: 'Blocker', mobile: 'title', render: (r) => <UserCell user={mk(r, 'blocker')} /> },
            { key: 'blocked', label: 'Blocked', render: (r) => <UserCell user={mk(r, 'blocked')} /> },
            { key: 'created_at', label: 'When', render: (r) => timeAgo(r.created_at) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Blocks.layout = (page) => <AdminShell>{page}</AdminShell>
