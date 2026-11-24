import { useEffect, useState } from 'react'
import axios from 'axios'

/** Is the caret right after "@abc"? Returns { query, start } or null. */
export function detectMention(text, caret) {
    const before = String(text ?? '').slice(0, caret ?? String(text ?? '').length)
    const m = before.match(/(?:^|\s)@([A-Za-z0-9_.]{0,20})$/)
    return m ? { query: m[1], start: before.length - m[1].length - 1 } : null
}

/** Put the chosen @username into the text where the user was typing. */
export function applyMention(text, mention, username) {
    const end = mention.start + 1 + mention.query.length
    return `${text.slice(0, mention.start)}@${username} ${text.slice(end)}`
}

/**
 * Little list of people to tag, shown above the input while typing "@ab…".
 * People you follow come first. Only mounts while a mention is being typed.
 */
export default function MentionSuggest({ query, onPick, onClose }) {
    const [users, setUsers] = useState([])

    useEffect(() => {
        let alive = true
        const t = setTimeout(() => {
            axios.get('/api/mentions/search', { params: { q: query } })
                .then(r => { if (alive) setUsers(r.data ?? []) })
                .catch(() => { if (alive) setUsers([]) })
        }, 150)
        return () => { alive = false; clearTimeout(t) }
    }, [query])

    if (!users.length) return null
    return (
        <div role="listbox" style={{ background: 'rgba(24,24,26,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', maxHeight: 232, overflowY: 'auto' }}>
            {users.map(u => (
                <button key={u.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onPick(u); onClose?.() }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <img src={u.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                        <span style={{ display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>@{u.username}</span>
                    </span>
                </button>
            ))}
        </div>
    )
}
