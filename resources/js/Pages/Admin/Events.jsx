import { Head } from '@inertiajs/react'
import axios from 'axios'
import { useState } from 'react'
import AdminShell from '@/Components/Admin/AdminShell'
import { Btn, Card, DataTable, Drawer, Empty, Field, Input, PageHeader, Pill, Stat, StatGrid, Textarea, UserCell, useAdmin } from '@/Components/Admin/ui'
import { errMsg, fmtDate, naira, num, useAdminFetch } from '@/Components/Admin/lib'

const TONE = { draft: 'mute', scheduled: 'info', active: 'good', ended: 'mute' }
const LABEL = { draft: 'Draft', scheduled: 'Scheduled', active: 'Live', ended: 'Ended' }
const EMPTY = { title: '', description: '', theme_color: '#FF6B35', banner_image: '', badge_image: '', starts_at: '', ends_at: '', discount_tiers: '5,10,15', max_sellers: '', scavenger_hunt_target: '', scavenger_hunt_coupon_amount: '', event_fee_percent: '' }
const local = (d) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')

function EventForm({ initial, onDone, onClose }) {
  const { toast } = useAdmin()
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial, starts_at: local(initial.starts_at), ends_at: local(initial.ends_at), discount_tiers: (initial.discount_tiers || []).join(',') } : EMPTY)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const upload = (field = 'banner_image') => async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const fd = new FormData(); fd.append('image', file)
    try { const r = await axios.post('/api/admin/events/upload-banner', fd); set(field, r.data.url) } catch (er) { toast(errMsg(er), 'error') }
  }
  const save = async () => {
    setBusy(true)
    const payload = {
      ...f,
      discount_tiers: String(f.discount_tiers).split(',').map((s) => parseInt(s.trim())).filter(Boolean),
      scavenger_hunt_target: f.scavenger_hunt_target || null, scavenger_hunt_coupon_amount: f.scavenger_hunt_coupon_amount || null,
      event_fee_percent: f.event_fee_percent || null, max_sellers: f.max_sellers || null,
    }
    try {
      initial ? await axios.put(`/api/admin/events/${initial.id}`, payload) : await axios.post('/api/admin/events', payload)
      toast('Event saved'); onDone()
    } catch (er) { toast(errMsg(er), 'error') } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Field label="Title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="Description"><Textarea value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
      <Field label="Banner image">
        {f.banner_image && <img src={f.banner_image} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, marginBottom: 6 }} />}
        <input type="file" accept="image/*" onChange={upload('banner_image')} />
      </Field>
      <Field label="Champion badge image" hint="The picture the winner gets on their profile. Leave empty to use the default badge.">
        {f.badge_image && <img src={f.badge_image} alt="" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12, marginBottom: 6, background: 'rgba(255,255,255,.05)' }} />}
        <input type="file" accept="image/*" onChange={upload('badge_image')} />
      </Field>
      <Field label="Theme colour"><Input type="color" value={f.theme_color || '#FF6B35'} onChange={(e) => set('theme_color', e.target.value)} /></Field>
      <Field label="Starts at"><Input type="datetime-local" value={f.starts_at} onChange={(e) => set('starts_at', e.target.value)} /></Field>
      <Field label="Ends at"><Input type="datetime-local" value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} /></Field>
      <Field label="Discount tiers (%)" hint="Sellers pick ONE of these when they join, e.g. 5,10,15."><Input value={f.discount_tiers} onChange={(e) => set('discount_tiers', e.target.value)} /></Field>
      <Field label="Max sellers" hint="Minimum 5. Leave blank for no limit."><Input type="number" value={f.max_sellers ?? ''} onChange={(e) => set('max_sellers', e.target.value)} /></Field>
      <Field label="Scavenger hunt: different sellers a buyer must buy from"><Input type="number" value={f.scavenger_hunt_target ?? ''} onChange={(e) => set('scavenger_hunt_target', e.target.value)} /></Field>
      <Field label="Hunt reward (₦ coupon)"><Input type="number" value={f.scavenger_hunt_coupon_amount ?? ''} onChange={(e) => set('scavenger_hunt_coupon_amount', e.target.value)} /></Field>
      <Field label="Event fee % (optional)" hint="Replaces the normal commission for sellers in this event."><Input type="number" value={f.event_fee_percent ?? ''} onChange={(e) => set('event_fee_percent', e.target.value)} /></Field>
      <div style={{ display: 'flex', gap: 8 }}><Btn kind="primary" busy={busy} onClick={save}>Save event</Btn><Btn onClick={onClose}>Cancel</Btn></div>
    </div>
  )
}

function Results({ event, onClose }) {
  const { data, loading } = useAdminFetch(`/api/admin/events/${event.id}/results`, {}, [event.id])
  const rows = data?.rows || []
  return (
    <Drawer open title={`Results · ${event.title}`} onClose={onClose} width={560}>
      {loading ? 'Loading…' : rows.length === 0 ? <Empty title="No sellers joined" sub="Nobody has joined this event yet." /> : (
        <>
          <p style={{ opacity: .6, fontSize: 13 }}>{event.status === 'ended' ? 'Final standings (revenue is what sellers earned, before payout fees).' : 'Live standings — they update as orders come in.'}</p>
          {rows.map((r) => (
            <div key={r.seller_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <b style={{ width: 30 }}>#{r.rank}</b>
              <div style={{ flex: 1 }}>{r.seller ? <UserCell user={r.seller} /> : `Seller ${r.seller_id}`}</div>
              <div style={{ textAlign: 'right' }}><div>{naira(r.revenue)}</div><small style={{ opacity: .6 }}>{r.orders_count} sales · {r.discount_percent}% off</small></div>
            </div>
          ))}
        </>
      )}
    </Drawer>
  )
}

export default function Events() {
  const { data, loading, reload } = useAdminFetch('/api/admin/events', {}, [])
  const events = Array.isArray(data) ? data : data?.rows || []
  const { toast, confirm } = useAdmin()
  const [form, setForm] = useState(null) // null | {} | event
  const [view, setView] = useState(null)

  const run = async (fn, ok) => { try { await fn(); toast(ok); reload() } catch (e) { toast(errMsg(e), 'error') } }
  const publish = async (e) => { if (await confirm({ title: `Publish “${e.title}”?`, message: 'Sellers (or everyone, if it is already live) are notified straight away.', confirmLabel: 'Publish', danger: false })) run(() => axios.post(`/api/admin/events/${e.id}/publish`), 'Event published') }
  const end = async (e) => { if (await confirm({ title: `End “${e.title}” now?`, message: 'Discounts revert immediately, sellers get their results and the top seller is crowned Champion.', confirmLabel: 'End event' })) run(() => axios.post(`/api/admin/events/${e.id}/end`), 'Event ended — results saved') }

  const live = events.filter((e) => e.status === 'active').length
  return (
    <>
      <Head title="Events · Admin" />
      <PageHeader title="Events" sub="Sales events, seller discounts and scavenger hunts" actions={<Btn kind="primary" size="sm" onClick={() => setForm({})}>New event</Btn>} />
      <StatGrid>
        <Stat label="Total" value={num(events.length)} />
        <Stat label="Live now" value={num(live)} tone={live ? 'good' : undefined} />
        <Stat label="Scheduled" value={num(events.filter((e) => e.status === 'scheduled').length)} />
        <Stat label="Sellers joined" value={num(events.reduce((a, e) => a + (e.participants_count || 0), 0))} />
      </StatGrid>
      <Card pad={false}>
        <DataTable rows={events} loading={loading} meta={null} onRetry={reload} empty={<Empty title="No events yet" sub="Create one to run a platform-wide sale." />}
          columns={[
            { key: 't', label: 'Event', mobile: 'title', render: (e) => <span><b>{e.title}</b>{e.scavenger_hunt_target ? <> <Pill tone="violet">Hunt ×{e.scavenger_hunt_target}</Pill></> : null}</span> },
            { key: 's', label: 'Status', render: (e) => <Pill tone={TONE[e.status] || 'mute'}>{LABEL[e.status] || e.status}</Pill> },
            { key: 'd', label: 'Dates', mobile: 'hide', render: (e) => `${fmtDate(e.starts_at)} → ${fmtDate(e.ends_at)}` },
            { key: 'p', label: 'Sellers', render: (e) => num(e.participants_count) },
            { key: 'a', label: '', render: (e) => (
              <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                {e.status === 'draft' && <Btn size="sm" kind="primary" onClick={() => publish(e)}>Publish</Btn>}
                {['scheduled', 'active'].includes(e.status) && <Btn size="sm" kind="danger" onClick={() => end(e)}>End now</Btn>}
                <Btn size="sm" onClick={() => setView(e)}>Results</Btn>
                {e.status !== 'ended' && <Btn size="sm" onClick={() => setForm(e)}>Edit</Btn>}
              </span>) },
          ]} />
      </Card>
      <Drawer open={!!form} title={form?.id ? 'Edit event' : 'New event'} onClose={() => setForm(null)}>
        {form && <EventForm initial={form.id ? form : null} onDone={() => { setForm(null); reload() }} onClose={() => setForm(null)} />}
      </Drawer>
      {view && <Results event={view} onClose={() => setView(null)} />}
    </>
  )
}
Events.layout = (page) => <AdminShell>{page}</AdminShell>
