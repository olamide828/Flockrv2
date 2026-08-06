import { useEffect, useState } from 'react';
import {
    RiCheckLine,
    RiCloseLine,
    RiFileCopyLine,
    RiGiftLine,
    RiScreenshot2Line,
    RiTimeLine,
} from 'react-icons/ri';

/**
 * CouponModal — shown after a successful review submission
 *
 * Usage:
 *   <CouponModal
 *     coupon={{ code, amount, min_order, expires_at }}
 *     onClose={() => setCoupon(null)}
 *   />
 */
export default function CouponModal({ coupon, onClose }) {
    const [copied,  setCopied]  = useState(false);
    const [visible, setVisible] = useState(false);

    // Animate in
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(coupon.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback for older browsers
            const el = document.createElement('textarea');
            el.value = coupon.code;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    if (!coupon) return null;

    return (
        <div style={{
            position:   'fixed',
            inset:      0,
            zIndex:     9999,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding:    '20px',
            background: visible ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0)',
            backdropFilter: visible ? 'blur(12px)' : 'none',
            transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
        }}>
            {/* Modal card */}
            <div style={{
                position:  'relative',
                width:     '100%',
                maxWidth:  380,
                background:'#111',
                border:    '1px solid rgba(255,255,255,0.1)',
                borderRadius: 28,
                padding:   '32px 24px 28px',
                textAlign: 'center',
                transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(30px)',
                opacity:   visible ? 1 : 0,
                transition:'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}>
                {/* Close button */}
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.07)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.5)',
                    }}
                >
                    <RiCloseLine size={16} />
                </button>

                {/* Gift icon */}
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,107,53,0.08))',
                    border: '2px solid rgba(255,107,53,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    animation: 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <RiGiftLine size={32} color="#FF6B35" />
                </div>

                <h2 style={{ margin: '0 0 6px', color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display, sans-serif)' }}>
                    You earned a coupon! 🎉
                </h2>
                <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.5 }}>
                    Thank you for your review. Here's ₦{Number(coupon.amount).toLocaleString()} off your next order.
                </p>

                {/* Coupon card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(255,107,53,0.05) 100%)',
                    border: '1.5px dashed rgba(255,107,53,0.4)',
                    borderRadius: 18,
                    padding: '20px 16px',
                    marginBottom: 20,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative circles (tear-away effect) */}
                    <div style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#111' }} />
                    <div style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#111' }} />

                    <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Your promo code
                    </p>
                    <p style={{
                        margin: '0 0 8px',
                        color: '#FF6B35',
                        fontSize: 22,
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        letterSpacing: '0.15em',
                    }}>
                        {coupon.code}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                            ₦{Number(coupon.amount).toLocaleString()} off · Min. ₦{Number(coupon.min_order).toLocaleString()}
                        </span>
                        {coupon.expires_at && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                                <RiTimeLine size={11} />
                                Expires {coupon.expires_at}
                            </span>
                        )}
                    </div>
                </div>

                {/* Warning — save the code */}
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px',
                    background: 'rgba(234,179,8,0.08)',
                    border: '1px solid rgba(234,179,8,0.2)',
                    borderRadius: 12,
                    marginBottom: 20,
                    textAlign: 'left',
                }}>
                    <RiScreenshot2Line size={16} color="#EAB308" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ margin: 0, color: 'rgba(234,179,8,0.85)', fontSize: 12, lineHeight: 1.5 }}>
                        <strong>Save this code!</strong> Screenshot it or copy it now — you won't see it again here.
                    </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                        onClick={handleCopy}
                        style={{
                            width: '100%', padding: '13px',
                            background: copied ? 'rgba(16,185,129,0.15)' : '#FF6B35',
                            border: copied ? '1px solid rgba(16,185,129,0.3)' : 'none',
                            borderRadius: 14,
                            color: copied ? '#10B981' : '#fff',
                            fontSize: 14, fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'all 0.2s',
                        }}
                    >
                        {copied
                            ? <><RiCheckLine size={16} /> Copied!</>
                            : <><RiFileCopyLine size={16} /> Copy Code</>
                        }
                    </button>
                    <button
                        onClick={handleClose}
                        style={{
                            width: '100%', padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 14,
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 14, fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        I've saved it, close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes bounceIn {
                    from { transform: scale(0.3); opacity: 0; }
                    to   { transform: scale(1);   opacity: 1; }
                }
            `}</style>
        </div>
    );
}