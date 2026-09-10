import { useState, useRef } from 'react'
import { RiCloseLine, RiSendPlaneFill, RiLoader4Line, RiPlayFill, RiPauseFill } from 'react-icons/ri'

export default function MediaComposerPreview({ file, previewUrl, caption, onCaptionChange, onSend, onCancel, sending }) {
    const isVideo = file.type.startsWith('video')
    const [playing, setPlaying] = useState(false)
    const videoRef = useRef(null)

    const togglePlay = () => {
        const v = videoRef.current
        if (!v) return
        if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 970, background: '#000', display: 'flex', flexDirection: 'column' }}>
            <button onClick={onCancel} style={{ position: 'absolute', top: 'calc(16px + env(safe-area-inset-top,0px))', left: 16, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                <RiCloseLine size={20} />
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {isVideo ? (
                    <>
                        <video ref={videoRef} src={previewUrl} onClick={togglePlay} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        {!playing && (
                            <button onClick={togglePlay} style={{ position: 'absolute', width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <RiPlayFill size={28} />
                            </button>
                        )}
                    </>
                ) : (
                    <img src={previewUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px calc(20px + env(safe-area-inset-bottom,0px))', background: 'rgba(0,0,0,0.6)' }}>
                <input
                    value={caption}
                    onChange={e => onCaptionChange(e.target.value)}
                    placeholder="Add a caption..."
                    style={{ flex: 1, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 999, padding: '12px 16px', color: '#fff', fontSize: 15, outline: 'none' }}
                />
                <button onClick={onSend} disabled={sending} style={{ width: 46, height: 46, borderRadius: '50%', background: '#FF6B35', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                    {sending ? <RiLoader4Line size={18} style={{ animation: 'mcpSpin 0.8s linear infinite' }} /> : <RiSendPlaneFill size={18} />}
                </button>
            </div>
            <style>{`@keyframes mcpSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}