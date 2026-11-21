import { RiErrorWarningFill, RiLoader4Line } from 'react-icons/ri'

/**
 * Puts a red "Retry" button on the right of a message that failed to send (no internet, timeout, server error).
 * Your bubble stays exactly where you sent it; tap Retry to send the same thing again.
 */
export default function RetryWrap({ failed, onRetry, mine = true, children }) {
    if (!failed) return children
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0, flex: '0 1 auto', maxWidth: 'calc(100% - 44px)' }}>{children}</div>
            <button type="button" onClick={onRetry} aria-label="Message not sent. Tap to retry"
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.16)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <RiErrorWarningFill size={14} /> Retry
            </button>
        </div>
    )
}

export const SendingDot = () => <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
