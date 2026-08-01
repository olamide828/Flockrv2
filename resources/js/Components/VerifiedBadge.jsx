import { RiVerifiedBadgeLine } from 'react-icons/ri'

/**
 * Renders the verification checkmark with the correct color:
 *  - 'flockr'       → orange fill (platform-granted)
 *  - 'subscription' → blue fill (paid verification)
 *  - null/undefined → renders nothing
 */
export default function VerifiedBadge({ type, size = 16 }) {
    if (!type) return null
    const color = type === 'subscription' ? '#3B82F6' : '#FF6B35'
    return <RiVerifiedBadgeLine size={size} color={color} style={{ flexShrink: 0 }} />
}