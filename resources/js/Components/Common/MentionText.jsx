import { Link } from '@inertiajs/react'

// NOTE: no regex look-behind here. Safari on iPhone before 16.4 (and some in-app browsers) cannot even parse
// `(?<!...)`, which blanked every page that imported this file. This version works everywhere.
const MENTION = /(^|[^\w@])(@[A-Za-z0-9_.]{2,20})/g

export function splitMentions(text) {
    const s = String(text ?? '')
    const out = []
    let last = 0, m
    MENTION.lastIndex = 0
    while ((m = MENTION.exec(s)) !== null) {
        const start = m.index + m[1].length
        if (start > last) out.push(s.slice(last, start))
        out.push({ mention: m[2] })
        last = start + m[2].length
    }
    if (last < s.length) out.push(s.slice(last))
    return out
}

/** Plain text where @username becomes a link to that profile. */
export default function MentionText({ text, style, linkStyle }) {
    if (!text) return null
    return (
        <span style={style}>
            {splitMentions(text).map((part, i) => {
                if (typeof part === 'string') return part
                const name = part.mention.slice(1).replace(/\.+$/, '')
                return <Link key={i} href={`/@${name}`} onClick={e => e.stopPropagation()} style={{ color: '#FF6B35', fontWeight: 600, textDecoration: 'none', ...linkStyle }}>{part.mention}</Link>
            })}
        </span>
    )
}
