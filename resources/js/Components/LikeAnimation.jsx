import { useRef, useCallback } from 'react'
import { RiHeartFill } from 'react-icons/ri'

export function useLikeAnimation(defaultTargetRef) {
  const [burstState, setBurstState] = useRefState(null)
  const timerRef = useRef(null)

  const trigger = useCallback((x, y, targetEl) => {
    const id = `${Date.now()}-${Math.random()}`
    const resolvedTarget = targetEl ?? defaultTargetRef?.current ?? null

    let dx = 0, dy = 0
    if (resolvedTarget) {
      const rect = resolvedTarget.getBoundingClientRect()
      dx = (rect.left + rect.width / 2) - x
      dy = (rect.top + rect.height / 2) - y
    }

    setBurstState({ id, x, y, dx, dy })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setBurstState(null)
      if (resolvedTarget) {
        resolvedTarget.classList.remove('like-anim-bump')
        void resolvedTarget.offsetWidth // force reflow so rapid re-likes retrigger cleanly
        resolvedTarget.classList.add('like-anim-bump')
      }
    }, 1000)
  }, [defaultTargetRef])

  return { burst: burstState, trigger }
}

// Tiny local useState wrapper kept in this file so the hook above reads
// cleanly — no behavior difference from calling useState directly.
function useRefState(initial) {
  const React = require('react')
  return React.useState(initial)
}

export function LikeAnimationOverlay({ burst }) {
  if (!burst) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: burst.x,
        top: burst.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div
        key={burst.id}
        className="like-anim-heart"
        style={{ '--dx': `${burst.dx}px`, '--dy': `${burst.dy}px`, filter: 'drop-shadow(0 0 20px rgba(255,45,85,0.6))' }}
      >
        <RiHeartFill size={104} color="#ff2d55" style={{ display: 'block' }} />
      </div>
      <style>{`
        @keyframes likeAnimHeart {
          0%   { transform: scale(0); opacity: 1; }
          20%  { transform: scale(1.5); opacity: 1; }
          36%  { transform: scale(1.08); opacity: 1; }
          70%  { transform: scale(1.08); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.12); opacity: 0.85; }
        }
        .like-anim-heart {
          animation: likeAnimHeart 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
        @keyframes likeAnimBump {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .like-anim-bump { animation: likeAnimBump 0.32s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>
    </div>
  )
}