import { RiLoader4Line } from 'react-icons/ri'
import { RetryIcon } from '@/Components/Chat/ChatMessageBubble'

/** Icon-only retry beside a failed message (no pill, so the bubble is never squeezed). */
export default function RetryWrap({ failed, onRetry, mine = true, children }) {
    if (!failed) return children
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 8 }}>
            {mine && <RetryIcon onRetry={onRetry} />}
            <div style={{ minWidth: 0 }}>{children}</div>
            {!mine && <RetryIcon onRetry={onRetry} />}
        </div>
    )
}

export const SendingDot = () => <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
