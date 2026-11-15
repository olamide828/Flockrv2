import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import {
  Btn, Card, DataTable, Empty, ErrorBox, KV, Meter, PageHeader, Pill, Skeleton, StatusPill, Timeline, UserCell, useAdmin,
} from '@/Components/Admin/ui'
import { errMsg, fmtDate, naira, timeAgo, useAdminFetch } from '@/Components/Admin/lib'

const oid = () => window.location.pathname.split('/').filter(Boolean).pop()
const API = '/api/admin/orders'

const parseAddr = (raw) => { if (!raw) return null; if (typeof raw === 'object') return raw; try { return JSON.parse(raw) } catch { return null } }

export default function OrderDetail() {
  const id = oid()
  const { data, loading, error, reload } = useAdminFetch(`${API}/${id}`, {}, [id])
  const { toast, confirm, refreshBadges } = useAdmin()
  const [busy, setBusy] = useState(false)

  const back = { href: '/admin/orders', label: 'Orders' }
  if (loading && !data) return <><PageHeader title="Order" back={back} /><Card><Skeleton rows={8} /></Card></>
  if (error || !data) return <><PageHeader title="Order" back={back} /><ErrorBox error={error || 'Order not found'} onRetry={reload} /></>

  const { order, money, escrow, wallet, notes, timeline, can } = data
  const addr = parseAddr(order.shipping_address)

  const run = async (fn, ok) => {
    setBusy(true)
    try { const r = await fn(); toast(r?.data?.message || ok); reload(); refreshBadges() } catch (e) { toast(errMsg(e), 'error') } finally { setBusy(false) }
  }

  const cancel = async () => {
    const v = await confirm({ title: 'Cancel and refund this order?', message: `The buyer is refunded ${naira(money.payment_total)} through Paystack, stock is returned, and any seller credit is reversed.`, confirmLabel: 'Cancel & refund', fields: [{ key: 'reason', label: 'Reason', multiline: true, required: true }] })
    if (v) run(() => axios.post(`${API}/${id}/cancel`, v), 'Order cancelled and refund started')
  }
  const retry = async () => { if (await confirm({ title: 'Retry the refund?', message: 'We will ask Paystack to refund the buyer again.', confirmLabel: 'Retry refund', danger: false })) run(() => axios.post(`${API}/${id}/retry-refund`), 'Refund retried') }
  const release = async () => {
    const v = await confirm({ title: 'Release escrow now?', message: `${naira(money.seller_earning)} moves to the seller’s wallet immediately instead of waiting for the 3-day window.`, confirmLabel: 'Release to seller', danger: false, fields: [{ key: 'reason', label: 'Reason', value: 'Buyer confirmed outside the app' }] })
    if (v) run(() => axios.post(`${API}/${id}/release-escrow`, v), 'Escrow released')
  }
  const delivered = async () => { if (await confirm({ title: 'Mark as delivered?', message: 'Starts the 3-day escrow countdown for the seller.', confirmLabel: 'Mark delivered', danger: false })) run(() => axios.post(`${API}/${id}/mark-delivered`), 'Marked as delivered') }
  const addNote = async () => {
    const v = await confirm({ title: 'Add internal note', message: 'Only admins can see this.', confirmLabel: 'Save note', danger: false, fields: [{ key: 'note', label: 'Note', multiline: true, required: true }] })
    if (v) run(() => axios.post(`${API}/${id}/note`, v), 'Note added')
  }

  const refundTone = { succeeded: 'good', failed: 'bad', pending: 'warn' }[order.refund_status] || 'mute'
  const escrowTone = { held: 'warn', released: 'good', none: 'mute' }[escrow.state]
  const daysLeft = escrow.auto_release_at ? Math.max(0, Math.ceil((new Date(escrow.auto_release_at) - Date.now()) / 864e5)) : null

  return (
    <>
      <Head title={`${order.reference} · Admin`} />
      <PageHeader back={back} title={<span className="mono">{order.reference}</span>} sub={`Placed ${fmtDate(order.created_at)}`}
        actions={<>
          {can.mark_delivered && <Btn size="sm" onClick={delivered} busy={busy}>Mark delivered</Btn>}
          {can.release_escrow && <Btn size="sm" kind="good" onClick={release} busy={busy}>Release escrow</Btn>}
          {can.retry_refund && <Btn size="sm" kind="primary" onClick={retry} busy={busy}>Retry refund</Btn>}
          {can.cancel && <Btn size="sm" kind="danger" onClick={cancel} busy={busy}>Cancel &amp; refund</Btn>}
          <Btn size="sm" onClick={addNote} busy={busy}>Add note</Btn>
        </>} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatusPill status={order.status} />
        <Pill tone={escrowTone}>Escrow: {escrow.state}</Pill>
        {order.refund_status && <Pill tone={refundTone}>Refund {order.refund_status}</Pill>}
        {order.dispute && <a href="/admin/disputes"><Pill tone="warn">Dispute · {order.dispute.status}</Pill></a>}
      </div>

      {order.refund_status === 'failed' && (
        <div className="a-error" style={{ margin: '0 0 16px' }}>
          <span><b>Refund failed.</b> {order.refund_error || 'Paystack did not accept the refund.'} The buyer has not been repaid yet.</span>
          <Btn size="sm" onClick={retry}>Retry</Btn>
        </div>
      )}

      <div className="a-grid c21">
        <div>
          <Card title="Items" pad={false}>
            <DataTable rows={order.items ?? []} rowKey={(i) => i.id} columns={[
              { key: 'p', label: 'Product', mobile: 'title', render: (i) => (
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ width: 44, height: 44, borderRadius: 10, background: '#1a1d25', overflow: 'hidden', flexShrink: 0 }}>
                    {i.product?.primary_image && <img src={i.product.primary_image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </span>
                  <span style={{ minWidth: 0 }}><b>{i.product_name}</b><br /><small className="a-mute">{i.product?.slug}</small></span>
                </span>) },
              { key: 'quantity', label: 'Qty', align: 'right' },
              { key: 'unit_price', label: 'Unit', align: 'right', render: (i) => naira(i.unit_price) },
              { key: 'total', label: 'Total', align: 'right', render: (i) => naira(i.total) },
            ]} empty={<Empty title="No items" />} />
          </Card>

          <Card title="Money">
            <div className="od-money">
              <div><span>Items subtotal</span><b>{naira(money.subtotal)}</b></div>
              <div><span>Courier fee</span><b>{naira(money.courier_fee)}</b></div>
              {money.discount > 0 && <div><span>Coupon discount</span><b className="neg">-{naira(money.discount)}</b></div>}
              <div className="tot"><span>Buyer paid</span><b>{naira(money.payment_total)}</b></div>
              <hr />
              <div><span>Flockr commission</span><b>{naira(money.commission ?? money.flockr_fee)}</b></div>
              <div><span>Flockr delivery fee</span><b>{naira(money.delivery_fee ?? 0)}</b></div>
              <div className="tot"><span>Seller earns</span><b className="pos">{naira(money.seller_earning)}</b></div>
            </div>
          </Card>

          <Card title="Escrow">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <Pill tone={escrowTone}>{escrow.state === 'held' ? 'Held by Flockr' : escrow.state === 'released' ? 'Released to seller' : 'No funds held'}</Pill>
              <small className="a-mute">
                {escrow.released_at ? `Released ${fmtDate(escrow.released_at)}`
                  : escrow.auto_release_at ? `Auto-releases ${fmtDate(escrow.auto_release_at)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)`
                  : escrow.state === 'held' ? 'Waits for delivery, then 3 days' : ''}
              </small>
            </div>
            {escrow.state === 'held' && <Meter value={escrow.auto_release_at ? 1 - (daysLeft / 3) : 0.1} tone="warn" />}
          </Card>

          <Card title="Wallet entries for this order" sub="Read-only" pad={false}>
            <DataTable rows={wallet} columns={[
              { key: 'source', label: 'Source', mobile: 'title', render: (t) => <span style={{ textTransform: 'capitalize' }}>{String(t.source).replace(/_/g, ' ')}</span> },
              { key: 'type', label: 'Type', render: (t) => <Pill tone={t.type === 'credit' ? 'good' : 'warn'}>{t.type}</Pill> },
              { key: 'amount', label: 'Amount', align: 'right', render: (t) => naira(t.amount) },
              { key: 'created_at', label: 'When', render: (t) => fmtDate(t.created_at) },
            ]} empty={<Empty title="No wallet entries yet" sub="Created when escrow is released or an order is reversed." />} />
          </Card>
        </div>

        <div>
          <Card title="People">
            <div className="a-stack">
              <div><small className="a-mute">Buyer</small><UserCell user={order.buyer} sub={order.buyer?.phone || order.buyer?.email} /></div>
              <div><small className="a-mute">Seller</small><UserCell user={order.seller} sub={order.seller?.phone || order.seller?.email} /></div>
            </div>
          </Card>

          <Card title="Delivery">
            <KV items={[
              ['Ship to', addr ? `${addr.name ?? ''} · ${addr.phone ?? ''}` : null],
              ['Address', addr ? [addr.address ?? addr.street, addr.city, addr.state].filter(Boolean).join(', ') : null],
              ['Courier', order.courier_name], ['Tracking #', order.tracking_number],
            ]} />
          </Card>

          <Card title="Timeline"><Timeline items={timeline.map((t) => ({ title: t.title, sub: [fmtDate(t.at), t.sub].filter(Boolean).join(' · ') }))} /></Card>

          <Card title="Internal notes & admin actions">
            {notes.length === 0 ? <Empty title="Nothing yet" /> : (
              <div className="a-stack">
                {notes.map((n) => (
                  <div key={n.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                    <b style={{ fontSize: 13 }}>{n.note ?? n.action}</b>
                    <small className="a-mute" style={{ display: 'block' }}>{n.admin} · {timeAgo(n.created_at)}</small>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <style>{`.mono{font-family:monospace}.a-grid.c21{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
.od-money{display:flex;flex-direction:column;gap:10px}.od-money>div{display:flex;justify-content:space-between;gap:10px}.od-money span{color:var(--mute)}.od-money .tot span{color:var(--ink);font-weight:700}.od-money .tot b{font-size:17px}.od-money hr{border:0;border-top:1px solid var(--line);margin:2px 0}.od-money .neg{color:var(--bad)}.od-money .pos{color:var(--good)}
@media(max-width:900px){.a-grid.c21{grid-template-columns:minmax(0,1fr)}}`}</style>
    </>
  )
}
OrderDetail.layout = (page) => <AdminShell>{page}</AdminShell>
