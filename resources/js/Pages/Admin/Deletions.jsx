import { Head } from '@inertiajs/react'
import axios from 'axios'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Empty, PageHeader, Pager, Pill, SearchInput, Select, Stat, StatGrid, Toolbar, useAdmin } from '@/Components/Admin/ui'
import { errMsg, fmtDate, num, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/deletions'

export default function Deletions() {
  const list = useAdminList(API, { search: '', status: '' })
  const st = list.extra.stats
  const { toast, confirm } = useAdmin()

  const call = async (fn, ok) => { try { const { data } = await fn(); toast(data?.message || ok); list.reload() } catch (e) { toast(errMsg(e), 'error') } }

  const hold = async (r) => {
    const f = await confirm({ title: 'Place a legal hold?', message: 'A held account is never purged, even after its date.', confirmLabel: 'Place hold', fields: [{ key: 'reason', label: 'Reason (case / request reference)', multiline: true, required: true }] })
    if (f?.reason) call(() => axios.post(`${API}/${r.id}/hold`, { reason: f.reason }), 'Hold placed')
  }
  const release = async (r) => {
    const f = await confirm({ title: 'Release the hold?', message: 'The account will be purged on its scheduled date.', confirmLabel: 'Release', fields: [{ key: 'reason', label: 'Reason', multiline: true }] })
    if (f) call(() => axios.post(`${API}/${r.id}/release`, { reason: f.reason }), 'Hold released')
  }
  const restore = async (r) => {
    const f = await confirm({ title: `Restore ${r.name || 'this account'}?`, message: 'Content comes back. Bank details and follows do not. The user signs in with "Forgot password".', confirmLabel: 'Restore', fields: [{ key: 'username', label: `Username (leave empty for @${r.username || 'a new one'})` }, { key: 'reason', label: 'Reason', multiline: true }] })
    if (f) call(() => axios.post(`${API}/${r.id}/restore`, { username: f.username || undefined, reason: f.reason }), 'Account restored')
  }
  const purge = async (r) => {
    const f = await confirm({ title: 'Purge now?', message: 'Personal data is deleted immediately and cannot be undone.', confirmLabel: 'Purge', fields: [{ key: 'reason', label: 'Reason', multiline: true, required: true }] })
    if (f?.reason) call(() => axios.post(`${API}/${r.id}/purge`, { reason: f.reason }), 'Purged')
  }

  const statusPill = (r) => r.purged_at ? <Pill tone="mute">Purged</Pill>
    : r.legal_hold ? <Pill tone="warn">Legal hold</Pill>
    : r.days_left != null && r.days_left <= 0 ? <Pill tone="bad">Due now</Pill>
    : <Pill tone="info">{r.days_left ?? '?'}d left</Pill>

  return (
    <>
      <Head title="Account deletions · Admin" />
      <PageHeader title="Account deletions" sub="People who deleted their account: grace period, legal hold, restore" />
      <StatGrid>
        <Stat label="Waiting" value={st ? num(st.waiting) : '—'} onClick={() => list.setParam('status', 'pending')} />
        <Stat label="Due now" value={st ? num(st.due) : '—'} tone={st?.due ? 'warn' : undefined} onClick={() => list.setParam('status', 'due')} />
        <Stat label="Legal hold" value={st ? num(st.held) : '—'} onClick={() => list.setParam('status', 'held')} />
        <Stat label="Purged" value={st ? num(st.purged) : '—'} onClick={() => list.setParam('status', 'purged')} />
      </StatGrid>
      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Name, email, old username or ID…" />
        <Select value={list.params.status} onChange={(v) => list.setParam('status', v)} options={[['', 'All'], ['pending', 'Waiting'], ['due', 'Due now'], ['held', 'Legal hold'], ['purged', 'Purged']]} />
      </Toolbar>
      <Card pad={false}>
        <DataTable {...list} onRetry={list.reload} empty={<Empty title="No deleted accounts" sub="Nothing matches these filters." />}
          columns={[
            { key: 'n', label: 'Account', mobile: 'title', render: (r) => <span>{r.name || '—'} <small>@{r.username || '—'}</small></span> },
            { key: 'e', label: 'Email', mobile: 'hide', render: (r) => r.email || '—' },
            { key: 'r', label: 'Requested', mobile: 'hide', render: (r) => fmtDate(r.requested_at) },
            { key: 's', label: 'Purge date', mobile: 'hide', render: (r) => fmtDate(r.scheduled_at) },
            { key: 'st', label: 'Status', render: statusPill },
            { key: 'a', label: '', render: (r) => r.purged_at ? null : (
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.legal_hold ? <Btn size="sm" onClick={() => release(r)}>Release</Btn> : <Btn size="sm" onClick={() => hold(r)}>Hold</Btn>}
                <Btn size="sm" onClick={() => restore(r)}>Restore</Btn>
                {!r.legal_hold && <Btn size="sm" kind="danger" onClick={() => purge(r)}>Purge</Btn>}
              </span>) },
          ]} />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Deletions.layout = (page) => <AdminShell>{page}</AdminShell>
