import { useEffect, useState } from 'react';
import {
    RiCloseLine, RiUserLine, RiSettings4Line, RiBarChart2Line,
    RiShoppingBasketLine, RiBankCardLine, RiShareForwardLine, RiLogoutBoxLine,
    RiArrowRightSLine, RiWallet3Line,
} from 'react-icons/ri';
import { AvatarImage } from '@/Layouts/AppLayout';
import ShareProfileSheet from '@/Components/ShareProfileSheet';

function Row({ Icon, label, onClick, danger }) {
    return (
        <button onClick={onClick} className={`pf-row ${danger ? 'pf-row-danger' : ''}`}>
            <div className={`pf-row-icon ${danger ? 'pf-row-icon-danger' : ''}`}>
                <Icon size={19} />
            </div>
            <span className="pf-row-label">{label}</span>
            {!danger && <RiArrowRightSLine size={18} className="pf-row-chevron" />}
        </button>
    );
}

function GroupLabel({ children }) {
    return <p className="pf-group-label">{children}</p>;
}

function fmtCount(n) {
    n = Number(n ?? 0);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

export default function ProfileSheet({ user, onClose, onNavigate, onLogoutClick }) {
    const [closing, setClosing] = useState(false);
    const [showShareSheet, setShowShareSheet] = useState(false);

    useEffect(() => {
        document.body.classList.add('chat-open');
        return () => document.body.classList.remove('chat-open');
    }, []);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 200);
    };

    const go = (path) => {
        onNavigate(path);
        handleClose();
    };

    const handleShareClick = () => {
        handleClose();
        setTimeout(() => setShowShareSheet(true), 210);
    };

    if (!user) return null;
    const isSeller = user.role === 'seller';

    return (
        <>
            <div className={`pf-screen ${closing ? 'pf-screen-out' : ''}`}>
                <div className="pf-hero">
                    <div className="pf-hero-glow" />
                    <button onClick={handleClose} className="pf-close" aria-label="Close">
                        <RiCloseLine size={20} />
                    </button>

                    <AvatarImage user={user} size={84} />
                    <h2 className="pf-name">{user.name}</h2>
                    <p className="pf-username">@{user.username}</p>

                    <div className="pf-stats">
                        <div className="pf-stat">
                            <strong>{fmtCount(user.followers_count)}</strong>
                            <span>Followers</span>
                        </div>
                        <div className="pf-stat-divider" />
                        <div className="pf-stat">
                            <strong>{fmtCount(user.following_count)}</strong>
                            <span>Following</span>
                        </div>
                        {isSeller && (
                            <>
                                <div className="pf-stat-divider" />
                                <div className="pf-stat">
                                    <strong>₦{fmtCount(user.wallet_balance)}</strong>
                                    <span>Wallet</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="pf-body">
                    <GroupLabel>Account</GroupLabel>
                    <div className="pf-group">
                        <Row Icon={RiUserLine} label="View Profile" onClick={() => go(`/@${user.username}`)} />
                        <Row Icon={RiSettings4Line} label="Settings" onClick={() => go('/settings/profile')} />
                    </div>

                    <GroupLabel>Workspace</GroupLabel>
                    <div className="pf-group">
                        {user.role === 'buyer' && (
                            <Row Icon={RiBarChart2Line} label="Dashboard" onClick={() => go('/dashboard')} />
                        )}
                        {isSeller && (
                            <Row Icon={RiBarChart2Line} label="Seller Dashboard" onClick={() => go('/seller/dashboard')} />
                        )}
                        {user.role === 'admin' && (
                            <Row Icon={RiBarChart2Line} label="Admin Dashboard" onClick={() => go('/admin/dashboard')} />
                        )}
                        <Row Icon={RiShoppingBasketLine} label="My Orders" onClick={() => go('/orders')} />
                        {isSeller && (
                            <Row Icon={RiWallet3Line} label="Payouts" onClick={() => go('/seller/payouts')} />
                        )}
                    </div>

                    <GroupLabel>Share</GroupLabel>
                    <div className="pf-group">
                        <Row Icon={RiShareForwardLine} label="Share Profile" onClick={handleShareClick} />
                    </div>

                    <button onClick={() => { handleClose(); setTimeout(onLogoutClick, 210); }} className="pf-logout-btn">
                        <RiLogoutBoxLine size={18} /> Log Out
                    </button>
                </div>
            </div>

            {showShareSheet && (
                <ShareProfileSheet user={user} onClose={() => setShowShareSheet(false)} />
            )}

            <style>{`
                .pf-screen {
                    position: fixed; inset: 0; z-index: 970;
                    background: #0a0a0a;
                    display: flex; flex-direction: column;
                    overflow-y: auto;
                    animation: pfSlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .pf-screen-out { animation: pfSlideDown 0.2s ease forwards; }
                .pf-hero {
                    position: relative;
                    padding: calc(28px + env(safe-area-inset-top, 0px)) 24px 26px;
                    display: flex; flex-direction: column; align-items: center;
                    text-align: center;
                    background: linear-gradient(180deg, rgba(255,92,0,0.14), transparent 70%);
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .pf-hero-glow {
                    position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
                    width: 280px; height: 280px; border-radius: 50%;
                    background: var(--flockr-orange); opacity: 0.18; filter: blur(60px);
                    pointer-events: none;
                }
                .pf-close {
                    position: absolute; top: calc(16px + env(safe-area-inset-top, 0px)); right: 16px;
                    width: 36px; height: 36px; border-radius: 50%;
                    background: rgba(255,255,255,0.08); border: none; color: #fff;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    z-index: 2;
                }
                .pf-name { position: relative; margin: 16px 0 0; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
                .pf-username { position: relative; margin: 3px 0 0; color: rgba(255,255,255,0.4); font-size: 13px; }
                .pf-stats { position: relative; display: flex; align-items: center; gap: 20px; margin-top: 18px; }
                .pf-stat { text-align: center; }
                .pf-stat strong { display: block; color: #fff; font-size: 16px; font-weight: 800; }
                .pf-stat span { color: rgba(255,255,255,0.4); font-size: 11px; }
                .pf-stat-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.1); }
                .pf-body { flex: 1; padding: 20px 16px calc(28px + env(safe-area-inset-bottom, 0px)); }
                .pf-group-label { margin: 20px 6px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); }
                .pf-group-label:first-child { margin-top: 4px; }
                .pf-group { background: #121212; border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; overflow: hidden; }
                .pf-row { width: 100%; display: flex; align-items: center; gap: 14px; padding: 15px 16px; background: none; border: none; border-top: 1px solid rgba(255,255,255,0.05); cursor: pointer; text-align: left; }
                .pf-row:first-child { border-top: none; }
                .pf-row:active { background: rgba(255,255,255,0.04); }
                .pf-row-icon { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,92,0,0.12); color: var(--flockr-orange); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .pf-row-label { flex: 1; color: #fff; font-size: 15px; font-weight: 600; }
                .pf-row-chevron { color: rgba(255,255,255,0.2); flex-shrink: 0; }
                .pf-logout-btn {
                    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
                    margin-top: 28px; padding: 16px;
                    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);
                    border-radius: 16px; color: #F87171; font-size: 15px; font-weight: 800;
                    cursor: pointer;
                }
                .pf-logout-btn:active { background: rgba(239,68,68,0.2); }
                @keyframes pfSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pfSlideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(16px); } }
            `}</style>
        </>
    );
}