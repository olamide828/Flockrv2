import { useState } from "react"
import { Head, router } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import axios from "axios"
import Toast, { useToast } from "@/Components/Toast"
import {
  RiArrowLeftLine,
  RiBankCardLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiCloseCircleLine,
  RiCalendarLine,
  RiArrowUpLine,
  RiWalletLine,
  RiBuilding4Line,
  RiLoader4Line,
  RiInformationLine,
} from "react-icons/ri"

function fmt(n) {
  return Number(n ?? 0).toLocaleString()
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', paid: 'Paid', rejected: 'Rejected', failed: 'Failed' }

function Pagination({ pagination, onNavigate }) {
  if (!pagination?.links || pagination.last_page <= 1) return null
  return (
    <div className="pyr-pg-row">
      {pagination.links.map((link, i) => (
        <button
          key={i}
          type="button"
          disabled={!link.url}
          onClick={() => link.url && onNavigate(link.url)}
          className={`pyr-pg-btn ${link.active ? "pyr-pg-active" : ""}`}
          dangerouslySetInnerHTML={{ __html: link.label }}
        />
      ))}
    </div>
  )
}

export default function SellerPayouts({ payouts: initialPayouts = { data: [] }, balance = 0 }) {
  const [pagination, setPagination] = useState(initialPayouts)
  const payouts = pagination.data ?? []
  const [requesting, setRequesting] = useState(false)
  const [amount,     setAmount]     = useState("")
  const [showForm,   setShowForm]   = useState(false)
  const [error,      setError]      = useState("")
  const { showToast, ToastComponent } = useToast()

  const pendingTotal = payouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const paidTotal    = payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const handleRequest = async (e) => {
    e.preventDefault()
    setError("")
    const amt = Number(amount)
    if (!amt || amt < 1000) { setError("Minimum withdrawal is ₦1,000.") ; return }
    if (amt > Number(balance)) { setError("Amount exceeds your available balance.") ; return }
    setRequesting(true)
    try {
      const { data } = await axios.post("/api/seller/payouts", { amount: amt })
      setPagination(prev => ({ ...prev, data: [data, ...(prev.data ?? [])] }))
      setAmount("")
      setShowForm(false)
      showToast("Payout request submitted.", "success")
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Please verify your email before requesting a payout.")
        router.visit('/verify-email')
        return
      }
      const msg = err.response?.data?.message ?? "Request failed. Please try again."
      setError(msg)
      showToast(msg, "error")
    } finally { setRequesting(false) }
  }

  const goToPage = (url) => {
    router.get(url, {}, {
      preserveState: true,
      preserveScroll: true,
      only: ['payouts'],
      onSuccess: (page) => setPagination(page.props.payouts),
    })
  }

  return (
    <>
      <Head title="Payouts" />

      <div className="pyr-page">
        <header className="pyr-header">
          <div className="pyr-header-inner">
            <button type="button" onClick={() => window.history.back()} className="pyr-back" aria-label="Go back">
              <RiArrowLeftLine size={18} />
            </button>
            <div>
              <h1>Payouts</h1>
              <p>Withdraw your earnings</p>
            </div>
          </div>
        </header>

        <main className="pyr-content">

          {/* BALANCE BAR */}
          <div className="pyr-balance-bar">
            <div>
              <p className="pyr-balance-label">Available Balance</p>
              <h2 className="pyr-balance-amount">₦{fmt(balance)}</h2>
            </div>
            <button onClick={() => setShowForm(s => !s)} className="pyr-withdraw-btn">
              <RiArrowUpLine size={16} /> Withdraw
            </button>
          </div>

          {/* FORM */}
          {showForm && (
            <div className="pyr-form-card">
              <div className="pyr-form-header">
                <RiWalletLine size={16} />
                <h3>Request Withdrawal</h3>
              </div>
              <form onSubmit={handleRequest} className="pyr-form-body">
                <label>
                  Amount (₦)
                  <div className="pyr-input-wrap">
                    <span>₦</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="1000"
                      max={balance}
                    />
                  </div>
                </label>
                {error && (
                  <div className="pyr-form-error">
                    <RiInformationLine size={14} /> {error}
                  </div>
                )}
                <div className="pyr-form-note">
                  <RiBuilding4Line size={13} />
                  Payouts are sent to your registered bank account within 1–3 business days.
                </div>
                <div className="pyr-form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="pyr-cancel-btn">Cancel</button>
                  <button type="submit" disabled={requesting} className="pyr-submit-btn">
                    {requesting ? <><RiLoader4Line size={15} className="pyr-spin" /> Processing...</> : "Request Payout"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STATS */}
          <div className="pyr-stat-strip">
            <div className="pyr-stat"><strong>₦{fmt(pendingTotal)}</strong><span>Pending</span></div>
            <div className="pyr-stat-divider" />
            <div className="pyr-stat"><strong>₦{fmt(paidTotal)}</strong><span>Paid Out</span></div>
            <div className="pyr-stat-divider" />
            <div className="pyr-stat"><strong>{pagination.total ?? payouts.length}</strong><span>Total Requests</span></div>
          </div>

          {/* LIST */}
          <div className="pyr-list-card">
            <div className="pyr-list-header"><h3>Payout History</h3></div>

            {!payouts.length ? (
              <div className="pyr-empty">
                <div className="pyr-empty-icon"><RiBankCardLine size={24} /></div>
                <h4>No payouts yet</h4>
                <p>Your withdrawal history will appear here.</p>
              </div>
            ) : (
              <div>
                {payouts.map((payout) => (
                  <div key={payout.id} className="pyr-row">
                    <div className={`pyr-row-icon ${payout.status === 'paid' || payout.status === 'approved' ? 'pyr-icon-live' : payout.status === 'rejected' || payout.status === 'failed' ? 'pyr-icon-danger' : 'pyr-icon-neutral'}`}>
                      {payout.status === "pending"  && <RiTimeLine size={16} />}
                      {(payout.status === "approved" || payout.status === "paid") && <RiCheckboxCircleLine size={16} />}
                      {(payout.status === "rejected" || payout.status === "failed") && <RiCloseCircleLine size={16} />}
                    </div>

                    <div className="pyr-row-meta">
                      <h4>Payout #{payout.id}</h4>
                      <p><RiCalendarLine size={11} /> {timeAgo(payout.created_at)}{payout.reference ? ` · Ref: ${payout.reference}` : ''}</p>
                    </div>

                    <div className="pyr-row-right">
                      <strong>₦{fmt(payout.amount)}</strong>
                      <span className={`pyr-status-chip ${payout.status === 'paid' || payout.status === 'approved' ? 'pyr-chip-live' : payout.status === 'rejected' || payout.status === 'failed' ? 'pyr-chip-danger' : 'pyr-chip-neutral'}`}>
                        {STATUS_LABEL[payout.status] ?? payout.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination pagination={pagination} onNavigate={goToPage} />
          </div>

          {/* BANK REMINDER */}
          <div className="pyr-info-banner">
            <RiBuilding4Line size={16} />
            <div>
              <p>Payouts go to your registered bank account.</p>
              <a href="/settings/profile#bank">Update bank details →</a>
            </div>
          </div>

        </main>
      </div>

      {ToastComponent}

      <style>{`
        * { box-sizing: border-box; }
        .pyr-spin { animation: pyrSpin 0.8s linear infinite; }
        @keyframes pyrSpin { to { transform: rotate(360deg); } }
        @keyframes pyrSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .pyr-page { min-height: 100vh; background: #0a0a0a; color: white; font-family: "DM Sans", sans-serif; }
        .pyr-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .pyr-header-inner { max-width: 820px; margin: auto; padding: 0 24px; height: 64px; display: flex; align-items: center; gap: 14px; }
        .pyr-back { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.06); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .pyr-back:hover { background: rgba(255,255,255,0.1); }
        .pyr-header h1 { margin: 0; font-size: 16px; font-weight: 700; }
        .pyr-header p { margin: 1px 0 0; font-size: 11px; color: rgba(255,255,255,0.35); }
        .pyr-content { max-width: 820px; margin: auto; padding: 22px 24px 90px; display: flex; flex-direction: column; gap: 16px; }
        .pyr-balance-bar { display: flex; align-items: center; justify-content: space-between; background: #111; border: 1px solid rgba(255,107,53,0.2); border-radius: 16px; padding: 20px 22px; }
        .pyr-balance-label { margin: 0 0 4px; font-size: 12px; color: rgba(255,255,255,0.4); }
        .pyr-balance-amount { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; color: #FF6B35; }
        .pyr-withdraw-btn { display: flex; align-items: center; gap: 7px; padding: 0 20px; height: 42px; border-radius: 10px; background: #FF6B35; color: white; font-weight: 700; font-size: 13px; border: none; cursor: pointer; }
        .pyr-withdraw-btn:hover { background: #ff7a4a; }
        .pyr-form-card { background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; animation: pyrSlideIn 0.15s ease; }
        .pyr-form-header { display: flex; align-items: center; gap: 8px; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); }
        .pyr-form-header h3 { margin: 0; font-size: 14px; color: white; font-weight: 700; }
        .pyr-form-body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 14px; }
        .pyr-form-body label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; display: flex; flex-direction: column; gap: 8px; }
        .pyr-input-wrap { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 16px; }
        .pyr-input-wrap span { color: rgba(255,255,255,0.4); font-size: 15px; font-weight: 700; }
        .pyr-input-wrap input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 16px; font-weight: 700; }
        .pyr-form-error { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(239,68,68,0.1); color: #EF4444; font-size: 13px; }
        .pyr-form-note { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.35); }
        .pyr-form-actions { display: flex; gap: 10px; }
        .pyr-cancel-btn { flex: 1; padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.55); cursor: pointer; font-size: 13px; font-weight: 600; }
        .pyr-submit-btn { flex: 2; padding: 12px; border-radius: 10px; background: #FF6B35; border: none; color: white; cursor: pointer; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .pyr-submit-btn:hover { background: #ff7a4a; }
        .pyr-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pyr-stat-strip { display: flex; align-items: center; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 8px; }
        .pyr-stat { flex: 1; text-align: center; }
        .pyr-stat strong { display: block; font-size: 17px; font-weight: 800; color: white; }
        .pyr-stat span { font-size: 11px; color: rgba(255,255,255,0.4); }
        .pyr-stat-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.07); }
        .pyr-list-card { background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; }
        .pyr-list-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .pyr-list-header h3 { margin: 0; font-size: 14px; font-weight: 700; }
        .pyr-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        .pyr-row:first-child { border-top: none; }
        .pyr-row-icon { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .pyr-icon-live { background: rgba(255,107,53,0.12); color: #FF6B35; }
        .pyr-icon-neutral { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
        .pyr-icon-danger { background: rgba(239,68,68,0.1); color: #EF4444; }
        .pyr-row-meta { flex: 1; min-width: 0; }
        .pyr-row-meta h4 { margin: 0; font-size: 13px; font-weight: 700; }
        .pyr-row-meta p { margin: 4px 0 0; font-size: 11px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 4px; }
        .pyr-row-right { text-align: right; flex-shrink: 0; }
        .pyr-row-right strong { display: block; font-size: 14px; font-weight: 800; color: white; }
        .pyr-status-chip { display: inline-block; margin-top: 5px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; }
        .pyr-chip-live { background: rgba(255,107,53,0.12); color: #FF6B35; }
        .pyr-chip-neutral { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
        .pyr-chip-danger { background: rgba(239,68,68,0.1); color: #EF4444; }
        .pyr-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 24px; text-align: center; }
        .pyr-empty-icon { width: 54px; height: 54px; border-radius: 15px; background: rgba(255,107,53,0.1); display: flex; align-items: center; justify-content: center; color: #FF6B35; }
        .pyr-empty h4 { margin: 0; font-size: 15px; font-weight: 700; color: white; }
        .pyr-empty p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.4); }
        .pyr-info-banner { display: flex; align-items: flex-start; gap: 12px; background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 18px; color: rgba(255,255,255,0.45); }
        .pyr-info-banner p { margin: 0 0 3px; font-size: 13px; color: rgba(255,255,255,0.5); }
        .pyr-info-banner a { color: #FF6B35; text-decoration: none; font-size: 12px; font-weight: 700; }
        .pyr-pg-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        .pyr-pg-btn { min-width: 34px; height: 34px; padding: 0 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); background: #0a0a0a; color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 700; cursor: pointer; }
        .pyr-pg-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .pyr-pg-active { background: #FF6B35 !important; border-color: transparent !important; color: #fff !important; }
        @media (max-width: 640px) { .pyr-header-inner, .pyr-content { padding-left: 16px; padding-right: 16px; } .pyr-balance-amount { font-size: 26px; } }
      `}</style>
    </>
  )
}

SellerPayouts.layout = page => <AppLayout>{page}</AppLayout>