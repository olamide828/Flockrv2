import { RiImageFill, RiVideoFill } from 'react-icons/ri'

const icon = { display: 'block', flexShrink: 0 }
// ONE inline-flex row: the icon and the label always sit side by side on a single line, whatever the parent's layout is
const row = (children) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%', verticalAlign: 'bottom' }}>{children}</span>
const txt = (t) => <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{t}</span>

export function parseReaction(conv) {
    let lr = conv?.last_reaction
    if (typeof lr === 'string') { try { lr = JSON.parse(lr) } catch { lr = null } }
    return lr || null
}

/** The grey line under a chat's name in the inbox list: text, a photo/video label, a reaction, or a deleted note. */
export default function lastPreview(conv, myId) {
    const m = conv?.last_message
    const lr = parseReaction(conv)

    // A reaction newer than the last message is the latest activity: You: Reacted 👍 to “How are you?”
    if (lr && (!m || new Date(lr.at) > new Date(m.created_at))) {
        const who = lr.user_id === myId ? 'You' : (conv.participants?.find(p => p.id === lr.user_id)?.name?.split(' ')[0] ?? 'They')
        return <>{who}: Reacted {lr.emoji} to “{lr.preview}”</>
    }

    if (!m) return 'Say hello!'
    const prefix = m.sender_id === myId ? 'You: ' : ''
    if (m.is_deleted) return <>{prefix}<i>This message was deleted</i></>

    const hasMedia = !!(m.media_type || m.media_url || m.media_path)
    if (hasMedia) {
        const isVideo = m.media_type === 'video'
        return row(<>{prefix && <span style={{ flexShrink: 0 }}>{prefix.trim()}</span>}{isVideo ? <RiVideoFill size={14} style={icon} /> : <RiImageFill size={14} style={icon} />}{txt(m.body ? m.body : (isVideo ? 'Video' : 'Photo'))}</>)
    }
    return prefix + (m.body ?? 'Say hello!')
}
