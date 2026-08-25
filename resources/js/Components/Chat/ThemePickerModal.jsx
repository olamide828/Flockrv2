import { useState } from 'react'
import axios from 'axios'
import { RiCloseLine, RiCheckLine, RiVipDiamondLine } from 'react-icons/ri'

export const CHAT_THEMES = [
  { key: 'off', label: 'Off', free: true, color: '#3a3a3a' },
  { key: 'bubbles', label: 'Bubbles', free: true, color: '#FF6B35' },
  { key: 'drift', label: 'Drift', free: true, color: '#9CA3AF' },
  { key: 'rain', label: 'Neon Rain', free: false, color: '#3B82F6' },
  { key: 'embers', label: 'Embers', free: false, color: '#F97316' },
  { key: 'snowfall', label: 'Snowfall', free: false, color: '#E5E7EB' },
  { key: 'confetti', label: 'Confetti', free: false, color: '#F472B6' },
  { key: 'starfield', label: 'Starfield', free: false, color: '#A78BFA' },
  { key: 'aurora', label: 'Aurora', free: false, color: '#34D399' },
  { key: 'neonGrid', label: 'Neon Grid', free: false, color: '#22D3EE' },
]

export default function ThemePickerModal({ currentTheme, canUsePro, onApplied, onUpgrade, onClose }) {
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  const select = async (theme) => {
    if (!theme.free && !canUsePro) { onUpgrade(); return }
    setSaving(theme.key); setError('')
    try {
      await axios.patch('/api/users/me/chat-theme', { theme: theme.key })
      onApplied(theme.key)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not update theme.')
    } finally { setSaving(null) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.7)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 951, maxWidth: 480, margin: '0 auto', background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderRadius: '22px 22px 0 0', padding: '10px 20px calc(20px + env(safe-area-inset-bottom,0px))', maxHeight: '78vh', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)', margin: '4px auto 14px' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer' }}><RiCloseLine size={15} /></button>

        <p style={{ margin: '0 0 4px', color: '#fff', fontWeight: 800, fontSize: 16 }}>Chat Background</p>
        <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.4)', fontSize: 12.5 }}>
          {canUsePro ? 'Your theme shows for everyone you chat with.' : 'Pro backgrounds are unlocked by Flockr Pro sellers.'}
        </p>

        {error && <p style={{ color: '#EF4444', fontSize: 12, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {CHAT_THEMES.map(theme => {
            const locked = !theme.free && !canUsePro
            const active = currentTheme === theme.key
            return (
              <button key={theme.key} onClick={() => select(theme)} disabled={saving === theme.key}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 16, background: active ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? '#FF6B35' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', position: 'relative' }}>
                {!theme.free && (
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RiVipDiamondLine size={10} color="#FF6B35" />
                  </div>
                )}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: theme.color, opacity: locked ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {active && <RiCheckLine size={16} color="#fff" />}
                </div>
                <span style={{ color: locked ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 11, fontWeight: 600 }}>{theme.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}