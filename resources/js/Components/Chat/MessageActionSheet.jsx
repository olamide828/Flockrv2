import { RiReplyLine, RiDeleteBinLine, RiFileCopyLine } from 'react-icons/ri'

export default function MessageActionSheet({ message, isMine, onReply, onDelete, onCopy, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 940, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 941, maxWidth: 420, margin: '0 auto', background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '20px 20px 0 0', padding: '10px 16px calc(16px + env(safe-area-inset-bottom,0px))' }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 10px' }} />
                <button onClick={onReply} style={actionRow}><RiReplyLine size={17} color="rgba(255,255,255,0.7)" /> Reply</button>
                {message.body && (
                    <button onClick={onCopy} style={actionRow}><RiFileCopyLine size={17} color="rgba(255,255,255,0.7)" /> Copy Text</button>
                )}
                {isMine && (
                    <button onClick={onDelete} style={{ ...actionRow, color: '#EF4444' }}><RiDeleteBinLine size={17} color="#EF4444" /> Delete Message</button>
                )}
            </div>
        </>
    )
}

const actionRow = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 8px', background: 'none', border: 'none', cursor: 'pointer',
    color: '#fff', fontSize: 14, fontWeight: 500, textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
}