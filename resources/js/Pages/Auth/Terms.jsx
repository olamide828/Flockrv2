import { useState, useEffect } from 'react'
import { Link } from '@inertiajs/react'
import {
    RiFileTextLine, RiUserLine, RiStoreLine,
    RiShieldCheckLine, RiVideoLine, RiBankCardLine,
    RiTruckLine, RiCloseLine, RiCustomerServiceLine,
    RiCopyrightLine, RiScalesLine, RiAlertLine,
    RiCheckboxCircleLine, RiMailLine, RiGlobalLine,
    RiArrowRightSLine, RiArrowUpLine, RiErrorWarningLine,
} from 'react-icons/ri'

const C = {
    bg: '#0a0a0a', surface: '#111111', surfaceHi: '#1a1a1a',
    border: 'rgba(255,255,255,0.07)', orange: '#FF6B35',
    orangeDim: 'rgba(255,107,53,0.1)', orangeMid: 'rgba(255,107,53,0.2)',
    white: '#ffffff', muted: 'rgba(255,255,255,0.5)',
    faint: 'rgba(255,255,255,0.22)', fainter: 'rgba(255,255,255,0.06)',
    green: '#10B981', greenDim: 'rgba(16,185,129,0.1)',
    yellow: '#FBBF24', yellowDim: 'rgba(251,191,36,0.1)',
    blue: '#3B82F6', blueDim: 'rgba(59,130,246,0.1)',
    red: '#EF4444', redDim: 'rgba(239,68,68,0.08)',
}

const SECTIONS = [
    { id: 'introduction', icon: RiFileTextLine,        label: 'Introduction'          },
    { id: 'definitions',  icon: RiGlobalLine,          label: 'Definitions'           },
    { id: 'accounts',     icon: RiUserLine,            label: 'Accounts'              },
    { id: 'platform',     icon: RiShieldCheckLine,     label: 'Platform Role'         },
    { id: 'sellers',      icon: RiStoreLine,           label: 'Seller Obligations'    },
    { id: 'ugc',          icon: RiVideoLine,           label: 'Your Content'          },
    { id: 'feed',         icon: RiVideoLine,           label: 'Feed & Data'           },
    { id: 'payments',     icon: RiBankCardLine,        label: 'Payments & Escrow'     },
    { id: 'logistics',    icon: RiTruckLine,           label: 'Shipping'              },
    { id: 'prohibited',   icon: RiCloseLine,           label: 'Prohibited Conduct'    },
    { id: 'disputes',     icon: RiCustomerServiceLine, label: 'Buyer Protection'      },
    { id: 'ip',           icon: RiCopyrightLine,       label: 'Intellectual Property' },
    { id: 'disclaimers',  icon: RiAlertLine,           label: 'Disclaimers'           },
    { id: 'liability',    icon: RiScalesLine,          label: 'Liability'             },
    { id: 'termination',  icon: RiErrorWarningLine,    label: 'Termination'           },
    { id: 'governing',    icon: RiScalesLine,          label: 'Governing Law'         },
    { id: 'general',      icon: RiCheckboxCircleLine,  label: 'General'               },
    { id: 'contact',      icon: RiMailLine,            label: 'Contact'               },
]

// ── Shared primitives ─────────────────────────────────────────────────────────

function H2({ id, icon: Icon, children }) {
    return (
        <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 20px', scrollMarginTop: 80 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.orangeDim, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={C.orange} />
            </div>
            <h2 style={{ margin: 0, color: C.white, fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px' }}>{children}</h2>
        </div>
    )
}

function H3({ children }) {
    return <h3 style={{ color: C.white, fontSize: 14, fontWeight: 700, margin: '22px 0 9px' }}>{children}</h3>
}

function P({ children }) {
    return <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' }}>{children}</p>
}

function Ul({ items }) {
    return (
        <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none' }}>
            {items.map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.orange, flexShrink: 0, marginTop: 8 }} />
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.7 }}>{item}</span>
                </li>
            ))}
        </ul>
    )
}

function Card({ title, titleColor = C.green, bg, border, children }) {
    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            {title && <p style={{ color: titleColor, fontWeight: 700, fontSize: 12, margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>}
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.7 }}>{children}</div>
        </div>
    )
}

function Table({ rows }) {
    return (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
            {rows.map(([label, value], i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? C.surface : C.surfaceHi }}>
                    <div style={{ padding: '11px 14px', color: C.orange, fontWeight: 700, fontSize: 12, borderRight: `1px solid ${C.border}` }}>{label}</div>
                    <div style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 1.6 }}>{value}</div>
                </div>
            ))}
        </div>
    )
}

// ── TOC ───────────────────────────────────────────────────────────────────────

function TOC({ active, onSelect, mobileOpen, onMobileClose }) {
    return (
        <>
            {mobileOpen && (
                <div onClick={onMobileClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 48 }} />
            )}
            <nav className={`tos-toc${mobileOpen ? ' tos-toc--open' : ''}`} style={{
                width: 210, flexShrink: 0,
                position: 'sticky', top: 68, alignSelf: 'flex-start',
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '14px 10px',
                maxHeight: 'calc(100vh - 88px)', overflowY: 'auto',
                scrollbarWidth: 'none',
            }}>
                <p style={{ color: C.faint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px 6px' }}>Contents</p>
                {SECTIONS.map(s => {
                    const on = active === s.id
                    return (
                        <button key={s.id}
                            onClick={() => {
                                onSelect(s.id)
                                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                onMobileClose()
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                width: '100%', padding: '7px 10px', borderRadius: 8,
                                background: on ? C.orangeDim : 'transparent',
                                border: `1px solid ${on ? C.orangeMid : 'transparent'}`,
                                cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                            }}>
                            <s.icon size={12} color={on ? C.orange : C.faint} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: on ? C.orange : C.muted, fontWeight: on ? 700 : 400, lineHeight: 1.3 }}>{s.label}</span>
                            {on && <RiArrowRightSLine size={11} color={C.orange} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                        </button>
                    )
                })}
            </nav>
        </>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TermsOfService() {
    const [active,  setActive]  = useState('introduction')
    const [tocOpen, setTocOpen] = useState(false)
    const [showTop, setShowTop] = useState(false)

    useEffect(() => {
        const onScroll = () => {
            setShowTop(window.scrollY > 400)
            for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const el = document.getElementById(SECTIONS[i].id)
                if (el && el.getBoundingClientRect().top <= 100) {
                    setActive(SECTIONS[i].id)
                    break
                }
            }
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            <style>{`
                .tos-toc { display: flex; flex-direction: column; }
                .tos-layout { display: flex; gap: 36px; align-items: flex-start; }
                @media (max-width: 768px) {
                    .tos-toc { display: none !important; }
                    .tos-toc--open {
                        display: flex !important;
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        right: 0 !important; bottom: 0 !important;
                        z-index: 49 !important;
                        border-radius: 0 !important;
                        width: 100% !important;
                        max-height: 100vh !important;
                        overflow-y: auto !important;
                        padding: 24px 16px !important;
                    }
                    .tos-layout { flex-direction: column !important; gap: 0 !important; }
                    .tos-toc-btn { display: flex !important; }
                    .tos-meta { flex-wrap: wrap !important; gap: 16px !important; }
                    .tos-table-row { grid-template-columns: 1fr !important; }
                    .tos-table-label { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; }
                }
                @media (min-width: 769px) { .tos-toc-btn { display: none !important; } }
                .tos-toc::-webkit-scrollbar { display: none; }
            `}</style>

            {/* ── Header ── */}
            <div style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: 1040, margin: '0 auto', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <span style={{ color: C.orange, fontWeight: 900, fontSize: 19, letterSpacing: '-1px' }}>flockr</span>
                        </Link>
                        <span style={{ color: C.border, fontSize: 16 }}>|</span>
                        <span style={{ color: C.muted, fontSize: 13 }}>Terms of Service</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: C.greenDim, border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: C.green }}>
                            Ogun State, Nigeria
                        </span>
                        <button className="tos-toc-btn" onClick={() => setTocOpen(o => !o)} style={{ display: 'none', alignItems: 'center', gap: 5, padding: '7px 12px', background: C.orangeDim, border: `1px solid ${C.orangeMid}`, borderRadius: 8, cursor: 'pointer', color: C.orange, fontSize: 12, fontWeight: 700 }}>
                            Contents
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Hero ── */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.05) 0%, transparent 55%)', borderBottom: `1px solid ${C.border}`, padding: '44px 20px 36px' }}>
                <div style={{ maxWidth: 1040, margin: '0 auto' }}>
                    <h1 style={{ color: C.white, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px', lineHeight: 1.15 }}>
                        How Flockr works.<br />
                        <span style={{ color: C.orange }}>What we expect from each other.</span>
                    </h1>
                    <p style={{ color: C.muted, fontSize: 14, maxWidth: 500, lineHeight: 1.7, margin: '0 0 22px' }}>
                        These Terms govern your use of Flockr — a social commerce marketplace connecting Buyers and Sellers across Nigeria. By using Flockr, you agree to these Terms.
                    </p>
                    <div className="tos-meta" style={{ display: 'flex', gap: 28 }}>
                        {[['Effective', '1 July 2025'], ['Governing Law', 'Ogun State, Nigeria'], ['Legal Contact', 'legal@flockr.ng']].map(([k, v]) => (
                            <div key={k}>
                                <p style={{ color: C.faint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{k}</p>
                                <p style={{ color: C.white, fontSize: 13, fontWeight: 600, margin: 0 }}>{v}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 20px 80px' }}>
                <div className="tos-layout" style={{ display: 'flex', gap: 36, alignItems: 'flex-start' }}>

                    <TOC active={active} onSelect={setActive} mobileOpen={tocOpen} onMobileClose={() => setTocOpen(false)} />

                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* 1. Introduction */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="introduction" icon={RiFileTextLine}>Introduction and Acceptance</H2>
                            <Card title="Summary" titleColor={C.green} bg={C.greenDim} border="rgba(16,185,129,0.18)">
                                By using Flockr you agree to these Terms. Flockr is a marketplace — we connect Buyers and Sellers but we are not the seller, shipper, or financial institution. You must be 18 or older to use the Services.
                            </Card>
                            <P>
                                Welcome to <strong style={{ color: C.white }}>Flockr</strong>, a social commerce marketplace operated by <strong style={{ color: C.white }}>Flockr Technologies Limited</strong>, registered in Nigeria with its principal place of business in Ogun State.
                            </P>
                            <P>
                                These Terms of Service ("Terms") govern your access to and use of the Flockr website, mobile application, and all related services. By registering or using the Services in any way, you agree to be bound by these Terms and our <Link href="/privacy" style={{ color: C.orange, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>.
                            </P>
                            <Card title="Important" titleColor={C.red} bg={C.redDim} border="rgba(239,68,68,0.18)">
                                If you do not agree to these Terms, you must immediately stop using the Services.
                            </Card>
                        </section>

                        {/* 2. Definitions */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="definitions" icon={RiGlobalLine}>Definitions</H2>
                            <Table rows={[
                                ['"Buyer"',       'A registered user who browses, saves, or purchases products on the Platform.'],
                                ['"Seller"',      'A registered user approved to list products, upload videos, and operate a storefront.'],
                                ['"Content"',     'Any text, images, videos, audio, or other material you upload or submit through the Services.'],
                                ['"UGC"',         'User-Generated Content — content created by users, including videos, reviews, comments, and hashtags.'],
                                ['"Transaction"', 'Any purchase or sale of goods facilitated through the Platform.'],
                                ['"Escrow"',      'Temporary holding of funds by Flockr pending order fulfilment.'],
                                ['"Paystack"',    'Paystack Payments Limited, our CBN-regulated payment processing partner.'],
                                ['"TShip"',       'Our third-party logistics and shipping facilitation partner.'],
                                ['"Services"',    'The Flockr website, mobile app, and all related tools operated by Flockr Technologies Limited.'],
                            ]} />
                        </section>

                        {/* 3. Accounts */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="accounts" icon={RiUserLine}>Account Registration and Eligibility</H2>
                            <H3>3.1 Eligibility</H3>
                            <P>You must be at least <strong style={{ color: C.white }}>18 years old</strong> to register. By creating an account you confirm that:</P>
                            <Ul items={[
                                'You are at least 18 years of age',
                                'You have the legal capacity to enter a binding contract under Nigerian law',
                                'All registration information you provide is accurate and complete',
                                'You are not prohibited from using the Services under any applicable law',
                            ]} />
                            <H3>3.2 Account Security</H3>
                            <P>You are responsible for keeping your credentials secure. Notify us immediately at <strong style={{ color: C.orange }}>legal@flockr.ng</strong> if you suspect unauthorised access to your account.</P>
                            <H3>3.3 One Account Per User</H3>
                            <P>Each person may hold one personal account. Sellers may also hold one verified Seller account. Creating multiple accounts to circumvent suspensions is prohibited and will result in permanent termination of all associated accounts.</P>
                            <H3>3.4 Seller Verification</H3>
                            <P>Sellers must complete Flockr's verification process — including government-issued ID and bank account verification via Paystack. Flockr may approve or reject Seller applications at its sole discretion.</P>
                        </section>

                        {/* 4. Platform Role */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="platform" icon={RiShieldCheckLine}>Platform Role — Marketplace Facilitator</H2>
                            <Card title="How Flockr works" titleColor={C.blue} bg={C.blueDim} border="rgba(59,130,246,0.18)">
                                Flockr is a technology platform and marketplace facilitator — not a retailer, manufacturer, or logistics carrier. Contracts of sale are formed directly between Buyers and Sellers. Flockr facilitates the connection, holds funds in escrow, and enforces platform policies.
                            </Card>
                            <H3>4.1 What Flockr does</H3>
                            <Ul items={[
                                'Provides the platform for Buyers and Sellers to connect',
                                'Facilitates payment processing through Paystack on behalf of Sellers',
                                'Holds funds in escrow pending order fulfilment',
                                'Provides access to logistics coordination via TShip',
                                'Enforces platform policies and mediates disputes within defined parameters',
                            ]} />
                            <H3>4.2 No endorsement</H3>
                            <P>Listing a product on Flockr does not mean Flockr endorses, recommends, or guarantees its quality, safety, legality, or authenticity. Buyers transact with Sellers at their own risk, subject to our Buyer Protection policy in Section 11.</P>
                            <H3>4.3 Not a logistics provider</H3>
                            <P>Flockr does not own or operate any shipping infrastructure. Delivery services via TShip are subject to TShip's own terms. Flockr is not liable for loss, damage, or delay of goods in transit.</P>
                        </section>

                        {/* 5. Sellers */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="sellers" icon={RiStoreLine}>Seller Obligations</H2>
                            <H3>5.1 Listings</H3>
                            <Ul items={[
                                'Provide accurate descriptions, images, and pricing for all products',
                                'Ensure all listed products comply with Nigerian law and FCCPC regulations',
                                'Keep inventory levels updated and process orders within 48 hours of confirmation',
                                'Not list counterfeit, stolen, or prohibited goods — see 5.2',
                            ]} />
                            <H3>5.2 Prohibited Products</H3>
                            <Table rows={[
                                ['Counterfeit goods',     'Products infringing any intellectual property right.'],
                                ['Controlled substances', 'Illegal drugs, narcotics, or unauthorised pharmaceuticals.'],
                                ['Weapons',               'Firearms, ammunition, or explosives regulated or prohibited under Nigerian law.'],
                                ['Stolen property',       'Goods obtained through theft, fraud, or trafficking.'],
                                ['Adult content',         'Pornographic or sexually explicit material.'],
                                ['Hate material',         'Products promoting hatred, violence, or discrimination.'],
                            ]} />
                            <Card title="Enforcement" titleColor={C.yellow} bg={C.yellowDim} border="rgba(251,191,36,0.18)">
                                Prohibited listings will be removed immediately. Seller accounts may be suspended or permanently terminated. Serious violations may be referred to law enforcement.
                            </Card>
                            <H3>5.3 Taxes</H3>
                            <P>Sellers are solely responsible for compliance with all applicable tax obligations under Nigerian law, including VAT under the Value Added Tax Act.</P>
                        </section>

                        {/* 6. UGC */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="ugc" icon={RiVideoLine}>Your Content</H2>
                            <Card title="You own your content" titleColor={C.green} bg={C.greenDim} border="rgba(16,185,129,0.18)">
                                You retain full ownership of all content you upload. Nothing in these Terms transfers ownership of your content to Flockr.
                            </Card>
                            <H3>6.1 Licence to Flockr</H3>
                            <P>By posting content, you grant Flockr a <strong style={{ color: C.white }}>worldwide, non-exclusive, royalty-free, sublicensable licence</strong> to use, reproduce, display, and distribute your content to operate the Services, promote the Platform, and train our recommendation algorithms.</P>
                            <H3>6.2 Your warranties</H3>
                            <Ul items={[
                                'You own or have the right to post the content',
                                'The content does not infringe any third-party intellectual property right',
                                'The content does not violate the Cybercrimes Act 2015 or any applicable law',
                                'The content is not defamatory, harassing, or obscene',
                            ]} />
                            <H3>6.3 Moderation</H3>
                            <P>Flockr may remove or restrict access to any content that violates these Terms, applicable law, or our Community Guidelines, without prior notice.</P>
                            <H3>6.4 IP Takedown Notices</H3>
                            <P>If you believe content on the Platform infringes your intellectual property, email <strong style={{ color: C.orange }}>ip@flockr.ng</strong> with: your name and contact details; identification of the infringed work; URL of the infringing content; a good-faith statement that you are authorised to make the claim; and your signature. Counter-notices may be submitted within 14 days of removal.</P>
                        </section>

                        {/* 7. Feed */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="feed" icon={RiVideoLine}>Feed Algorithm and Behavioural Data</H2>
                            <P>Flockr's For You feed is personalised using behavioural signals including video watch time and completion rate, skip events, likes, saves, comments, shares, product clicks, purchases, and seller follows. See our <Link href="/privacy" style={{ color: C.orange, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link> for full details on how this data is processed and how to opt out.</P>
                        </section>

                        {/* 8. Payments */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="payments" icon={RiBankCardLine}>Payments, Escrow, and Paystack</H2>
                            <H3>8.1 Payment processing</H3>
                            <P>All payments are processed by <strong style={{ color: C.white }}>Paystack Payments Limited</strong> (CBN-regulated). By transacting on the Platform you agree to <a href="https://paystack.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: C.orange, textDecoration: 'none', fontWeight: 600 }}>Paystack's Terms</a>.</P>
                            <H3>8.2 Escrow</H3>
                            <Ul items={[
                                'Funds are held in escrow upon successful payment',
                                'Released to the Seller when the Buyer confirms receipt, or automatically after the 7-day dispute window closes',
                                'Held pending resolution if a dispute is raised under Section 11',
                            ]} />
                            <H3>8.3 Seller payouts</H3>
                            <P>Payouts to verified Nigerian bank accounts are processed within <strong style={{ color: C.white }}>3–5 business days</strong> of a withdrawal request. Flockr may withhold payouts during fraud investigations.</P>
                            <H3>8.4 Service fees</H3>
                            <P>Flockr charges Sellers a transaction fee on completed sales. Current rates are at <strong style={{ color: C.orange }}>flockr.ng/fees</strong> and may change with 30 days' notice.</P>
                            <Card title="Flockr is not a bank" titleColor={C.yellow} bg={C.yellowDim} border="rgba(251,191,36,0.18)">
                                Flockr is not a financial institution. We are not liable for payment processing errors or delays attributable to Paystack or banking infrastructure beyond our control.
                            </Card>
                        </section>

                        {/* 9. Logistics */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="logistics" icon={RiTruckLine}>Shipping and Logistics — TShip</H2>
                            <P>Shipping is facilitated through <strong style={{ color: C.white }}>TShip</strong> and its carrier network, subject to TShip's own terms.</P>
                            <H3>Seller responsibilities</H3>
                            <Ul items={[
                                'Accurately describe product dimensions and weight for shipping calculations',
                                'Package goods appropriately for transit',
                                'Book shipment promptly upon order confirmation',
                                'Provide accurate pick-up address information',
                            ]} />
                            <Card title="Flockr is not liable for logistics failures" titleColor={C.yellow} bg={C.yellowDim} border="rgba(251,191,36,0.18)">
                                Flockr is not liable for loss, damage, delay, or incorrect delivery of goods during transit. Shipping complaints should be raised with TShip through the tracking interface.
                            </Card>
                        </section>

                        {/* 10. Prohibited */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="prohibited" icon={RiCloseLine}>Prohibited Conduct</H2>
                            <P>Users must not:</P>
                            <Table rows={[
                                ['Fraud',             'Engage in fraudulent transactions, chargeback fraud, price manipulation, or false dispute submissions.'],
                                ['Impersonation',     'Impersonate any person, entity, or brand.'],
                                ['Security attacks',  'Attempt to circumvent authentication, security measures, or access controls.'],
                                ['Scraping',          'Extract Platform data without written authorisation from Flockr.'],
                                ['Malicious code',    'Upload viruses, malware, or any harmful code.'],
                                ['Harassment',        'Harass, threaten, or intimidate other users.'],
                                ['Automated abuse',   'Use bots or scripts to interact with the Platform without written authorisation.'],
                                ['Legal violations',  'Violate any applicable Nigerian or international law.'],
                            ]} />
                            <P>Violations may result in immediate account suspension or permanent termination, without prejudice to civil or criminal remedies.</P>
                        </section>

                        {/* 11. Disputes */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="disputes" icon={RiCustomerServiceLine}>Buyer Protection and Dispute Resolution</H2>
                            <H3>11.1 When you're protected</H3>
                            <Ul items={[
                                'Item not delivered within the Seller\'s stated timeframe plus a 5-day grace period',
                                'Item received is materially different from the listing',
                                'Item is damaged, defective, or counterfeit',
                            ]} />
                            <Card title="7-day dispute window" titleColor={C.blue} bg={C.blueDim} border="rgba(59,130,246,0.18)">
                                Disputes must be raised within 7 days of the marked delivery date through the Platform's dispute interface.
                            </Card>
                            <H3>11.2 How disputes work</H3>
                            <Ul items={[
                                'Flockr notifies the Seller and requests a response within 48 hours',
                                'Both parties submit evidence (photos, messages, tracking info)',
                                'Flockr issues a determination within 5 business days',
                                "Flockr's determination is binding on both parties as a condition of using the Platform",
                            ]} />
                            <H3>11.3 External remedies</H3>
                            <P>Nothing in these Terms limits your statutory rights under the Federal Competition and Consumer Protection Act 2018. You may escalate unresolved disputes to the FCCPC or competent courts in Ogun State.</P>
                        </section>

                        {/* 12. IP */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="ip" icon={RiCopyrightLine}>Intellectual Property — Flockr</H2>
                            <P>All intellectual property in the Platform — including the Flockr name, logo, software, source code, design, and algorithms — is owned by <strong style={{ color: C.white }}>Flockr Technologies Limited</strong> and protected under the Nigerian Copyright Act 2022 and the Trade Marks Act, Cap T13, LFN 2004.</P>
                            <P>You are granted a limited, non-exclusive, non-transferable, revocable licence to use the Platform for its intended purpose. You may not reproduce, modify, distribute, reverse-engineer, or create derivative works from any Platform intellectual property.</P>
                        </section>

                        {/* 13. Disclaimers */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="disclaimers" icon={RiAlertLine}>Disclaimers</H2>
                            <Table rows={[
                                ['"As is" provision',         'The Services are provided on an "as is" and "as available" basis without warranties of any kind — express or implied — including merchantability, fitness for a particular purpose, or uninterrupted operation.'],
                                ['Third-party content',       'Flockr does not warrant the accuracy, completeness, or reliability of any UGC, product listing, or third-party content on the Platform.'],
                                ['Service availability',      'Flockr does not guarantee continuous access to the Services and is not liable for downtime due to maintenance or events beyond its control.'],
                            ]} />
                        </section>

                        {/* 14. Liability */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="liability" icon={RiScalesLine}>Limitation of Liability</H2>
                            <Card title="Read carefully" titleColor={C.yellow} bg={C.yellowDim} border="rgba(251,191,36,0.18)">
                                This section limits Flockr's financial exposure. Nothing here excludes liability for death or personal injury caused by gross negligence, fraud, or any liability that cannot lawfully be excluded under Nigerian law.
                            </Card>
                            <Table rows={[
                                ['Aggregate cap',           "Flockr's total liability for all claims shall not exceed the greater of: (i) fees you paid to Flockr in the 12 months before the claim; or (ii) ₦50,000."],
                                ['Consequential loss',      'Flockr is not liable for indirect, incidental, special, or consequential damages — including loss of profits, data, or business opportunity.'],
                                ['Third-party reliance',    'Flockr is not liable for loss arising from your reliance on information provided by other users.'],
                            ]} />
                            <H3>Indemnification</H3>
                            <P>You agree to indemnify Flockr and its officers, directors, and employees against any claims, liabilities, damages, or legal fees arising from: your violation of these Terms; your content; your use of the Services; or your violation of any third-party right or applicable law.</P>
                        </section>

                        {/* 15. Termination */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="termination" icon={RiErrorWarningLine}>Term and Termination</H2>
                            <H3>Termination by you</H3>
                            <P>Close your account at any time via <strong style={{ color: C.white }}>Settings → Account → Delete Account</strong>. Pending transactions must be resolved first.</P>
                            <H3>Termination by Flockr</H3>
                            <P>Flockr may suspend or terminate your account at any time, with or without notice, where:</P>
                            <Ul items={[
                                'You breach these Terms',
                                'We are required to do so by law or a competent authority',
                                'Your account poses a risk to other users or the Platform',
                                'Your account has been inactive for more than 24 consecutive months',
                            ]} />
                            <H3>Effect of termination</H3>
                            <P>Your licence to use the Services ends immediately on termination. Sections 6.1, 12, 13, 14, and 16 survive termination.</P>
                        </section>

                        {/* 16. Governing Law */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="governing" icon={RiScalesLine}>Governing Law and Dispute Resolution</H2>
                            <Table rows={[
                                ['Governing law',       'These Terms are governed by the laws of the Federal Republic of Nigeria, with particular reference to the laws in force in Ogun State.'],
                                ['Amicable resolution', 'Before formal proceedings, both parties agree to attempt good-faith resolution within 30 days of written notice.'],
                                ['Jurisdiction',        'All disputes shall be subject to the exclusive jurisdiction of the courts of Ogun State, Nigeria.'],
                                ['Class action waiver', 'You waive any right to bring or participate in a class action or representative proceeding against Flockr, to the extent permitted by law.'],
                            ]} />
                        </section>

                        {/* 17. General */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="general" icon={RiCheckboxCircleLine}>General Provisions</H2>
                            <Table rows={[
                                ['Entire agreement', 'These Terms, together with the Privacy Policy, constitute the entire agreement between you and Flockr regarding the Services.'],
                                ['Amendments',       'Flockr may amend these Terms at any time. Material changes will be communicated at least 14 days before they take effect. Continued use constitutes acceptance.'],
                                ['Severability',     'If any provision is found invalid, it will be modified to the minimum extent necessary. All other provisions remain in force.'],
                                ['Waiver',           "Failure to enforce any provision is not a waiver of that right."],
                                ['Assignment',       "You may not assign your rights without Flockr's written consent. Flockr may assign its rights in connection with a merger or acquisition."],
                                ['Force majeure',    'Flockr is not liable for failure or delay caused by events beyond its reasonable control, including acts of God, war, power failures, or internet outages.'],
                            ]} />
                        </section>

                        {/* 18. Contact */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="contact" icon={RiMailLine}>Contact Information</H2>
                            <P>For legal notices, IP claims, or general enquiries:</P>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 20 }}>
                                {[
                                    ['General Legal',  'legal@flockr.ng'],
                                    ['IP & Takedown',  'ip@flockr.ng'],
                                    ['Privacy / DPO',  'privacy@flockr.ng'],
                                    ['Address',        'Ogun State, Nigeria'],
                                ].map(([label, val]) => (
                                    <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                                        <p style={{ color: C.faint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>{label}</p>
                                        <p style={{ color: C.white, fontSize: 13, fontWeight: 600, margin: 0, wordBreak: 'break-all' }}>{val}</p>
                                    </div>
                                ))}
                            </div>
                            <Card title="Response time" titleColor={C.green} bg={C.greenDim} border="rgba(16,185,129,0.18)">
                                We acknowledge all legal notices within <strong style={{ color: C.white }}>48 hours</strong> and provide a substantive response within <strong style={{ color: C.white }}>14 business days</strong>.
                            </Card>
                        </section>

                        {/* Footer */}
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ color: C.faint, fontSize: 12 }}>© {new Date().getFullYear()} Flockr Technologies Limited</span>
                            <div style={{ display: 'flex', gap: 14 }}>
                                <Link href="/terms"   style={{ color: C.orange, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Terms of Service</Link>
                                <Link href="/privacy" style={{ color: C.muted,  fontSize: 12, textDecoration: 'none' }}>Privacy Policy</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Back to top */}
            {showTop && (
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ position: 'fixed', bottom: 24, right: 18, width: 40, height: 40, borderRadius: '50%', background: C.orange, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,107,53,0.4)', zIndex: 40 }}>
                    <RiArrowUpLine size={17} color="#fff" />
                </button>
            )}
        </div>
    )
}