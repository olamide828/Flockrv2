import SafeImg from '@/Components/Media/SafeImg'

const hue = (s = '') => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

/** Round avatar that always renders: the photo when it loads, coloured initials otherwise. */
export default function Avatar({ src, name = '', size = 40, style, ring }) {
    const h = hue(name)
    const initial = (name.trim()[0] || 'U').toUpperCase()
    const fallback = (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.42, background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 50) % 360} 65% 28%))` }}>
            {initial}
        </span>
    )
    return (
        <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#222', border: ring, ...style }}>
            <SafeImg src={src} alt="" fallback={fallback} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </span>
    )
}
