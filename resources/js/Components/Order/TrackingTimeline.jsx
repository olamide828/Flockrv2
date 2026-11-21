import { RiCheckLine, RiCheckDoubleLine, RiMapPinLine, RiTruckLine, RiStoreLine, RiShoppingBagLine, RiAlertLine, RiMotorbikeLine, RiBankCardLine } from 'react-icons/ri';

export function fmtDateTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
}

const ICONS = {
    'order.created': RiShoppingBagLine, 'order.paid': RiBankCardLine, 'order.packed': RiStoreLine,
    'shipment.created': RiMotorbikeLine, 'shipment.dropped_off': RiMotorbikeLine, 'shipment.picked_up': RiMotorbikeLine, 'shipment.in_transit': RiTruckLine,
    'shipment.out_for_delivery': RiTruckLine, 'shipment.delivered': RiCheckDoubleLine,
    'shipment.pickup_failed': RiAlertLine, 'shipment.delivery_failed': RiAlertLine, 'shipment.returned': RiAlertLine,
    'shipment.cancelled': RiAlertLine, 'order.cancelled': RiAlertLine,
};
const BAD = new Set(['shipment.pickup_failed', 'shipment.delivery_failed', 'shipment.returned', 'shipment.cancelled', 'order.cancelled']);

/** The 5 milestones shown in the progress bar — computed from what actually happened. */
export function stagesFor(order) {
    const ev = new Set((order.timeline ?? []).map(e => e.event));
    const has = (...k) => k.some(x => ev.has(x));
    const status = order.status;
    return [
        { label: 'Placed',    done: true },
        { label: 'Paid',      done: has('order.paid') || !!order.paid_at || !['pending'].includes(status) },
        { label: 'Packed',    done: has('order.packed', 'shipment.picked_up', 'shipment.in_transit', 'shipment.out_for_delivery', 'shipment.delivered') || ['processing', 'shipped', 'delivered'].includes(status) },
        { label: 'On the way', done: has('shipment.picked_up', 'shipment.in_transit', 'shipment.out_for_delivery', 'shipment.delivered') || ['shipped', 'delivered'].includes(status) },
        { label: 'Delivered', done: has('shipment.delivered') || status === 'delivered' },
    ];
}

export function ProgressStages({ order }) {
    const stages = stagesFor(order);
    const reached = stages.filter(s => s.done).length;
    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {stages.map((s, i) => (
                    <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {i > 0 && <div style={{ position: 'absolute', top: 13, right: '50%', width: '100%', height: 2, background: stages[i].done ? '#10B981' : 'rgba(255,255,255,0.08)' }} />}
                        <div style={{ position: 'relative', zIndex: 1, width: 28, height: 28, borderRadius: '50%', background: s.done ? '#10B981' : '#1a1a1a', border: `2px solid ${s.done ? '#10B981' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {s.done && <RiCheckLine size={14} color="#fff" />}
                        </div>
                        <span style={{ marginTop: 8, fontSize: 10.5, color: s.done ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: s.done ? 600 : 400, textAlign: 'center' }}>{s.label}</span>
                    </div>
                ))}
            </div>
            <p style={{ margin: '14px 0 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{reached} of {stages.length} steps complete</p>
        </div>
    );
}

/** Real events, newest first, each with its own timestamp (courier events use Terminal's time). */
export default function TrackingTimeline({ order, title = 'Tracking history' }) {
    // newest first; the server already orders ties (placed → paid → courier), so reverse that order rather than re-sorting
    const events = [...(order.timeline ?? [])].map(e => ({ ...e, event: String(e.event).replace(/-/g, '_') })).reverse();
    return (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
            <p style={{ margin: 0, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>
            <div style={{ padding: '16px 18px' }}>
                {events.length === 0 && <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No updates yet.</p>}
                {events.map((e, i) => {
                    const Icon = ICONS[e.event] ?? RiTruckLine;
                    const bad = BAD.has(e.event);
                    const latest = i === 0;
                    const col = bad ? '#EF4444' : latest ? '#FF6B35' : '#10B981';
                    const last = i === events.length - 1;
                    return (
                        <div key={e.event + e.at + i} style={{ display: 'flex', gap: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${col}20`, border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: latest ? `0 0 14px ${col}55` : 'none' }}>
                                    <Icon size={14} color={col} />
                                </div>
                                {!last && <div style={{ width: 2, flex: 1, minHeight: 18, background: 'rgba(255,255,255,0.08)', margin: '3px 0' }} />}
                            </div>
                            <div style={{ paddingBottom: last ? 0 : 18, flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                    <p style={{ margin: 0, color: latest ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: latest ? 700 : 600 }}>{e.title}</p>
                                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{fmtDateTime(e.at)}</span>
                                </div>
                                {e.description && <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.45 }}>{e.description}</p>}
                                {e.location && <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><RiMapPinLine size={11} /> {e.location}</p>}
                                {e.source === 'terminal' && <span style={{ display: 'inline-block', marginTop: 5, fontSize: 10, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', padding: '1px 7px', borderRadius: 999 }}>Courier update</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
