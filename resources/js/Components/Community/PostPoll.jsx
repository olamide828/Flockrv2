import { useEffect, useState } from 'react'
import axios from 'axios'
import { RiCheckLine, RiCheckboxCircleFill } from 'react-icons/ri'

function timeLeft(endsAt) {
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return 'Final results'
  const m = Math.ceil(ms / 60000)
  if (m < 60) return `${m}m left`
  const h = Math.ceil(m / 60)
  if (h < 24) return `${h}h left`
  return `${Math.ceil(h / 24)}d left`
}

/**
 * A poll under a post. Numbers stay hidden until you vote (or it closes / it's your own poll).
 * Votes can't be changed. If the poll allows several answers, tick them then press Vote.
 */
export default function PostPoll({ poll: initial, auth, showToast, onChange, compact = false }) {
  const [poll, setPoll] = useState(initial)
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { setPoll(initial) }, [initial])
  if (!poll) return null

  const voted = poll.my_votes?.length > 0
  const canVote = !poll.is_closed && !voted
  const stop = (e) => { e.stopPropagation() }   // the post card opens the post when tapped

  const submit = async (ids) => {
    if (!auth?.user) { window.location.href = '/login'; return }
    if (busy) return
    setBusy(true)
    try {
      const { data } = await axios.post(`/api/community/polls/${poll.id}/vote`, { option_ids: ids })
      setPoll(data.poll); setPicked([]); onChange?.(data.poll)
    } catch (err) {
      const msg = err.response?.data?.errors?.poll?.[0] ?? err.response?.data?.errors?.option_ids?.[0] ?? err.response?.data?.message ?? 'Could not record your vote.'
      showToast?.(msg, 'error')
    } finally { setBusy(false) }
  }

  const tap = (o) => {
    if (!canVote) return
    if (!poll.allow_multiple) { submit([o.id]); return }
    setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]))
  }

  const top = poll.show_results ? Math.max(...poll.options.map((o) => o.votes ?? 0)) : 0

  return (
    <div onClick={stop} style={{ margin: compact ? '8px 0 10px' : '10px 0 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {poll.options.map((o) => {
        const mine = poll.my_votes?.includes(o.id)
        const on = picked.includes(o.id)
        const lead = poll.show_results && (o.votes ?? 0) === top && top > 0
        return (
          <button key={o.id} type="button" disabled={!canVote || busy} onClick={() => tap(o)}
            style={{ position: 'relative', overflow: 'hidden', textAlign: 'left', padding: '12px 14px', borderRadius: 12, cursor: canVote ? 'pointer' : 'default',
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${mine || on ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`, color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {poll.show_results && (
              <span style={{ position: 'absolute', inset: 0, width: `${o.percent ?? 0}%`, background: lead ? 'rgba(255,107,53,0.32)' : 'rgba(255,255,255,0.09)', transition: 'width .5s ease' }} />
            )}
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
              {(mine || on) && <RiCheckboxCircleFill size={16} color="#FF6B35" />}
              <span style={{ flex: 1, wordBreak: 'break-word' }}>{o.text}</span>
              {poll.show_results && <span style={{ fontWeight: 800, color: lead ? '#FF6B35' : 'rgba(255,255,255,0.7)' }}>{o.percent}%</span>}
            </span>
          </button>
        )
      })}

      {canVote && poll.allow_multiple && (
        <button type="button" disabled={!picked.length || busy} onClick={() => submit(picked)}
          style={{ alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 999, border: 'none', cursor: picked.length ? 'pointer' : 'default',
            background: picked.length ? '#FF6B35' : 'rgba(255,255,255,0.08)', color: picked.length ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700 }}>
          <RiCheckLine size={14} style={{ verticalAlign: -2, marginRight: 4 }} />{busy ? 'Voting…' : 'Vote'}
        </button>
      )}

      <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        {poll.show_results ? `${poll.total_votes} ${poll.total_votes === 1 ? 'vote' : 'votes'} · ` : ''}
        {poll.ends_at ? timeLeft(poll.ends_at) : ''}
        {canVote && poll.allow_multiple ? ' · pick all that apply' : ''}
        {canVote && !poll.show_results ? ' · results show after you vote' : ''}
      </p>
    </div>
  )
}
