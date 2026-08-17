import { useRef, useState, useCallback } from 'react'
import { RiHeartFill } from 'react-icons/ri'

export function useLikeAnimation() {
  const [bursts, setBursts] = useState([])
  const idRef = useRef(0)

  const trigger = useCallback((x, y) => {
    const id = ++idRef.current
    const rotation = (Math.random() * 16) - 8
    const scale = 0.9 + Math.random() * 0.25
    setBursts(prev => [...prev, { id, x, y, rotation, scale }])
    setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id))
    }, 1000)
  }, [])

  // Backward-compatible: components that destructure `burst` (singular) still
  // get the most recent one for any code that hasn't been touched.
  return { burst: bursts[bursts.length - 1] ?? null, bursts, trigger }
}

const SPARK_COLORS = ['#ff2d55', '#ff6b35', '#ffd23f']

function SingleBurst({ x, y, rotation, scale }) {
  const sparks = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 360 + (i % 2 === 0 ? -7 : 7)
    const distance = 56 + (i % 3) * 14
    return {
      angle, distance,
      delay: 40 + i * 18,
      size: 7 + (i % 3) * 4,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
    }
  })

  return (
    <div style={{ position: 'fixed', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`, pointerEvents: 'none', zIndex: 9999 }}>
      <div className="like-anim-ring" />
      {sparks.map((s, i) => (
        <span key={i} className="like-anim-spark"
          style={{ '--angle': `${s.angle}deg`, '--dist': `${s.distance}px`, animationDelay: `${s.delay}ms`, fontSize: s.size, color: s.color }}>
          ✦
        </span>
      ))}
      <div className="like-anim-heart">
        <RiHeartFill size={92} color="#ff2d55" style={{ display: 'block', filter: 'drop-shadow(0 0 20px rgba(255,45,85,0.7))' }} />
      </div>
    </div>
  )
}

export function LikeAnimationOverlay({ burst, bursts }) {
  // Accepts either the array form (preferred, stacks) or a single burst
  // (older call sites) — either way it renders correctly.
  const list = bursts && bursts.length ? bursts : (burst ? [burst] : [])
  if (list.length === 0) return null

  return (
    <>
      {list.map(b => <SingleBurst key={b.id} {...b} />)}
      <style>{`
        @keyframes likeAnimRing {
          0%   { width: 14px; height: 14px; opacity: 0.9; border-width: 4px; }
          100% { width: 190px; height: 190px; opacity: 0; border-width: 0.5px; }
        }
        .like-anim-ring {
          position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
          border-radius: 50%; border: 4px solid rgba(255,107,53,0.75);
          animation: likeAnimRing 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        @keyframes likeAnimHeart {
          0%   { transform: scale(0) rotate(-18deg); opacity: 0; }
          32%  { transform: scale(1.4) rotate(8deg);  opacity: 1; }
          48%  { transform: scale(0.94) rotate(-4deg); opacity: 1; }
          62%  { transform: scale(1.07) rotate(2deg);  opacity: 1; }
          78%  { transform: scale(1) rotate(0deg);     opacity: 1; }
          100% { transform: scale(1.1) rotate(0deg);   opacity: 0; }
        }
        .like-anim-heart { animation: likeAnimHeart 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes likeAnimSpark {
          0%   { transform: rotate(var(--angle)) translateX(0) scale(0); opacity: 1; }
          25%  { transform: rotate(var(--angle)) translateX(calc(var(--dist) * 0.35)) scale(1.25); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateX(var(--dist)) scale(0.2); opacity: 0; }
        }
        .like-anim-spark {
          position: absolute; top: 0; left: 0;
          animation: likeAnimSpark 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  )
}