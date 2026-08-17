let interacted = false
const listeners = new Set()

export function markInteracted() {
  if (interacted) return
  interacted = true
  listeners.forEach(fn => { try { fn() } catch {} })
  listeners.clear()
}

export function hasUserInteracted() {
  return interacted
}

export function onFirstInteraction(fn) {
  if (interacted) { fn(); return () => {} }
  listeners.add(fn)
  return () => listeners.delete(fn)
}