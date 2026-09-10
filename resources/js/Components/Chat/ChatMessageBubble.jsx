import { useRef } from 'react'
import RoomMediaPlayer from '@/Components/Community/RoomMediaPlayer'

function renderMessageBody(text) {
    return text.split(/(@[a-zA-Z0-9_.]+)/g).map((part, i) =>
        part.startsWith('@') ? <span key={i} style={{ color: '#FF6B35', fontWeight: 700 }}>{part}</span> : part
    )
}

export default function ChatMessageBubble({ msg, mine, showName, showAv, avatarUser, fmtTime, onOpenLightbox, onPressAction }) {
    const swipeRef = useRef({})
    const pressTimer = useRef(null)

    const onTouchStart = (e) => { swipeRef.current = { startX: e.touches[0].clientX, el: e.currentTarget } }
    const onTouchMove = (e) => {
        const dx = e.touches[0].clientX - (swipeRef.current.startX ?? 0)
        if (dx > 0) {
            const el = swipeRef.current.el
            if (el) el.style.transform = `translateX(${Math.min(dx * 0.5, 60)}px)`
        }
    }
    const onTouchEnd = (e) => {
        const dx = e.changedTouches[0].clientX - (swipeRef.current.startX ?? 0)
        const el = swipeRef.current.el
        if (el) el.style.transform = 'translateX(0)'
        if (dx > 50 && !msg.is_deleted) onPressAction('reply', msg)
        swipeRef.current = {}
    }
    const onPressStart = (e) => {
        if (msg.is_deleted) return
        const rect = e.currentTarget?.getBoundingClientRect()
        if (!rect) return
        pressTimer.current = setTimeout(() => onPressAction('menu', msg, rect.top), 900)
    }
    const onPressEnd = () => clearTimeout(pressTimer.current)

    return (
        <div
            onTouchStart={e => { onTouchStart(e); onPressStart(e) }}
            onTouchMove={onTouchMove}
            onTouchEnd={e => { onTouchEnd(e); onPressEnd() }}
            onMouseDown={onPressStart}
            onMouseUp={onPressEnd}
            onMouseLeave={onPressEnd}
            style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding: `${showAv ? 8 : 2}px 12px 2px`, alignItems: 'flex-end', gap: 8, opacity: msg._optimistic ? 0.6 : 1, transition: 'transform 0.15s ease', userSelect: 'none' }}
        >
            {!mine && (
                <div style={{ width: 32, flexShrink: 0, alignSelf: 'flex-end' }}>
                    {showAv && (avatarUser?.avatar_url
                        ? <img src={avatarUser.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#333' }} />
                    )}
                </div>
            )}

            <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2 }}>
                {msg.reply_to && !msg.is_deleted && (
                    <div style={{ padding: '5px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', borderLeft: '2px solid #FF6B35', maxWidth: '100%', marginBottom: 2 }}>
                        <p style={{ margin: 0, color: '#FF6B35', fontSize: 10, fontWeight: 700 }}>{msg.reply_to.sender?.name ?? 'Reply'}</p>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{msg.reply_to.body || (msg.reply_to.media_type ? `📎 ${msg.reply_to.media_type}` : '')}</p>
                    </div>
                )}

                {msg.is_deleted ? (
                    <div style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: mine ? '18px 5px 5px 18px' : '5px 18px 18px 5px', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontStyle: 'italic' }}>
                        This message was deleted
                    </div>
                ) : msg.media_url ? (
                    <div style={{
                        background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        borderRadius: mine ? `22px ${showName ? 22 : 8}px 8px 22px` : `${showName ? 22 : 8}px 22px 22px 8px`,
                        boxShadow: '0 8px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                        overflow: 'hidden', color: '#fff', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word',
                    }}>
                        <div onClick={() => onOpenLightbox(msg)} style={{ cursor: 'pointer', width: 220, height: 220, overflow: 'hidden' }}>
                            {msg.media_type === 'video'
                                ? <RoomMediaPlayer src={msg.media_url} maxHeight={220} />
                                : <img src={msg.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            }
                        </div>
                        {msg.body && <p style={{ margin: '8px 14px 10px' }}>{msg.body}</p>}
                    </div>
                ) : (
                    <div style={{
                        padding: '9px 14px', background: mine ? '#ff5c00' : 'rgba(255,255,255,0.09)',
                        borderRadius: mine ? `18px ${showName ? 18 : 5}px 5px 18px` : `${showName ? 18 : 5}px 18px 18px 5px`,
                        color: '#fff', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', overflow: 'hidden',
                        boxShadow: mine ? '0 2px 12px rgba(255,92,0,0.3)' : 'none',
                    }}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{renderMessageBody(msg.body)}</p>
                    </div>
                )}

                <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, padding: mine ? '0 4px 0 0' : '0 0 0 4px' }}>{fmtTime(msg.created_at)}</span>
            </div>
        </div>
    )
}