import { router } from '@inertiajs/react'
import axios from 'axios'

/**
 * Controlled component now — the parent (Community/Index) owns a shared
 * followingMap keyed by userId, so following someone from one post updates
 * every other post by that same author instantly, with no refresh needed.
 *
 * isFollowing / onChange are required; this component just renders the
 * current state and fires the optimistic update + API call.
 */
export default function FollowButton({ userId, isOwner, isFollowing, onChange, auth }) {
  if (isOwner) return null

  const toggle = async (e) => {
    e?.stopPropagation()
    e?.preventDefault()
    if (!auth?.user) { router.visit('/login'); return }
    const was = isFollowing
    onChange(userId, !was) // optimistic, propagates to every post by this author immediately
    try {
      await axios.post(`/api/users/${userId}/follow`)
    } catch {
      onChange(userId, was) // rollback everywhere on failure
    }
  }

  if (isFollowing) {
    return (
      <span onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
        Following
      </span>
    )
  }

  return (
    <button onClick={toggle}
      style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, background: 'transparent', border: '1px solid #FF6B35', color: '#FF6B35', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
      Follow
    </button>
  )
}