import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Empty, Grid, PageHeader, Pager, Pill, SearchInput, Stat, StatGrid, Tabs, Toolbar, UserCell, useAdmin,
} from '@/Components/Admin/ui'
import { Donut, SERIES } from '@/Components/Admin/charts'
import { errMsg, fmtDate, naira, nairaCompact, num, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/coupons'
const state = (c) => (c.used_at ? 'used' : c.expires_at && new Date(c.expires_at) <= new Date() ? 'expired' : 'active')
const TONE = { active: 'good', used: 'info', expired: 'mute' }

export default function Coupons() {
  const list = useAdminList(API, { search: '', status: 'active' })
  const { stats } = list.extra
  const { toast, confirm } = useAdmin()
  const [busyId, setBusyId] = useState(null)

  const run = async (id, fn, ok) => {
    setBusyId(id)
    try { const r = await fn(); toast(r?.data?.message || ok); list.reload() } catch (e) { toast(errMsg(e), 'error') } finally { setBusyId(null) }
  }

  const create = async () => {
    const v = await confirm({
      title: 'Create goodwill coupon', message: 'A one-time discount code for one buyer. This is a cost to Flockr when it is used.', confirmLabel: 'Create coupon', danger: false,
      fields: [
        { key: 'buyer', label: 'Buyer (username or email)', required: true },
        { key: 'amount', label: 'Amount (₦100 to ₦50,000)', type: 'number', value: '1000', required: true },
        { key: 'min_order', label: 'Minimum order (₦, optional)', type: 'number', value: '0' },
        { key: 'days', label: 'Valid for (days)', type: 'number', value: '30', required: true },
      ],
    })
    if (v) run('new', () => axios.post(API, { buyer: v.buyer.trim(), amount: Number(v.amount), min_order: Number(v.min_order || 0), days: Number(v.days) }), 'Coupon created')
  }
  const voidIt = async (c) => { if (await confirm({ title: `Void ${c.code}?`, message: 'The buyer can no longer use it.', confirmLabel: 'Void coupon' })) run(c.id, () => axios.post(`${API}/${c.id}/void`), 'Coupon voided') }
  const extend = async (c) => {
    const v = await confirm({ title: `Extend ${c.code}`, confirmLabel: 'Extend', danger: false, fields: [{ key: 'days', label: 'Add days', type: 'number', value: '14', required: true }] })
    if (v) run(c.id, () => axios.post(`${API}/${c.id}/extend`, { days: Number(v.days) }), 'Coupon extended')
  }

  return (
    <>
      <Head title="Coupons · Admin" />
      <PageHeader title="Coupons" sub="Review-reward and goodwill coupons. You can issue, extend or void them." actions={<Btn kind="primary" size="sm" busy={busyId === 'new'} onClick={create}>New coupon</Btn>} />

      <StatGrid>
        <Stat label="Active coupons" value={stats ? num(stats.active) : '—'} sub={stats ? `${naira(stats.active_value)} outstanding` : null} tone="warn" onClick={() => list.setParam('status', 'active')} />
        <Stat label="Used" value={stats ? num(stats.used) : '—'} sub={stats ? `${naira(stats.used_value)} given away` : null} onClick={() => list.setParam('status', 'used')} />
      </StatGrid>

      {stats && (
        <Card title="Coupon value" sub="Still outstanding vs already redeemed">
          <Donut valueFormat={nairaCompact} center={{ value: nairaCompact(stats.active_value + stats.used_value), label: 'Issued value' }} data={[
            { label: 'Outstanding', value: stats.active_value, color: SERIES[3] }, { label: 'Redeemed', value: stats.used_value, color: SERIES[2] },
          ]} />
        </Card>
      )}

      <Tabs tabs={[['active', 'Active'], ['used', 'Used'], ['expired', 'Expired / voided'], ['all', 'All']]} value={list.params.status} onChange={(v) => list.setParam('status', v)} />
      <Toolbar><SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Code, buyer name, username or email…" /></Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload}
          empty={<Empty title="No coupons here" sub="Create one with the New coupon button." />}
          columns={[
            { key: 'code', label: 'Code', mobile: 'title', render: (c) => <b style={{ fontFamily: 'monospace' }}>{c.code}</b> },
            { key: 'buyer', label: 'Buyer', render: (c) => <UserCell user={c.buyer} sub={null} /> },
            { key: 'amount', label: 'Amount', align: 'right', render: (c) => <b>{naira(c.amount)}</b> },
            { key: 'min_order', label: 'Min order', align: 'right', mobile: 'hide', render: (c) => (Number(c.min_order) ? naira(c.min_order) : 'None') },
            { key: 'state', label: 'Status', render: (c) => <Pill tone={TONE[state(c)]}>{state(c)}</Pill> },
            { key: 'expires_at', label: 'Expires', render: (c) => (c.expires_at ? fmtDate(c.expires_at) : 'Never') },
            { key: 'used', label: 'Used on', mobile: 'hide', render: (c) => (c.used_on_order ?? c.usedOnOrder) ? <a href={`/admin/orders/${(c.used_on_order ?? c.usedOnOrder).id}`}>{(c.used_on_order ?? c.usedOnOrder).reference}</a> : '—' },
          ]}
          rowActions={(c) => state(c) === 'used' ? null : (
            <>
              <Btn size="sm" disabled={busyId === c.id} onClick={() => extend(c)}>Extend</Btn>
              {state(c) === 'active' && <Btn size="sm" kind="danger" disabled={busyId === c.id} onClick={() => voidIt(c)}>Void</Btn>}
            </>
          )}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Coupons.layout = (page) => <AdminShell>{page}</AdminShell>
