import { RiCloseLine, RiSendPlaneFill, RiLoader4Line } from 'react-icons/ri'

export default function MediaComposerPreview({ file, previewUrl, caption, onCaptionChange, onSend, onCancel, sending }) {
    const isVideo = file.type.startsWith('video')
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                {isVideo
                    ? <video src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
                <button onClick={onCancel} style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', border: '2px solid #0d0d0d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <RiCloseLine size={11} />
                </button>
            </div>
            <input
                value={caption}
                onChange={e => onCaptionChange(e.target.value)}
                placeholder="Add a caption..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '9px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            <button onClick={onSend} disabled={sending} style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF6B35', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                {sending ? <RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RiSendPlaneFill size={16} />}
            </button>
        </div>
    )
}