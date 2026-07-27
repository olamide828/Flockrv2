// ─── EmailVerification.jsx ─────────────────────────────────────────────────
import { Head, Link, router, usePage } from '@inertiajs/react'
import { useState } from 'react'

export function VerifyEmail() {
  const { flash } = usePage().props
  const [sending, setSending] = useState(false)

  const successMessage = flash?.status === 'verification-link-sent'
    ? "A new verification link has been sent!"
    : null

  const resend = () => {
    setSending(true)
    router.post('/email/verification-notification', {}, {
      onFinish: () => setSending(false),
    })
  }

  return (
    <>
      <Head title="Verify Email" />
      <AuthShell title="Check your inbox" subtitle="Verify your email to unlock all of Flockr">
        {successMessage && (
          <div className="bg-flockr-green/10 border border-flockr-green/30 rounded-flockr px-4 py-3 mb-4">
            <p className="text-flockr-green text-sm">{successMessage}</p>
          </div>
        )}

        <div className="bg-flockr-card border border-white/[0.06] rounded-2xl p-6 mb-5 text-center">
          <p className="text-white/70 text-sm leading-relaxed">
            We've sent a verification link to your email address. Click the link to activate your account.
          </p>
        </div>

        <button onClick={resend} disabled={sending} className="btn-primary w-full py-3.5">
          {sending ? 'Sending...' : 'Resend Verification Email'}
        </button>

        <p className="text-center text-flockr-muted text-sm mt-6">
          <Link href="/logout" method="post" as="button" className="text-flockr-orange hover:underline font-medium">
            Log out
          </Link>
        </p>
      </AuthShell>
    </>
  )
}

// ── Local shell — same as PasswordPages.jsx ─────────────────────────────────
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