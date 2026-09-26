export function ensurePlaying(el) {
  if (!el) return
  const tryPlay = () => { el.play().catch(() => {}) }
  if (el.readyState >= 3) { tryPlay(); return }
  el.addEventListener('canplay', tryPlay, { once: true })
  setTimeout(() => {
    if (el.readyState >= 3 && el.paused) tryPlay()
  }, 1500)
}