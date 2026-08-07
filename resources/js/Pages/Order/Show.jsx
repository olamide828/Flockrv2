import { useState } from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import {
  RiArrowLeftLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiRefreshLine,
  RiArchiveDrawerLine,
  RiTruckLine,
  RiGiftLine,
  RiCloseCircleLine,
  RiArrowGoBackLine,
  RiMapPinLine,
  RiStoreLine,
  RiVerifiedBadgeLine,
  RiArrowRightLine,
  RiShieldCheckLine,
  RiPhoneLine,
  RiUserLine,
  RiShoppingBagLine,
  RiFileCopyLine,
  RiCheckLine,
  RiSecurePaymentLine,
  RiLoader4Line,
  RiBankCardLine,
  RiAlertLine,
} from 'react-icons/ri'
import DisputeModal from './DisputeModal'
import VerifiedBadge from '@/Components/VerifiedBadge';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    bg: 'rgba(234,179,8,0.12)',    text: '#EAB308', Icon: RiTimeLine           },
  paid:       { label: 'Paid',       bg: 'rgba(16,185,129,0.12)',   text: '#10B981', Icon: RiCheckboxCircleLine },
  confirmed:  { label: 'Confirmed',  bg: 'rgba(59,130,246,0.12)',   text: '#3B82F6', Icon: RiRefreshLine        },
  processing: { label: 'Processing', bg: 'rgba(59,130,246,0.12)',   text: '#3B82F6', Icon: RiArchiveDrawerLine  },
  shipped:    { label: 'Shipped',    bg: 'rgba(139,92,246,0.12)',   text: '#8B5CF6', Icon: RiTruckLine          },
  delivered:  { label: 'Delivered',  bg: 'rgba(16,185,129,0.12)',   text: '#10B981', Icon: RiGiftLine           },
  cancelled:  { label: 'Cancelled',  bg: 'rgba(239,68,68,0.12)',    text: '#EF4444', Icon: RiCloseCircleLine    },
  refunded:   { label: 'Refunded',   bg: 'rgba(156,163,175,0.12)', text: '#9CA3AF', Icon: RiArrowGoBackLine    },
  disputed:   { label: 'Disputed',   color: 'rgba(156,163,175,0.12)',text: '#F59E0B', Icon: RiAlertLine    },
}

const TRACKING_STEPS = [
  { key: 'pending',    label: 'Order Placed',  Icon: RiShoppingBagLine   },
  { key: 'paid',       label: 'Payment',       Icon: RiCheckboxCircleLine },
  { key: 'confirmed',  label: 'Confirmed',     Icon: RiRefreshLine        },
  { key: 'processing', label: 'Processing',    Icon: RiArchiveDrawerLine  },
  { key: 'shipped',    label: 'Shipped',       Icon: RiTruckLine          },
  { key: 'delivered',  label: 'Delivered',     Icon: RiGiftLine           },
]

function fmt(d) {
  return new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function OrderShow({ order }) {
  const { auth } = usePage().props
  const [cancelling,      setCancelling]      = useState(false)
  const [copied,          setCopied]          = useState(false)
  const [resumingPayment, setResumingPayment] = useState(false)
  const [toast,           setToast]           = useState(null)
  const [showDispute,     setShowDispute]     = useState(false)

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const cfg        = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const StatusIcon = cfg.Icon
  const isBuyer    = auth?.user?.id === order.buyer_id
  const isSeller   = auth?.user?.id === order.seller_id

  const canCancel  = isBuyer && ['pending', 'paid', 'confirmed'].includes(order.status)
  const canResume  = isBuyer && order.status === 'pending'

  // Show "Report a Problem" for buyers on active paid orders
  const canDispute = isBuyer && ['paid', 'confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)

  const currentStepIdx = TRACKING_STEPS.findIndex(s => s.key === order.status)
  const showTracking   = !['cancelled', 'refunded'].includes(order.status)

  const handleResumePayment = async () => {
    setResumingPayment(true)
    try {
      const { data } = await axios.post('/api/orders/resume-payment', { order_id: order.id })
      window.location.href = data.authorization_url
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Could not resume payment. Please try again.')
    } finally {
      setResumingPayment(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setCancelling(true)
    try {
      await axios.post(`/api/orders/${order.id}/cancel`, { reason: 'Cancelled by buyer' })
      router.reload()
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to cancel order.')
    } finally { setCancelling(false) }
  }

  const handleCopyRef = async () => {
    await navigator.clipboard.writeText(order.reference).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Head title={`Order ${order.reference}`} />

      <div style={{ height: '100%', overflowY: 'auto', background: '#0A0A0A', color: '#fff', fontFamily: '"DM Sans", sans-serif' }}>

        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => window.history.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <RiArrowLeftLine size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.reference}</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{fmt(order.created_at)}</p>
          </div>
          <button onClick={handleCopyRef} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12, flexShrink: 0 }}>
            {copied
              ? <><RiCheckLine size={13} color="#10B981" /><span style={{ color: '#10B981' }}>Copied</span></>
              : <><RiFileCopyLine size={13} />Copy ref</>
            }
          </button>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Complete payment banner */}
          {canResume && (
            <div style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.05))', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 24, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RiBankCardLine size={24} color="#FF6B35" />
                </div>
                <div>
                  <p style={{ margin: 0, color: '#FF6B35', fontWeight: 700, fontSize: 15 }}>Payment Incomplete</p>
                  <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.4 }}>
                    Your order was created but payment wasn't completed. Complete payment to confirm your order.
                  </p>
                </div>
              </div>
              <button
                onClick={handleResumePayment}
                disabled={resumingPayment}
                style={{ width: '100%', padding: '15px', borderRadius: 16, background: resumingPayment ? 'rgba(255,107,53,0.5)' : '#FF6B35', border: 'none', cursor: resumingPayment ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'opacity 0.2s' }}
              >
                {resumingPayment
                  ? <><RiLoader4Line size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Redirecting to Paystack...</>
                  : <><RiSecurePaymentLine size={18} /> Complete Payment · ₦{Number(order.total).toLocaleString()}</>
                }
              </button>
              <p style={{ margin: 0, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                You will be redirected to Paystack's secure payment page
              </p>
            </div>
          )}

          {/* Status hero */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <StatusIcon size={26} color={cfg.text} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 3px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Order Status</p>
              <p style={{ margin: 0, color: cfg.text, fontWeight: 800, fontSize: 20 }}>{cfg.label}</p>
              {order.paid_at && <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Paid {fmt(order.paid_at)}</p>}
              {order.status === 'pending' && !order.paid_at && (
                <p style={{ margin: '3px 0 0', color: 'rgba(234,179,8,0.7)', fontSize: 11 }}>Awaiting payment</p>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 22 }}>₦{Number(order.total).toLocaleString()}</p>
              <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Tracking timeline */}
          {showTracking && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '20px' }}>
              <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order Timeline</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {TRACKING_STEPS.map((step, i) => {
                  const done    = i <= currentStepIdx
                  const current = i === currentStepIdx
                  const Icon    = step.Icon
                  const isLast  = i === TRACKING_STEPS.length - 1
                  return (
                    <div key={step.key} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? (current ? '#FF6B35' : '#10B981') : 'rgba(255,255,255,0.06)', border: `2px solid ${done ? (current ? '#FF6B35' : '#10B981') : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                          <Icon size={15} color={done ? '#fff' : 'rgba(255,255,255,0.25)'} />
                        </div>
                        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: done && i < currentStepIdx ? '#10B981' : 'rgba(255,255,255,0.08)', margin: '4px 0' }} />}
                      </div>
                      <div style={{ paddingBottom: isLast ? 0 : 20, paddingTop: 5 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: current ? 700 : 500, color: done ? '#fff' : 'rgba(255,255,255,0.3)' }}>{step.label}</p>
                        {current && order.status !== 'pending' && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Current status</p>}
                        {current && order.status === 'pending' && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(234,179,8,0.6)' }}>Awaiting payment</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cancelled / Refunded notice */}
          {['cancelled', 'refunded'].includes(order.status) && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '14px 18px' }}>
              <p style={{ margin: '0 0 4px', color: '#EF4444', fontWeight: 700, fontSize: 14 }}>
                {order.status === 'cancelled' ? 'Order Cancelled' : 'Order Refunded'}
              </p>
              {order.cancellation_reason && (
                <p style={{ margin: 0, color: 'rgba(239,68,68,0.7)', fontSize: 13 }}>{order.cancellation_reason}</p>
              )}
            </div>
          )}

          {/* Track Order button — shown for active deliveries */}
{!['pending', 'cancelled', 'refunded'].includes(order.status) && (
    <Link
        href={`/orders/${order.id}/tracking`}
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '13px',
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 14,
            color: '#8B5CF6',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: 10,
        }}
    >
        <RiTruckLine size={16} />
        Track Delivery
    </Link>
)}

          {/* Tracking number */}
          {order.tracking_number && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <RiTruckLine size={20} color="#8B5CF6" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Tracking Number</p>
                <p style={{ margin: '2px 0 0', color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>{order.tracking_number}</p>
                {order.courier && <p style={{ margin: '1px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>via {order.courier}</p>}
              </div>
            </div>
          )}

          {/* Order items */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, overflow: 'hidden' }}>
            <p style={{ margin: 0, padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Items ({order.items?.length})
            </p>
            {order.items?.map((item, i) => (
              <div key={item.id ?? i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 18px', borderBottom: i < order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  {item.product?.primary_image
                    ? <img src={item.product.primary_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiShoppingBagLine size={20} color="rgba(255,255,255,0.2)" /></div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                  <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Qty {item.quantity} · ₦{Number(item.unit_price).toLocaleString()} each</p>
                </div>
                <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>₦{Number(item.total).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
            <p style={{ margin: 0, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Price Breakdown</p>
            {[
              { label: 'Subtotal',     value: order.subtotal },
              { label: 'Shipping',     value: order.shipping_fee },
              { label: 'Platform fee', value: order.platform_fee },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{label}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>₦{Number(value ?? 0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Total</span>
              <span style={{ color: '#FF6B35', fontWeight: 800, fontSize: 18 }}>₦{Number(order.total).toLocaleString()}</span>
            </div>
          </div>

          {/* Seller card */}
          {order.seller && (
            <Link href={`/@${order.seller.username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, textDecoration: 'none' }}>
              <img
                src={order.seller.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(order.seller.name ?? 'S')}&background=1a1a1a`}
                alt={order.seller.name}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{order.seller.name}</span>
                  <VerifiedBadge type={order.seller.verification_type} size={13} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{order.seller.username}</span>
              </div>
              <RiArrowRightLine size={16} color="rgba(255,255,255,0.2)" />
            </Link>
          )}

          {/* Shipping address */}
          {order.shipping_address && (
            <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <RiMapPinLine size={15} color="#FF6B35" />
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Shipping Address</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {order.shipping_address.name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RiUserLine size={13} color="rgba(255,255,255,0.3)" />
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{order.shipping_address.name}</span>
                  </div>
                )}
                {order.shipping_address.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RiPhoneLine size={13} color="rgba(255,255,255,0.3)" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{order.shipping_address.phone}</span>
                  </div>
                )}
                {(order.shipping_address.address || order.shipping_address.city) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <RiMapPinLine size={13} color="rgba(255,255,255,0.3)" style={{ marginTop: 2 }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.5 }}>
                      {[order.shipping_address.address, order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trust badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 16 }}>
            <RiShieldCheckLine size={18} color="#10B981" />
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              Protected by Flockr Buyer Protection. Secure payment via Paystack.
            </p>
          </div>

          {/* Seller view CTA */}
          {isSeller && (
            <Link href="/seller/orders" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              <RiStoreLine size={16} /> View all your orders
            </Link>
          )}

          {/* Cancel button */}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{ width: '100%', padding: '14px', borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <RiCloseCircleLine size={17} />
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}

          {/* Report a Problem — shown for buyers on active paid orders */}
          {canDispute && (
            <button
              onClick={() => setShowDispute(true)}
              style={{
                width: '100%', padding: '13px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 600, fontSize: 14,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <RiAlertLine size={16} />
              Report a Problem
            </button>
          )}

        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, pointerEvents: 'none',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
          backdropFilter: 'blur(12px)',
          color: '#fff', padding: '12px 20px', borderRadius: 999,
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {showDispute && <DisputeModal order={order} onClose={() => setShowDispute(false)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform: translateX(-50%) translateY(10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </>
  )
}

OrderShow.layout = page => <AppLayout>{page}</AppLayout>