export function timeAgo(d) {
  if (!d) return ''
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)     return `${Math.floor(s)}s`
  if (s < 3600)   return `${Math.floor(s / 60)}m`
  if (s < 86400)  return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

export function fmtTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

export function fmtCount(n) {
  const num = Number(n ?? 0)
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (num >= 1_000)     return (num / 1_000).toFixed(1).replace('.0', '') + 'K'
  return String(num)
}