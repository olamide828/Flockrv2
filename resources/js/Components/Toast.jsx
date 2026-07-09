import { useEffect, useState } from 'react';
import {
    RiCheckLine,
    RiCloseLine,
    RiErrorWarningLine,
    RiInformationLine,
    RiLoader4Line,
} from 'react-icons/ri';

/**
 * Flockr Toast — reusable toast notification
 *
 * Usage:
 *   const { showToast, ToastComponent } = useToast();
 *
 *   // In your component JSX:
 *   {ToastComponent}
 *
 *   // To show:
 *   showToast('Order placed!', 'success')
 *   showToast('Something went wrong.', 'error')
 *   showToast('Loading rates…', 'loading')
 *   showToast('Rate limit reached.', 'warning')
 *
 * Types: 'success' | 'error' | 'warning' | 'loading' | 'info'
 * Duration: default 3500ms (loading stays until dismissed or replaced)
 */

const ICONS = {
    success: { Icon: RiCheckLine,          color: '#10B981' },
    error:   { Icon: RiErrorWarningLine,   color: '#EF4444' },
    warning: { Icon: RiErrorWarningLine,   color: '#FBBF24' },
    loading: { Icon: RiLoader4Line,        color: '#FF6B35' },
    info:    { Icon: RiInformationLine,    color: '#3B82F6' },
};

export function useToast() {
    const [toast, setToast] = useState(null);
    // toast = { message, type, id }

    const showToast = (message, type = 'info', duration = 3500) => {
        const id = Date.now();
        setToast({ message, type, id });

        // Loading toasts stay until replaced or manually cleared
        if (type !== 'loading') {
            setTimeout(() => {
                setToast(prev => prev?.id === id ? null : prev);
            }, duration);
        }
    };

    const hideToast = () => setToast(null);

    const ToastComponent = <Toast toast={toast} onDismiss={hideToast} />;

    return { showToast, hideToast, ToastComponent };
}

export function Toast({ toast, onDismiss }) {
    const visible = !!toast;
    const config  = ICONS[toast?.type ?? 'info'] ?? ICONS.info;
    const Icon    = config.Icon;

    return (
        <div
            style={{
                position:  'fixed',
                bottom:    80,
                left:      '50%',
                transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
                zIndex:    9000,
                pointerEvents: visible ? 'auto' : 'none',
                opacity:   visible ? 1 : 0,
                transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
        >
            <div
                style={{
                    display:       'flex',
                    alignItems:    'center',
                    gap:           8,
                    background:    'rgba(10,10,10,0.9)',
                    backdropFilter:'blur(16px)',
                    border:        '1px solid rgba(255,255,255,0.1)',
                    borderRadius:  999,
                    padding:       '10px 16px 10px 14px',
                    whiteSpace:    'nowrap',
                    boxShadow:     '0 8px 32px rgba(0,0,0,0.4)',
                    maxWidth:      '88vw',
                }}
            >
                <Icon
                    size={15}
                    color={config.color}
                    style={toast?.type === 'loading' ? { animation: 'spin 0.8s linear infinite', flexShrink: 0 } : { flexShrink: 0 }}
                />
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {toast?.message}
                </span>
                {/* Dismiss button — shown for errors and warnings */}
                {(toast?.type === 'error' || toast?.type === 'warning') && (
                    <button
                        onClick={onDismiss}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                        <RiCloseLine size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default Toast;