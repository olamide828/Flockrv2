import { useState, useRef, useEffect } from 'react'
import { RiCloseLine, RiSendPlaneFill } from 'react-icons/ri'
import { AvatarImage } from '@/Layouts/AppLayout'
import axios from 'axios'

export default function MessageToast({ toast, onOpen, onDismiss }) {
    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const inputRef = useRef(null)

    // Reset local state whenever a NEW message replaces the currently shown one
    useEffect(() => {
        setReply('')
        setSent(false)
    }, [toast.message_id])

    const handleSend = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!reply.trim() || sending) return
        setSending(true)
        try {
            await axios.post(`/api/conversations/${toast.conversation_id}/messages`, { body: reply.trim() })
            setSent(true)
            setTimeout(() => onDismiss(), 1200)
        } catch {
            setSending(false)
        }
    }

    return (
        <div className="mt-toast" onClick={() => onOpen(toast)}>
            <AvatarImage user={toast.sender} size={42} />
            <div className="mt-toast-body">
                <p className="mt-toast-name">{toast.sender.name}</p>
                {sent ? (
                    <p className="mt-toast-sent">Reply sent ✓</p>
                ) : (
                    <p className="mt-toast-msg">{toast.body}</p>
                )}
            </div>
            <button className="mt-toast-close" onClick={(e) => { e.stopPropagation(); onDismiss() }} aria-label="Dismiss">
                <RiCloseLine size={14} />
            </button>

            {!sent && (
                <form className="mt-toast-reply-row" onClick={(e) => e.stopPropagation()} onSubmit={handleSend}>
                    <input
                        ref={inputRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Reply..."
                        disabled={sending}
                        className="mt-toast-input"
                    />
                    <button type="submit" disabled={!reply.trim() || sending} className="mt-toast-send" aria-label="Send reply">
                        <RiSendPlaneFill size={14} />
                    </button>
                </form>
            )}

            <style>{`
                .mt-toast {
                    position: relative;
                    display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;
                    width: 340px; max-width: calc(100vw - 32px);
                    padding: 14px 40px 12px 14px;
                    background: rgba(24,24,24,0.55);
                    backdrop-filter: blur(20px) saturate(160%);
                    -webkit-backdrop-filter: blur(20px) saturate(160%);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 18px;
                    box-shadow: 0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
                    cursor: pointer;
                    animation: mtSlideIn 0.28s cubic-bezier(0.16,1,0.3,1);
                    pointer-events: auto;
                }
                .mt-toast-body { flex: 1; min-width: 0; padding-top: 2px; }
                .mt-toast-name { margin: 0 0 3px; color: #fff; font-weight: 700; font-size: 13.5px; }
                .mt-toast-msg { margin: 0; color: rgba(255,255,255,0.75); font-size: 13px; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                .mt-toast-sent { margin: 0; color: #4ADE80; font-size: 12.5px; font-weight: 600; }
                .mt-toast-close {
                    position: absolute; top: 10px; right: 10px;
                    width: 22px; height: 22px; border-radius: 50%;
                    background: rgba(255,255,255,0.1); border: none;
                    color: rgba(255,255,255,0.6);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                }
                .mt-toast-reply-row {
                    display: flex; align-items: center; gap: 8px; width: 100%;
                    margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);
                }
                .mt-toast-input {
                    flex: 1; min-width: 0;
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 999px; padding: 8px 13px;
                    color: #fff; font-size: 13px; outline: none;
                }
                .mt-toast-input::placeholder { color: rgba(255,255,255,0.35); }
                .mt-toast-send {
                    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
                    background: var(--flockr-orange, #ff5c00); border: none;
                    color: #fff; display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                }
                .mt-toast-send:disabled { opacity: 0.4; cursor: not-allowed; }
                @keyframes mtSlideIn {
                    from { opacity: 0; transform: translateY(-14px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    )
}