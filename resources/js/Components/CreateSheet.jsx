import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { RiVideoAddLine, RiStore2Line, RiCloseLine, RiArrowRightSLine } from 'react-icons/ri';

const OPTIONS = [
    { path: '/seller/products/create', label: 'List Product', hint: 'Add an item to sell',      Icon: RiStore2Line },
    { path: '/seller/upload',          label: 'Upload Video', hint: 'Post a shoppable video',   Icon: RiVideoAddLine },
];

export default function CreateSheet({ onClose }) {
    const handleNavigate = (path) => {
        onClose();
        router.visit(path);
    };

    const handlePrefetch = (path) => {
        try {
            if (typeof router.prefetch === 'function') {
                router.prefetch(path, { method: 'get' }, { cacheFor: 30000 });
            }
        } catch {}
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9990, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div
                onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }}
            />

            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 480,
                background: '#121214',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                padding: '8px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
                zIndex: 1,
                boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* Grab handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 10px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                </div>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                        Create New Post
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <RiCloseLine size={18} />
                    </button>
                </div>

                {/* Rows */}
                <div style={{ marginTop: 8 }}>
                    {OPTIONS.map(({ path, label, hint, Icon }, i) => (
                        <button
                            key={path}
                            className="cs-row"
                            onMouseEnter={() => handlePrefetch(path)}
                            onTouchStart={() => handlePrefetch(path)}
                            onClick={() => handleNavigate(path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                width: '100%',
                                padding: '16px 4px',
                                background: 'transparent',
                                border: 'none',
                                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                color: '#fff',
                                textAlign: 'left',
                                cursor: 'pointer',
                                outline: 'none',
                            }}
                        >
                            <Icon size={24} color="#ff5c00" style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{label}</span>
                                <span style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{hint}</span>
                            </span>
                            <RiArrowRightSLine size={20} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
                        </button>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .cs-row { transition: background 0.15s ease; }
                .cs-row:active { background: rgba(255,255,255,0.04) !important; }
            `}</style>
        </div>,
        document.body
    );
}