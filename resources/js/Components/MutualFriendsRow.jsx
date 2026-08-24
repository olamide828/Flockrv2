import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from '@inertiajs/react'
import { RiCloseLine } from 'react-icons/ri'

function MutualFriendsModal({ users, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(380px,90vw)', maxHeight: '75vh', zIndex: 901, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Flock Mates in Common</p>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={15} /></button>
                </div>
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {users.map(u => (
                        <Link key={u.id} href={`/@${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 10, textDecoration: 'none' }}>
                            <img src={u.avatar_url} alt={u.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{u.name}</p>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{u.username}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    )
}

export default function MutualFriendsRow({ profileUserId }) {
    const [data, setData] = useState(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        axios.get(`/api/users/${profileUserId}/mutual-follows`).then(({ data }) => setData(data)).catch(() => {})
    }, [profileUserId])

    if (!data || data.count === 0) return null

    const preview = data.users.slice(0, 3)
    const extra = data.count - preview.length

    const names = preview.map(u => `@${u.username}`)
    const label = extra > 0
        ? `${names.join(', ')} +${extra} others are also Flock Mates with this account`
        : names.length > 1
            ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are also Flock Mates with this account`
            : `${names[0]} is also a Flock Mate with this account`

    return (
        <>
            <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 10 }}>
                <div style={{ display: 'flex' }}>
                    {preview.map((u, i) => (
                        <img key={u.id} src={u.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '2px solid #121212', marginLeft: i > 0 ? -8 : 0 }} />
                    ))}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12.5, textAlign: 'left' }}>{label}</span>
            </button>
            {showModal && <MutualFriendsModal users={data.users} onClose={() => setShowModal(false)} />}
        </>
    )
}