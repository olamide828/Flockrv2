// ─── ForgotPassword.jsx ───────────────────────────────────────────────────────
import { Head, Link, useForm, usePage } from '@inertiajs/react'

export function ForgotPassword({ status }) {
    const { flash } = usePage().props  
  const { data, setData, post, processing, errors } = useForm({ email: '' })

  const successMessage = status || flash?.success || flash?.status

  return (
    <>
      <Head title="Forgot Password" />
      <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send a reset link">
        {successMessage && (  // ← use successMessage instead of status
          <div className="bg-flockr-green/10 border border-flockr-green/30 rounded-flockr px-4 py-3 mb-4">
            <p className="text-flockr-green text-sm">{successMessage}</p>
          </div>
            )}
        <form onSubmit={e => { e.preventDefault(); post('/forgot-password') }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={data.email}
              onChange={e => setData('email', e.target.value)}
              placeholder="you@example.com"
              className="input-flockr"
              required
            />
            {errors.email && <p className="text-flockr-red text-xs">{errors.email}</p>}
          </div>
          <button type="submit" disabled={processing} className="btn-primary w-full py-3.5">
            {processing ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="text-center text-flockr-muted text-sm mt-6">
          Remember it? <Link href="/login" className="text-flockr-orange hover:underline font-medium">Back to login</Link>
        </p>
      </AuthShell>
    </>
  )
}

// ─── ResetPassword.jsx ────────────────────────────────────────────────────────
export function ResetPassword({ token, email }) {
  const { data, setData, post, processing, errors } = useForm({
    token,
    email:                 email ?? '',
    password:              '',
    password_confirmation: '',
  })

  return (
    <>
      <Head title="Reset Password" />
      <AuthShell title="Set new password" subtitle="Choose a strong password for your account">
        <form onSubmit={e => { e.preventDefault(); post('/reset-password') }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">Email</label>
            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="input-flockr" required />
            {errors.email && <p className="text-flockr-red text-xs">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">New Password</label>
            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="input-flockr" required />
            {errors.password && <p className="text-flockr-red text-xs">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-flockr-muted uppercase tracking-wider">Confirm Password</label>
            <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="input-flockr" required />
          </div>
          <button type="submit" disabled={processing} className="btn-primary w-full py-3.5">
            {processing ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </AuthShell>
    </>
  )
}

// ─── Shared shell (same as Login/Register) ────────────────────────────────────
function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-flockr-black flex">
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col items-center justify-center bg-flockr-surface border-r border-white/[0.06] p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-flockr-orange/5 via-transparent to-transparent pointer-events-none" />
        <a href="/" className="font-display font-800 text-5xl text-white mb-3">
          flockr<span className="text-flockr-orange">.</span>
        </a>
        <p className="text-flockr-muted text-center text-sm leading-relaxed max-w-xs">
          Nigeria's video-first social commerce marketplace.
        </p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">
          <a href="/" className="lg:hidden block font-display font-800 text-3xl text-white mb-8 text-center">
            flockr<span className="text-flockr-orange">.</span>
          </a>
          <div className="mb-6">
            <h1 className="font-display font-bold text-2xl text-white">{title}</h1>
            <p className="text-flockr-muted text-sm mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}