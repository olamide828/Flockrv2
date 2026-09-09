import { useState } from 'react'
import { RiMoreFill } from 'react-icons/ri'
import RoomMediaPlayer from '@/Components/Community/RoomMediaPlayer'
import MediaLightbox from './MediaLightbox'
import MessageActionSheet from './MessageActionSheet'

function renderMessageBody(text) {
    return text.split(/(@[a-zA-Z0-9_.]+)/g).map((part, i) =>
        part.startsWith('@') ? <span key={i} style={{ color: '#FF6B35', fontWeight: 700 }}>{part}</span> : part
    )
}

export default function ChatMessageBubble({ msg, mine, first, last, showAvatar, avatarUser, highlight, fmtTime, onDelete, onReply, showToast }) {
    const [showLightbox, setShowLightbox] = useState(false)
    const [showActions, setShowActions] = useState(false)

    const br = mine
        ? `18px ${first ? 18 : 4}px ${last ? 18 : 4}px 18px`
        : `${first ? 18 : 4}px 18px 18px ${last ? 18 : 4}px`

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
            {!mine && (
                <div style={{ width: 28, flexShrink: 0 }}>
                    {showAvatar && (avatarUser?.avatar_url
                        ? <img src={avatarUser.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#333' }} />
                    )}
                </div>
            )}

            <div className="msg-row-wrap" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 2, maxWidth: '72%' }}>
                {!msg.is_deleted && !msg._optimistic && (
                    <button onClick={() => setShowActions(true)} className="msg-more-btn" style={{ position: 'absolute', top: -4, [mine ? 'left' : 'right']: -28, width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.4)', display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <RiMoreFill size={14} />
                    </button>
                )}

                <div style={{ padding: '9px 14px', background: mine ? (highlight ? '#e85200' : '#ff5c00') : (highlight ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'), border: mine ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: br, color: '#fff', fontSize: 14, lineHeight: 1.5, opacity: msg._optimistic ? 0.6 : 1, boxShadow: mine ? '0 2px 12px rgba(255,92,0,0.2)' : 'none' }}>
                    {msg.is_deleted ? (
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: 13 }}>This message was deleted</p>
                    ) : (
                        <>
                            {msg.reply_to && (
                                <div style={{ borderLeft: '2px solid rgba(255,255,255,0.3)', paddingLeft: 8, marginBottom: 6, opacity: 0.75 }}>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700 }}>{msg.reply_to.sender_id === msg.sender_id ? 'themselves' : 'Reply'}</p>
                                    <p style={{ margin: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.reply_to.body || (msg.reply_to.media_type ? `📎 ${msg.reply_to.media_type}` : '')}</p>
                                </div>
                            )}
                            {msg.media_url && (
                                <div onClick={() => setShowLightbox(true)} style={{ width: 200, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', marginBottom: msg.body ? 6 : 0 }}>
                                    {msg.media_type === 'video'
                                        ? <div style={{ aspectRatio: '9/16', maxHeight: 260 }}><RoomMediaPlayer src={msg.media_url} /></div>
                                        : <img src={msg.media_url} alt="" style={{ width: '100%', display: 'block' }} />
                                    }
                                </div>
                            )}
                            {msg.body && renderMessageBody(msg.body)}
                        </>
                    )}
                </div>

                {last && !msg.is_deleted && (
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{fmtTime(msg.created_at)}</span>
                )}
            </div>

            {showLightbox && msg.media_url && (
                <MediaLightbox url={msg.media_url} type={msg.media_type} onClose={() => setShowLightbox(false)} />
            )}

            {showActions && (
                <MessageActionSheet
                    message={msg}
                    isMine={mine}
                    onReply={() => { setShowActions(false); onReply(msg) }}
                    onDelete={() => { setShowActions(false); onDelete(msg) }}
                    onCopy={() => { setShowActions(false); navigator.clipboard?.writeText(msg.body); showToast?.('Copied', 'success') }}
                    onClose={() => setShowActions(false)}
                />
            )}
        </div>
    )
}