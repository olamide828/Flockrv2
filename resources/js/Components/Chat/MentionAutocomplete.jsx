import { useState, useEffect } from 'react'
import axios from 'axios'
import { AvatarImage } from '@/Layouts/AppLayout'
import { RiSearchLine } from 'react-icons/ri'

export default function MentionAutocomplete({ initialQuery, onSelect, onClose }) {
    const [search, setSearch] = useState(initialQuery ?? '')
    const [following, setFollowing] = useState([])
    const [searchResults, setSearchResults] = useState([])
    const [loadingFollowing, setLoadingFollowing] = useState(true)
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        axios.get('/api/users/suggested')
            .then(({ data }) => setFollowing(data))
            .catch(() => setFollowing([]))
            .finally(() => setLoadingFollowing(false))
    }, [])

    useEffect(() => {
        if (search.trim().length < 2) { setSearchResults([]); return }
        const t = setTimeout(async () => {
            setSearching(true)
            try {
                const { data } = await axios.get('/api/users/search', { params: { q: search } })
                setSearchResults(data)
            } catch { setSearchResults([]) }
            finally { setSearching(false) }
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    const list = search.trim().length >= 2
        ? searchResults
        : following.filter(u =>
            !search.trim() ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.username.toLowerCase().includes(search.toLowerCase())
        )

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8, background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', zIndex: 91, boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', maxHeight: 320, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RiSearchLine size={14} color="rgba(255,255,255,0.3)" />
                    <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or username..."
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13 }}
                    />
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {(loadingFollowing || searching) && (
                        <div style={{ padding: 16, color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>Loading…</div>
                    )}
                    {!loadingFollowing && !searching && list.length === 0 && (
                        <div style={{ padding: 16, color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>No matches</div>
                    )}
                    {!searching && list.map(u => (
                        <button key={u.id} onClick={() => onSelect(u)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                            <AvatarImage user={u} size={30} />
                            <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</p>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>@{u.username}{u.role === 'seller' ? ' · Seller' : ''}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}