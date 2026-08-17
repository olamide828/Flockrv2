import { useRef, useState, useCallback } from 'react'
import { RiHeartFill } from 'react-icons/ri'

export function useLikeAnimation() {
  const [burst, setBurst] = useState(null)
  const timerRef = useRef(null)

  const trigger = useCallback((x, y) => {
    const id = `${Date.now()}-${Math.random()}`
    setBurst({ id, x, y })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setBurst(null), 1050)
  }, [])

  return { burst, trigger }
}

const SPARK_COLORS = ['#ff2d55', '#ff6b35', '#ffd23f', '#ff8fab']

export function LikeAnimationOverlay({ burst }) {
  if (!burst) return null

  const sparks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360 + (i % 2 === 0 ? -6 : 6)
    const distance = 62 + (i % 4) * 12
    return {
      angle, distance,
      delay: 60 + i * 20,
      size: 8 + (i % 3) * 5,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
    }
  })

  return (
    <div
      key={burst.id}
      style={{ position: 'fixed', left: burst.x, top: burst.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9999, perspective: 500 }}
    >
      <div className="like-anim-flash" />
      {sparks.map((s, i) => (
        <span key={i} className="like-anim-spark"
          style={{ '--angle': `${s.angle}deg`, '--dist': `${s.distance}px`, animationDelay: `${s.delay}ms`, fontSize: s.size, color: s.color }}>
          ✦
        </span>
      ))}
      <div className="like-anim-heart">
        <RiHeartFill size={100} color="#ff2d55" style={{ display: 'block', filter: 'drop-shadow(0 0 24px rgba(255,45,85,0.75))' }} />
      </div>

      <style>{`
        @keyframes likeAnimFlash {
          0%   { opacity: 0;   transform: scale(0.2); }
          28%  { opacity: 0.85; transform: scale(1.3); }
          100% { opacity: 0;   transform: scale(2.2); }
        }
        .like-anim-flash {
          position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
          width: 90px; height: 90px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,107,53,0.4) 45%, transparent 75%);
          animation: likeAnimFlash 0.55s ease-out forwards;
        }

        @keyframes likeAnimHeart {
          0%   { transform: scale(0) rotateY(180deg) rotate(-22deg); opacity: 0; }
          38%  { transform: scale(1.35) rotateY(0deg) rotate(9deg);  opacity: 1; }
          52%  { transform: scale(0.94) rotate(-4deg); }
          66%  { transform: scale(1.06) rotate(1deg); }
          80%  { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-28px) scale(1.06) rotate(0deg); opacity: 0; }
        }
        .like-anim-heart {
          animation: likeAnimHeart 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-style: preserve-3d;
        }

        @keyframes likeAnimSpark {
          0%   { transform: rotate(var(--angle)) translateX(0) rotate(0deg) scale(0); opacity: 1; }
          25%  { transform: rotate(var(--angle)) translateX(calc(var(--dist) * 0.35)) rotate(140deg) scale(1.3); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateX(var(--dist)) translateY(-16px) rotate(340deg) scale(0.2); opacity: 0; }
        }
        .like-anim-spark {
          position: absolute; top: 0; left: 0;
          animation: likeAnimSpark 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}