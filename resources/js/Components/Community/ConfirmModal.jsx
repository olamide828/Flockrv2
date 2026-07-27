import { RiCloseLine } from 'react-icons/ri'

/**
 * Generic confirm dialog — replaces window.confirm() calls, which look
 * jarring and inconsistent against the rest of the app's UI.
 */
// NEW signature:
export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, onConfirm, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(360px,90vw)', zIndex: 951, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 22 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
          <RiCloseLine size={14} />
        </button>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>{title}</p>
      
<p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5, margin: '0 0 20px' }}>{message}</p>
{children && <div style={{ marginBottom: 20 }}>{children}</div>}
<div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {cancelLabel}
          </button>
          <button onClick={() => { onConfirm(); onClose() }} style={{ flex: 1, padding: 11, borderRadius: 12, background: danger ? '#EF4444' : '#FF6B35', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}