import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/Components/Community/ConfirmModal';
import { useToast } from '@/Components/Toast';
import {
    RiArrowLeftLine, RiBox3Line, RiCheckLine, RiCloseLine, RiExternalLinkLine, RiGiftLine, RiLoader4Line,
    RiMapPinLine, RiMotorbikeLine, RiSearchLine, RiShieldCheckLine, RiTimeLine, RiTruckLine, RiWallet3Line,
} from 'react-icons/ri';

const S = {
    pending:          { label: 'Awaiting payment', color: '#EAB308' },
    paid:             { label: 'Pack item',        color: '#3B82F6' },
    confirmed:        { label: 'Courier coming',   color: '#8B5CF6' },
    processing:       { label: 'Ready for pickup', color: '#FF6B35' },
    ready_for_pickup: { label: 'Ready for pickup', color: '#FF6B35' },
    shipped:          { label: 'Picked up',        color: '#8B5CF6' },
    in_transit:       { label: 'In transit',       color: '#6366F1' },
    delivered:        { label: 'Delivered',        color: '#10B981' },
    pickup_failed:    { label: 'Pickup failed',    color: '#EF4444' },
    delivery_failed:  { label: 'Delivery failed',  color: '#EF4444' },
    returned:         { label: 'Returned',         color: '#9CA3AF' },
    cancelled:        { label: 'Cancelled',        color: '#EF4444' },
    disputed:         { label: 'Disputed',         color: '#F59E0B' },
    refunded:         { label: 'Refunded',         color: '#9CA3AF' },
};

const GROUPS = {
    todo:      ['paid', 'confirmed', 'pickup_failed'],
    transit:   ['processing', 'ready_for_pickup', 'shipped', 'in_transit'],
    delivered: ['delivered'],
    issues:    ['delivery_failed', 'disputed', 'returned', 'cancelled', 'refunded'],
};
const TABS = [['all', 'All'], ['todo', 'To do'], ['transit', 'On the way'], ['delivered', 'Delivered'], ['issues', 'Issues']];
const STEPS = ['Paid', 'Packed', 'Picked up', 'Delivered', 'Paid out'];

const naira = n => '₦' + Number(n ?? 0).toLocaleString('en-NG');
const fmt = d => d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
const parseAddr = raw => { if (!raw) return null; if (typeof raw === 'object') return raw; try { return JSON.parse(raw); } catch { return null; } };
const earningOf = o => Number(o.seller_earning ?? Math.max(0, Number(o.subtotal ?? 0) - Number(o.platform_fee ?? 0)));

// Itemised receipt: what the buyer paid -> what lands in the seller's wallet
function receipt(o) {
    const subtotal = Number(o.subtotal ?? 0);
    const commission = Number(o.platform_fee ?? 0);
    const earn = earningOf(o);
    const couponShare = Math.max(0, +(subtotal - commission - earn).toFixed(2)); // coupon cost the seller carries
    const discount = Number(o.discount_amount ?? 0);
    const delivery = Number(o.shipping_fee ?? o.courier_fee ?? 0);
    return { subtotal, commission, earn, couponShare, discount, delivery,
        flockrCoupon: discount > 0 && couponShare === 0, buyerPaid: Number(o.payment_total ?? o.total ?? 0) };
}

// how far along the order is (0-4), -1 when it never got going
function stepOf(o) {
    if (o.escrow_released_at) return 4;
    if (o.status === 'delivered') return 3;
    if (['shipped', 'in_transit'].includes(o.status)) return 2;
    if (['processing', 'ready_for_pickup'].includes(o.status)) return 1;
    if (['paid', 'confirmed', 'pickup_failed'].includes(o.status)) return 0;
    return -1;
}

// when will the money land?
function payoutNote(o) {
    if (o.escrow_released_at) return { tone: 'good', text: 'Released to your wallet ' + fmt(o.escrow_released_at) };
    if (o.status === 'delivered') {
        const at = o.delivered_at ? new Date(new Date(o.delivered_at).getTime() + 3 * 864e5) : null;
        return { tone: 'warn', text: 'Held in escrow' + (at ? ' · auto-releases ' + fmt(at) + ' unless the buyer raises an issue' : '') };
    }
    if (['paid', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'in_transit', 'pickup_failed'].includes(o.status))
        return { tone: 'info', text: 'Held safely by Flockr until the buyer receives the item' };
    if (o.status === 'disputed') return { tone: 'warn', text: 'On hold while the dispute is reviewed' };
    if (['cancelled', 'refunded', 'returned'].includes(o.status)) return { tone: 'mute', text: 'No earnings — buyer was refunded' };
    return null;
}

function Stepper({ step }) {
    if (step < 0) return null;
    return (
        <div className="so-steps">
            {STEPS.map((l, i) => (
                <div key={l} className={'so-step ' + (i <= step ? 'on' : '')}>
                    <i />{i < STEPS.length - 1 && <b />}<span>{l}</span>
                </div>
            ))}
        </div>
    );
}

function OrderCard({ order: init, ask, showToast }) {
    const [order, setOrder] = useState(init);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const cfg = S[order.status] ?? S.pending;
    const addr = parseAddr(order.shipping_address);
    const earn = earningOf(order);
    const rc = receipt(order);
    const note = payoutNote(order);
    const needsPack = ['paid', 'confirmed'].includes(order.status);
    const pickupFailed = order.status === 'pickup_failed';
    const issue = ['delivery_failed', 'pickup_failed', 'disputed'].includes(order.status);
    const items = order.items ?? [];

    const act = async (fn, okMsg) => {
        setBusy(true);
        try { await fn(); showToast(okMsg, 'success'); }
        catch (e) { showToast(e.response?.data?.message ?? 'Something went wrong. Try again.', 'error'); }
        finally { setBusy(false); }
    };

    const markReady = () => ask({
        title: 'Ready for pickup?',
        message: 'Confirm the item is packed. A courier will be sent to collect it.',
        confirmLabel: 'Yes, it\'s packed',
        danger: false,
        onConfirm: () => act(async () => {
            await axios.patch('/api/orders/' + order.id + '/status', { status: 'processing' });
            setOrder(o => ({ ...o, status: 'processing' }));
        }, 'Marked ready. Courier dispatching shortly.'),
    });

    const reschedule = () => act(async () => {
        await axios.post('/api/orders/' + order.id + '/reschedule-pickup');
        setOrder(o => ({ ...o, status: 'processing' }));
    }, 'Pickup rescheduled.');

    return (
        <article className={'so-card' + (needsPack ? ' hot' : '') + (issue ? ' bad' : '')}>
            <button className="so-head" onClick={() => setOpen(v => !v)} aria-expanded={open}>
                <div className="so-thumb">
                    {items[0]?.product?.primary_image
                        ? <img src={items[0].product.primary_image} alt="" />
                        : <RiGiftLine size={18} color="rgba(255,255,255,.2)" />}
                    {items.length > 1 && <em>+{items.length - 1}</em>}
                </div>
                <div className="so-mid">
                    <div className="so-title">{items[0]?.product_name ?? 'Order'}{items.length > 1 ? ` + ${items.length - 1} more` : ''}</div>
                    <div className="so-sub">{order.buyer?.name ?? 'Buyer'} · {fmt(order.created_at)}</div>
                    <span className="so-chip" style={{ color: cfg.color, borderColor: cfg.color + '40', background: cfg.color + '12' }}>{cfg.label}</span>
                </div>
                <div className="so-amt">
                    <b>{naira(earn)}</b>
                    <small>{order.escrow_released_at ? 'received' : 'you earn'}</small>
                </div>
            </button>

            {needsPack && <div className="so-nudge"><i />Pack this item, then tap “Mark ready”.</div>}
            {pickupFailed && <div className="so-nudge red"><i />The courier couldn’t collect. Reschedule the pickup.</div>}

            {(needsPack || pickupFailed) && (
                <div className="so-cta">
                    {needsPack && <button className="so-btn blue" onClick={markReady} disabled={busy}>{busy ? <RiLoader4Line className="spin" size={16} /> : <RiCheckLine size={16} />} Mark ready for pickup</button>}
                    {pickupFailed && <button className="so-btn orange" onClick={reschedule} disabled={busy}>{busy ? <RiLoader4Line className="spin" size={16} /> : <RiMotorbikeLine size={16} />} Reschedule pickup</button>}
                </div>
            )}

            {open && (
                <div className="so-body">
                    <Stepper step={stepOf(order)} />

                    {note && <div className={'so-note ' + note.tone}><RiWallet3Line size={14} />{note.text}</div>}

                    <div className="so-sec">
                        {items.map((it, i) => (
                            <div key={i} className="so-item">
                                <div className="so-thumb sm">{it.product?.primary_image ? <img src={it.product.primary_image} alt="" /> : <RiGiftLine size={14} color="rgba(255,255,255,.2)" />}</div>
                                <div className="so-im"><b>{it.product_name}</b><small>Qty {it.quantity} · {naira(it.unit_price)}</small></div>
                                <span>{naira(it.total)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="so-receipt">
                        <div className="so-rh">Order receipt</div>
                        <div className="so-r"><span>Items ({items.reduce((a, i) => a + Number(i.quantity ?? 1), 0)})</span><b>{naira(rc.subtotal)}</b></div>
                        <div className="so-r neg"><span>Flockr commission</span><b>-{naira(rc.commission)}</b></div>
                        {rc.couponShare > 0 && <div className="so-r neg"><span>Coupon (your share)</span><b>-{naira(rc.couponShare)}</b></div>}
                        {rc.flockrCoupon && <div className="so-r mute"><span>Coupon paid by Flockr</span><b>{naira(rc.discount)}</b></div>}
                        <div className="so-r total"><span>{order.escrow_released_at ? 'You received' : 'You earn'}</span><b>{naira(rc.earn)}</b></div>
                        {rc.delivery > 0 && <div className="so-r mute"><span>Delivery (paid by buyer, goes to courier)</span><b>{naira(rc.delivery)}</b></div>}
                        {rc.buyerPaid > 0 && <div className="so-r mute"><span>Buyer paid in total</span><b>{naira(rc.buyerPaid)}</b></div>}
                    </div>

                    {(addr || order.courier_name) && (
                        <div className="so-two">
                            {addr && <div><small><RiMapPinLine size={11} /> Ship to</small><b>{addr.name}</b><p>{[addr.address, addr.city, addr.state].filter(Boolean).join(', ')}</p></div>}
                            {order.courier_name && <div><small><RiTruckLine size={11} /> Courier</small><b>{order.courier_name}</b><p className="mono">{order.tracking_number ?? 'Awaiting tracking #'}</p></div>}
                        </div>
                    )}

                    <div className="so-ref">Ref {order.reference}</div>

                    <div className="so-links">
                        <Link href={'/orders/' + order.id + '/tracking'}><RiTruckLine size={13} /> Track delivery</Link>
                        <Link href={'/orders/' + order.id}><RiExternalLinkLine size={13} /> View order</Link>
                    </div>
                </div>
            )}
        </article>
    );
}

export default function SellerOrders({ orders: raw = [], summary = {} }) {
    const { showToast, ToastComponent } = useToast();
    const orders = Array.isArray(raw) ? raw : (raw?.data ?? []);
    const [tab, setTab] = useState('all');
    const [q, setQ] = useState('');
    const [dlg, setDlg] = useState(null);

    const counts = useMemo(() => {
        const c = { all: orders.length };
        Object.entries(GROUPS).forEach(([k, st]) => { c[k] = orders.filter(o => st.includes(o.status)).length; });
        return c;
    }, [orders]);

    const list = orders.filter(o => {
        if (tab !== 'all' && !GROUPS[tab].includes(o.status)) return false;
        if (!q) return true;
        const t = q.toLowerCase();
        return (o.reference ?? '').toLowerCase().includes(t) || (o.buyer?.name ?? '').toLowerCase().includes(t)
            || (o.items ?? []).some(i => (i.product_name ?? '').toLowerCase().includes(t));
    });

    return (
        <>
            <Head title="Orders" />
            <div className="so-page scroll-hidden h-screen overflow-y-auto">
                <div className="so-top">
                    <div className="so-wrap">
                        <div className="so-bar">
                            <button className="so-back" aria-label="Back" onClick={() => (window.history.length > 1 ? window.history.back() : router.visit('/seller/dashboard'))}><RiArrowLeftLine size={20} /></button>
                            <h1>Orders</h1>
                            <span className="so-count">{orders.length}</span>
                        </div>
                        <div className="so-sum">
                            <div className={counts.todo ? 'hl' : ''}><b>{counts.todo}</b><small>To do</small></div>
                            <div><b>{counts.transit}</b><small>On the way</small></div>
                            <div><b className="amber">{naira(summary.in_escrow)}</b><small>In escrow</small></div>
                            <div><b className="green">{naira(summary.released)}</b><small>Paid to wallet</small></div>
                        </div>
                        <div className="so-search">
                            <RiSearchLine size={15} />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search buyer, product or reference" />
                            {q && <button onClick={() => setQ('')} aria-label="Clear"><RiCloseLine size={15} /></button>}
                        </div>
                        <div className="so-tabs">
                            {TABS.map(([k, l]) => (
                                <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                                    {l}{counts[k] > 0 && <em>{counts[k]}</em>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="so-wrap so-list">
                    <div className="so-escrow-tip"><RiShieldCheckLine size={14} />Payment is held in escrow, then released to your wallet 3 days after delivery (or sooner when the buyer confirms).</div>
                    {list.length === 0 ? (
                        <div className="so-empty"><RiBox3Line size={28} /><b>{q ? 'No matching orders' : tab === 'all' ? 'No orders yet' : 'Nothing here'}</b><p>{q ? 'Try a different search.' : 'New orders will show up here.'}</p></div>
                    ) : list.map(o => <OrderCard key={o.id} order={o} ask={setDlg} showToast={showToast} />)}
                </div>
            </div>

            {dlg && <ConfirmModal title={dlg.title} message={dlg.message} confirmLabel={dlg.confirmLabel} danger={dlg.danger} onConfirm={() => { const f = dlg.onConfirm; setDlg(null); f(); }} onClose={() => setDlg(null)} />}
            {ToastComponent}
            <style>{css}{css2}</style>
        </>
    );
}

SellerOrders.layout = page => <AppLayout>{page}</AppLayout>;

const css = `
.so-page{background:var(--flockr-black,#0a0a0a);color:#fff}
.so-wrap{max-width:720px;margin:0 auto;padding:0 16px}
.so-top{position:sticky;top:0;z-index:30;background:rgba(10,10,10,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:0}
.so-bar{display:flex;align-items:center;gap:12px;padding:12px 0 12px}
.so-bar h1{margin:0;font-size:20px;font-weight:800;flex:1}
.so-back{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
.so-count{font-size:12px;font-weight:700;color:rgba(255,255,255,.5);background:rgba(255,255,255,.06);padding:4px 10px;border-radius:999px}
.so-sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.so-sum>div{background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:10px 8px;text-align:center;min-width:0}
.so-sum>div.hl{border-color:rgba(59,130,246,.4);background:rgba(59,130,246,.08)}
.so-sum b{display:block;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.so-sum b.amber{color:#F5B93B}.so-sum b.green{color:#10B981}
.so-sum small{display:block;margin-top:2px;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.35)}
.so-search{display:flex;align-items:center;gap:9px;padding:9px 13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;color:rgba(255,255,255,.3)}
.so-search input{flex:1;background:none;border:0;outline:0;color:#fff;font-size:13px;font-family:inherit;min-width:0}
.so-search button{background:none;border:0;color:rgba(255,255,255,.4);cursor:pointer;display:flex}
.so-tabs{display:flex;gap:6px;overflow-x:auto;padding:12px 0;scrollbar-width:none}
.so-tabs button{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.09);background:transparent;color:rgba(255,255,255,.5);font-size:12.5px;font-weight:600;cursor:pointer}
.so-tabs button.on{background:#fff;color:#000;border-color:#fff}
.so-tabs em{font-style:normal;font-size:10px;font-weight:800;opacity:.7}
.so-list{padding-top:14px;padding-bottom:110px;display:flex;flex-direction:column;gap:10px}
.so-escrow-tip{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.45;color:rgba(255,255,255,.5);background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:12px;padding:10px 12px}
.so-escrow-tip svg{color:#10B981;flex-shrink:0;margin-top:2px}
.so-card{position:relative;background:#111;border:1px solid rgba(255,255,255,.07);border-left:4px solid rgba(255,255,255,.12);border-radius:6px 18px 18px 6px;overflow:hidden}
.so-card.hot{border-color:rgba(59,130,246,.35);border-left-color:#3B82F6}.so-card.bad{border-color:rgba(239,68,68,.3);border-left-color:#EF4444}
.so-head{all:unset;box-sizing:border-box;width:100%;display:flex;gap:12px;align-items:center;padding:14px;cursor:pointer}
.so-thumb{position:relative;width:52px;height:52px;border-radius:12px;background:#1a1a1a;border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:visible}
.so-thumb img{width:100%;height:100%;object-fit:cover;border-radius:12px}
.so-thumb em{position:absolute;right:-6px;bottom:-6px;font-style:normal;font-size:10px;font-weight:800;background:#FF6B35;color:#fff;border-radius:999px;padding:1px 6px;border:2px solid #111}
.so-thumb.sm{width:38px;height:38px;border-radius:9px}.so-thumb.sm img{border-radius:9px}
.so-mid{flex:1;min-width:0}
.so-title{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.so-sub{font-size:11.5px;color:rgba(255,255,255,.38);margin:2px 0 6px}
.so-chip{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:999px;border:1px solid}
.so-amt{text-align:right;flex-shrink:0}
.so-amt b{display:block;font-size:16px;font-weight:800;color:#10B981}
.so-amt small{font-size:10.5px;color:rgba(255,255,255,.35)}
.so-nudge{display:flex;gap:9px;align-items:center;padding:9px 14px;font-size:12px;font-weight:600;color:#3B82F6;background:rgba(59,130,246,.07);border-top:1px solid rgba(59,130,246,.12)}
.so-nudge.red{color:#EF4444;background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.14)}
.so-nudge i{width:7px;height:7px;border-radius:50%;background:currentColor;animation:soblink 1.4s ease infinite}
.so-cta{padding:10px 14px 14px}
.so-btn{width:100%;display:flex;gap:8px;align-items:center;justify-content:center;padding:13px;border:0;border-radius:13px;color:#fff;font-size:14px;font-weight:700;cursor:pointer}
.so-btn.blue{background:#3B82F6}.so-btn.orange{background:#FF6B35}.so-btn:disabled{opacity:.5;cursor:not-allowed}
.so-body{border-top:1px solid rgba(255,255,255,.06);padding:14px;display:flex;flex-direction:column;gap:14px}
.so-steps{display:flex}
.so-step{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:9.5px;color:rgba(255,255,255,.3);text-align:center}
.so-step i{width:11px;height:11px;border-radius:50%;background:#222;border:2px solid #333;z-index:1}
.so-step b{position:absolute;top:5px;left:50%;width:100%;height:2px;background:#222}
.so-step.on{color:rgba(255,255,255,.75)}.so-step.on i{background:#10B981;border-color:#10B981}.so-step.on b{background:#10B981}
.so-note{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.45;padding:10px 12px;border-radius:12px;border:1px solid}
.so-note svg{flex-shrink:0;margin-top:2px}
.so-note.good{color:#10B981;background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.2)}
.so-note.warn{color:#F5B93B;background:rgba(245,185,59,.07);border-color:rgba(245,185,59,.2)}
.so-note.info{color:#6aa3ee;background:rgba(57,135,229,.07);border-color:rgba(57,135,229,.2)}
.so-note.mute{color:rgba(255,255,255,.5);background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)}
.so-sec{display:flex;flex-direction:column;gap:10px}
.so-item{display:flex;gap:11px;align-items:center;font-size:13px}
.so-im{flex:1;min-width:0}.so-im b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.so-im small{color:rgba(255,255,255,.35);font-size:11.5px}
.so-money{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.so-money>div{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px 6px;text-align:center}
.so-money small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.3);margin-bottom:3px}
.so-money b{font-size:13.5px}.so-money .neg{color:#ef7a7a}.so-money .pos{color:#10B981;font-size:15px;font-weight:800}
.so-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.so-two>div{background:rgba(255,255,255,.03);border-radius:12px;padding:10px 12px;min-width:0}
.so-two small{display:flex;gap:4px;align-items:center;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.3);margin-bottom:5px}
.so-two b{font-size:12.5px;display:block}.so-two p{margin:2px 0 0;font-size:11.5px;color:rgba(255,255,255,.4);line-height:1.45;word-break:break-word}.so-two .mono{font-family:monospace}
@media(max-width:420px){.so-two{grid-template-columns:1fr}}
.so-ref{font:11px monospace;color:rgba(255,255,255,.25)}
.so-links{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.so-links a{display:flex;gap:6px;align-items:center;justify-content:center;padding:11px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.7);font-size:12.5px;font-weight:600;text-decoration:none}
.so-empty{text-align:center;padding:70px 0;color:rgba(255,255,255,.25)}.so-empty b{display:block;margin-top:10px;color:rgba(255,255,255,.5);font-size:15px}.so-empty p{margin:4px 0 0;font-size:13px}
.spin{animation:sospin .8s linear infinite}@keyframes sospin{to{transform:rotate(360deg)}}@keyframes soblink{50%{opacity:.3}}
`;

const css2 = `
.so-receipt{background:#0c0c0c;border:1px dashed rgba(255,255,255,.14);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.so-rh{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:2px}
.so-r{display:flex;justify-content:space-between;gap:12px;font-size:13px;align-items:baseline}
.so-r span{color:rgba(255,255,255,.6)}
.so-r.neg b{color:#ef7a7a}
.so-r.mute span,.so-r.mute b{color:rgba(255,255,255,.35);font-size:11.5px;font-weight:500}
.so-r.total{margin-top:2px;padding-top:10px;border-top:1px dashed rgba(255,255,255,.16)}
.so-r.total span{color:#fff;font-weight:700}.so-r.total b{color:#10B981;font-size:18px;font-weight:800}
`;
