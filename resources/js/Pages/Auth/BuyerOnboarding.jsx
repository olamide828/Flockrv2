import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useState } from 'react';
import {
    RiArrowLeftLine,
    RiArrowRightLine,
    RiBearSmileLine,
    RiBookLine,
    RiCapsuleLine,
    RiCarLine,
    RiCheckLine,
    RiFootballLine,
    RiGamepadLine,
    RiHandbagLine,
    RiHeartLine,
    RiHome4Line,
    RiLeafLine,
    RiMapPinLine,
    RiMoreLine,
    RiPaintBrushLine,
    RiPaletteLine,
    RiRestaurantLine,
    RiShirtLine,
    RiSmartphoneLine,
    RiSparklingLine,
    RiUserSmileLine,
} from 'react-icons/ri';

const INTERESTS = [
    { label: 'Fashion & Clothing', Icon: RiShirtLine },
    { label: 'Beauty & Skincare', Icon: RiPaintBrushLine },
    { label: 'Electronics & Gadgets', Icon: RiSmartphoneLine },
    { label: 'Food & Drinks', Icon: RiRestaurantLine },
    { label: 'Home & Living', Icon: RiHome4Line },
    { label: 'Health & Wellness', Icon: RiCapsuleLine },
    { label: 'Accessories & Jewelry', Icon: RiHandbagLine },
    { label: 'Kids & Baby', Icon: RiBearSmileLine },
    { label: 'Books & Education', Icon: RiBookLine },
    { label: 'Gaming', Icon: RiGamepadLine },
    { label: 'Auto Parts', Icon: RiCarLine },
    { label: 'Sports & Fitness', Icon: RiFootballLine },
    { label: 'Organic & Natural', Icon: RiLeafLine },
    { label: 'Art & Crafts', Icon: RiPaletteLine },
    { label: 'Other', Icon: RiMoreLine },
];

const BUDGET_OPTIONS = [
    { value: 'under_5k', label: 'Under ₦5,000', sub: 'Budget-friendly finds' },
    { value: '5k_20k', label: '₦5,000 – ₦20,000', sub: 'Mid-range products' },
    { value: '20k_50k', label: '₦20,000 – ₦50,000', sub: 'Premium picks' },
    { value: 'above_50k', label: 'Above ₦50,000', sub: 'Luxury & high-end' },
    { value: 'no_limit', label: 'No limit', sub: 'Show me everything' },
];

const MIN_INTERESTS = 3;

export default function BuyerOnboarding() {
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;

    const { data, setData, post, processing } = useForm({
        interests: [],
        budget: '',
        location: '',
    });

    const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    const prev = () => setStep((s) => Math.max(s - 1, 1));

    const [interests, setInterests] = useState([]);

    const toggleInterest = (label) => {
        setInterests((prev) => {
            const next = prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label];
            setData('interests', next); // sync to form after updating local state
            return next;
        });
    };

       const submit = async (e) => {
        e.preventDefault()
        // Refresh CSRF cookie before submitting
        await axios.get('/sanctum/csrf-cookie')
        post('/onboarding')
    }
    

    const skip = () => post('/onboarding/skip');

    return (
        <>
            <Head title="Personalize Your Feed" />
            <div style={{ minHeight: '100vh', background: 'var(--flockr-black)', display: 'flex', flexDirection: 'column' }}>
                {/* Top bar */}
                <div
                    style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}
                >
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#fff' }}>
                        flockr<span style={{ color: 'var(--flockr-orange)' }}>.</span>
                    </span>
                    <button
                        onClick={skip}
                        style={{ background: 'none', border: 'none', color: 'var(--flockr-muted)', fontSize: 13, cursor: 'pointer' }}
                    >
                        Skip for now
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${(step / TOTAL_STEPS) * 100}%`,
                            background: 'var(--flockr-orange)',
                            transition: 'width 0.4s ease',
                        }}
                    />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
                    <div style={{ width: '100%', maxWidth: 480 }}>
                        {/* ── Step 1: Interests ─────────────────────────────────── */}
                        {step === 1 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ marginBottom: 28, textAlign: 'center' }}>
                                    <div
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 20,
                                            margin: '0 auto 16px',
                                            background: 'rgba(255,92,0,0.12)',
                                            border: '1px solid rgba(255,92,0,0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <RiHeartLine size={28} color="var(--flockr-orange)" />
                                    </div>
                                    <h1
                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 0 8px' }}
                                    >
                                        What are you into?
                                    </h1>
                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: 0 }}>
                                        Pick at least {MIN_INTERESTS} — we'll personalise your feed and show you products you'll love
                                    </p>
                                </div>

                                {/* Selected count */}
                                {data.interests.length > 0 && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            marginBottom: 14,
                                            padding: '8px 12px',
                                            background: 'rgba(255,92,0,0.08)',
                                            border: '1px solid rgba(255,92,0,0.2)',
                                            borderRadius: 10,
                                        }}
                                    >
                                        <RiCheckLine size={14} color="var(--flockr-orange)" />
                                        <span style={{ color: 'var(--flockr-orange)', fontSize: 13, fontWeight: 600 }}>
                                            {data.interests.length} selected
                                            {data.interests.length < MIN_INTERESTS && ` — pick ${MIN_INTERESTS - data.interests.length} more`}
                                        </span>
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 8,
                                        maxHeight: 400,
                                        overflowY: 'auto',
                                        paddingRight: 4,
                                    }}
                                >
                                    {INTERESTS.map(({ label, Icon }) => {
                                        const active = data.interests.includes(label);
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => toggleInterest(label)}
                                                style={{
                                                    padding: '12px 14px',
                                                    background: active ? 'rgba(255,92,0,0.12)' : 'var(--flockr-card)',
                                                    border: `1.5px solid ${active ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.07)'}`,
                                                    borderRadius: 10,
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'all 0.15s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}
                                            >
                                                <Icon
                                                    size={16}
                                                    color={active ? 'var(--flockr-orange)' : 'var(--flockr-muted)'}
                                                    style={{ flexShrink: 0 }}
                                                />
                                                <span
                                                    style={{
                                                        color: active ? '#fff' : 'var(--flockr-muted)',
                                                        fontSize: 13,
                                                        fontWeight: active ? 600 : 400,
                                                    }}
                                                >
                                                    {label}
                                                </span>
                                                {active && (
                                                    <RiCheckLine
                                                        size={13}
                                                        color="var(--flockr-orange)"
                                                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={next}
                                    disabled={data.interests.length < MIN_INTERESTS}
                                    style={{ ...primaryBtn, marginTop: 24, opacity: data.interests.length < MIN_INTERESTS ? 0.5 : 1 }}
                                >
                                    <span>Continue</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            </div>
                        )}

                        {/* ── Step 2: Budget range ──────────────────────────────── */}
                        {step === 2 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ marginBottom: 28, textAlign: 'center' }}>
                                    <div
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 20,
                                            margin: '0 auto 16px',
                                            background: 'rgba(255,92,0,0.12)',
                                            border: '1px solid rgba(255,92,0,0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <RiSparklingLine size={28} color="var(--flockr-orange)" />
                                    </div>
                                    <h1
                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 0 8px' }}
                                    >
                                        What's your budget?
                                    </h1>
                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: 0 }}>
                                        We'll show you products within your price range
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {BUDGET_OPTIONS.map((opt) => {
                                        const active = data.budget === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setData('budget', opt.value)}
                                                style={{
                                                    padding: '14px 16px',
                                                    background: active ? 'rgba(255,92,0,0.12)' : 'var(--flockr-card)',
                                                    border: `1.5px solid ${active ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.08)'}`,
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <div style={{ textAlign: 'left' }}>
                                                    <p style={{ color: '#fff', fontSize: 14, fontWeight: active ? 700 : 500, margin: 0 }}>
                                                        {opt.label}
                                                    </p>
                                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 12, margin: '2px 0 0' }}>{opt.sub}</p>
                                                </div>
                                                {active && (
                                                    <div
                                                        style={{
                                                            width: 22,
                                                            height: 22,
                                                            borderRadius: '50%',
                                                            background: 'var(--flockr-orange)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <RiCheckLine size={13} color="#fff" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                                    <button type="button" onClick={prev} style={ghostBtn}>
                                        <RiArrowLeftLine size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={next}
                                        disabled={!data.budget}
                                        style={{ ...primaryBtn, flex: 1, opacity: !data.budget ? 0.5 : 1 }}
                                    >
                                        <span>Continue</span>
                                        <RiArrowRightLine size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Location ─────────────────────────────────── */}
                        {step === 3 && (
                            <form onSubmit={submit} style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ marginBottom: 28, textAlign: 'center' }}>
                                    <div
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 20,
                                            margin: '0 auto 16px',
                                            background: 'rgba(255,92,0,0.12)',
                                            border: '1px solid rgba(255,92,0,0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <RiMapPinLine size={28} color="var(--flockr-orange)" />
                                    </div>
                                    <h1
                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 0 8px' }}
                                    >
                                        Where are you?
                                    </h1>
                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: 0 }}>
                                        We'll show you sellers near you and local deals
                                    </p>
                                </div>

                                <div style={{ position: 'relative', marginBottom: 14 }}>
                                    <RiMapPinLine
                                        size={16}
                                        color="var(--flockr-muted)"
                                        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                                    />
                                    <input
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        placeholder="e.g. Lagos, Abuja, Port Harcourt..."
                                        style={{ ...inputStyle, paddingLeft: 38 }}
                                    />
                                </div>

                                {/* Summary card */}
                                <div
                                    style={{
                                        background: 'var(--flockr-card)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 14,
                                        padding: 16,
                                        marginBottom: 8,
                                    }}
                                >
                                    <p
                                        style={{
                                            color: 'var(--flockr-muted)',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.07em',
                                            margin: '0 0 12px',
                                        }}
                                    >
                                        Your preferences
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <RiHeartLine size={14} color="var(--flockr-orange)" style={{ marginTop: 2, flexShrink: 0 }} />
                                            <div>
                                                <p
                                                    style={{
                                                        color: 'var(--flockr-muted)',
                                                        fontSize: 11,
                                                        margin: '0 0 3px',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                    }}
                                                >
                                                    Interests
                                                </p>
                                                <p style={{ color: '#fff', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                                                    {data.interests.join(' · ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                            <RiSparklingLine size={14} color="var(--flockr-orange)" style={{ marginTop: 2, flexShrink: 0 }} />
                                            <div>
                                                <p
                                                    style={{
                                                        color: 'var(--flockr-muted)',
                                                        fontSize: 11,
                                                        margin: '0 0 3px',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                    }}
                                                >
                                                    Budget
                                                </p>
                                                <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>
                                                    {BUDGET_OPTIONS.find((b) => b.value === data.budget)?.label}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                    <button type="button" onClick={prev} style={ghostBtn}>
                                        <RiArrowLeftLine size={16} /> Back
                                    </button>
                                    <button type="submit" disabled={processing} style={{ ...primaryBtn, flex: 1, opacity: processing ? 0.7 : 1 }}>
                                        <RiUserSmileLine size={17} />
                                        <span>{processing ? 'Setting up...' : 'Start Shopping'}</span>
                                    </button>
                                </div>

                                <p style={{ textAlign: 'center', color: 'var(--flockr-subtle)', fontSize: 12, margin: '14px 0 0' }}>
                                    You can update these anytime in Settings
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: var(--flockr-orange) !important; outline: none; box-shadow: 0 0 0 3px rgba(255,92,0,0.12); }
        input::placeholder { color: var(--flockr-subtle); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
        </>
    );
}

const inputStyle = {
    width: '100%',
    padding: '13px 14px',
    background: 'var(--flockr-card)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const primaryBtn = {
    width: '100%',
    padding: '15px',
    background: 'var(--flockr-orange)',
    border: 'none',
    borderRadius: 999,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
};

const ghostBtn = {
    padding: '15px 20px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 999,
    color: 'var(--flockr-muted)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
};
