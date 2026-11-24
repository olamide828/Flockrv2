import { RiCheckLine, RiCheckDoubleLine, RiTimeLine } from 'react-icons/ri'

/**
 * WhatsApp-style delivery ticks for my own messages.
 *   clock = still sending, ✓ = sent, ✓✓ grey = delivered, ✓✓ orange = seen.
 * `state` is one of: 'sending' | 'sent' | 'delivered' | 'seen'
 */
export function tickState(msg) {
    if (msg._failed) return null
    if (msg._optimistic) return 'sending'
    if (msg.read_at || msg.delivery === 'seen') return 'seen'
    if (msg.delivered_at || msg.delivery === 'delivered') return 'delivered'
    return 'sent'
}

export default function Ticks({ state, size = 14 }) {
    if (!state) return null
    const common = { size, style: { display: 'block', flexShrink: 0 } }
    const icon = state === 'sending' ? <RiTimeLine {...common} size={size - 2} color="rgba(255,255,255,0.4)" />
        : state === 'sent' ? <RiCheckLine {...common} color="rgba(255,255,255,0.45)" />
        : state === 'delivered' ? <RiCheckDoubleLine {...common} color="rgba(255,255,255,0.45)" />
        : <RiCheckDoubleLine {...common} color="#FF6B35" />
    return <span aria-label={state} title={state} style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>{icon}</span>
}
