import { useState, useEffect, useRef } from 'react'
import { Link, Head } from '@inertiajs/react'
import {
    RiShieldCheckLine, RiEyeLine, RiDatabase2Line,
    RiShareForwardLine, RiLockPasswordLine, RiUserLine,
    RiAlertLine, RiMailLine, RiArrowRightSLine,
    RiCheckboxCircleLine, RiArrowUpLine,
} from 'react-icons/ri'

import { LuCookie } from "react-icons/lu";

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
    { id: 'overview',  icon: RiShieldCheckLine,    label: 'Overview'           },
    { id: 'collect',   icon: RiDatabase2Line,      label: 'What We Collect'    },
    { id: 'use',       icon: RiEyeLine,            label: 'How We Use It'      },
    { id: 'feed',      icon: RiDatabase2Line,      label: 'Feed & Tracking'    },
    { id: 'sharing',   icon: RiShareForwardLine,   label: 'Data Sharing'       },
    { id: 'retention', icon: RiDatabase2Line,      label: 'Data Retention'     },
    { id: 'security',  icon: RiLockPasswordLine,   label: 'Security'           },
    { id: 'rights',    icon: RiUserLine,           label: 'Your Rights'        },
    { id: 'children',  icon: RiAlertLine,          label: "Children's Privacy" },
    { id: 'cookies',   icon: LuCookie,         label: 'Cookie Policy'      },
    { id: 'changes',   icon: RiCheckboxCircleLine, label: 'Policy Changes'     },
    { id: 'contact',   icon: RiMailLine,           label: 'Contact & DPO'      },
]

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

function RightRow({ right, desc, how }) {
    return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <RiCheckboxCircleLine size={13} color={C.green} />
                <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{right}</span>
            </div>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 5px' }}>{desc}</p>
            <p style={{ color: C.orange, fontSize: 12, fontWeight: 600, margin: 0 }}>How → {how}</p>
        </div>
    )
}

function TOC({ active, onSelect, mobileOpen, onMobileClose }) {
    return (
        <>
            {mobileOpen && (
                <div onClick={onMobileClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 48 }} />
            )}
            <nav style={{
                width: 210, flexShrink: 0,
                position: 'sticky', top: 68, alignSelf: 'flex-start',
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 14, padding: '14px 10px',
                maxHeight: 'calc(100vh - 88px)', overflowY: 'auto',
                scrollbarWidth: 'none',
                // Mobile: fixed overlay
                ...(mobileOpen !== undefined && {
                    '@media (max-width: 768px)': mobileOpen
                        ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 49, borderRadius: 0, width: '100%', maxHeight: '100vh' }
                        : { display: 'none' },
                }),
            }} className={`pp-toc${mobileOpen ? ' pp-toc--open' : ''}`}>
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
                                width: '100%', padding: '8px 10px', borderRadius: 8,
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

export default function PrivacyPolicy() {
    const [active,    setActive]    = useState('overview')
    const [tocOpen,   setTocOpen]   = useState(false)
    const [showTop,   setShowTop]   = useState(false)

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
        <>
        <Head title="Privacy Policy" />
        <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            <style>{`
                .pp-toc { display: flex; flex-direction: column; }
                .pp-layout { display: flex; gap: 36px; align-items: flex-start; }
                @media (max-width: 768px) {
                    .pp-toc { display: none !important; }
                    .pp-toc--open { display: flex !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 49 !important; border-radius: 0 !important; width: 100% !important; max-height: 100vh !important; overflow-y: auto !important; padding: 24px 16px !important; }
                    .pp-layout { flex-direction: column !important; gap: 0 !important; }
                    .pp-toc-btn { display: flex !important; }
                    .pp-meta { flex-wrap: wrap !important; gap: 16px !important; }
                }
                @media (min-width: 769px) { .pp-toc-btn { display: none !important; } }
                .pp-toc::-webkit-scrollbar { display: none; }
            `}</style>

            {/* Header */}
            <div style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: 1040, margin: '0 auto', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <span style={{ color: C.orange, fontWeight: 900, fontSize: 19, letterSpacing: '-1px' }}>flockr</span>
                        </Link>
                        <span style={{ color: C.border, fontSize: 16 }}>|</span>
                        <span style={{ color: C.muted, fontSize: 13 }}>Privacy & Cookie Policy</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: C.greenDim, border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: C.green }}>NDPA 2023</span>
                        <button className="pp-toc-btn" onClick={() => setTocOpen(o => !o)} style={{ display: 'none', alignItems: 'center', gap: 5, padding: '7px 12px', background: C.orangeDim, border: `1px solid ${C.orangeMid}`, borderRadius: 8, cursor: 'pointer', color: C.orange, fontSize: 12, fontWeight: 700 }}>
                            Contents
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.05) 0%, transparent 55%)', borderBottom: `1px solid ${C.border}`, padding: '44px 20px 36px' }}>
                <div style={{ maxWidth: 1040, margin: '0 auto' }}>
                    <h1 style={{ color: C.white, fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px', lineHeight: 1.15 }}>
                        Your data, your rights.<br />
                        <span style={{ color: C.orange }}>No surprises.</span>
                    </h1>
                    <p style={{ color: C.muted, fontSize: 14, maxWidth: 500, lineHeight: 1.7, margin: '0 0 22px' }}>
                        This policy explains exactly what Flockr collects, why, and what you can do about it — in plain language, compliant with the Nigeria Data Protection Act 2023.
                    </p>
                    <div className="pp-meta" style={{ display: 'flex', gap: 28 }}>
                        {[['Effective', '1 July 2025'], ['Governing Law', 'Ogun State, Nigeria'], ['DPO Contact', 'privacy@flockr.ng']].map(([k, v]) => (
                            <div key={k}>
                                <p style={{ color: C.faint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{k}</p>
                                <p style={{ color: C.white, fontSize: 13, fontWeight: 600, margin: 0 }}>{v}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 20px 80px' }}>
                <div className="pp-layout" style={{ display: 'flex', gap: 36, alignItems: 'flex-start' }}>

                    <TOC active={active} onSelect={setActive} mobileOpen={tocOpen} onMobileClose={() => setTocOpen(false)} />

                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* 1. Overview */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="overview" icon={RiShieldCheckLine}>Overview</H2>
                            <Card title="Summary" titleColor={C.green} bg={C.greenDim} border="rgba(16,185,129,0.18)">
                                We collect data to run Flockr, personalise your feed, process payments, and keep the platform safe. We do not sell your personal data. You can request access, correction, or deletion of your data by emailing privacy@flockr.ng.
                            </Card>
                            <P>This Privacy Policy applies to all users of the Flockr platform — Buyers, Sellers, and visitors — and governs all personal data processed by <strong style={{ color: C.white }}>Flockr Technologies Limited</strong>, registered in Nigeria with its principal place of business in Ogun State.</P>
                            <P>Flockr operates as a Data Controller under the Nigeria Data Protection Act 2023 ("NDPA") and the Nigeria Data Protection Regulation 2019 ("NDPR"). Our Data Protection Officer can be reached at <strong style={{ color: C.orange }}>privacy@flockr.ng</strong>.</P>
                        </section>

                        {/* 2. What We Collect */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="collect" icon={RiDatabase2Line}>What We Collect</H2>
                            <H3>Data you give us directly</H3>
                            <Table rows={[
                                ['Account data',      'Name, email, phone number, username, password (stored as a hash — we never see it in plain text), profile photo, bio, and city/state location.'],
                                ['Seller data',       'Bank account details collected via Paystack for payouts. Government-issued ID submitted during Seller verification.'],
                                ['Order data',        'Delivery name, address, order details, and any dispute communications.'],
                                ['Messages',          'In-app chat messages between Buyers and Sellers.'],
                                ['Content',           'Videos, photos, product descriptions, hashtags, comments, and reviews you upload or post.'],
                                ['Support requests',  'Messages you send us and reports you make about other users or content.'],
                            ]} />
                            <H3>Data we collect automatically</H3>
                            <Table rows={[
                                ['Feed behaviour',    'Video watch time, completion rate, skip events, likes, saves, shares, comments, product clicks, cart additions, and purchases. Used only to personalise your feed — see Section 4.'],
                                ['Device & browser',  'Device type, OS, and browser version. Used only to display the app correctly on your device.'],
                                ['Log data',          'IP address, access timestamps, and error logs. Retained for security and debugging.'],
                                ['Session cookie',    'A session token that keeps you logged in. See Section 10 (Cookie Policy).'],
                            ]} />
                            <Card title="What we do not collect right now" titleColor={C.blue} bg={C.blueDim} border="rgba(59,130,246,0.18)">
                                We do not run advertising trackers, collect precise GPS location, or build cross-site profiles. If this changes, we will notify you before it takes effect.
                            </Card>
                        </section>

                        {/* 3. How We Use It */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="use" icon={RiEyeLine}>How We Use Your Data</H2>
                            <Table rows={[
                                ['Running the platform',       'Accounts, orders, Seller payouts, in-app chat. Legal basis: performance of contract.'],
                                ['Feed personalisation',       'Curating your For You feed. Legal basis: legitimate interests. See Section 4.'],
                                ['Safety & fraud prevention',  'Detecting abuse, verifying identity, resolving disputes. Legal basis: legitimate interests / legal obligation.'],
                                ['Order notifications',        'Email and in-app alerts about your orders and account. Legal basis: performance of contract.'],
                                ['Marketing emails',           'Promotional messages only if you opt in. Unsubscribe at any time. Legal basis: consent.'],
                                ['Legal compliance',           'Responding to court orders, regulatory requests, and tax obligations. Legal basis: legal obligation.'],
                            ]} />
                        </section>

                        {/* 4. Feed & Tracking */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="feed" icon={RiDatabase2Line}>Feed Algorithm & Behavioural Tracking</H2>
                            <Card title="Why we track this" titleColor={C.blue} bg={C.blueDim} border="rgba(59,130,246,0.18)">
                                Flockr's For You feed is the core of the product. Without knowing what you engage with, everyone would see the same generic content. These signals are used only to personalise your feed — not shared with advertisers.
                            </Card>
                            <H3>What we track</H3>
                            <Ul items={[
                                'Video watch time and completion percentage',
                                'Skip events — videos you swipe past in under 2 seconds',
                                'Likes, saves, shares, and comments',
                                'Product clicks, cart additions, and purchases',
                                'Seller follows and unfollows',
                            ]} />
                            <H3>How it works</H3>
                            <P>These signals build an interest profile — affinity scores across sellers, categories, and hashtags. Scores decay over time so your feed reflects current interests. No human reviews your individual profile; the process is fully automated.</P>
                            <H3>Legal basis & opting out</H3>
                            <P>Feed personalisation is processed on the basis of <strong style={{ color: C.white }}>legitimate interests</strong>. You may object at any time by emailing <strong style={{ color: C.orange }}>privacy@flockr.ng</strong> and we will serve you trending content instead of a personalised feed.</P>
                        </section>

                        {/* 5. Sharing */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="sharing" icon={RiShareForwardLine}>Data Sharing</H2>
                            <Card title="We do not sell your data" titleColor={C.yellow} bg={C.yellowDim} border="rgba(251,191,36,0.18)">
                                Flockr does not sell, rent, or trade your personal data to advertisers, data brokers, or any third party for their own commercial purposes.
                            </Card>
                            <Table rows={[
                                ['Paystack',         'Bank account details and payment verification processed by Paystack Payments Limited (CBN-regulated) for payouts and payment handling.'],
                                ['TShip',            'Delivery name and address shared with TShip and its carrier network solely to fulfil your order.'],
                                ['Between users',    'When a Buyer places an order, delivery details go to the Seller and logistics partner. Sellers\' public profiles are visible to all users.'],
                                ['Law enforcement',  'Where required by law, court order, or regulatory request from the NDPC, NITDA, FCCPC, or other competent authority.'],
                                ['Business transfer','If Flockr is acquired or merges, your data may transfer to the successor. We will notify you 30 days in advance.'],
                            ]} />
                        </section>

                        {/* 6. Retention */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="retention" icon={RiDatabase2Line}>Data Retention</H2>
                            <P>We keep your data only as long as needed for the purpose it was collected, or as required by law.</P>
                            <Table rows={[
                                ['Account data',        'Duration of your account plus 12 months after deletion.'],
                                ['Transaction records', '7 years from transaction date, as required by Nigerian financial regulations.'],
                                ['Feed behaviour',      'Rolling 24-month window. Raw events older than 24 months are aggregated and deleted.'],
                                ['Chat messages',       'Until deleted by either party, subject to any active dispute hold.'],
                                ['Content you post',    'Until you delete it, plus 90 days in backups.'],
                                ['Deleted accounts',    'Most data deleted within 30 days of account closure.'],
                            ]} />
                        </section>

                        {/* 7. Security */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="security" icon={RiLockPasswordLine}>Security</H2>
                            <Ul items={[
                                'All data in transit is encrypted using TLS 1.2 or higher',
                                'Passwords are hashed and salted — we cannot recover your password, only reset it',
                                'Access to personal data is restricted to staff who need it, and is logged',
                                'Payment data is handled by Paystack — we never store card numbers',
                            ]} />
                            <Card title="Data breach notification" titleColor={C.yellow} bg={C.yellowDim} border="rgba(251,191,36,0.18)">
                                If we become aware of a breach that poses a risk to your rights, we will notify the NDPC within 72 hours and notify affected users by email without undue delay, per Section 40 of the NDPA 2023.
                            </Card>
                        </section>

                        {/* 8. Rights */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="rights" icon={RiUserLine}>Your Rights</H2>
                            <P>Under the NDPA 2023, you have the following rights. Email <strong style={{ color: C.orange }}>privacy@flockr.ng</strong> to exercise any of them. We will respond within 30 days.</P>
                            <RightRow right="Access" desc="Request a copy of the personal data we hold about you." how="Email privacy@flockr.ng — Subject: Data Access Request" />
                            <RightRow right="Correction" desc="Ask us to correct inaccurate or incomplete data." how="Settings → Edit Profile, or email privacy@flockr.ng" />
                            <RightRow right="Deletion" desc="Request deletion of your account and personal data, subject to legal retention requirements." how="Settings → Account → Delete Account, or email privacy@flockr.ng" />
                            <RightRow right="Object to processing" desc="Object to feed personalisation or other processing based on legitimate interests." how="Email privacy@flockr.ng — we will stop personalising your feed" />
                            <RightRow right="Withdraw marketing consent" desc="Opt out of promotional emails at any time." how="Click Unsubscribe in any marketing email" />
                            <RightRow right="Lodge a complaint" desc="Complain to the Nigeria Data Protection Commission if you believe your rights have been violated." how="ndpc.gov.ng or info@ndpc.gov.ng" />
                            <Card title="Self-service coming soon" titleColor={C.blue} bg={C.blueDim} border="rgba(59,130,246,0.18)">
                                We are building a data download and consent management centre in your account settings. Until it is live, please contact us at privacy@flockr.ng for any data requests.
                            </Card>
                        </section>

                        {/* 9. Children */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="children" icon={RiAlertLine}>Children's Privacy</H2>
                            <Card title="Flockr is for users 18 and over" titleColor={C.red} bg={C.redDim} border="rgba(239,68,68,0.18)">
                                We do not knowingly collect personal data from anyone under 18. If you believe a minor has created an account, please contact <strong style={{ color: C.orange }}>privacy@flockr.ng</strong> and we will delete their data promptly.
                            </Card>
                        </section>

                        {/* 10. Cookies */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="cookies" icon={LuCookie}>Cookie Policy</H2>
                            <P>Cookies are small text files stored on your device. Flockr uses only the cookies necessary to operate the platform.</P>
                            <H3>Cookies we use</H3>
                            <Table rows={[
                                ['Session cookie',    'Keeps you logged in during your browser session. Expires when you close the browser or after 120 minutes of inactivity. Essential — cannot be disabled.'],
                                ['Remember me token', 'If you choose "Remember me" at login, keeps you logged in for up to 30 days. Cleared when you log out.'],
                                ['CSRF token',        'A security token that prevents cross-site request forgery attacks. Essential — cannot be disabled.'],
                            ]} />
                            <H3>What we do not use</H3>
                            <Ul items={[
                                'Third-party advertising or tracking cookies',
                                'Analytics cookies (Google Analytics, Mixpanel, etc.) — we use server-side logs only',
                                'Social media tracking pixels (Facebook Pixel, TikTok Pixel, etc.)',
                            ]} />
                            <Card title="No cookie banner needed right now" titleColor={C.green} bg={C.greenDim} border="rgba(16,185,129,0.18)">
                                Because we use only essential cookies, we are not currently required to show a consent banner under the NDPA 2023. If we introduce non-essential cookies in the future, we will add a consent mechanism and update this section.
                            </Card>
                            <P>You can delete cookies at any time through your browser settings. Deleting the session cookie will log you out of Flockr.</P>
                        </section>

                        {/* 11. Changes */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="changes" icon={RiCheckboxCircleLine}>Policy Changes</H2>
                            <P>We may update this policy as Flockr grows or as legal requirements change. When we make material changes:</P>
                            <Ul items={[
                                'We will post the updated policy here with a new "Last Updated" date',
                                'We will notify you by email at least 14 days before the change takes effect',
                                'Your continued use of Flockr after the effective date means you accept the updated policy',
                            ]} />
                        </section>

                        {/* 12. Contact */}
                        <section style={{ marginBottom: 48 }}>
                            <H2 id="contact" icon={RiMailLine}>Contact & DPO</H2>
                            <P>For any privacy question, data request, or concern:</P>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 20 }}>
                                {[
                                    ['Data Protection Officer', 'privacy@flockr.ng'],
                                    ['IP & Takedown',           'ip@flockr.ng'],
                                    ['General Legal',           'legal@flockr.ng'],
                                    ['Address',                 'Ogun State, Nigeria'],
                                ].map(([label, val]) => (
                                    <div key={label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                                        <p style={{ color: C.faint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>{label}</p>
                                        <p style={{ color: C.white, fontSize: 13, fontWeight: 600, margin: 0, wordBreak: 'break-all' }}>{val}</p>
                                    </div>
                                ))}
                            </div>
                            <Card title="Response time" titleColor={C.green} bg={C.greenDim} border="rgba(16,185,129,0.18)">
                                We acknowledge all privacy requests within <strong style={{ color: C.white }}>48 hours</strong> and provide a full response within <strong style={{ color: C.white }}>30 days</strong> as required by the NDPA 2023.
                            </Card>
                        </section>

                        {/* Footer */}
                        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ color: C.faint, fontSize: 12 }}>© {new Date().getFullYear()} Flockr Technologies Limited</span>
                            <div style={{ display: 'flex', gap: 14 }}>
                                <Link href="/terms"   style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>Terms of Service</Link>
                                <Link href="/privacy" style={{ color: C.orange, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link>
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
        </>
    )
}