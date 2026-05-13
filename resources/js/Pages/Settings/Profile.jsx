import { useState, useRef } from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'

export default function ProfileSettings({ banks = [] }) {
  const { auth } = usePage().props
  const [tab,         setTab]         = useState('profile')
  const [avatarPrev,  setAvatarPrev]  = useState(auth?.user?.avatar_url)
  const fileRef = useRef(null)

  const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
    name:     auth?.user?.name     ?? '',
    username: auth?.user?.username ?? '',
    bio:      auth?.user?.bio      ?? '',
    location: auth?.user?.location ?? '',
    phone:    auth?.user?.phone    ?? '',
    avatar:   null,
  })

  const bankForm = useForm({
    bank_code:      '',
    account_number: '',
  })

  const pwForm = useForm({
    current_password:      '',
    password:              '',
    password_confirmation: '',
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setData('avatar', file)
    setAvatarPrev(URL.createObjectURL(file))
  }

  const submitProfile = (e) => {
    e.preventDefault()
    post('/settings/profile', { forceFormData: true })
  }

  const submitBank = (e) => {
    e.preventDefault()
    bankForm.post('/settings/bank')
  }

  const submitPassword = (e) => {
    e.preventDefault()
    pwForm.post('/settings/password')
  }

  const TABS = [
    { key: 'profile',  label: '👤 Profile' },
    { key: 'security', label: '🔒 Security' },
    ...(auth?.user?.role === 'seller' ? [{ key: 'payouts', label: '💳 Payouts' }] : []),
    { key: 'notifications', label: '🔔 Notifications' },
  ]

  return (
    <>
      <Head title="Settings" />
      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black">

        <div className="sticky top-0 z-20 bg-flockr-black/90 backdrop-blur-md border-b border-white/[0.06] px-6 py-4">
          <h1 className="font-display font-bold text-white text-xl">Settings</h1>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-8">
          {/* Tab nav */}
          <div className="flex gap-1 p-1 bg-flockr-card rounded-xl border border-white/[0.06] mb-8 overflow-x-auto scroll-hidden">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  tab === t.key ? 'bg-flockr-orange text-white' : 'text-flockr-muted hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Profile tab ──────────────────────────────────────────── */}
          {tab === 'profile' && (
            <form onSubmit={submitProfile} className="space-y-6">
              {recentlySuccessful && (
                <div className="flex items-center gap-2 bg-flockr-green/10 border border-flockr-green/30 rounded-flockr px-4 py-3">
                  <svg className="w-4 h-4 text-flockr-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <p className="text-flockr-green text-sm font-medium">Profile updated successfully!</p>
                </div>
              )}

              {/* Avatar upload */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <img
                    src={avatarPrev}
                    alt="Avatar"
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-flockr-orange flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{auth?.user?.name}</p>
                  <p className="text-flockr-muted text-xs">@{auth?.user?.username}</p>
                  <p className="text-flockr-subtle text-xs mt-1">JPG, PNG, WebP · Max 5MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name" error={errors.name}>
                  <input value={data.name} onChange={e => setData('name', e.target.value)} className="input-flockr" />
                </Field>
                <Field label="Username" error={errors.username}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-flockr-muted text-sm">@</span>
                    <input value={data.username} onChange={e => setData('username', e.target.value.toLowerCase())} className="input-flockr pl-7" />
                  </div>
                </Field>
              </div>

              <Field label="Bio" error={errors.bio}>
                <textarea
                  value={data.bio}
                  onChange={e => setData('bio', e.target.value)}
                  rows={3}
                  placeholder="Tell buyers about yourself or your store..."
                  className="input-flockr resize-none"
                  maxLength={200}
                />
                <p className="text-flockr-subtle text-xs text-right mt-1">{data.bio.length}/200</p>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Location" error={errors.location}>
                  <input value={data.location} onChange={e => setData('location', e.target.value)} placeholder="Lagos, Nigeria" className="input-flockr" />
                </Field>
                <Field label="Phone" error={errors.phone}>
                  <input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="08012345678" className="input-flockr" />
                </Field>
              </div>

              <button type="submit" disabled={processing} className="btn-primary w-full py-3.5">
                {processing ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* ── Security tab ─────────────────────────────────────────── */}
          {tab === 'security' && (
            <form onSubmit={submitPassword} className="space-y-5">
              <div className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] p-5 space-y-5">
                <h2 className="font-display font-bold text-white text-base">Change Password</h2>
                <Field label="Current Password" error={pwForm.errors.current_password}>
                  <input type="password" value={pwForm.data.current_password} onChange={e => pwForm.setData('current_password', e.target.value)} className="input-flockr" />
                </Field>
                <Field label="New Password" error={pwForm.errors.password}>
                  <input type="password" value={pwForm.data.password} onChange={e => pwForm.setData('password', e.target.value)} className="input-flockr" />
                </Field>
                <Field label="Confirm New Password" error={pwForm.errors.password_confirmation}>
                  <input type="password" value={pwForm.data.password_confirmation} onChange={e => pwForm.setData('password_confirmation', e.target.value)} className="input-flockr" />
                </Field>
                <button type="submit" disabled={pwForm.processing} className="btn-primary py-3">
                  {pwForm.processing ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* ── Payouts tab (sellers) ─────────────────────────────────── */}
          {tab === 'payouts' && (
            <div className="space-y-6">
              {auth?.user?.paystack_subaccount_code ? (
                <div className="flex items-center gap-3 bg-flockr-green/10 border border-flockr-green/30 rounded-flockr p-4">
                  <svg className="w-5 h-5 text-flockr-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <div>
                    <p className="text-flockr-green font-medium text-sm">Bank account connected</p>
                    <p className="text-flockr-green/70 text-xs">Payouts will be sent automatically after order delivery.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-flockr p-4">
                  <span className="text-xl">⚠️</span>
                  <p className="text-yellow-400 text-sm">Connect your bank account to receive payouts from your sales.</p>
                </div>
              )}

              <form onSubmit={submitBank} className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] p-5 space-y-5">
                <h2 className="font-display font-bold text-white text-base">Bank Account</h2>
                <Field label="Bank" error={bankForm.errors.bank_code}>
                  <select
                    value={bankForm.data.bank_code}
                    onChange={e => bankForm.setData('bank_code', e.target.value)}
                    className="input-flockr"
                    required
                  >
                    <option value="">Select your bank</option>
                    {banks.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Account Number" error={bankForm.errors.account_number}>
                  <input
                    type="text"
                    value={bankForm.data.account_number}
                    onChange={e => bankForm.setData('account_number', e.target.value.replace(/\D/g, ''))}
                    placeholder="0123456789"
                    maxLength={10}
                    className="input-flockr"
                    required
                  />
                </Field>
                <button type="submit" disabled={bankForm.processing} className="btn-primary w-full py-3">
                  {bankForm.processing ? 'Connecting...' : 'Connect Bank Account'}
                </button>
              </form>
            </div>
          )}

          {/* ── Notifications tab ─────────────────────────────────────── */}
          {tab === 'notifications' && (
            <div className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] divide-y divide-white/[0.06]">
              {[
                { key: 'new_order',      label: 'New Orders',           sub: 'When someone buys your product' },
                { key: 'new_follower',   label: 'New Followers',        sub: 'When someone follows you' },
                { key: 'new_comment',    label: 'Comments',             sub: 'When someone comments on your video' },
                { key: 'new_like',       label: 'Likes',                sub: 'When someone likes your video' },
                { key: 'order_update',   label: 'Order Updates',        sub: 'Status changes on your purchases' },
                { key: 'promotions',     label: 'Promotions',           sub: 'Special offers and deals' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-flockr-muted text-xs mt-0.5">{item.sub}</p>
                  </div>
                  <ToggleSwitch
                    defaultOn={auth?.user?.notification_preferences?.[item.key] !== false}
                    onChange={val => axios.patch('/settings/notifications', { [item.key]: val })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

ProfileSettings.layout = page => <AppLayout>{page}</AppLayout>

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-flockr-red text-xs">{error}</p>}
    </div>
  )
}

function ToggleSwitch({ defaultOn, onChange }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      type="button"
      onClick={() => { const next = !on; setOn(next); onChange(next) }}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-flockr-orange' : 'bg-flockr-subtle'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}
