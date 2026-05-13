import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'

export default function OrderSuccess({ order }) {
  return (
    <>
      <Head title="Order Confirmed!" />
      <div className="h-screen overflow-y-auto scroll-hidden bg-flockr-black flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6 animate-slide-up">

          {/* Success icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-flockr-green/10 border-2 border-flockr-green/30 flex items-center justify-center">
              <svg className="w-12 h-12 text-flockr-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-full bg-flockr-green/10 animate-ping" />
          </div>

          <div>
            <h1 className="font-display font-bold text-white text-3xl">Order Placed! 🎉</h1>
            <p className="text-flockr-muted text-sm mt-2 leading-relaxed">
              Your payment was successful. The seller has been notified and will confirm your order shortly.
            </p>
          </div>

          {/* Order summary card */}
          <div className="bg-flockr-card rounded-flockr-lg border border-white/[0.06] p-5 text-left space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-flockr-muted text-sm">Order Reference</span>
              <span className="text-white font-mono text-sm font-bold">{order?.reference}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-flockr-muted text-sm">Amount Paid</span>
              <span className="text-flockr-green font-bold naira">₦{Number(order?.total ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-flockr-muted text-sm">Status</span>
              <span className="badge badge-green">Paid</span>
            </div>
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-flockr-muted text-xs">
                📧 A confirmation has been sent to your email. The seller will contact you about delivery.
              </p>
            </div>
          </div>

          {/* Items */}
          {order?.items?.length > 0 && (
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-flockr-card rounded-flockr border border-white/[0.06] p-3">
                  <div className="w-12 h-12 rounded-lg bg-flockr-surface shrink-0 overflow-hidden">
                    {item.product?.primary_image
                      ? <img src={item.product.primary_image} alt={item.product_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-flockr-subtle text-lg">📦</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-1">{item.product_name}</p>
                    <p className="text-flockr-muted text-xs">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-white font-semibold text-sm naira">₦{Number(item.total).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/orders" className="btn-primary py-3">View My Orders</Link>
            <Link href="/" className="btn-ghost py-3">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </>
  )
}

OrderSuccess.layout = page => <AppLayout>{page}</AppLayout>
