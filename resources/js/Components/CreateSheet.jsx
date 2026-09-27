import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { RiVideoUploadLine, RiPriceTag3Line, RiCloseLine } from 'react-icons/ri';

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
            {/* Backdrop */}
            <div 
                onClick={onClose} 
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.2s ease-out'
                }} 
            />

            {/* Bottom Sheet */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 480,
                background: '#121214',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
                zIndex: 1,
                boxShadow: '0 -10px 40px rgba(0,0,0,0.8)',
                animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                        Create New Post
                    </h3>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            color: '#fff',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <RiCloseLine size={20} />
                    </button>
                </div>

                {/* Option Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* List Product Option */}
                    <button
                        onMouseEnter={() => handlePrefetch('/seller/products/create')}
                        onTouchStart={() => handlePrefetch('/seller/products/create')}
                        onClick={() => handleNavigate('/seller/products/create')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            padding: '24px 16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1.5px dashed rgba(255,255,255,0.2)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            color: '#fff',
                            outline: 'none'
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            background: 'rgba(255,92,0,0.12)',
                            color: '#ff5c00',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <RiPriceTag3Line size={26} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>List Product</span>
                    </button>

                    {/* Upload Video Option */}
                    <button
                        onMouseEnter={() => handlePrefetch('/seller/upload')}
                        onTouchStart={() => handlePrefetch('/seller/upload')}
                        onClick={() => handleNavigate('/seller/upload')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            padding: '24px 16px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1.5px dashed rgba(255,255,255,0.2)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            color: '#fff',
                            outline: 'none'
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            background: 'rgba(255,92,0,0.12)',
                            color: '#ff5c00',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <RiVideoUploadLine size={26} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Upload Video</span>
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div>,
        document.body
    );
}