import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Empty, Grid, PageHeader, Pager, Pill, SearchInput, Stat, StatGrid, StatusPill, Tabs, Toolbar, UserCell, useAdmin,
} from '@/Components/Admin/ui'
import { BarChart, Donut, SERIES } from '@/Components/Admin/charts'
import { errMsg, fmtDate, naira, nairaCompact, num, timeAgo, useAdminList } from '@/Components/Admin/lib'

const API = '/api/admin/payouts'
const TABS = [['all', 'All'], ['pending', 'Pending'], ['processing', 'Processing'], ['paid', 'Paid'], ['failed', 'Failed / rejected']]

export default function Payouts() {
  const list = useAdminList(API, { search: '', status: 'pending' })
  const { stats, live } = list.extra
  const { toast, confirm, refreshBadges } = useAdmin()
  const [busyId, setBusyId] = useState(null)

  const run = async (id, fn, ok) => {
    setBusyId(id)
    try { const r = await fn(); toast(r?.data?.message || ok); list.reload(); refreshBadges() } catch (e) { toast(errMsg(e), 'error') } finally { setBusyId(null) }
  }

  const toggleLive = async () => {
    const goingLive = !live
    const ok = await confirm({
      title: goingLive ? 'Go live with real transfers?' : 'Switch back to test mode?',
      message: goingLive
        ? 'From now on, approving a payout sends REAL money from your Paystack balance to the seller’s bank. Make sure your balance is funded and your Paystack LIVE key is set.'
        : 'Approving a payout will only mark it paid. No real money moves.',
      confirmLabel: goingLive ? 'Yes, go live' : 'Switch to test', danger: goingLive,
    })
    if (!ok) return
    try { const r = await axios.post(`${API}/live`, { live: goingLive, confirm: true }); toast(r.data.message); list.reload() } catch (e) { toast(errMsg(e), 'error') }
  }

  const approve = async (p) => {
    const bank = p.seller ? `${p.seller.bank_name ?? 'bank'} ····${p.seller.account_last4 ?? ''} (${p.seller.account_name ?? 'unnamed'})` : 'the seller’s bank'
    const ok = await confirm({
      title: `Approve ${naira(p.amount, 2)} payout?`,
      message: live ? `${naira(p.amount, 2)} is sent from Flockr to ${bank}. This cannot be undone.` : `Test mode: ${naira(p.amount, 2)} is marked paid and no real money moves. Destination would be ${bank}.`,
      confirmLabel: 'Approve payout', danger: false,
    })
    if (ok) run(p.id, () => axios.post(`${API}/${p.id}/approve`), 'Payout approved')
  }
  const reject = async (p) => {
    const v = await confirm({
      title: `Reject ${naira(p.amount, 2)} payout?`, message: 'The money goes back to the seller’s wallet and they are notified.',
      confirmLabel: 'Reject payout', fields: [{ key: 'reason', label: 'Reason (the seller sees this)', multiline: true, required: true }],
    })
    if (v) run(p.id, () => axios.post(`${API}/${p.id}/reject`, v), 'Payout rejected')
  }

  return (
    <>
      <Head title="Payouts · Admin" />
      <PageHeader title="Payouts" sub="Sellers withdrawing their earnings. Money only ever goes from a seller’s wallet to that seller’s own bank account." />

      <div className="a-error" style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', ...(live ? { background: 'rgba(16,185,129,.1)', borderColor: 'rgba(16,185,129,.35)' } : {}) }}>
        <span>{live ? <><b>LIVE.</b> Approving a payout sends real money to the seller’s bank.</> : <><b>Test mode.</b> Approving marks a payout as paid without sending real money.</>}</span>
        {live !== undefined && <Btn onClick={toggleLive}>{live ? 'Switch to test mode' : 'Go live'}</Btn>}
      </div>

      <StatGrid>
        <Stat label="Waiting for approval" value={stats ? num(stats.pending_count) : '—'} sub={stats ? naira(stats.pending_amount) : null} tone={stats?.pending_count ? 'warn' : undefined} onClick={() => list.setParam('status', 'pending')} />
        <Stat label="Paid (30 days)" value={stats ? nairaCompact(stats.paid_amount_30d) : '—'} sub={stats ? `${num(stats.paid_count_30d)} payouts` : null} onClick={() => list.setParam('status', 'paid')} />
        <Stat label="Failed (30 days)" value={stats ? num(stats.failed_30d) : '—'} tone={stats?.failed_30d ? 'bad' : undefined} onClick={() => list.setParam('status', 'failed')} />
      </StatGrid>

      {stats && (
        <Grid cols={2}>
          <Card title="Money flow" sub="Pending now vs paid in the last 30 days">
            <BarChart valueFormat={nairaCompact} height={200} data={[
              { label: 'Pending', value: stats.pending_amount, color: SERIES[3] },
              { label: 'Paid 30d', value: stats.paid_amount_30d, color: SERIES[2] },
            ]} />
          </Card>
          <Card title="Payout count" sub="Pending, paid and failed">
            <Donut valueFormat={num} center={{ value: num(stats.pending_count + stats.paid_count_30d + stats.failed_30d), label: 'Payouts' }} data={[
              { label: 'Pending', value: stats.pending_count, color: SERIES[3] },
              { label: 'Paid (30d)', value: stats.paid_count_30d, color: SERIES[2] },
              { label: 'Failed (30d)', value: stats.failed_30d, color: SERIES[7] },
            ]} />
          </Card>
        </Grid>
      )}

      <Tabs tabs={TABS.map(([k, l]) => [k, l, k === 'pending' ? stats?.pending_count : 0])} value={list.params.status} onChange={(v) => list.setParam('status', v)} />
      <Toolbar><SearchInput value={list.params.search} onChange={(v) => list.setParam('search', v)} placeholder="Search seller name or @username…" /></Toolbar>

      <Card pad={false}>
        <DataTable
          {...list} onRetry={list.reload}
          empty={<Empty title="No payouts here" sub={list.params.status === 'pending' ? 'Nothing is waiting for approval.' : 'Try another tab.'} />}
          columns={[
            { key: 'seller', label: 'Seller', mobile: 'title', render: (p) => <UserCell user={p.seller} sub={null} /> },
            { key: 'amount', label: 'Amount', align: 'right', render: (p) => <b>{naira(p.amount, 2)}</b> },
            { key: 'bank', label: 'Bank', render: (p) => p.seller?.bank_name ? <span>{p.seller.bank_name} ····{p.seller.account_last4}<br /><small className="a-mute">{p.seller.account_name}</small></span> : <Pill tone="bad">No bank</Pill> },
            { key: 'status', label: 'Status', render: (p) => <span><StatusPill status={p.status} />{p.failure_reason && <small className="a-mute" style={{ display: 'block' }}>{p.failure_reason}</small>}</span> },
            { key: 'created_at', label: 'Requested', render: (p) => <span title={fmtDate(p.created_at, true)}>{timeAgo(p.created_at)}</span> },
            { key: 'paid_at', label: 'Paid', mobile: 'hide', render: (p) => p.paid_at ? fmtDate(p.paid_at) : '—' },
            { key: 'reference', label: 'Reference', mobile: 'hide', render: (p) => <small style={{ fontFamily: 'monospace' }}>{p.reference ?? '—'}</small> },
          ]}
          rowActions={(p) => p.status === 'pending' ? (
            <>
              <Btn size="sm" kind="good" busy={busyId === p.id} onClick={() => approve(p)}>Approve</Btn>
              <Btn size="sm" kind="danger" disabled={busyId === p.id} onClick={() => reject(p)}>Reject</Btn>
            </>
          ) : null}
        />
        <Pager meta={list.meta} onPage={list.setPage} />
      </Card>
    </>
  )
}
Payouts.layout = (page) => <AdminShell>{page}</AdminShell>
