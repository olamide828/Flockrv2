import { useState } from 'react'
import { router } from '@inertiajs/react'
import axios from 'axios'

/**
 * Universal follow button/badge. Hits the SAME /api/users/{id}/follow
 * endpoint your VideoCard already uses, so following someone here also
 * reflects on their profile and in the video feed, and vice versa —
 * it's all backed by one `follows` table.
 *
 * Renders nothing for your own posts (isOwner) or when logged out and
 * showWhenLoggedOut is false.
 */
export default function FollowButton({ userId, isOwner, isFollowing: initial = false, auth, size = 'sm' }) {
  const [following, setFollowing] = useState(initial)
  const [busy, setBusy] = useState(false)

  if (isOwner) return null

  const toggle = async (e) => {
    e?.stopPropagation()
    e?.preventDefault()
    if (!auth?.user) { router.visit('/login'); return }
    if (busy) return
    setBusy(true)
    const was = following
    setFollowing(!was)
    try {
      await axios.post(`/api/users/${userId}/follow`)
    } catch {
      setFollowing(was)
    } finally {
      setBusy(false)
    }
  }

  const small = size === 'sm'

  return (
    <button onClick={toggle} disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: small ? '3px 10px' : '6px 16px',
        borderRadius: 999,
        background: following ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: `1px solid ${following ? 'rgba(255,255,255,0.15)' : '#FF6B35'}`,
        color: following ? 'rgba(255,255,255,0.5)' : '#FF6B35',
        fontSize: small ? 11 : 13, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s', flexShrink: 0,
      }}>
      {following ? 'Following' : 'Follow'}
    </button>
  )
}