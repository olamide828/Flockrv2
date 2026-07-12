import { useState } from 'react'

export default function Av({ user, size = 36 }) {
  const [err, setErr] = useState(false)
  const src = (!err && user?.avatar_url) ? user.avatar_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'U')}&background=1a1a1a&color=fff`
  return <img src={src} alt="" onError={() => setErr(true)}
    style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
}