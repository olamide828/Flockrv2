import { Link } from '@inertiajs/react';
import { useState } from 'react';
import {
    RiCloseLine, RiUserLine, RiSettings4Line, RiBarChart2Line,
    RiShoppingBasketLine, RiBankCardLine, RiShareForwardLine, RiLogoutBoxLine,
} from 'react-icons/ri';
import { AvatarImage } from '@/Layouts/AppLayout';
import { useToast } from '@/Components/Toast';

function SheetItem({ Icon, label, onClick, danger }) {
    return (
        <button onClick={onClick} className="ps-item" style={danger ? { color: '#F87171' } : undefined}>
            <div className="ps-item-icon" style={danger ? { background: 'rgba(239,68,68,0.1)', color: '#F87171' } : undefined}>
                <Icon size={17} />
            </div>
            <span>{label}</span>
        </button>
    );
}

export default function ProfileSheet({ user, onClose, onNavigate, onLogoutClick }) {
    const { showToast, ToastComponent } = useToast();
    const [closing, setClosing] = useState(false);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const go = (path) => {
        onNavigate(path);
        handleClose();
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/@${user.username}`;
        if (navigator.share) {
            try { await navigator.share({ title: user.name, url }); } catch {}
            handleClose();
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            showToast('Profile link copied!', 'success');
        } catch {}
        setTimeout(handleClose, 600);
    };

    if (!user) return null;

    return (
        <>
            <div onClick={handleClose} className={`ps-backdrop ${closing ? 'ps-backdrop-out' : ''}`} />
            <div className={`ps-sheet ${closing ? 'ps-sheet-out' : ''}`}>
                <div className="ps-handle" />
                <button onClick={handleClose} className="ps-close" aria-label="Close"><RiCloseLine size={16} /></button>

                <div className="ps-header">
                    <AvatarImage user={user} size={52} />
                    <div>
                        <p className="ps-name">{user.name}</p>
                        <p className="ps-username">@{user.username}</p>
                    </div>
                </div>

                <div className="ps-items">
                    <SheetItem Icon={RiUserLine} label="View Profile" onClick={() => go(`/@${user.username}`)} />
                    <SheetItem Icon={RiSettings4Line} label="Settings" onClick={() => go('/settings/profile')} />

                    {user.role === 'buyer' && (
                        <SheetItem Icon={RiBarChart2Line} label="Dashboard" onClick={() => go('/dashboard')} />
                    )}
                    {user.role === 'seller' && (
                        <SheetItem Icon={RiBarChart2Line} label="Seller Dashboard" onClick={() => go('/seller/dashboard')} />
                    )}
                    {user.role === 'admin' && (
                        <SheetItem Icon={RiBarChart2Line} label="Admin Dashboard" onClick={() => go('/admin/dashboard')} />
                    )}

                    <SheetItem Icon={RiShoppingBasketLine} label="My Orders" onClick={() => go('/orders')} />

                    {user.role === 'seller' && (
                        <SheetItem Icon={RiBankCardLine} label="Payouts" onClick={() => go('/seller/payouts')} />
                    )}

                    <SheetItem Icon={RiShareForwardLine} label="Share Profile" onClick={handleShare} />
                </div>

                <div className="ps-divider" />

                <div className="ps-items">
                    <SheetItem Icon={RiLogoutBoxLine} label="Log Out" danger onClick={() => { handleClose(); setTimeout(onLogoutClick, 190); }} />
                </div>
            </div>

            {ToastComponent}

            <style>{`
                .ps-backdrop { position: fixed; inset: 0; z-index: 960; background: rgba(0,0,0,0.6); animation: psFadeIn 0.18s ease; }
                .ps-backdrop-out { animation: psFadeOut 0.18s ease forwards; }
                .ps-sheet {
                    position: fixed; left: 0; right: 0; bottom: 0; z-index: 961;
                    max-width: 480px; margin: 0 auto;
                    background: #141414; border: 1px solid rgba(255,255,255,0.08); border-bottom: none;
                    border-radius: 24px 24px 0 0;
                    padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0px));
                    animation: psSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .ps-sheet-out { animation: psSlideDown 0.18s ease forwards; }
                .ps-handle { width: 36px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.15); margin: 4px auto 14px; }
                .ps-close { position: absolute; top: 14px; right: 14px; width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.07); border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .ps-header { display: flex; align-items: center; gap: 12px; padding: 4px 6px 16px; }
                .ps-name { color: #fff; font-weight: 700; font-size: 15px; margin: 0; }
                .ps-username { color: rgba(255,255,255,0.4); font-size: 12px; margin: 2px 0 0; }
                .ps-items { display: flex; flex-direction: column; gap: 2px; }
                .ps-item { display: flex; align-items: center; gap: 12px; padding: 11px 6px; border-radius: 12px; background: none; border: none; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; text-align: left; width: 100%; transition: background 0.15s; }
                .ps-item:hover { background: rgba(255,255,255,0.05); }
                .ps-item-icon { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(255,255,255,0.7); }
                .ps-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 0; }
                @keyframes psFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes psFadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes psSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes psSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
            `}</style>
        </>
    );
}