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
const state = (c) => (c.is_public ? (c.is_active === false ? 'paused' : c.expires_at && new Date(c.expires_at) <= new Date() ? 'expired' : 'active') : c.used_at ? 'used' : c.expires_at && new Date(c.expires_at) <= new Date() ? 'expired' : 'active')
const TONE = { active: 'good', used: 'info', expired: 'mute', paused: 'warn' }
const valueOf = (c) => (c.kind === 'percent' ? `${Number(c.percent)}% off${c.max_discount ? ` (max ${naira(c.max_discount)})` : ''}` : naira(c.amount))

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
  const createPromo = async () => {
    const v = await confirm({
      title: 'New promo code',
      message: 'A public code anyone can type at checkout — e.g. for an influencer or a campaign. Leave "Code" empty to generate one.',
      confirmLabel: 'Create code', danger: false,
      fields: [
        { key: 'code', label: 'Code (letters/numbers, e.g. AMAKA10)', value: '' },
        { key: 'campaign', label: 'Campaign / influencer name (for your records)', value: '' },
        { key: 'kind', label: 'Discount type', value: 'percent', options: [{ value: 'percent', label: 'Percentage (%)' }, { value: 'fixed', label: 'Fixed amount (₦)' }] },
        { key: 'value', label: 'Value (e.g. 10 for 10%, or 1000 for ₦1,000)', type: 'number', value: '10', required: true },
        { key: 'max_discount', label: 'Max discount in ₦ (for % codes, optional)', type: 'number', value: '' },
        { key: 'min_order', label: 'Minimum order ₦ (optional)', type: 'number', value: '0' },
        { key: 'max_uses', label: 'Total uses allowed (empty = unlimited)', type: 'number', value: '' },
        { key: 'per_user_limit', label: 'Uses per person', type: 'number', value: '1', required: true },
        { key: 'new_users_only', label: 'Who can use it', value: 'no', options: [{ value: 'no', label: 'Everyone' }, { value: 'yes', label: 'First-time buyers only' }] },
        { key: 'funded_by', label: 'Who pays for the discount', value: 'flockr', options: [{ value: 'flockr', label: 'Flockr pays (seller earns the full amount)' }, { value: 'shared', label: 'Shared 50/50 with the seller' }] },
        { key: 'days', label: 'Valid for (days, empty = no expiry)', type: 'number', value: '30' },
      ],
    })
    if (!v) return
    const n = (x) => (x === '' || x == null ? null : Number(x))
    run('new', () => axios.post(`${API}/promo`, {
      code: v.code.trim() || null, campaign: v.campaign.trim() || null, kind: v.kind, value: Number(v.value), max_discount: n(v.max_discount),
      min_order: n(v.min_order) ?? 0, max_uses: n(v.max_uses), per_user_limit: n(v.per_user_limit) ?? 1, new_users_only: v.new_users_only === 'yes',
      funded_by: v.funded_by, days: n(v.days),
    }), 'Promo code created')
  }
  const toggle = (c) => run(c.id, () => axios.post(`${API}/${c.id}/toggle`), 'Updated')
  const voidIt = async (c) => { if (await confirm({ title: `Void ${c.code}?`, message: 'The buyer can no longer use it.', confirmLabel: 'Void coupon' })) run(c.id, () => axios.post(`${API}/${c.id}/void`), 'Coupon voided') }
  const extend = async (c) => {
    const v = await confirm({ title: `Extend ${c.code}`, confirmLabel: 'Extend', danger: false, fields: [{ key: 'days', label: 'Add days', type: 'number', value: '14', required: true }] })
    if (v) run(c.id, () => axios.post(`${API}/${c.id}/extend`, { days: Number(v.days) }), 'Coupon extended')
  }

  return (
    <>
      <Head title="Coupons · Admin" />
      <PageHeader title="Coupons" sub="Personal coupons (reviews, goodwill, scavenger hunts) and public promo codes for campaigns and influencers." actions={<><Btn size="sm" busy={busyId === 'new'} onClick={create}>Gift coupon</Btn><Btn kind="primary" size="sm" busy={busyId === 'new'} onClick={createPromo}>New promo code</Btn></>} />

      <StatGrid>
        <Stat label="Active coupons" value={stats ? num(stats.active) : '—'} sub={stats ? `${naira(stats.active_value)} outstanding` : null} tone="warn" onClick={() => list.setParam('status', 'active')} />
        <Stat label="Promo codes live" value={stats ? num(stats.promo_codes) : '—'} sub={stats ? `${num(stats.promo_uses)} uses · ${naira(stats.promo_given)} discounted` : null} tone="good" onClick={() => list.setParam('status', 'promo')} />
        <Stat label="Used" value={stats ? num(stats.used) : '—'} sub={stats ? `${naira(stats.used_value)} given away` : null} onClick={() => list.setParam('status', 'used')} />
      </StatGrid>

      {stats && (
        <Card title="Coupon value" sub="Still outstanding vs already redeemed">
          <Donut valueFormat={nairaCompact} center={{ value: nairaCompact(stats.active_value + stats.used_value), label: 'Issued value' }} data={[
            { label: 'Outstanding', value: stats.active_value, color: SERIES[3] }, { label: 'Redeemed', value: stats.used_value, color: SERIES[2] },
          ]} />
        </Card>
      )}

      <Tabs tabs={[['promo', 'Promo codes'], ['active', 'Personal · active'], ['used', 'Used'], ['expired', 'Expired / voided'], ['all', 'All']]} value={list.params.status} onChange={(v) => list.setParam('status', v)} />
      <Toolbar><SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Code, buyer name, username or email…" /></Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload}
          empty={<Empty title="No coupons here" sub="Create one with the New coupon button." />}
          columns={[
            { key: 'code', label: 'Code', mobile: 'title', render: (c) => <b style={{ fontFamily: 'monospace' }}>{c.code}</b> },
            { key: 'buyer', label: 'Buyer / campaign', render: (c) => c.is_public ? <span><b>Public code</b>{c.campaign ? <small style={{ display: 'block', opacity: .6 }}>{c.campaign}</small> : null}</span> : <UserCell user={c.buyer} sub={null} /> },
            { key: 'amount', label: 'Discount', align: 'right', render: (c) => <b>{valueOf(c)}</b> },
            { key: 'uses', label: 'Uses', align: 'right', mobile: 'hide', render: (c) => c.is_public ? `${c.uses_count ?? 0}${c.max_uses ? ' / ' + c.max_uses : ''}` : '—' },
            { key: 'min_order', label: 'Min order', align: 'right', mobile: 'hide', render: (c) => (Number(c.min_order) ? naira(c.min_order) : 'None') },
            { key: 'state', label: 'Status', render: (c) => <Pill tone={TONE[state(c)]}>{state(c)}</Pill> },
            { key: 'expires_at', label: 'Expires', render: (c) => (c.expires_at ? fmtDate(c.expires_at) : 'Never') },
            { key: 'used', label: 'Used on', mobile: 'hide', render: (c) => (c.used_on_order ?? c.usedOnOrder) ? <a href={`/admin/orders/${(c.used_on_order ?? c.usedOnOrder).id}`}>{(c.used_on_order ?? c.usedOnOrder).reference}</a> : '—' },
          ]}
          rowActions={(c) => c.is_public ? (
            <>
              <Btn size="sm" disabled={busyId === c.id} onClick={() => toggle(c)}>{c.is_active === false ? 'Resume' : 'Pause'}</Btn>
              <Btn size="sm" disabled={busyId === c.id} onClick={() => extend(c)}>Extend</Btn>
            </>
          ) : state(c) === 'used' ? null : (
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
