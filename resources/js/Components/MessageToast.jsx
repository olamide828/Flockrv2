import { RiCloseLine, RiCornerUpLeftLine } from 'react-icons/ri'
import { AvatarImage } from '@/Layouts/AppLayout'

export default function MessageToast({ toast, onReply, onDismiss }) {
    return (
        <div className="mt-toast" onClick={() => onReply(toast)}>
            <AvatarImage user={toast.sender} size={42} />
            <div className="mt-toast-body">
                <p className="mt-toast-name">{toast.sender.name}</p>
                <p className="mt-toast-msg">{toast.body}</p>
            </div>
            <button
                className="mt-toast-close"
                onClick={(e) => { e.stopPropagation(); onDismiss(toast.id) }}
                aria-label="Dismiss"
            >
                <RiCloseLine size={14} />
            </button>
            <button className="mt-toast-reply" onClick={(e) => { e.stopPropagation(); onReply(toast) }}>
                <RiCornerUpLeftLine size={13} /> Reply
            </button>

            <style>{`
                .mt-toast {
                    position: relative;
                    display: flex; align-items: flex-start; gap: 12px;
                    width: 340px; max-width: calc(100vw - 32px);
                    padding: 14px 40px 14px 14px;
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
                .mt-toast-close {
                    position: absolute; top: 10px; right: 10px;
                    width: 22px; height: 22px; border-radius: 50%;
                    background: rgba(255,255,255,0.1); border: none;
                    color: rgba(255,255,255,0.6);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                }
                .mt-toast-reply {
                    position: absolute; bottom: 10px; right: 10px;
                    display: flex; align-items: center; gap: 5px;
                    padding: 5px 11px; border-radius: 999px;
                    background: var(--flockr-orange, #FF6B35); border: none;
                    color: #fff; font-size: 11px; font-weight: 700;
                    cursor: pointer;
                }
                @keyframes mtSlideIn {
                    from { opacity: 0; transform: translateY(-14px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    )
}