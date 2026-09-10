import { RiReplyLine, RiDeleteBinLine } from 'react-icons/ri'

export default function MessageActionSheet({ msg, canDelete, onReply, onDelete, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 940, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 941, background: 'rgba(18,18,18,0.98)', backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 16px)', animation: 'slideUp 0.22s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div style={{ padding: '6px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {msg.body || (msg.media_type ? `📎 ${msg.media_type}` : '')}
                    </p>
                </div>
                <button onClick={onReply} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <RiReplyLine size={22} color="#FF6B35" /> Reply
                </button>
                {canDelete && (
                    <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 15, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <RiDeleteBinLine size={22} /> Delete message
                    </button>
                )}
                <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'calc(100% - 32px)', margin: '6px 16px 8px', padding: 13, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600, borderRadius: 14 }}>
                    Cancel
                </button>
            </div>
        </>
    )
}