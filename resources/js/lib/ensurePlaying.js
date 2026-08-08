export function ensurePlaying(el) {
  if (!el) return
  const tryPlay = () => { el.play().catch(() => {}) }
  if (el.readyState >= 3) tryPlay() // HAVE_FUTURE_DATA or better — safe to resume now
  else el.addEventListener('canplay', tryPlay, { once: true })
}