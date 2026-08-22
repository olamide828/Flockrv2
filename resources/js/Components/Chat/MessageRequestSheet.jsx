import { RiCloseLine, RiAlarmWarningLine, RiProhibitedLine, RiChat3Line } from 'react-icons/ri'

export default function MessageRequestSheet({ sender, onReport, onBlock, onContinue, onClose }) {
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 940, background: 'rgba(0,0,0,0.7)' }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 941, maxWidth: 420, margin: '0 auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '22px 22px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))' }}>
                <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 16px' }} />
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RiCloseLine size={15} />
                </button>
                <p style={{ margin: '0 0 6px', color: '#fff', fontWeight: 700, fontSize: 15, textAlign: 'center' }}>Message from @{sender?.username}</p>
                <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.4)', fontSize: 12.5, textAlign: 'center' }}>You don't follow each other. Only reply if you trust this account.</p>

                <button onClick={onContinue} style={{ width: '100%', padding: 13, borderRadius: 999, background: '#FF6B35', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RiChat3Line size={15} /> Continue to Chat
                </button>
                <button onClick={onReport} style={{ width: '100%', padding: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RiAlarmWarningLine size={14} /> Report as Spam
                </button>
                <button onClick={onBlock} style={{ width: '100%', padding: 12, borderRadius: 999, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RiProhibitedLine size={14} /> Report and Block
                </button>
            </div>
        </>
    )
}