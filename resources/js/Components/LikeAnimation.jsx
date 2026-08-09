import { useRef, useState, useCallback } from 'react'
import { RiHeartFill } from 'react-icons/ri'

export function useLikeAnimation() {
  const [burst, setBurst] = useState(null)
  const timerRef = useRef(null)

  const trigger = useCallback((x, y) => {
    const id = `${Date.now()}-${Math.random()}`
    setBurst({ id, x, y })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setBurst(null), 950)
  }, [])

  return { burst, trigger }
}

export function LikeAnimationOverlay({ burst }) {
  if (!burst) return null

  const particles = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 360 + (i % 2 === 0 ? -8 : 8)
    const distance = 58 + (i % 3) * 14
    return { angle, distance, delay: i * 22, size: 9 + (i % 3) * 4 }
  })

  return (
    <div
      key={burst.id}
      style={{
        position: 'fixed',
        left: burst.x,
        top: burst.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div className="like-anim-ring" />
      {particles.map((p, i) => (
        <span key={i} className="like-anim-particle"
          style={{ '--angle': `${p.angle}deg`, '--dist': `${p.distance}px`, animationDelay: `${p.delay}ms`, fontSize: p.size }}>
          ❤
        </span>
      ))}
      <div className="like-anim-core">
        <RiHeartFill size={104} color="#ff2d55" style={{ display: 'block', filter: 'drop-shadow(0 0 22px rgba(255,45,85,0.7))' }} />
      </div>

      <style>{`
        @keyframes likeAnimCore {
          0%   { transform: scale(0) rotate(-18deg); opacity: 0; }
          22%  { transform: scale(1.4) rotate(8deg);  opacity: 1; }
          38%  { transform: scale(0.94) rotate(-4deg); opacity: 1; }
          52%  { transform: scale(1.08) rotate(2deg);  opacity: 1; }
          65%  { transform: scale(1) rotate(0deg);     opacity: 1; }
          100% { transform: scale(1.15) rotate(0deg);  opacity: 0; }
        }
        .like-anim-core { animation: likeAnimCore 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

        @keyframes likeAnimRing {
          0%   { width: 16px; height: 16px; opacity: 0.9; border-width: 4px; }
          100% { width: 200px; height: 200px; opacity: 0; border-width: 0.5px; }
        }
        .like-anim-ring {
          position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
          border-radius: 50%; border: 4px solid rgba(255,107,53,0.75);
          animation: likeAnimRing 0.75s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        @keyframes likeAnimParticle {
          0%   { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 1; }
          25%  { transform: rotate(var(--angle)) translateX(calc(var(--dist) * 0.35)) scale(1.15); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateX(var(--dist)) scale(0.25); opacity: 0; }
        }
        .like-anim-particle {
          position: absolute; top: 0; left: 0; color: #ff6b35;
          animation: likeAnimParticle 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
        }
      `}</style>
    </div>
  )
}