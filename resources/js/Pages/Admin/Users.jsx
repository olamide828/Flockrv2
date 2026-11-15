import { Head } from '@inertiajs/react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Card, PageHeader, Toolbar, SearchInput, Select, DataTable, Pager, Pill, Stat, StatGrid, UserCell, Empty } from '@/Components/Admin/ui'
import { useAdminList, num, fmtDate, timeAgo } from '@/Components/Admin/lib'

const ROLES = [['all', 'All roles'], ['buyer', 'Buyers'], ['seller', 'Sellers'], ['admin', 'Admins']]
const STATUSES = [['all', 'Any status'], ['active', 'Active'], ['verified', 'Verified'], ['suspended', 'Suspended'], ['flagged', 'Flagged'], ['pro', 'Pro'], ['deleted', 'Deleted']]
const ROLE_TONE = { admin: 'violet', seller: 'info', buyer: 'mute' }

function Badges({ u }) {
  return (
    <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
      {u.deleted_at ? <Pill tone="bad">Deleted</Pill> : !u.is_active ? <Pill tone="bad">Suspended</Pill> : null}
      {u.is_verified && <Pill tone="good">Verified</Pill>}
      {u.is_flagged && <Pill tone="warn">Flagged</Pill>}
      {u.is_pro && <Pill tone="violet">Pro</Pill>}
    </span>
  )
}

export default function Users() {
  const list = useAdminList('/api/admin/people/users', { search: '', role: 'all', status: 'all' })
  const st = list.extra.stats

  const go = (u) => { window.location.href = `/admin/users/${u.id}` }
  const filter = (k, v) => list.setParam(k, list.params[k] === v ? 'all' : v)

  return (
    <>
      <Head title="Users · Admin" />
      <PageHeader title="Users" sub="Everyone on Flockr: buyers, sellers and admins" />

      <StatGrid>
        <Stat label="Total users" value={st ? num(st.total) : '—'} onClick={() => { list.setParam('status', 'all'); list.setParam('role', 'all') }} />
        <Stat label="Sellers" value={st ? num(st.sellers) : '—'} onClick={() => filter('role', 'seller')} />
        <Stat label="New (7 days)" value={st ? num(st.new_7d) : '—'} />
        <Stat label="Pro members" value={st ? num(st.pro) : '—'} onClick={() => filter('status', 'pro')} />
        <Stat label="Suspended" value={st ? num(st.suspended) : '—'} tone={st?.suspended ? 'bad' : undefined} onClick={() => filter('status', 'suspended')} />
        <Stat label="Flagged" value={st ? num(st.flagged) : '—'} tone={st?.flagged ? 'warn' : undefined} onClick={() => filter('status', 'flagged')} />
      </StatGrid>

      <Toolbar>
        <SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search name, @username, email or phone…" />
        <Select value={list.params.role} onChange={(v) => list.setParam('role', v)} options={ROLES} />
        <Select value={list.params.status} onChange={(v) => list.setParam('status', v)} options={STATUSES} />
      </Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload} onRowClick={go}
          empty={<Empty title="No users match" sub="Try clearing a filter or searching for something else." />}
          columns={[
            { key: 'user', label: 'User', mobile: 'title', render: (u) => <UserCell user={u} sub={u.email} /> },
            { key: 'role', label: 'Role', render: (u) => <Pill tone={ROLE_TONE[u.role] || 'mute'}>{u.role}</Pill> },
            { key: 'status', label: 'Status', render: (u) => <Badges u={u} /> },
            { key: 'phone', label: 'Phone', mobile: 'hide', render: (u) => u.phone || '—' },
            { key: 'created_at', label: 'Joined', render: (u) => fmtDate(u.created_at) },
            { key: 'last_seen_at', label: 'Last seen', mobile: 'hide', render: (u) => timeAgo(u.last_seen_at) },
          ]}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Users.layout = (page) => <AdminShell>{page}</AdminShell>
