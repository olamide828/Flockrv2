import { useState, useEffect } from 'react'
import axios from 'axios'
import { RiArrowLeftLine, RiSearchLine } from 'react-icons/ri'

export default function NewMessageOverlay({ onClose, onStarted }) {
    const [search, setSearch] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [starting, setStarting] = useState(null)

    useEffect(() => {
        if (!search.trim()) { setResults([]); return }
        const t = setTimeout(async () => {
            setLoading(true)
            try {
                const { data } = await axios.get('/api/users/search', { params: { q: search } })
                setResults(data)
            } catch { setResults([]) }
            finally { setLoading(false) }
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    const start = async (user) => {
        setStarting(user.id)
        try {
            const { data } = await axios.post('/api/conversations', { user_id: user.id })
            onStarted(data)
        } catch {}
        finally { setStarting(null) }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 970, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><RiArrowLeftLine size={20} /></button>
                <div style={{ flex: 1, position: 'relative' }}>
                    <RiSearchLine size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search for a user"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '10px 14px 10px 34px', color: '#fff', fontSize: 14, outline: 'none' }}
                    />
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && <p style={{ padding: 20, color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>Searching…</p>}
                {!loading && results.map(u => (
                    <button key={u.id} onClick={() => start(u)} disabled={starting === u.id} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <img src={u.avatar_url} alt={u.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                            <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 600 }}>{u.name}</p>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{u.username}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}