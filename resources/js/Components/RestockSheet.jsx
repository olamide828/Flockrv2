import axios from 'axios';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiAddLine, RiBellLine, RiCloseLine, RiHeartLine, RiLoader4Line, RiStore2Line, RiUserFollowLine } from 'react-icons/ri';
import { useToast } from '@/Components/Toast';

const QUICK = [5, 10, 25, 50];

/** Bottom sheet where a seller adds stock. Calls onDone(newStock) after success. */
export function RestockSheet({ product, onClose, onDone }) {
    const { showToast, ToastComponent } = useToast();
    const [qty, setQty] = useState('10');
    const [busy, setBusy] = useState(false);
    const [aud, setAud] = useState(null);
    const n = parseInt(qty, 10) || 0;
    const soldOut = Number(product.stock_quantity) <= 0;

    useEffect(() => {
        axios.get(`/api/products/${product.id}/restock-audience`).then(r => setAud(r.data)).catch(() => {});
    }, [product.id]);

    const submit = async () => {
        if (n < 1) { showToast('Enter how many you are adding.', 'error'); return; }
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/products/${product.id}/restock`, { quantity: n });
            showToast(data.message, 'success');
            onDone?.(data.stock, data);
            setTimeout(onClose, 600);
        } catch (e) {
            showToast(e.response?.data?.message ?? 'Could not restock. Try again.', 'error');
            setBusy(false);
        }
    };

    // Rendered into <body> so no parent (e.g. the ProductEdit page) can trap it underneath the bottom nav
    const sheet = (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: '#111', borderRadius: '24px 24px 0 0', padding: '14px 20px 28px', zIndex: 1 }}>
                <div style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 800 }}>Restock</h3>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,.45)', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: 0, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiCloseLine size={18} /></button>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                    <div style={{ flex: 1, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', textAlign: 'center' }}>
                        <small style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>In stock now</small>
                        <div style={{ color: soldOut ? '#EF4444' : '#fff', fontSize: 22, fontWeight: 800 }}>{soldOut ? 'Sold out' : product.stock_quantity}</div>
                    </div>
                    <div style={{ flex: 1, padding: 12, borderRadius: 14, background: 'rgba(16,185,129,.07)', border: '1px solid rgba(16,185,129,.2)', textAlign: 'center' }}>
                        <small style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>After restock</small>
                        <div style={{ color: '#10B981', fontSize: 22, fontWeight: 800 }}>{Math.max(0, Number(product.stock_quantity) || 0) + n}</div>
                    </div>
                </div>

                <label style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>How many are you adding?</label>
                <input type="number" min="1" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', margin: '7px 0 10px', padding: '13px 14px', fontSize: 18, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {QUICK.map(q => (
                        <button key={q} type="button" onClick={() => setQty(String(n + q))}
                            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                            <RiAddLine size={13} />{q}
                        </button>
                    ))}
                </div>

                {soldOut && (
                    <div style={{ display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 14, background: 'rgba(255,107,53,.07)', border: '1px solid rgba(255,107,53,.2)', marginBottom: 16 }}>
                        <RiBellLine size={16} color="#FF6B35" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.65)', lineHeight: 1.5 }}>
                            This item is sold out, so we’ll alert people the moment you restock:
                            <div style={{ display: 'flex', gap: 14, marginTop: 6, color: '#fff', fontWeight: 700 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><RiHeartLine size={14} />{aud ? aud.saved : '…'} saved it</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><RiUserFollowLine size={14} />{aud ? aud.followers : '…'} followers</span>
                            </div>
                        </div>
                    </div>
                )}

                <button type="button" onClick={submit} disabled={busy || n < 1}
                    style={{ width: '100%', padding: 15, borderRadius: 14, border: 0, background: '#FF6B35', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: busy || n < 1 ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {busy ? <RiLoader4Line size={18} style={{ animation: 'rsspin .8s linear infinite' }} /> : <RiStore2Line size={18} />}
                    {soldOut ? 'Restock & notify buyers' : 'Add stock'}
                </button>
            </div>
            {ToastComponent}
            <style>{'@keyframes rsspin{to{transform:rotate(360deg)}}'}</style>
        </div>
    );
    return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
}

/** Drop-in button: <RestockButton product={p} onDone={(stock)=>…} /> */
export default function RestockButton({ product, onDone, compact = false, style }) {
    const [open, setOpen] = useState(false);
    const out = Number(product.stock_quantity) <= 0;
    return (
        <>
            <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: compact ? '5px 10px' : '9px 14px', borderRadius: 999, border: out ? '1px solid #FF6B35' : '1px solid rgba(255,255,255,.12)', background: out ? '#FF6B35' : 'rgba(255,255,255,.06)', color: '#fff', fontSize: compact ? 11.5 : 13, fontWeight: 700, cursor: 'pointer', ...style }}>
                <RiAddLine size={compact ? 12 : 14} />{out ? 'Restock' : 'Add stock'}
            </button>
            {open && <RestockSheet product={product} onClose={() => setOpen(false)} onDone={onDone} />}
        </>
    );
}
