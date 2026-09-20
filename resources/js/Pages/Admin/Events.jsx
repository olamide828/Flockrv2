import { useState, useEffect } from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import {
  RiGroupLine, RiVideoLine, RiShoppingBagLine, RiBankCardLine,
  RiAlertLine, RiBarChartLine, RiArrowRightLine, RiAddLine, RiCloseLine,
} from 'react-icons/ri'
import ConfirmModal from '@/Components/Community/ConfirmModal'
import { useToast } from '@/Components/Toast'

function AdminLayout({ children, active }) {
  const links = [
    { href: '/admin/dashboard', icon: RiBarChartLine,    label: 'Overview'  },
    { href: '/admin/users',     icon: RiGroupLine,       label: 'Users'     },
    { href: '/admin/videos',    icon: RiVideoLine,       label: 'Videos'    },
    { href: '/admin/orders',    icon: RiShoppingBagLine, label: 'Orders'    },
    { href: '/admin/payouts',   icon: RiBankCardLine,    label: 'Payouts'   },
    { href: '/admin/reports',   icon: RiAlertLine,       label: 'Reports'   },
    { href: '/admin/disputes',  icon: RiAlertLine,       label: 'Disputes'  },
    { href: '/admin/events',    icon: RiAlertLine,       label: 'Events'    },
    { href: '/admin/analytics', icon: RiBarChartLine,    label: 'Analytics' },
  ]
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: '"DM Sans", sans-serif', display: 'flex' }}>
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '8px 14px 20px' }}>
          <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 18 }}>Flockr</p>
          <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Admin Panel</p>
        </div>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, textDecoration: 'none', background: active === l.href ? 'rgba(255,107,53,0.12)' : 'transparent', color: active === l.href ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontWeight: active === l.href ? 600 : 400, fontSize: 14 }}>
            <l.icon size={18} />{l.label}
          </Link>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '32px' }}>{children}</div>
    </div>
  )
}

const STATUS_CFG = {
  draft:     { label: 'Draft',     color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  scheduled: { label: 'Scheduled', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  active:    { label: 'Live',      color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  ended:     { label: 'Ended',     color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
}



function EventForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? {
    title: '', description: '', theme_color: '#FF6B35', banner_image: '',
    starts_at: '', ends_at: '', discount_tiers: '5,10,15', max_sellers: '',
    scavenger_hunt_target: '', scavenger_hunt_coupon_amount: '', event_fee_percent: '',
  })
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false) 

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleBannerUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  setUploadingBanner(true)
  try {
    const fd = new FormData()
    fd.append('image', file)
    const { data } = await axios.post('/api/admin/events/upload-banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    set('banner_image', data.url)
  } catch {
    showToast('Failed to upload banner.', 'error')
  } finally {
    setUploadingBanner(false)
  }
}

  const submit = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        discount_tiers: String(form.discount_tiers).split(',').map(s => parseInt(s.trim())).filter(Boolean),
        scavenger_hunt_target: form.scavenger_hunt_target || null,
        scavenger_hunt_coupon_amount: form.scavenger_hunt_coupon_amount || null,
        event_fee_percent: form.event_fee_percent || null,
        max_sellers: form.max_sellers || null,
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  const inp = { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
  const lbl = { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px', display: 'block' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div><label style={lbl}>Title</label><input style={inp} value={form.title} onChange={e => set('title', e.target.value)} /></div>
      <div><label style={lbl}>Description</label><textarea style={{ ...inp, resize: 'none' }} rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label style={lbl}>Theme color</label><input type="color" style={{ ...inp, height: 40, padding: 4 }} value={form.theme_color} onChange={e => set('theme_color', e.target.value)} /></div>
<div>
  <label style={lbl}>Banner image</label>
  {form.banner_image ? (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <img src={form.banner_image} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10 }} />
      <button onClick={() => set('banner_image', '')} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
    </div>
  ) : (
    <label style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, cursor: uploadingBanner ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.4)' }}>
      {uploadingBanner ? 'Uploading…' : 'Click to upload banner image'}
      <input type="file" accept="image/*" disabled={uploadingBanner} onChange={handleBannerUpload} style={{ display: 'none' }} />
    </label>
  )}
</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label style={lbl}>Starts at</label><input type="datetime-local" style={inp} value={form.starts_at?.slice(0,16) ?? ''} onChange={e => set('starts_at', e.target.value)} /></div>
        <div><label style={lbl}>Ends at</label><input type="datetime-local" style={inp} value={form.ends_at?.slice(0,16) ?? ''} onChange={e => set('ends_at', e.target.value)} /></div>
      </div>
        <div>
        <label style={lbl}>Discount tiers (comma-separated %)</label>
        <input style={inp} value={form.discount_tiers} onChange={e => set('discount_tiers', e.target.value)} placeholder="5,10,15" />
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Sellers pick ONE of these percentages when they join — this is how much their prices drop for the whole event.</p>
      </div>
      <div>
        <label style={lbl}>Max sellers (min 5, leave blank for unlimited)</label>
        <input type="number" style={inp} value={form.max_sellers ?? ''} onChange={e => set('max_sellers', e.target.value)} placeholder="e.g. 10" />
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Caps how many sellers can join, to keep the event exclusive. Leave blank for no limit.</p>
        </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>Scavenger hunt: sellers</label>
          <input type="number" style={inp} value={form.scavenger_hunt_target ?? ''} onChange={e => set('scavenger_hunt_target', e.target.value)} placeholder="e.g. 3" />
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Buyers who purchase from this many DIFFERENT participating sellers automatically earn the reward coupon below.</p>
          </div>
        <div><label style={lbl}>Hunt reward (₦)</label><input type="number" style={inp} value={form.scavenger_hunt_coupon_amount ?? ''} onChange={e => set('scavenger_hunt_coupon_amount', e.target.value)} placeholder="e.g. 500" /></div>
        <div>
          <label style={lbl}>Event fee % (optional)</label>
        <input type="number" style={inp} value={form.event_fee_percent ?? ''} onChange={e => set('event_fee_percent', e.target.value)} placeholder="e.g. 2" />
        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Lowers Flockr's normal 5% commission to this number for participating sellers, as an incentive to join. Leave blank to keep it at 5%.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={submit} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#FF6B35', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save Event'}
        </button>
        <button onClick={onCancel} style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminEvents() {
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => axios.get('/api/admin/events').then(r => setEvents(r.data))
  useEffect(() => { load() }, [])

  const handleSave = async (payload) => {
    if (editing) await axios.put(`/api/admin/events/${editing.id}`, payload)
    else await axios.post('/api/admin/events', payload)
    setShowForm(false)
    setEditing(null)
    load()
  }

  const publish = async (event) => {
    await axios.post(`/api/admin/events/${event.id}/publish`)
    load()
  }

 const { showToast, ToastComponent } = useToast()
const [confirmEnd, setConfirmEnd] = useState(null) 

const endNow = (event) => setConfirmEnd(event)

const handleConfirmEnd = async () => {
  try {
    await axios.post(`/api/admin/events/${confirmEnd.id}/end`)
    showToast(`"${confirmEnd.title}" has been ended.`, 'success')
    load()
  } catch {
    showToast('Failed to end event.', 'error')
  }
}

  return (
    <AdminLayout active="/admin/events">
      <Head title="Admin · Events" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Events</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{events.length} total</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, background: '#FF6B35', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <RiAddLine size={16} /> New Event
        </button>
      </div>

      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, zIndex: 101, background: '#111', borderLeft: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff' }}><RiCloseLine size={16} /></button>
            </div>
            <EventForm initial={editing} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>
        </>
      )}

      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
        {events.map((e, i) => {
          const cfg = STATUS_CFG[e.status] ?? STATUS_CFG.draft
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < events.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>{e.title}</p>
                <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {new Date(e.starts_at).toLocaleDateString()} → {new Date(e.ends_at).toLocaleDateString()} · {e.participants_count} sellers
                </p>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              {e.status === 'draft' && (
                <button onClick={() => publish(e)} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Publish</button>
              )}
              {['scheduled', 'active'].includes(e.status) && (
                <button onClick={() => endNow(e)} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>End Now</button>
              )}
              <button onClick={() => { setEditing(e); setShowForm(true) }} style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Edit</button>
              <Link href={`/events/${e.id}`} target="_blank" style={{ color: 'rgba(255,255,255,0.3)', display: 'flex' }}><RiArrowRightLine size={16} /></Link>
            </div>
          )
        })}
        {events.length === 0 && <p style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.3)' }}>No events yet.</p>}
      </div>
      {ToastComponent}
{confirmEnd && (
  <ConfirmModal
    title="End this event?"
    message={`"${confirmEnd.title}" will be marked as ended immediately, and all seller discounts will revert.`}
    confirmLabel="End Event"
    danger
    onConfirm={handleConfirmEnd}
    onClose={() => setConfirmEnd(null)}
  />
)}
    </AdminLayout>
  )
}