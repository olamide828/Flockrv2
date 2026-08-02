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
  RiSparklingLine,
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

const STATUS_META = {
  pending:   { grad: "linear-gradient(135deg,#F59E0B,#FBBF24)", label: "Pending" },
  approved:  { grad: "linear-gradient(135deg,#10B981,#34D399)", label: "Approved" },
  paid:      { grad: "linear-gradient(135deg,#10B981,#34D399)", label: "Paid" },
  rejected:  { grad: "linear-gradient(135deg,#EF4444,#F87171)", label: "Rejected" },
  failed:    { grad: "linear-gradient(135deg,#EF4444,#F87171)", label: "Failed" },
}

function Pagination({ pagination, onNavigate }) {
  if (!pagination?.links || pagination.last_page <= 1) return null
  return (
    <div className="py-pg-row">
      {pagination.links.map((link, i) => (
        <button
          key={i}
          type="button"
          disabled={!link.url}
          onClick={() => link.url && onNavigate(link.url)}
          className={`py-pg-btn ${link.active ? "py-pg-active" : ""}`}
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
      showToast("Payout request submitted 🎉", "success")
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

      <div className="py-page">
        <div className="py-blob py-blob-a" />
        <div className="py-blob py-blob-b" />

        <header className="py-header">
          <div className="py-header-inner">
            <button type="button" onClick={() => window.history.back()} className="py-back" aria-label="Go back">
              <RiArrowLeftLine size={18} />
            </button>
            <div>
              <h1>Payouts <span>💸</span></h1>
              <p>Withdraw your earnings anytime</p>
            </div>
          </div>
        </header>

        <main className="py-content">

          {/* BALANCE HERO */}
          <div className="py-hero">
            <div className="py-hero-blob" />
            <div className="py-hero-left">
              <p className="py-hero-label"><RiSparklingLine size={13} /> Available Balance</p>
              <h2 className="py-hero-amount">₦{fmt(balance)}</h2>
              <p className="py-hero-sub">Ready to withdraw whenever you like</p>
            </div>
            <button onClick={() => setShowForm(s => !s)} className="py-withdraw-btn">
              <RiArrowUpLine size={17} /> Withdraw
            </button>
          </div>

          {/* WITHDRAW FORM */}
          {showForm && (
            <div className="py-form-card">
              <div className="py-form-header">
                <div className="py-form-icon"><RiWalletLine size={17} /></div>
                <h3>Request Withdrawal</h3>
              </div>
              <form onSubmit={handleRequest} className="py-form-body">
                <label>
                  Amount (₦)
                  <div className="py-input-wrap">
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
                  <div className="py-form-error">
                    <RiInformationLine size={14} /> {error}
                  </div>
                )}
                <div className="py-form-note">
                  <RiBuilding4Line size={13} />
                  Payouts are sent to your registered bank account within 1–3 business days.
                </div>
                <div className="py-form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="py-cancel-btn">Cancel</button>
                  <button type="submit" disabled={requesting} className="py-submit-btn">
                    {requesting ? <><RiLoader4Line size={15} className="py-spin" /> Processing...</> : "Request Payout"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STATS */}
          <div className="py-stats">
            <div className="py-stat">
              <div className="py-stat-icon" style={{ background: 'linear-gradient(135deg,#F59E0B,#FBBF24)' }}><RiTimeLine size={18} /></div>
              <div><strong>₦{fmt(pendingTotal)}</strong><p>Pending</p></div>
            </div>
            <div className="py-stat">
              <div className="py-stat-icon" style={{ background: 'linear-gradient(135deg,#10B981,#34D399)' }}><RiCheckboxCircleLine size={18} /></div>
              <div><strong>₦{fmt(paidTotal)}</strong><p>Paid Out</p></div>
            </div>
            <div className="py-stat">
              <div className="py-stat-icon" style={{ background: 'linear-gradient(135deg,#FF6B35,#FF3D71)' }}><RiBankCardLine size={18} /></div>
              <div><strong>{pagination.total ?? payouts.length}</strong><p>Total Requests</p></div>
            </div>
          </div>

          {/* LIST */}
          <div className="py-list-card">
            <div className="py-list-header"><h3>Payout History</h3></div>

            {!payouts.length ? (
              <div className="py-empty">
                <div className="py-empty-blob"><RiBankCardLine size={30} /></div>
                <h4>No payouts yet</h4>
                <p>Your withdrawal history will appear here.</p>
              </div>
            ) : (
              <div>
                {payouts.map((payout) => {
                  const meta = STATUS_META[payout.status] ?? STATUS_META.pending
                  return (
                    <div key={payout.id} className="py-row">
                      <div className="py-row-icon" style={{ background: meta.grad }}>
                        {payout.status === "pending"  && <RiTimeLine size={16} />}
                        {(payout.status === "approved" || payout.status === "paid") && <RiCheckboxCircleLine size={16} />}
                        {(payout.status === "rejected" || payout.status === "failed") && <RiCloseCircleLine size={16} />}
                      </div>

                      <div className="py-row-meta">
                        <h4>Payout #{payout.id}</h4>
                        <p><RiCalendarLine size={11} /> {timeAgo(payout.created_at)}</p>
                        {payout.reference && <p className="py-row-ref">Ref: {payout.reference}</p>}
                      </div>

                      <div className="py-row-right">
                        <strong>₦{fmt(payout.amount)}</strong>
                        <span className="py-status-chip" style={{ background: meta.grad }}>{meta.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <Pagination pagination={pagination} onNavigate={goToPage} />
          </div>

          {/* BANK REMINDER */}
          <div className="py-info-banner">
            <div className="py-info-icon"><RiBuilding4Line size={17} /></div>
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
        .py-spin { animation: pySpin 0.8s linear infinite; }
        @keyframes pySpin { to { transform: rotate(360deg); } }
        @keyframes pySlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .py-page { position: relative; min-height: 100vh; background: #0a0a0a; color: white; font-family: "DM Sans", sans-serif; overflow-x: hidden; }
        .py-blob { position: fixed; border-radius: 50%; filter: blur(90px); opacity: 0.16; pointer-events: none; z-index: 0; }
        .py-blob-a { width: 420px; height: 420px; background: #FF6B35; top: -140px; right: -100px; }
        .py-blob-b { width: 360px; height: 360px; background: #10B981; bottom: -120px; left: -100px; }
        .py-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.75); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .py-header-inner { max-width: 1200px; margin: auto; padding: 0 24px; height: 76px; display: flex; align-items: center; gap: 14px; }
        .py-back { width: 42px; height: 42px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s, background 0.15s; flex-shrink: 0; }
        .py-back:hover { background: rgba(255,255,255,0.12); transform: translateX(-2px); }
        .py-header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .py-header p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.4); }
        .py-content { position: relative; z-index: 1; max-width: 900px; margin: auto; padding: 28px 24px 100px; display: flex; flex-direction: column; gap: 20px; }
        .py-hero { position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(255,107,53,0.18), rgba(255,61,113,0.1)); border: 1px solid rgba(255,107,53,0.25); border-radius: 32px; padding: 34px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .py-hero-blob { position: absolute; width: 220px; height: 220px; border-radius: 50%; background: #FF6B35; filter: blur(70px); opacity: 0.25; top: -80px; right: -40px; }
        .py-hero-left { position: relative; z-index: 1; }
        .py-hero-label { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 13px; color: #FFB88C; font-weight: 700; }
        .py-hero-amount { margin: 0 0 4px; font-size: 46px; font-weight: 900; letter-spacing: -2px; background: linear-gradient(135deg,#fff,#FFD8C2); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .py-hero-sub { margin: 0; font-size: 12px; color: rgba(255,255,255,0.4); }
        .py-withdraw-btn { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 15px 28px; border-radius: 999px; background: white; color: black; font-weight: 800; font-size: 14px; border: none; cursor: pointer; white-space: nowrap; transition: transform 0.15s; }
        .py-withdraw-btn:hover { transform: translateY(-2px); }
        .py-form-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; overflow: hidden; animation: pySlideIn 0.2s ease; }
        .py-form-header { display: flex; align-items: center; gap: 10px; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .py-form-icon { width: 34px; height: 34px; border-radius: 12px; background: linear-gradient(135deg,#FF6B35,#FF3D71); display: flex; align-items: center; justify-content: center; }
        .py-form-header h3 { margin: 0; font-size: 15px; color: white; font-weight: 700; }
        .py-form-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }
        .py-form-body label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; display: flex; flex-direction: column; gap: 8px; }
        .py-input-wrap { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 14px 18px; }
        .py-input-wrap span { color: rgba(255,255,255,0.4); font-size: 16px; font-weight: 700; }
        .py-input-wrap input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 17px; font-weight: 700; }
        .py-form-error { display: flex; align-items: center; gap: 8px; padding: 11px 15px; border-radius: 14px; background: rgba(239,68,68,0.12); color: #F87171; font-size: 13px; }
        .py-form-note { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.35); }
        .py-form-actions { display: flex; gap: 10px; }
        .py-cancel-btn { flex: 1; padding: 13px; border-radius: 999px; background: rgba(255,255,255,0.06); border: none; color: rgba(255,255,255,0.55); cursor: pointer; font-size: 14px; font-weight: 700; }
        .py-submit-btn { flex: 2; padding: 13px; border-radius: 999px; background: linear-gradient(135deg,#FF6B35,#FF3D71); border: none; color: white; cursor: pointer; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 20px rgba(255,107,53,0.3); }
        .py-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .py-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
        .py-stat { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 22px; padding: 18px; }
        .py-stat-icon { width: 42px; height: 42px; border-radius: 15px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 6px 14px rgba(0,0,0,0.3); }
        .py-stat strong { display: block; font-size: 18px; font-weight: 800; }
        .py-stat p { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.4); }
        .py-list-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 30px; overflow: hidden; }
        .py-list-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .py-list-header h3 { margin: 0; font-size: 15px; font-weight: 700; }
        .py-row { display: flex; align-items: center; gap: 14px; padding: 16px 22px; border-top: 1px solid rgba(255,255,255,0.04); }
        .py-row:first-child { border-top: none; }
        .py-row-icon { width: 42px; height: 42px; border-radius: 15px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 6px 14px rgba(0,0,0,0.3); }
        .py-row-meta { flex: 1; min-width: 0; }
        .py-row-meta h4 { margin: 0; font-size: 13px; font-weight: 700; }
        .py-row-meta p { margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 4px; }
        .py-row-ref { font-size: 11px !important; color: rgba(255,255,255,0.25) !important; margin-top: 2px !important; }
        .py-row-right { text-align: right; flex-shrink: 0; }
        .py-row-right strong { display: block; font-size: 15px; font-weight: 800; color: white; }
        .py-status-chip { display: inline-block; margin-top: 6px; padding: 4px 12px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #fff; }
        .py-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 70px 24px; text-align: center; }
        .py-empty-blob { width: 68px; height: 68px; border-radius: 24px; background: linear-gradient(135deg, rgba(255,107,53,0.2), rgba(16,185,129,0.12)); display: flex; align-items: center; justify-content: center; color: #FF9D6B; }
        .py-empty h4 { margin: 0; font-size: 16px; font-weight: 800; color: white; }
        .py-empty p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.4); }
        .py-info-banner { display: flex; align-items: flex-start; gap: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 22px; padding: 18px 20px; }
        .py-info-icon { width: 36px; height: 36px; border-radius: 13px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); flex-shrink: 0; }
        .py-info-banner p { margin: 0 0 4px; color: rgba(255,255,255,0.5); font-size: 13px; }
        .py-info-banner a { color: #FF9D6B; text-decoration: none; font-size: 12px; font-weight: 700; }
        .py-pg-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 18px 22px; border-top: 1px solid rgba(255,255,255,0.05); }
        .py-pg-btn { min-width: 36px; height: 36px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.55); font-size: 12px; font-weight: 700; cursor: pointer; }
        .py-pg-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        .py-pg-active { background: linear-gradient(135deg,#FF6B35,#FF3D71) !important; border-color: transparent !important; color: #fff !important; }
        @media (max-width: 640px) { .py-hero { flex-direction: column; align-items: flex-start; } .py-hero-amount { font-size: 34px; } .py-header-inner, .py-content { padding-left: 16px; padding-right: 16px; } }
      `}</style>
    </>
  )
}

SellerPayouts.layout = page => <AppLayout>{page}</AppLayout>

