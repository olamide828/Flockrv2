import { useState } from 'react';
import { RiCloseLine, RiWhatsappLine, RiMailLine, RiFileCopyLine, RiArrowRightSLine } from 'react-icons/ri';


const WHATSAPP_NUMBER = '2347012591630';
const SUPPORT_EMAIL = 'support@flockr.com.ng';

export default function ContactSheet({ user, onClose, showToast }) {
    const [closing, setClosing] = useState(false);

    const close = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const handle = user?.username ? `@${user.username}` : '';
    const waText = `Hi Flockr, ${handle ? `I'm ${handle}. ` : ''}I need help with `;
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;
    const mailUrl =
        `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Flockr support')}` +
        (handle ? `&body=${encodeURIComponent(`My username: ${handle}\n\n`)}` : '');

    const copyEmail = async () => {
        try {
            await navigator.clipboard.writeText(SUPPORT_EMAIL);
            showToast?.('Email copied', 'success');
        } catch {
            showToast?.('Could not copy the email', 'error');
        }
    };

    return (
        <>
            <div className={`cs-backdrop ${closing ? 'cs-backdrop-out' : ''}`} onClick={close} />
            <div className={`cs-sheet ${closing ? 'cs-sheet-out' : ''}`} role="dialog" aria-label="Contact us">
                <div className="cs-grab" />
                <div className="cs-head">
                    <h3>Contact us</h3>
                    <button onClick={close} aria-label="Close" className="cs-close"><RiCloseLine size={20} /></button>
                </div>
                <p className="cs-sub">Choose whichever is easiest. For an order issue, include the order number.</p>

                <div className="cs-group">
                    <a className="cs-row" href={waUrl} target="_blank" rel="noopener noreferrer">
                        <div className="cs-icon cs-icon-wa"><RiWhatsappLine size={19} /></div>
                        <div className="cs-text">
                            <span className="cs-label">Chat on WhatsApp</span>
                            <span className="cs-hint">Message us directly</span>
                        </div>
                        <RiArrowRightSLine size={18} className="cs-chevron" />
                    </a>

                    <div className="cs-row cs-row-split">
                        <a className="cs-row-main" href={mailUrl}>
                            <div className="cs-icon"><RiMailLine size={19} /></div>
                            <div className="cs-text">
                                <span className="cs-label">Send an email</span>
                                <span className="cs-hint">{SUPPORT_EMAIL}</span>
                            </div>
                        </a>
                        <button onClick={copyEmail} className="cs-copy" aria-label="Copy email address">
                            <RiFileCopyLine size={17} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .cs-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.6); animation: csFade 0.18s ease; }
                .cs-backdrop-out { opacity: 0; transition: opacity 0.18s ease; }
                .cs-sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 1001; max-width: 520px; margin: 0 auto; background: #0a0a0c; border: 1px solid rgba(255,255,255,0.08); border-bottom: none; border-radius: 20px 20px 0 0; padding: 10px 16px calc(24px + env(safe-area-inset-bottom, 0px)); animation: csUp 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
                .cs-sheet-out { transform: translateY(24px); opacity: 0; transition: transform 0.18s ease, opacity 0.18s ease; }
                .cs-grab { width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); margin: 0 auto 12px; }
                .cs-head { display: flex; align-items: center; justify-content: space-between; }
                .cs-head h3 { margin: 0; color: #fff; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
                .cs-close { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.08); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .cs-sub { margin: 6px 0 16px; color: rgba(255,255,255,0.5); font-size: 13px; line-height: 1.45; }
                .cs-group { background: #121214; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; }
                .cs-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-decoration: none; cursor: pointer; }
                .cs-row + .cs-row { border-top: 1px solid rgba(255,255,255,0.05); }
                .cs-row:active { background: rgba(255,255,255,0.05); }
                .cs-row-split { padding: 0; cursor: default; }
                .cs-row-split:active { background: none; }
                .cs-row-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 14px; padding: 14px 8px 14px 16px; text-decoration: none; }
                .cs-row-main:active { background: rgba(255,255,255,0.05); }
                .cs-icon { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.06); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .cs-icon-wa { background: rgba(37,211,102,0.14); color: #25D366; }
                .cs-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
                .cs-label { color: #fff; font-size: 14px; font-weight: 500; }
                .cs-hint { color: rgba(255,255,255,0.4); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .cs-chevron { color: rgba(255,255,255,0.25); flex-shrink: 0; }
                .cs-copy { width: 52px; align-self: stretch; background: none; border: none; border-left: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .cs-copy:active { background: rgba(255,255,255,0.05); color: #fff; }
                @keyframes csUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes csFade { from { opacity: 0; } to { opacity: 1; } }
                @media (prefers-reduced-motion: reduce) { .cs-sheet, .cs-backdrop { animation: none; } }
            `}</style>
        </>
    );
}