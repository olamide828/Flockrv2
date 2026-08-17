import { useRef, useState, useCallback } from 'react'
import { RiHeartFill } from 'react-icons/ri'

const MAX_CONCURRENT = 3

export function useLikeAnimation() {
  const [bursts, setBursts] = useState([])
  const idRef = useRef(0)

  const trigger = useCallback((x, y) => {
    const id = ++idRef.current
    setBursts(prev => {
      const next = [...prev, { id, x, y }]
      // Cap concurrent bursts so rapid double-tapping never piles up more
      // animating elements than the GPU can smoothly handle.
      return next.length > MAX_CONCURRENT ? next.slice(next.length - MAX_CONCURRENT) : next
    })
    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id))
    }, 750)
  }, [])

  return { burst: bursts[bursts.length - 1] ?? null, bursts, trigger }
}

function SingleBurst({ x, y }) {
  const particles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * 360
    return { angle, delay: i * 20 }
  })

  return (
    <div style={{ position: 'fixed', left: x, top: y, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9999, willChange: 'transform' }}>
      <div className="like-anim-ring" />
      {particles.map((p, i) => (
        <span key={i} className="like-anim-particle" style={{ '--angle': `${p.angle}deg`, animationDelay: `${p.delay}ms` }} />
      ))}
      <RiHeartFill size={84} color="#ff2d55" className="like-anim-heart" style={{ display: 'block' }} />
    </div>
  )
}

export function LikeAnimationOverlay({ burst, bursts }) {
  const list = bursts && bursts.length ? bursts : (burst ? [burst] : [])
  if (list.length === 0) return null

  return (
    <>
      {list.map(b => <SingleBurst key={b.id} x={b.x} y={b.y} />)}
      <style>{`
        @keyframes likeAnimRing {
          0%   { width: 14px; height: 14px; opacity: 0.8; border-width: 3px; }
          100% { width: 150px; height: 150px; opacity: 0; border-width: 0.5px; }
        }
        .like-anim-ring {
          position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
          border-radius: 50%; border: 3px solid rgba(255,45,85,0.6);
          animation: likeAnimRing 0.6s ease-out forwards;
          will-change: width, height, opacity;
        }
        @keyframes likeAnimHeart {
          0%   { transform: scale(0); opacity: 0; }
          35%  { transform: scale(1.25); opacity: 1; }
          55%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        .like-anim-heart {
          animation: likeAnimHeart 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        @keyframes likeAnimParticle {
          0%   { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateX(48px) scale(1); opacity: 0; }
        }
        .like-anim-particle {
          position: absolute; top: 0; left: 0; width: 6px; height: 6px; border-radius: 50%;
          background: #ff6b35;
          animation: likeAnimParticle 0.55s ease-out forwards;
          will-change: transform, opacity;
        }
      `}</style>
    </>
  )
}