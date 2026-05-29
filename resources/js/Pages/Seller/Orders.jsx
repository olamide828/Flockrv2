import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    RiArrowLeftLine,
    RiCalendarLine,
    RiCheckboxCircleLine,
    RiCloseCircleFill,
    RiCloseCircleLine,
    RiGiftLine,
    RiLoader4Line,
    RiMoneyDollarCircleLine,
    RiRefreshLine,
    RiSearchLine,
    RiShoppingBagLine,
    RiTimeLine,
    RiTruckLine,
} from 'react-icons/ri';
import axios from 'axios';

const STATUS_FILTERS = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function SellerOrders({ orders: initialOrders = { data: [], meta: {} } }) {
    const [orders, setOrders] = useState(initialOrders.data ?? []);
    const [meta, setMeta] = useState(initialOrders.meta ?? {});
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [selected, setSelected] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const filtered = orders.filter((o) => {
        const matchStatus = status === 'all' || o.status === status;
        const matchSearch =
            !search || o.reference?.toLowerCase().includes(search.toLowerCase()) || o.buyer?.name?.toLowerCase().includes(search.toLowerCase());
        return matchStatus && matchSearch;
    });

    const totalRevenue = filtered
        .filter((o) => ['paid', 'delivered', 'shipped', 'confirmed', 'processing'].includes(o.status))
        .reduce((sum, o) => sum + Number(o.total ?? 0), 0);

   const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(true)
    try {
        await axios.patch(`/api/orders/${orderId}/status`, 
            { status: newStatus }, 
            { withCredentials: true }
        )
        setOrders(prev => prev.map(o => 
            o.id === orderId ? { ...o, status: newStatus } : o
        ))
        setSelected(prev => prev ? { ...prev, status: newStatus } : null)
        
    } catch {
        alert('Failed to update order status.')

    } finally {
        setUpdatingStatus(false)
    }
}

    return (
        <>
            <Head title="Orders" />

            <div className="sp">
                {/* ── Header ──────────────────────────────────────────────── */}
                <header className="sp-header">
                    <div className="sp-header-inner">
                        <Link href="/seller/dashboard" className="sp-back">
                            <RiArrowLeftLine size={18} />
                        </Link>
                        <div className="sp-header-text">
                            <h1>Orders</h1>
                            <p>{meta.total ?? orders.length} total</p>
                        </div>
                    </div>
                </header>

                <main className="sp-main">
                    {/* ── Summary ─────────────────────────────────────────────── */}
                    <div className="sp-summary">
                        <div className="sp-stat">
                            <div className="sp-stat-icon">
                                <RiShoppingBagLine size={18} />
                            </div>
                            <div>
                                <span className="sp-stat-val">{filtered.length}</span>
                                <span className="sp-stat-label">Showing</span>
                            </div>
                        </div>
                        <div className="sp-stat sp-stat-accent">
                            <div className="sp-stat-icon">
                                <RiMoneyDollarCircleLine size={18} />
                            </div>
                            <div>
                                <span className="sp-stat-val">₦{totalRevenue.toLocaleString()}</span>
                                <span className="sp-stat-label">Revenue</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Search ──────────────────────────────────────────────── */}
                    <div className="sp-search-wrap">
                        <RiSearchLine size={15} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by reference or buyer..."
                            className="sp-search-input"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="sp-search-clear">
                                <RiCloseCircleFill size={16} />
                            </button>
                        )}
                    </div>

                    {/* ── Status tabs ─────────────────────────────────────────── */}
                    <div className="sp-tabs-wrap">
                        {STATUS_FILTERS.map((s) => (
                            <button key={s} onClick={() => setStatus(s)} className={`sp-tab ${status === s ? 'sp-tab-active' : ''}`}>
                                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                                {s !== 'all' && status === s && filtered.length > 0 && <span className="sp-tab-count">{filtered.length}</span>}
                            </button>
                        ))}
                    </div>

                    {/* ── Orders list ─────────────────────────────────────────── */}
                    {filtered.length === 0 ? (
                        <div className="sp-empty">
                            <RiShoppingBagLine size={40} color="rgba(255,255,255,0.15)" />
                            <h4>No orders found</h4>
                            <p>Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div className="sp-list">
                            {filtered.map((order) => {
                                const sc = statusColor(order.status);
                                const isSelected = selected?.id === order.id;
                                return (
                                    <div key={order.id}>
                                        <div
                                            className={`sp-order ${isSelected ? 'sp-order-selected' : ''}`}
                                            onClick={() => setSelected(isSelected ? null : order)}
                                        >
                                            {/* Status icon */}
                                            <div className="sp-order-icon" style={{ background: sc.bg, color: sc.text }}>
                                                {statusIcon(order.status)}
                                            </div>

                                            {/* Meta */}
                                            <div className="sp-order-meta">
                                                <div className="sp-order-ref">{order.reference}</div>
                                                <div className="sp-order-buyer">
                                                    <img
                                                        src={
                                                            order.buyer?.avatar_url ??
                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(order.buyer?.name ?? 'B')}&background=1a1a1a&size=32`
                                                        }
                                                        alt=""
                                                        className="sp-buyer-avatar"
                                                    />
                                                    <span>{order.buyer?.name}</span>
                                                    <span className="sp-dot">·</span>
                                                    <span>
                                                        {order.items_count} item{order.items_count !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right side */}
                                            <div className="sp-order-right">
                                                <strong className="sp-order-amount">₦{Number(order.total).toLocaleString()}</strong>
                                                <span className="sp-pill" style={{ background: sc.bg, color: sc.text }}>
                                                    {order.status}
                                                </span>
                                                <div className="sp-order-date">
                                                    <RiCalendarLine size={11} />
                                                    {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inline detail panel — expands under the row on all screens */}
                                        {isSelected && (
                                            <div className="sp-detail">
                                                <div className="sp-detail-header">
                                                    <div>
                                                        <p className="sp-detail-ref">{selected.reference}</p>
                                                        <span className="sp-pill" style={{ background: sc.bg, color: sc.text }}>
                                                            {selected.status}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => setSelected(null)} className="sp-detail-close">
                                                        <RiCloseCircleFill size={20} />
                                                    </button>
                                                </div>

                                                <div className="sp-detail-rows">
                                                   {/* Status dropdown — only show for statuses seller can action */}
{['paid', 'processing', 'shipped'].includes(selected.status) && (
    <div style={{
        padding: '12px 18px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 10,
    }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
            Update status:
        </span>
        <select
            disabled={updatingStatus}
            onChange={async (e) => {
                if (!e.target.value) return
                await handleStatusUpdate(selected.id, e.target.value)
                e.target.value = '' // reset dropdown
            }}
            style={{
                flex: 1, padding: '9px 12px',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#fff',
                fontSize: 13, fontFamily: 'inherit',
                cursor: updatingStatus ? 'not-allowed' : 'pointer',
                opacity: updatingStatus ? 0.6 : 1,
                outline: 'none',
            }}
        >
            <option value="">— Select new status —</option>
            {{
                paid:       ['processing', 'cancelled'],
                processing: ['shipped',    'cancelled'],
                shipped:    ['delivered'],
            }[selected.status]?.map(s => (
                <option key={s} value={s}>
                    {s === 'processing' ? '🔄 Processing'
                     : s === 'shipped'  ? '🚚 Shipped'
                     : s === 'delivered'? '✅ Delivered'
                     : s === 'cancelled'? '❌ Cancelled'
                     : s}
                </option>
            ))}
        </select>
        {updatingStatus && (
            <span style={{ fontSize: 12, color: '#ff6b35', flexShrink: 0 }}>Updating...</span>
        )}
    </div>
)}
                                                    <DetailRow label="Buyer" value={`${selected.buyer?.name} (@${selected.buyer?.username})`} />
                                                    <DetailRow label="Total" value={`₦${Number(selected.total).toLocaleString()}`} accent />
                                                    <DetailRow
                                                        label="Date"
                                                        value={new Date(selected.created_at).toLocaleDateString('en-NG', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                        })}
                                                    />
                                                    {selected.items?.map((item, i) => (
                                                        <DetailRow
                                                            key={i}
                                                            label={item.product?.name ?? `Item ${i + 1}`}
                                                            value={`×${item.quantity} · ₦${Number(item.price).toLocaleString()}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            <style>{styles}</style>
        </>
    );
}

SellerOrders.layout = (page) => <AppLayout>{page}</AppLayout>;

function DetailRow({ label, value, accent }) {
    return (
        <div className="sp-detail-row">
            <span className="sp-detail-label">{label}</span>
            <span className="sp-detail-val" style={accent ? { color: '#ff6b35', fontWeight: 700 } : {}}>
                {value}
            </span>
        </div>
    );
}

function statusColor(status) {
    const map = {
        pending: { bg: 'rgba(234,179,8,0.12)', text: '#EAB308' },
        paid: { bg: 'rgba(16,185,129,0.12)', text: '#10B981' },
        confirmed: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
        processing: { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6' },
        shipped: { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
        delivered: { bg: 'rgba(16,185,129,0.12)', text: '#10B981' },
        cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#EF4444' },
        refunded: { bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF' },
    };
    return map[status] ?? { bg: 'rgba(255,255,255,0.08)', text: '#fff' };
}

function statusIcon(status) {
    const s = 15;
    const map = {
        pending: <RiTimeLine size={s} />,
        paid: <RiCheckboxCircleLine size={s} />,
        confirmed: <RiCheckboxCircleLine size={s} />,
        processing: <RiLoader4Line size={s} />,
        shipped: <RiTruckLine size={s} />,
        delivered: <RiGiftLine size={s} />,
        cancelled: <RiCloseCircleLine size={s} />,
        refunded: <RiRefreshLine size={s} />,
    };
    return map[status] ?? <RiShoppingBagLine size={s} />;
}

const styles = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.sp {
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
  font-family: "DM Sans", system-ui, sans-serif;
  overflow-y: auto;
}

/* ── Header ──────────────────────────────────────────────────────────── */
.sp-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(10,10,10,0.88);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.sp-header-inner {
  max-width: 960px;
  margin: auto;
  padding: 0 20px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.sp-back {
  width: 36px; height: 36px;
  border-radius: 11px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  color: #fff; text-decoration: none; flex-shrink: 0;
  transition: background 0.15s;
}
.sp-back:hover { background: rgba(255,255,255,0.1); }

.sp-header-text h1 {
  font-size: 17px; font-weight: 700; line-height: 1.1; color: #fff;
}
.sp-header-text p {
  font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px;
}

/* ── Main ────────────────────────────────────────────────────────────── */
.sp-main {
  max-width: 960px;
  margin: auto;
  padding: 24px 20px 100px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Summary ─────────────────────────────────────────────────────────── */
.sp-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.sp-stat {
  background: #111;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.sp-stat-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.4); flex-shrink: 0;
}
.sp-stat-accent .sp-stat-icon { color: #ff6b35; background: rgba(255,107,53,0.1); }

.sp-stat-val {
  display: block;
  font-size: 20px; font-weight: 800; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sp-stat-accent .sp-stat-val { color: #ff6b35; }

.sp-stat-label {
  display: block;
  font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 2px;
}

/* ── Search ──────────────────────────────────────────────────────────── */
.sp-search-wrap {
  display: flex; align-items: center; gap: 10px;
  background: #111; border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px; padding: 12px 16px;
  transition: border-color 0.2s;
}
.sp-search-wrap:focus-within { border-color: rgba(255,107,53,0.4); }

.sp-search-input {
  flex: 1; min-width: 0;
  background: none; border: none; outline: none;
  color: #fff; font-size: 14px; font-family: inherit;
}
.sp-search-input::placeholder { color: rgba(255,255,255,0.25); }

.sp-search-clear {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.3); display: flex; flex-shrink: 0;
  transition: color 0.15s;
}
.sp-search-clear:hover { color: rgba(255,255,255,0.6); }

/* ── Status tabs ─────────────────────────────────────────────────────── */
.sp-tabs-wrap {
  display: flex; gap: 6px;
  overflow-x: auto; scrollbar-width: none;
  padding-bottom: 2px; -webkit-overflow-scrolling: touch;
}
.sp-tabs-wrap::-webkit-scrollbar { display: none; }

.sp-tab {
  padding: 7px 14px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.07);
  background: #111; color: rgba(255,255,255,0.4);
  font-size: 12px; font-weight: 600; font-family: inherit;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  display: flex; align-items: center; gap: 5px;
  transition: all 0.15s;
}
.sp-tab:hover { color: rgba(255,255,255,0.7); }
.sp-tab-active { background: #fff; color: #000; border-color: #fff; }

.sp-tab-count {
  background: rgba(0,0,0,0.2);
  border-radius: 999px;
  padding: 1px 6px;
  font-size: 10px;
}

/* ── Empty ───────────────────────────────────────────────────────────── */
.sp-empty {
  text-align: center; padding: 60px 24px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.sp-empty h4 { font-size: 16px; color: #fff; }
.sp-empty p  { font-size: 13px; color: rgba(255,255,255,0.35); }

/* ── Orders list ─────────────────────────────────────────────────────── */
.sp-list {
  display: flex; flex-direction: column;
  background: #111; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 22px; overflow: hidden;
}

/* ── Order row ───────────────────────────────────────────────────────── */
.sp-order {
  display: flex; align-items: center; gap: 12px;
  padding: 15px 18px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sp-order:last-child { border-bottom: none; }
.sp-order:hover { background: rgba(255,255,255,0.02); }
.sp-order-selected { background: rgba(255,107,53,0.04) !important; }

.sp-order-icon {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}

.sp-order-meta { flex: 1; min-width: 0; }

.sp-order-ref {
  font-size: 13px; font-weight: 600; color: #fff;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 4px;
}

.sp-order-buyer {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: rgba(255,255,255,0.4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.sp-buyer-avatar {
  width: 16px; height: 16px; border-radius: 50%;
  object-fit: cover; flex-shrink: 0;
}

.sp-dot { color: rgba(255,255,255,0.2); }

.sp-order-right {
  flex-shrink: 0; text-align: right;
  display: flex; flex-direction: column; align-items: flex-end; gap: 5px;
}

.sp-order-amount { font-size: 14px; font-weight: 700; color: #fff; }

.sp-order-date {
  display: flex; align-items: center; gap: 3px;
  font-size: 11px; color: rgba(255,255,255,0.3);
}

/* ── Status pill ─────────────────────────────────────────────────────── */
.sp-pill {
  display: inline-block;
  padding: 3px 9px; border-radius: 999px;
  font-size: 10px; font-weight: 700;
  text-transform: capitalize; white-space: nowrap;
}

/* ── Detail panel (inline, expands under row) ────────────────────────── */
.sp-detail {
  border-top: 1px solid rgba(255,107,53,0.15);
  background: rgba(255,107,53,0.03);
  animation: detailIn 0.18s ease;
}

@keyframes detailIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.sp-detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.sp-detail-ref {
  font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 6px;
}

.sp-detail-close {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.3); display: flex; flex-shrink: 0;
  margin-top: 2px; transition: color 0.15s;
}
.sp-detail-close:hover { color: rgba(255,255,255,0.7); }

.sp-detail-rows { padding: 4px 0 8px; }

.sp-detail-row {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
  padding: 11px 18px; font-size: 13px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.sp-detail-row:last-child { border-bottom: none; }

.sp-detail-label { color: rgba(255,255,255,0.4); flex-shrink: 0; }
.sp-detail-val   { color: #fff; font-weight: 600; text-align: right; word-break: break-word; }

/* ══════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════ */

/* Tablet */
@media (max-width: 768px) {
  .sp-main { padding: 18px 14px 100px; gap: 14px; }
  .sp-header-inner { padding: 0 14px; height: 58px; }

  .sp-summary { grid-template-columns: 1fr 1fr; gap: 10px; }
  .sp-stat { padding: 14px; border-radius: 16px; gap: 10px; }
  .sp-stat-val { font-size: 17px; }

  /* On tablet, show order rows in card style — no table look */
  .sp-list { background: transparent; border: none; border-radius: 0; gap: 10px; }
  .sp-order {
    background: #111; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 18px; padding: 14px;
  }
  .sp-order:last-child { border-bottom: 1px solid rgba(255,255,255,0.06); }

  .sp-detail {
    border-radius: 0 0 18px 18px;
    margin-top: -10px; /* pull up under the card */
    border: 1px solid rgba(255,255,255,0.06);
    border-top: 1px solid rgba(255,107,53,0.15);
  }
}

/* Mobile */
@media (max-width: 480px) {
  .sp-main { padding: 14px 12px 100px; }
  .sp-header-inner { padding: 0 12px; height: 54px; }
  .sp-header-text h1 { font-size: 16px; }

  /* Stack summary vertically on very small screens */
  .sp-summary { grid-template-columns: 1fr 1fr; }
  .sp-stat-val { font-size: 15px; }
  .sp-stat-label { font-size: 11px; }
  .sp-stat-icon { width: 34px; height: 34px; border-radius: 10px; }

  /* Order card layout: icon + content stacked nicely */
  .sp-order { gap: 10px; padding: 13px; }
  .sp-order-icon { width: 36px; height: 36px; border-radius: 10px; }
  .sp-order-ref { font-size: 12px; }
  .sp-order-buyer { font-size: 11px; }
  .sp-order-amount { font-size: 13px; }

  /* Detail rows stack label/value vertically */
  .sp-detail-row {
    flex-direction: column; gap: 3px; padding: 10px 14px;
  }
  .sp-detail-val { text-align: left; }
  .sp-detail-header { padding: 14px 14px 10px; }

  .sp-search-wrap { padding: 10px 13px; }
  .sp-search-input { font-size: 13px; }

  .sp-tab { font-size: 11px; padding: 6px 11px; }
}

/* Extra small (320px) */
@media (max-width: 360px) {
  .sp-summary { grid-template-columns: 1fr; }
  .sp-order {
    display: grid;
    grid-template-columns: 36px 1fr;
    grid-template-rows: auto auto;
    gap: 8px 10px;
  }
  .sp-order-right {
    grid-column: 1 / -1;
    flex-direction: row; align-items: center; justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.05);
    text-align: left;
  }
  .sp-order-date { display: none; }
}
`;
