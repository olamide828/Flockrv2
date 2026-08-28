import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from '@inertiajs/react'
import { RiCloseLine, RiCheckLine } from 'react-icons/ri'

export default function SuggestedAccountsSheet({ afterUserId, onClose }) {
    const [users, setUsers] = useState([])
    const [followed, setFollowed] = useState({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get(`/api/users/${afterUserId}/suggested-follows`)
            .then(({ data }) => setUsers(data))
            .catch(() => setUsers([]))
            .finally(() => setLoading(false))
    }, [afterUserId])

    const toggleFollow = async (u) => {
        const wasFollowed = !!followed[u.id]
        setFollowed(prev => ({ ...prev, [u.id]: !wasFollowed }))
        try { await axios.post(`/api/users/${u.id}/follow`) }
        catch { setFollowed(prev => ({ ...prev, [u.id]: wasFollowed })) }
    }

    if (!loading && users.length === 0) return null

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.6)' }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 901, maxWidth: 520, margin: '0 auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '20px 20px 0 0', padding: '16px 0 calc(20px + env(safe-area-inset-bottom,0px))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px' }}>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Suggested for you</p>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={15} /></button>
                </div>

                {loading ? (
                    <p style={{ padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>Loading…</p>
                ) : (
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 20px' }}>
                        {users.map(u => (
                            <div key={u.id} style={{ flexShrink: 0, width: 130, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, textAlign: 'center' }}>
                                <Link href={`/@${u.username}`}>
                                    <img src={u.avatar_url} alt={u.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
                                    <p style={{ margin: '0 0 2px', color: '#fff', fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                                    <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.4)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.username}</p>
                                </Link>
                                <button onClick={() => toggleFollow(u)} style={{ width: '100%', padding: '7px 0', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: followed[u.id] ? 'rgba(255,255,255,0.08)' : '#FF6B35', color: followed[u.id] ? 'rgba(255,255,255,0.6)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    {followed[u.id] ? <><RiCheckLine size={12} /> Following</> : 'Follow'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}