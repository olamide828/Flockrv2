import { Link } from '@inertiajs/react';
import { RiMapPinLine, RiPhoneLine, RiUserLine, RiShoppingBagLine, RiTruckLine, RiArrowRightLine, RiFileCopyLine, RiCheckLine } from 'react-icons/ri';
import { useState } from 'react';
import VerifiedBadge from '@/Components/VerifiedBadge';

const card = { background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' };
const label = { margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' };
const money = v => '₦' + Number(v ?? 0).toLocaleString();

export function addressOf(order) {
    const a = order.shipping_address;
    if (!a) return null;
    if (typeof a === 'string') { try { return JSON.parse(a); } catch { return null; } }
    return a;
}

export function ItemsCard({ order }) {
    const items = order.items ?? [];
    return (
        <div style={card}>
            <p style={{ ...label, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Items ({items.length})</p>
            {items.map((item, i) => {
                const p = item.product;
                const inner = (
                    <>
                        <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                            {p?.primary_image
                                ? <img src={p.primary_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiShoppingBagLine size={18} color="rgba(255,255,255,0.2)" /></div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                            <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Qty {item.quantity} · {money(item.unit_price)} each</p>
                        </div>
                        <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{money(item.total)}</p>
                    </>
                );
                const style = { display: 'flex', gap: 12, alignItems: 'center', padding: '12px 18px', textDecoration: 'none', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' };
                return p?.slug && order.seller?.username
                    ? <Link key={item.id ?? i} href={`/@${order.seller.username}/products/${p.slug}`} style={style}>{inner}</Link>
                    : <div key={item.id ?? i} style={style}>{inner}</div>;
            })}
        </div>
    );
}

export function PriceCard({ order }) {
    const rows = [
        ['Subtotal', order.subtotal],
        ['Delivery', order.courier_fee ?? order.shipping_fee],
        ['Platform fee', order.platform_fee],
    ];
    if (Number(order.discount_amount) > 0) rows.push(['Discount', -Number(order.discount_amount)]);
    if (Number(order.event_discount_amount) > 0) rows.push(['Event discount', -Number(order.event_discount_amount)]);
    return (
        <div style={card}>
            <p style={{ ...label, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Price breakdown</p>
            {rows.map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{l}</span>
                    <span style={{ color: v < 0 ? '#10B981' : 'rgba(255,255,255,0.7)', fontSize: 13 }}>{v < 0 ? '−' + money(-v) : money(v)}</span>
                </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{order.status === 'pending' ? 'Total due' : 'Total paid'}</span>
                <span style={{ color: '#FF6B35', fontWeight: 800, fontSize: 18 }}>{money(order.total)}</span>
            </div>
        </div>
    );
}

export function AddressCard({ order }) {
    const a = addressOf(order);
    if (!a) return null;
    const line = [a.address ?? a.street, a.city, a.state].filter(Boolean).join(', ');
    return (
        <div style={{ ...card, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <RiMapPinLine size={14} color="#FF6B35" /><p style={label}>Delivering to</p>
            </div>
            {(a.name ?? a.recipient_name) && <p style={{ margin: '0 0 4px', color: '#fff', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}><RiUserLine size={13} color="rgba(255,255,255,0.3)" />{a.name ?? a.recipient_name}</p>}
            {a.phone && <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.55)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}><RiPhoneLine size={13} color="rgba(255,255,255,0.3)" />{a.phone}</p>}
            {line && <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5 }}>{line}</p>}
            {a.landmark && <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>📍 Near {a.landmark}</p>}
        </div>
    );
}

export function SellerCard({ order }) {
    const s = order.seller;
    if (!s) return null;
    return (
        <Link href={`/@${s.username}`} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', textDecoration: 'none' }}>
            <img src={s.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name ?? 'S')}&background=1a1a1a`} alt={s.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{s.name}</span><VerifiedBadge type={s.verification_type} size={13} /></div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{s.username}</span>
            </div>
            <RiArrowRightLine size={16} color="rgba(255,255,255,0.2)" />
        </Link>
    );
}

const ETA_DONE = ['delivered', 'cancelled', 'refunded', 'returned'];
export function etaLabel(order) {
    if (!order || ETA_DONE.includes(order.status) || !order.estimated_delivery) return null;
    const d = new Date(order.estimated_delivery);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function CourierCard({ order }) {
    const [copied, setCopied] = useState(false);
    const eta = etaLabel(order);
    if (!order.courier_name && !order.tracking_number && !eta) return null;
    const showNum = order.tracking_number && !['pending', 'paid'].includes(order.status);
    const copy = async () => { try { await navigator.clipboard.writeText(order.tracking_number); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1800); };
    return (
        <div style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiTruckLine size={20} color="#8B5CF6" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
                {order.courier_name && <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>{order.courier_name}</p>}
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: showNum ? 'monospace' : 'inherit' }}>{showNum ? order.tracking_number : 'Tracking number appears once the courier picks up'}</p>
            </div>
            {eta && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Expected</p>
                    <p style={{ margin: '2px 0 0', color: '#10B981', fontSize: 14, fontWeight: 800 }}>{eta}</p>
                </div>
            )}
            {showNum && <button onClick={copy} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: copied ? '#10B981' : 'rgba(255,255,255,0.45)' }}>{copied ? <RiCheckLine size={15} /> : <RiFileCopyLine size={15} />}</button>}
        </div>
    );
}

/** Everything every order page shows, in the same order, from the same data. */
export default function OrderSummary({ order, showSeller = true }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <CourierCard order={order} />
            <ItemsCard order={order} />
            <PriceCard order={order} />
            <AddressCard order={order} />
            {showSeller && <SellerCard order={order} />}
        </div>
    );
}
