import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { RiArrowLeftLine, RiTrophyLine, RiShoppingBag3Line, RiMoneyDollarCircleLine, RiMedalLine } from 'react-icons/ri'

const money = (v) => '₦' + Number(v ?? 0).toLocaleString()
const eventId = () => window.location.pathname.match(/events\/(\d+)/)?.[1]

export default function EventResults() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    axios.get(`/api/events/${eventId()}/my-results`).then((r) => setD(r.data)).catch(() => setErr('We could not find results for this event. Only sellers who joined can see them.'))
  }, [])

  const color = d?.event?.theme_color || '#FF6B35'
  const card = { background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 18 }

  return (
    <>
      <Head title="Event results" />
      <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: '#0a0a0a', color: '#fff' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Link href="/seller/dashboard" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><RiArrowLeftLine /> Dashboard</Link>
          {err && <div style={card}>{err}</div>}
          {!d && !err && <div style={card}>Loading…</div>}
          {d && (
            <>
              <div style={{ ...card, background: `linear-gradient(135deg, ${color}33, #111)`, textAlign: 'center' }}>
                {d.champion ? <RiTrophyLine size={44} color="#FBBF24" /> : <RiMedalLine size={40} color={color} />}
                <h1 style={{ margin: '8px 0 4px', fontSize: 22 }}>{d.event.title}</h1>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                  {d.final ? 'Final results' : 'Live standings — the event is still running'}
                </p>
                {d.champion && <p style={{ margin: '12px 0 0', color: '#FBBF24', fontWeight: 800 }}>🏆 You are the Champion! A badge is now on your profile.</p>}
              </div>

              {d.me && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <Stat icon={<RiMedalLine />} label="Your rank" value={`#${d.me.rank} of ${d.me.total_sellers}`} />
                  <Stat icon={<RiShoppingBag3Line />} label="Sales" value={d.me.orders_count} />
                  <Stat icon={<RiMoneyDollarCircleLine />} label="Revenue" value={money(d.me.revenue)} />
                </div>
              )}
              {d.me?.discount_percent != null && <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' }}>You ran this event at {d.me.discount_percent}% off.</p>}

              <div style={card}>
                <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Top sellers</p>
                {d.top.map((t) => (
                  <div key={t.rank} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: t.is_me ? 800 : 400, color: t.is_me ? color : '#fff' }}>
                    <span style={{ width: 28 }}>#{t.rank}</span>
                    <span style={{ flex: 1 }}>{t.name} <span style={{ opacity: 0.5 }}>@{t.username}</span>{t.is_me && ' (you)'}</span>
                    <span style={{ opacity: 0.7, fontSize: 13 }}>{t.orders_count} sales</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ color: '#FF6B35', fontSize: 18 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 16, margin: '4px 0 2px' }}>{value}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{label}</div>
    </div>
  )
}

EventResults.layout = (page) => <AppLayout>{page}</AppLayout>
