import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Link } from '@inertiajs/react'
import { RiCloseLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'

function MutualFriendsModal({ users, onClose }) {
    const scrollRef = useRef(null)
    const scrollBy = (dir) => scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(500px,92vw)', zIndex: 901, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 15 }}>Flock Mates in Common</p>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', flexShrink: 0 }}><RiCloseLine size={15} /></button>
                </div>

                <div style={{ position: 'relative' }}>
                    {users.length > 3 && (
                        <button onClick={() => scrollBy(-1)} style={{ position: 'absolute', left: -6, top: '38%', width: 30, height: 30, borderRadius: '50%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><RiArrowLeftSLine size={18} /></button>
                    )}
                    <div ref={scrollRef} style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 30px', scrollSnapType: 'x mandatory' }}>
                        {users.map(u => (
                            <Link key={u.id} href={`/@${u.username}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0, width: 84, scrollSnapAlign: 'start' }}>
                                <img src={u.avatar_url} alt={u.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                                <p style={{ margin: 0, color: '#fff', fontSize: 12.5, fontWeight: 600, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 84 }}>{u.name}</p>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 84 }}>@{u.username}</p>
                            </Link>
                        ))}
                    </div>
                    {users.length > 3 && (
                        <button onClick={() => scrollBy(1)} style={{ position: 'absolute', right: -6, top: '38%', width: 30, height: 30, borderRadius: '50%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}><RiArrowRightSLine size={18} /></button>
                    )}
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