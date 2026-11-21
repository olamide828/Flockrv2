// Shared "liquid glass" look for the floating chat header + composer (iOS / WhatsApp style).
// Content scrolls UNDER these, so the blur actually has something to blur.
export const GLASS = {
    background: 'rgba(30, 30, 32, 0.42)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
}

export const glassCircle = (size = 44, extra = {}) => ({
    ...GLASS,
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'rgba(255,255,255,0.85)', padding: 0,
    ...extra,
})

export const ACCENT = '#ff5c00'
