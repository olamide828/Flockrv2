import { RiUserFollowLine, RiUserAddLine } from 'react-icons/ri'

export default function ConversationStartCard({ other, onFollow, following }) {
    if (!other) return null
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', textAlign: 'center' }}>
            <img src={other.avatar_url} alt={other.name} style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }} />
            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 16 }}>{other.name}</p>
            <p style={{ margin: '2px 0 10px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>@{other.username}</p>

            <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                <div><strong style={{ color: '#fff', fontSize: 14 }}>{other.followers_count ?? 0}</strong> <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Followers</span></div>
                <div><strong style={{ color: '#fff', fontSize: 14 }}>{other.following_count ?? 0}</strong> <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Following</span></div>
            </div>

            {other.follows_me && (
                <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 999, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
                    Follows you
                </span>
            )}

            {!following && (
                <button onClick={onFollow} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', background: '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {other.follows_me ? <><RiUserFollowLine size={14} /> Follow Back</> : <><RiUserAddLine size={14} /> Follow</>}
                </button>
            )}

            <p style={{ margin: '18px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Say hello 👋</p>
        </div>
    )
}