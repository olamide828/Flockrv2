import { useRef } from 'react'
import RoomMediaPlayer from '@/Components/Community/RoomMediaPlayer'
import ProductCard from '@/Components/Product/ProductCard'
import { RiRestartLine } from 'react-icons/ri'
import Ticks, { tickState } from '@/Components/Chat/Ticks'
import { ReactionChips } from '@/Components/Chat/MessageActionMenu'
import MentionText from '@/Components/Common/MentionText'

function renderMessageBody(text) {
    return <MentionText text={text} linkStyle={{ fontWeight: 700 }} />
}

/** Small red round icon next to a message that failed to send. Tap to send it again. */
export function RetryIcon({ onRetry }) {
    return (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRetry() }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
            aria-label="Message not sent. Tap to retry" title="Not sent. Tap to retry"
            style={{ flex: '0 0 28px', width: 28, height: 28, minWidth: 28, padding: 0, borderRadius: '50%', border: '1px solid rgba(239,68,68,0.55)', background: 'rgba(239,68,68,0.18)', color: '#f87171', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', cursor: 'pointer', lineHeight: 0 }}>
            <RiRestartLine size={15} />
        </button>
    )
}

export default function ChatMessageBubble({ msg, mine, showName, showAv, avatarUser, fmtTime, onOpenLightbox, onPressAction, onRetry, myId, showTicks = true }) {
    const swipeRef = useRef({})
    const pressTimer = useRef(null)
    const contentRef = useRef(null)
    const startPt = useRef({ x: 0, y: 0 })

    const onTouchStart = (e) => { swipeRef.current = { startX: e.touches[0].clientX, el: e.currentTarget }; startPt.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    const onTouchMove = (e) => {
        // a scroll or a swipe cancels the long-press
        if (Math.abs(e.touches[0].clientX - startPt.current.x) > 8 || Math.abs(e.touches[0].clientY - startPt.current.y) > 8) clearTimeout(pressTimer.current)
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
    const openMenu = () => {
        const rect = (contentRef.current ?? null)?.getBoundingClientRect()
        if (rect) onPressAction('menu', msg, rect)
    }
    const onPressStart = () => {
        if (msg.is_deleted || msg._optimistic) return
        clearTimeout(pressTimer.current)
        pressTimer.current = setTimeout(() => { navigator.vibrate?.(8); openMenu() }, 420)
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
            onContextMenu={(e) => { e.preventDefault(); if (!msg.is_deleted && !msg._optimistic) openMenu() }}
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none',  display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', padding: `${showAv ? 8 : 2}px 12px 2px`, alignItems: 'flex-end', gap: 8, opacity: msg._optimistic && !msg._failed ? 0.6 : 1, transition: 'transform 0.15s ease', userSelect: 'none' }}
        >
            {!mine && (
                <div style={{ width: 32, flexShrink: 0, alignSelf: 'flex-end' }}>
                    {showAv && (avatarUser?.avatar_url
                        ? <img src={avatarUser.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#333' }} />
                    )}
                </div>
            )}

            {mine && msg._failed && onRetry && <RetryIcon onRetry={onRetry} />}

            <div ref={contentRef} style={{ maxWidth: '72%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '100%' }}>
        <div style={{
            padding: '9px 14px',
            background: mine ? 'linear-gradient(135deg, rgba(255,107,53,0.88), rgba(255,92,0,0.72))' : 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(18px) saturate(170%)', WebkitBackdropFilter: 'blur(18px) saturate(170%)',
            border: mine ? '1px solid rgba(255,190,150,0.35)' : '1px solid rgba(255,255,255,0.16)',
            borderRadius: mine ? `18px ${showName ? 18 : 5}px 5px 18px` : `${showName ? 18 : 5}px 18px 18px 5px`,
            color: '#fff', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', overflow: 'hidden',
            boxShadow: mine ? '0 6px 20px rgba(255,92,0,0.28), inset 0 1px 0 rgba(255,255,255,0.28)' : '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{renderMessageBody(msg.body)}</p>
        </div>

        {msg.suggested_products?.length > 0 && (
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
                {msg.suggested_products.map(p => (
                    <div key={p.id} style={{ flexShrink: 0, width: 130 }}>
                        <ProductCard product={p} />
                    </div>
                ))}
            </div>
        )}
    </div>
)}

                {!msg.is_deleted && msg.reactions?.length > 0 && (
                    <ReactionChips reactions={msg.reactions} myId={myId} mine={mine} onToggle={(emoji) => onPressAction('react', msg, emoji)} />
                )}

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: msg._failed ? '#f87171' : 'rgba(255,255,255,0.35)', fontSize: 10, padding: mine ? '0 4px 0 0' : '0 0 0 4px' }}>
                    {msg._failed ? 'Not sent' : <>{msg.edited_at && !msg.is_deleted && <span>Edited</span>}<span>{fmtTime(msg.created_at)}</span></>}
                    {mine && showTicks && !msg.is_deleted && <Ticks state={tickState(msg)} />}
                </span>
            </div>
        </div>
    )
}