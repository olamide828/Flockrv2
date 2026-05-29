import { useState } from "react"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import axios from "axios"
import {
  RiArrowLeftLine,
  RiBankCardLine,
  RiMoneyDollarCircleLine,
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

const STATUS_STYLE = {
  pending:   { bg: "rgba(234,179,8,0.12)",   text: "#EAB308" },
  approved:  { bg: "rgba(16,185,129,0.12)",  text: "#10B981" },
  paid:      { bg: "rgba(16,185,129,0.12)",  text: "#10B981" },
  rejected:  { bg: "rgba(239,68,68,0.12)",   text: "#EF4444" },
  failed:    { bg: "rgba(239,68,68,0.12)",   text: "#EF4444" },
}

export default function SellerPayouts({ payouts: initialPayouts = { data: [] }, balance = 0 }) {
  const [payouts,    setPayouts]    = useState(initialPayouts.data ?? [])
  const [requesting, setRequesting] = useState(false)
  const [amount,     setAmount]     = useState("")
  const [showForm,   setShowForm]   = useState(false)
  const [error,      setError]      = useState("")

  const pendingTotal = payouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const paidTotal    = payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const handleRequest = async (e) => {
    e.preventDefault()
    setError("")
    const amt = Number(amount)
    if (!amt || amt < 1000) { setError("Minimum withdrawal is ₦1,000."); return }
    if (amt > Number(balance)) { setError("Amount exceeds your available balance."); return }
    setRequesting(true)
    try {
      const { data } = await axios.post("/api/seller/payouts", { amount: amt })
      setPayouts(prev => [data, ...prev])
      setAmount("")
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.message ?? "Request failed. Please try again.")
    } finally { setRequesting(false) }
  }

  return (
    <>
      <Head title="Payouts" />

      <div className="seller-page">

        <header className="page-header">
          <div className="page-header-inner">
            <div className="page-header-left">
              <Link href="/seller/dashboard" className="back-btn">
                <RiArrowLeftLine size={18} />
              </Link>
              <div>
                <h1>Payouts</h1>
                <p>Withdraw your earnings</p>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">

          {/* BALANCE HERO */}
          <div className="balance-hero">
            <div className="balance-left">
              <p className="balance-label">Available Balance</p>
              <h2 className="balance-amount">₦{fmt(balance)}</h2>
              <p className="balance-sub">Ready to withdraw</p>
            </div>
            <div className="balance-right">
              <button onClick={() => setShowForm(s => !s)} className="withdraw-btn">
                <RiArrowUpLine size={16} /> Withdraw
              </button>
            </div>
          </div>

          {/* WITHDRAW FORM */}
          {showForm && (
            <div className="form-card">
              <div className="form-header">
                <RiWalletLine size={18} />
                <h3>Request Withdrawal</h3>
              </div>
              <form onSubmit={handleRequest} className="form-body">
                <label>
                  Amount (₦)
                  <div className="input-wrap">
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
                  <div className="form-error">
                    <RiInformationLine size={14} /> {error}
                  </div>
                )}
                <div className="form-note">
                  <RiBuilding4Line size={13} />
                  Payouts are sent to your registered bank account within 1–3 business days.
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">Cancel</button>
                  <button type="submit" disabled={requesting} className="submit-btn">
                    {requesting ? <><RiLoader4Line size={15} /> Processing...</> : "Request Payout"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STATS STRIP */}
          <div className="summary-strip">
            <div className="summary-card">
              <RiTimeLine size={18} />
              <div><span>₦{fmt(pendingTotal)}</span><p>Pending</p></div>
            </div>
            <div className="summary-card highlight">
              <RiCheckboxCircleLine size={18} />
              <div><span>₦{fmt(paidTotal)}</span><p>Paid Out</p></div>
            </div>
            <div className="summary-card">
              <RiBankCardLine size={18} />
              <div><span>{payouts.length}</span><p>Total Requests</p></div>
            </div>
          </div>

          {/* PAYOUTS LIST */}
          <div className="table-card">
            <div className="table-header">
              <h3>Payout History</h3>
            </div>

            {!payouts.length ? (
              <div className="empty-state">
                <RiBankCardLine size={40} />
                <h4>No payouts yet</h4>
                <p>Your withdrawal history will appear here.</p>
              </div>
            ) : (
              <div className="payouts-list">
                {payouts.map((payout, i) => (
                  <div
                    key={payout.id}
                    className="payout-row"
                    style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : {}}
                  >
                    <div
                      className="payout-icon"
                      style={{ background: (STATUS_STYLE[payout.status] ?? {}).bg, color: (STATUS_STYLE[payout.status] ?? {}).text }}
                    >
                      {payout.status === "pending"  && <RiTimeLine size={16} />}
                      {(payout.status === "approved" || payout.status === "paid") && <RiCheckboxCircleLine size={16} />}
                      {(payout.status === "rejected" || payout.status === "failed") && <RiCloseCircleLine size={16} />}
                    </div>

                    <div className="payout-meta">
                      <h4>Payout #{payout.id}</h4>
                      <p>
                        <RiCalendarLine size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                        {timeAgo(payout.created_at)}
                      </p>
                      {payout.reference && (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>Ref: {payout.reference}</p>
                      )}
                    </div>

                    <div className="payout-right">
                      <strong>₦{fmt(payout.amount)}</strong>
                      <span
                        className="status-pill"
                        style={{ background: (STATUS_STYLE[payout.status] ?? {}).bg, color: (STATUS_STYLE[payout.status] ?? {}).text }}
                      >
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BANK DETAILS REMINDER */}
          <div className="info-banner">
            <RiBuilding4Line size={18} />
            <div>
              <p>Payouts go to your registered bank account.</p>
              <Link href="/settings/profile#bank">Update bank details →</Link>
            </div>
          </div>

        </main>
      </div>

      <style>{pageStyles}</style>
      <style>{`
        .balance-hero {
          background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 28px;
          padding: 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px;
        }
        .balance-label { margin: 0 0 6px; font-size: 13px; color: rgba(255,255,255,0.45); }
        .balance-amount { margin: 0 0 4px; font-size: 44px; font-weight: 800; letter-spacing: -2px; color: #ff6b35; }
        .balance-sub { margin: 0; font-size: 12px; color: rgba(255,255,255,0.3); }
        .withdraw-btn {
          display: flex; align-items: center; gap: 8px; padding: 14px 26px; border-radius: 999px;
          background: white; color: black; font-weight: 700; font-size: 14px; border: none; cursor: pointer;
          white-space: nowrap; transition: opacity 0.15s;
        }
        .withdraw-btn:hover { opacity: 0.9; }
        .form-card { background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; overflow: hidden; animation: slideIn 0.2s ease; }
        .form-header { display: flex; align-items: center; gap: 10px; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); font-size: 15px; font-weight: 600; }
        .form-header h3 { margin: 0; font-size: 15px; color: white; }
        .form-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }
        .form-body label { font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.05em; display: flex; flex-direction: column; gap: 8px; }
        .input-wrap { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 12px 16px; }
        .input-wrap span { color: rgba(255,255,255,0.4); font-size: 16px; font-weight: 700; }
        .input-wrap input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 16px; font-weight: 700; }
        .form-error { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: rgba(239,68,68,0.1); color: #ef4444; font-size: 13px; }
        .form-note { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.35); }
        .form-actions { display: flex; gap: 10px; }
        .cancel-btn { flex: 1; padding: 12px; border-radius: 14px; background: rgba(255,255,255,0.05); border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 14px; font-weight: 600; }
        .submit-btn { flex: 2; padding: 12px; border-radius: 14px; background: white; border: none; color: black; cursor: pointer; font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .summary-strip { display: flex; gap: 14px; }
        .summary-card { flex: 1; background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; color: rgba(255,255,255,0.4); }
        .summary-card.highlight { color: #ff6b35; }
        .summary-card div span { display: block; font-size: 20px; font-weight: 800; color: white; }
        .summary-card.highlight div span { color: #ff6b35; }
        .summary-card div p { margin: 2px 0 0; font-size: 12px; }
        .table-header { padding: 20px 22px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .table-header h3 { margin: 0; font-size: 15px; }
        .payouts-list { }
        .payout-row { display: flex; align-items: center; gap: 14px; padding: 16px 22px; }
        .payout-icon { width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .payout-meta { flex: 1; min-width: 0; }
        .payout-meta h4 { margin: 0; font-size: 13px; font-weight: 600; }
        .payout-meta p { margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.4); }
        .payout-right { text-align: right; flex-shrink: 0; }
        .payout-right strong { display: block; font-size: 15px; font-weight: 800; color: white; }
        .info-banner {
          display: flex; align-items: flex-start; gap: 14px;
          background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 18px 20px;
          color: rgba(255,255,255,0.4); font-size: 13px;
        }
        .info-banner div p { margin: 0 0 4px; }
        .info-banner div a { color: #ff6b35; text-decoration: none; font-size: 12px; }
        .status-pill { display: inline-block; margin-top: 5px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 640px) { .balance-hero { flex-direction: column; align-items: flex-start; } .balance-amount { font-size: 34px; } .summary-strip { flex-wrap: wrap; } }
      `}</style>
    </>
  )
}

SellerPayouts.layout = page => <AppLayout>{page}</AppLayout>

const pageStyles = `
  * { box-sizing: border-box; }
  .seller-page { min-height: 100vh; background: #0a0a0a; color: white; font-family: "DM Sans", sans-serif; }
  .page-header { position: sticky; top: 0; z-index: 40; background: rgba(10,10,10,0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.05); }
  .page-header-inner { max-width: 1200px; margin: auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
  .page-header-left { display: flex; align-items: center; gap: 14px; }
  .back-btn { width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.05); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; flex-shrink: 0; }
  .page-header h1 { margin: 0; font-size: 18px; font-weight: 700; }
  .page-header p { margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,0.4); }
  .page-content { max-width: 1200px; margin: auto; padding: 28px 24px 100px; display: flex; flex-direction: column; gap: 20px; }
  .table-card { background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 28px; overflow: hidden; }
  .empty-state { padding: 60px 24px; text-align: center; color: rgba(255,255,255,0.35); }
  .empty-state h4 { margin: 14px 0 6px; font-size: 16px; color: white; }
  .empty-state p { margin: 0; font-size: 13px; }
  @media (max-width: 640px) { .page-header-inner, .page-content { padding-left: 16px; padding-right: 16px; } }
`