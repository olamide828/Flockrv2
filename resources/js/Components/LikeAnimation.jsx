import { useRef, useState, useCallback } from 'react'
import { RiHeartFill } from 'react-icons/ri'

/**
 * A heart pops in exactly where the user tapped, holds a beat, then shrinks
 * smoothly toward the like counter and "lands" on it — no fade, just scale.
 * The counter itself gives a little bump the instant it arrives.
 *
 * trigger(clientX, clientY) uses the ref passed to the hook as the default
 * target. trigger(clientX, clientY, someOtherElement) overrides the target
 * for that call — needed by MediaLightbox, where the target changes per post.
 */
export function useLikeAnimation(defaultTargetRef) {
  const [burst, setBurst] = useState(null) // { id, x, y, phase, targetEl }
  const timersRef = useRef([])

  const trigger = useCallback((x, y, targetEl) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    const id = Date.now()
    const resolvedTarget = targetEl ?? defaultTargetRef?.current ?? null
    setBurst({ id, x, y, phase: 'pop', targetEl: resolvedTarget })

    timersRef.current.push(setTimeout(() => {
      setBurst(b => (b && b.id === id ? { ...b, phase: 'fly' } : b))

      timersRef.current.push(setTimeout(() => {
        setBurst(b => (b && b.id === id ? null : b))
        if (resolvedTarget) {
          resolvedTarget.classList.remove('like-anim-bump')
          void resolvedTarget.offsetWidth // force reflow so rapid re-likes retrigger cleanly
          resolvedTarget.classList.add('like-anim-bump')
        }
      }, 430))
    }, 230))
  }, [defaultTargetRef])

  return { burst, trigger }
}

export function LikeAnimationOverlay({ burst }) {
  if (!burst) return null

  let x = burst.x, y = burst.y
  const flying = burst.phase === 'fly'
  if (flying && burst.targetEl) {
    const rect = burst.targetEl.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }

  return (
    <div
      className={!flying ? 'like-anim-pop-in' : ''}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: flying ? 'translate(-50%, -50%) scale(0.1)' : undefined,
        transition: flying
          ? 'left 0.42s cubic-bezier(0.55,0,0.1,1), top 0.42s cubic-bezier(0.55,0,0.1,1), transform 0.42s cubic-bezier(0.55,0,0.1,1)'
          : undefined,
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'left, top, transform',
      }}
    >
      <RiHeartFill size={68} color="#ff2d55" style={{ filter: 'drop-shadow(0 0 16px rgba(255,45,85,0.65))', display: 'block' }} />
      <style>{`
        @keyframes likeAnimPopIn {
          0%   { transform: translate(-50%, -50%) scale(0); }
          55%  { transform: translate(-50%, -50%) scale(1.35); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .like-anim-pop-in { animation: likeAnimPopIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards; }
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