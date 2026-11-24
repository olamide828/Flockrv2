import { Link } from '@inertiajs/react'

/** Plain text where @username becomes a link to that profile. */
export default function MentionText({ text, style, linkStyle }) {
    if (!text) return null
    const parts = String(text).split(/((?<![\w@])@[A-Za-z0-9_.]{2,20})/g)
    return (
        <span style={style}>
            {parts.map((part, i) => {
                if (/^@[A-Za-z0-9_.]{2,20}$/.test(part)) {
                    const name = part.slice(1).replace(/\.+$/, '')
                    return <Link key={i} href={`/@${name}`} onClick={e => e.stopPropagation()} style={{ color: '#FF6B35', fontWeight: 600, textDecoration: 'none', ...linkStyle }}>{part}</Link>
                }
                return part
            })}
        </span>
    )
}
