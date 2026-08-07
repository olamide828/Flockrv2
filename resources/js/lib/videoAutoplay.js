// Tracks whether the user has interacted with the page yet (click, tap, or
// key press anywhere). Browsers only allow autoplay-with-sound after a real
// user gesture — a setTimeout-based "auto unmute" can get silently rejected
// or feel inconsistent. Once this fires, every video mounted afterward can
// just start unmuted directly; nothing needs the muted-then-unmute dance.
const KEY = 'flockr_has_interacted'
let interacted = false
try { interacted = sessionStorage.getItem(KEY) === '1' } catch {}

const listeners = new Set()

function markInteracted() {
  if (interacted) return
  interacted = true
  try { sessionStorage.setItem(KEY, '1') } catch {}
  listeners.forEach(fn => { try { fn() } catch {} })
  listeners.clear()
}

if (typeof window !== 'undefined' && !interacted) {
  window.addEventListener('click', markInteracted, { once: true, capture: true })
  window.addEventListener('touchstart', markInteracted, { once: true, capture: true })
  window.addEventListener('keydown', markInteracted, { once: true, capture: true })
}

export function hasUserInteracted() {
  return interacted
}

// Fires `fn` the moment the first interaction happens anywhere on the page.
// If it already happened, fires immediately. Returns an unsubscribe fn.
export function onFirstInteraction(fn) {
  if (interacted) { fn(); return () => {} }
  listeners.add(fn)
  return () => listeners.delete(fn)
}