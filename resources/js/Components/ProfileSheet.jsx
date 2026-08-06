import { useEffect, useState } from 'react';
import {
    RiCloseLine, RiUserLine, RiSettings4Line, RiBarChart2Line,
    RiShoppingBasketLine, RiShareForwardLine, RiLogoutBoxLine,
    RiArrowRightSLine, RiWallet3Line,
} from 'react-icons/ri';
import { AvatarImage } from '@/Layouts/AppLayout';
import ShareProfileSheet from '@/Components/ShareProfileSheet';

function Row({ Icon, label, onClick, danger }) {
    return (
        <button onClick={onClick} className={`pf-row ${danger ? 'pf-row-danger' : ''}`}>
            <div className={`pf-row-icon ${danger ? 'pf-row-icon-danger' : ''}`}>
                <Icon size={18} />
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

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 200);
    };

    const go = (path) => {
        onNavigate(path);
        handleClose();
    };

    if (!user) return null;
    const isSeller = user.role === 'seller';

    return (
        <>
            <div className={`pf-screen ${closing ? 'pf-screen-out' : ''}`}>
                <div className="pf-hero">
                    <button onClick={handleClose} className="pf-close" aria-label="Close">
                        <RiCloseLine size={20} />
                    </button>

                    <div className="pf-avatar-wrapper">
                        <AvatarImage user={user} size={80} />
                    </div>

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
                        <Row Icon={RiShareForwardLine} label="Share Profile" onClick={() => setShowShareSheet(true)} />
                    </div>

                    <button onClick={() => { handleClose(); setTimeout(onLogoutClick, 210); }} className="pf-logout-btn">
                        <RiLogoutBoxLine size={17} /> Log Out
                    </button>
                </div>
            </div>

            {/* ShareProfileSheet opens directly on top with high z-index */}
            {showShareSheet && (
                <ShareProfileSheet user={user} onClose={() => setShowShareSheet(false)} />
            )}

            <style>{`
                .pf-screen {
                    position: fixed; inset: 0; z-index: 970;
                    background: #000000;
                    display: flex; flex-direction: column;
                    overflow-y: auto;
                    animation: pfSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .pf-screen-out { animation: pfSlideDown 0.18s ease forwards; }
                .pf-hero {
                    position: relative;
                    padding: calc(24px + env(safe-area-inset-top, 0px)) 24px 24px;
                    display: flex; flex-direction: column; align-items: center;
                    text-align: center;
                    background: #0a0a0c;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }
                .pf-close {
                    position: absolute; top: calc(16px + env(safe-area-inset-top, 0px)); right: 16px;
                    width: 34px; height: 34px; border-radius: 50%;
                    background: rgba(255,255,255,0.08); border: none; color: #fff;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    z-index: 2; transition: background 0.15s;
                }
                .pf-close:active { background: rgba(255,255,255,0.16); }
                .pf-avatar-wrapper {
                    padding: 3px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                }
                .pf-name { margin: 14px 0 0; color: #ffffff; font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
                .pf-username { margin: 2px 0 0; color: rgba(255,255,255,0.45); font-size: 13px; font-weight: 400; }
                .pf-stats { display: flex; align-items: center; gap: 24px; margin-top: 20px; }
                .pf-stat { text-align: center; }
                .pf-stat strong { display: block; color: #ffffff; font-size: 15px; font-weight: 700; }
                .pf-stat span { color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 1px; }
                .pf-stat-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.1); }
                .pf-body { flex: 1; padding: 16px 16px calc(28px + env(safe-area-inset-bottom, 0px)); }
                .pf-group-label { margin: 18px 6px 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.35); }
                .pf-group-label:first-child { margin-top: 4px; }
                .pf-group { background: #121214; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; }
                .pf-row { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: none; border: none; border-top: 1px solid rgba(255,255,255,0.05); cursor: pointer; text-align: left; }
                .pf-row:first-child { border-top: none; }
                .pf-row:active { background: rgba(255,255,255,0.05); }
                .pf-row-icon { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.06); color: #ffffff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .pf-row-label { flex: 1; color: #ffffff; font-size: 14px; font-weight: 500; }
                .pf-row-chevron { color: rgba(255,255,255,0.25); flex-shrink: 0; }
                .pf-logout-btn {
                    width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
                    margin-top: 24px; padding: 14px;
                    background: #121214; border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px; color: #ffffff; font-size: 14px; font-weight: 600;
                    cursor: pointer; transition: background 0.15s;
                }
                .pf-logout-btn:active { background: rgba(255,255,255,0.08); }
                @keyframes pfSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pfSlideDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(16px); } }
            `}</style>
        </>
    );
}