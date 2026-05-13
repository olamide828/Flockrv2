import { Head, Link } from '@inertiajs/react'

export default function Error({ status, message }) {
  const config = {
    404: { emoji: '🔍', title: 'Page not found',       sub: 'The page you\'re looking for doesn\'t exist or has been moved.' },
    403: { emoji: '🔒', title: 'Access denied',        sub: 'You don\'t have permission to view this page.' },
    500: { emoji: '⚠️', title: 'Server error',         sub: 'Something went wrong on our end. We\'re already looking into it.' },
    503: { emoji: '🔧', title: 'Under maintenance',    sub: 'Flockr is undergoing maintenance. We\'ll be back shortly.' },
  }

  const { emoji, title, sub } = config[status] ?? config[500]

  return (
    <>
      <Head title={`${status} — ${title}`} />
      <div className="min-h-screen bg-flockr-black flex items-center justify-center px-6">
        <div className="text-center space-y-5 max-w-sm animate-slide-up">
          <div className="text-7xl">{emoji}</div>
          <div>
            <p className="text-flockr-muted text-sm font-mono mb-2">Error {status}</p>
            <h1 className="font-display font-bold text-white text-3xl">{title}</h1>
            <p className="text-flockr-muted text-sm leading-relaxed mt-2">{sub}</p>
          </div>
          <div className="flex flex-col gap-3 pt-3">
            <Link href="/" className="btn-primary py-3">Back to Flockr</Link>
            <button onClick={() => history.back()} className="btn-ghost py-3">Go Back</button>
          </div>
        </div>
      </div>
    </>
  )
}
