// One blocked-state avatar used everywhere (Inbox list, chat header, Profile)
// so the blocked state always looks the same: a muted person silhouette with
// a red "no-entry" slash across it. Custom SVG, no icon-pack dependency.
export default function BlockedAvatar({ size = 40, style }) {
  const px = typeof size === 'number' ? size : undefined
  return (
    <div
      aria-label="Blocked account"
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'radial-gradient(circle at 30% 25%, #2a2a2e, #161618)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', ...style,
      }}
    >
      <svg viewBox="0 0 48 48" width="72%" height="72%" style={{ display: 'block' }} fill="none">
        <circle cx="24" cy="18" r="7.5" fill="rgba(255,255,255,0.22)" />
        <path d="M9 41c0-8.3 6.7-13 15-13s15 4.7 15 13" fill="rgba(255,255,255,0.22)" />
        <circle cx="24" cy="24" r="19" stroke="#EF4444" strokeWidth="3.2" opacity="0.95" />
        <path d="M10.6 37.4 37.4 10.6" stroke="#EF4444" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
