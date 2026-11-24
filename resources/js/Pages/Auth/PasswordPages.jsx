import { Head, Link, useForm, usePage } from '@inertiajs/react'
import AuthShell, { BackButton, Field } from '@/Components/Auth/AuthShell'

export function ForgotPassword({ status }) {
  const { flash } = usePage().props
  const { data, setData, post, processing, errors } = useForm({ email: '' })
  const successMessage = status || flash?.success || flash?.status

  return (
    <>
      <Head title="Forgot Password" />
      <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send a reset link" back={<BackButton href="/login" label="Log in" />}
        footer={<>Remember it? <Link href="/login" className="text-flockr-orange hover:underline font-medium">Back to login</Link></>}>
        {successMessage && (
          <div className="bg-flockr-green/10 border border-flockr-green/30 rounded-flockr px-4 py-3 mb-4">
            <p className="text-flockr-green text-sm">{successMessage}</p>
          </div>
        )}
        <form onSubmit={e => { e.preventDefault(); post('/forgot-password') }} className="space-y-4">
          <Field label="Email" error={errors.email}>
            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="you@example.com" className="input-flockr" required autoFocus />
          </Field>
          <button type="submit" disabled={processing} className="btn-primary w-full py-3.5">{processing ? 'Sending...' : 'Send Reset Link'}</button>
        </form>
      </AuthShell>
    </>
  )
}

export function ResetPassword({ token, email }) {
  const { data, setData, post, processing, errors } = useForm({ token, email: email ?? '', password: '', password_confirmation: '' })

  return (
    <>
      <Head title="Reset Password" />
      <AuthShell title="Set new password" subtitle="Choose a strong password for your account" back={<BackButton href="/login" label="Log in" />}>
        <form onSubmit={e => { e.preventDefault(); post('/reset-password') }} className="space-y-4">
          <Field label="Email" error={errors.email}>
            <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="input-flockr" required />
          </Field>
          <Field label="New Password" error={errors.password}>
            <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="input-flockr" required />
          </Field>
          <Field label="Confirm Password">
            <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="input-flockr" required />
          </Field>
          <button type="submit" disabled={processing} className="btn-primary w-full py-3.5">{processing ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </AuthShell>
    </>
  )
}
