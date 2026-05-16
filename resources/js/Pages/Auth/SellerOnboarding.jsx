import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    RiArrowLeftLine,
    RiArrowRightLine,
    RiBearSmileLine,
    RiBookLine,
    RiBuildingLine,
    RiCapsuleLine,
    RiCarLine,
    RiCheckLine,
    RiFootballLine,
    RiGamepadLine,
    RiHandbagLine,
    RiHome4Line,
    RiLeafLine,
    RiMapPinLine,
    RiMoreLine,
    RiPaintBrushLine,
    RiPaletteLine,
    RiRestaurantLine,
    RiRocketLine,
    RiShirtLine,
    RiShoppingBagLine,
    RiSmartphoneLine,
    RiStoreLine,
    RiUserLine,
    RiWhatsappLine,
} from 'react-icons/ri';

const CATEGORIES = [
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

const MAX_CATEGORIES = 3;

export default function SellerOnboarding() {
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;

    const { data, setData, post, processing, errors } = useForm({
        store_name: '',
        business_type: '',
        product_categories: [], // array, up to 3
        description: '',
        location: '',
        whatsapp: '',
    });

    const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    const prev = () => setStep((s) => Math.max(s - 1, 1));

    const [selectedCategories, setSelectedCategories] = useState([]);

    const toggleCategory = (label) => {
        setSelectedCategories((prev) => {
            if (prev.includes(label)) {
                const next = prev.filter((c) => c !== label);
                setData('product_categories', next);
                return next;
            }
            if (prev.length >= MAX_CATEGORIES) return prev;
            const next = [...prev, label];
            setData('product_categories', next);
            return next;
        });
    };

    const submit = (e) => {
        e.preventDefault();
        post('/seller/onboarding');
    };

    return (
        <>
            <Head title="Set Up Your Store" />
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
                    <span style={{ color: 'var(--flockr-muted)', fontSize: 13 }}>
                        Step {step} of {TOTAL_STEPS}
                    </span>
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
                        {/* ── Step 1: Store basics ─────────────────────────────── */}
                        {step === 1 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <div style={{ marginBottom: 32, textAlign: 'center' }}>
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
                                        <RiStoreLine size={28} color="var(--flockr-orange)" />
                                    </div>
                                    <h1
                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 0 8px' }}
                                    >
                                        Set up your store
                                    </h1>
                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: 0 }}>Tell buyers who you are and what you sell</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <Field label="Store / Business Name" error={errors.store_name}>
                                        <input
                                            value={data.store_name}
                                            onChange={(e) => setData('store_name', e.target.value)}
                                            placeholder="e.g. Adaeze Fabrics, ChiTech Store"
                                            style={inputStyle}
                                        />
                                    </Field>

                                    <Field label="Business Type" error={errors.business_type}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            {[
                                                { value: 'individual', Icon: RiUserLine, label: 'Individual', sub: 'Just me, selling my own stuff' },
                                                {
                                                    value: 'registered_business',
                                                    Icon: RiBuildingLine,
                                                    label: 'Registered Business',
                                                    sub: 'I have a registered company',
                                                },
                                            ].map((opt) => {
                                                const active = data.business_type === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setData('business_type', opt.value)}
                                                        style={{
                                                            padding: '14px 12px',
                                                            background: active ? 'rgba(255,92,0,0.12)' : 'var(--flockr-card)',
                                                            border: `1.5px solid ${active ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.08)'}`,
                                                            borderRadius: 12,
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <opt.Icon
                                                            size={18}
                                                            color={active ? 'var(--flockr-orange)' : 'var(--flockr-muted)'}
                                                            style={{ marginBottom: 8 }}
                                                        />
                                                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{opt.label}</p>
                                                        <p style={{ color: 'var(--flockr-muted)', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
                                                            {opt.sub}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.business_type && (
                                            <p style={{ color: 'var(--flockr-red)', fontSize: 12, margin: '5px 0 0' }}>{errors.business_type}</p>
                                        )}
                                    </Field>

                                    <Field label="WhatsApp Number (optional)" error={errors.whatsapp}>
                                        <div style={{ position: 'relative' }}>
                                            <RiWhatsappLine
                                                size={16}
                                                color="var(--flockr-muted)"
                                                style={{
                                                    position: 'absolute',
                                                    left: 14,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    pointerEvents: 'none',
                                                }}
                                            />
                                            <input
                                                value={data.whatsapp}
                                                onChange={(e) => setData('whatsapp', e.target.value)}
                                                placeholder="08012345678"
                                                type="tel"
                                                style={{ ...inputStyle, paddingLeft: 38 }}
                                            />
                                        </div>
                                        <p style={{ color: 'var(--flockr-subtle)', fontSize: 11, margin: '5px 0 0' }}>
                                            Buyers may contact you via WhatsApp for orders
                                        </p>
                                    </Field>
                                </div>

                                <button
                                    type="button"
                                    onClick={next}
                                    disabled={!data.store_name || !data.business_type}
                                    style={{ ...primaryBtn, marginTop: 28, opacity: !data.store_name || !data.business_type ? 0.5 : 1 }}
                                >
                                    <span>Continue</span>
                                    <RiArrowRightLine size={18} />
                                </button>
                            </div>
                        )}

                        {/* ── Step 2: What you sell (multi-select, up to 3) ────── */}
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
                                        <RiShoppingBagLine size={28} color="var(--flockr-orange)" />
                                    </div>
                                    <h1
                                        style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 0 8px' }}
                                    >
                                        What do you sell?
                                    </h1>
                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: 0 }}>
                                        Pick up to {MAX_CATEGORIES} categories that describe your products
                                    </p>
                                </div>

                                {/* Selected count pill */}
                                {data.product_categories.length > 0 && (
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
                                            {data.product_categories.length} of {MAX_CATEGORIES} selected
                                        </span>
                                        {data.product_categories.length >= MAX_CATEGORIES && (
                                            <span style={{ color: 'var(--flockr-muted)', fontSize: 12, marginLeft: 'auto' }}>Max reached</span>
                                        )}
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 8,
                                        maxHeight: 380,
                                        overflowY: 'auto',
                                        paddingRight: 4,
                                    }}
                                >
                                    {CATEGORIES.map(({ label, Icon }) => {
                                        const active = data.product_categories.includes(label);
                                        const maxed = !active && data.product_categories.length >= MAX_CATEGORIES;
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => toggleCategory(label)}
                                                disabled={maxed}
                                                style={{
                                                    padding: '12px 14px',
                                                    background: active ? 'rgba(255,92,0,0.12)' : 'var(--flockr-card)',
                                                    border: `1.5px solid ${active ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.07)'}`,
                                                    borderRadius: 10,
                                                    cursor: maxed ? 'not-allowed' : 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'all 0.15s',
                                                    opacity: maxed ? 0.4 : 1,
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
                                                        size={14}
                                                        color="var(--flockr-orange)"
                                                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                                                    />
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
                                        disabled={data.product_categories.length === 0}
                                        style={{ ...primaryBtn, flex: 1, opacity: data.product_categories.length === 0 ? 0.5 : 1 }}
                                    >
                                        <span>Continue</span>
                                        <RiArrowRightLine size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Store bio + location ─────────────────────── */}
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
                                        Almost done!
                                    </h1>
                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: 0 }}>Help buyers know more about your store</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <Field label="Store Description" error={errors.description}>
                                        <textarea
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder={`Tell buyers what makes ${data.store_name || 'your store'} special. What do you sell? Why should they buy from you?`}
                                            rows={4}
                                            maxLength={500}
                                            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                                        />
                                        <p style={{ textAlign: 'right', color: 'var(--flockr-subtle)', fontSize: 11, margin: '4px 0 0' }}>
                                            {data.description.length}/500
                                        </p>
                                    </Field>

                                    <Field label="Store Location" error={errors.location}>
                                        <div style={{ position: 'relative' }}>
                                            <RiMapPinLine
                                                size={16}
                                                color="var(--flockr-muted)"
                                                style={{
                                                    position: 'absolute',
                                                    left: 14,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    pointerEvents: 'none',
                                                }}
                                            />
                                            <input
                                                value={data.location}
                                                onChange={(e) => setData('location', e.target.value)}
                                                placeholder="e.g. Yaba, Lagos · Wuse, Abuja"
                                                style={{ ...inputStyle, paddingLeft: 38 }}
                                            />
                                        </div>
                                    </Field>
                                </div>

                                {/* Preview card */}
                                {data.store_name && (
                                    <div
                                        style={{
                                            marginTop: 24,
                                            background: 'var(--flockr-card)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 14,
                                            padding: 16,
                                        }}
                                    >
                                        <p
                                            style={{
                                                color: 'var(--flockr-muted)',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.07em',
                                                margin: '0 0 10px',
                                            }}
                                        >
                                            Preview
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div
                                                style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: '50%',
                                                    background: 'var(--flockr-orange)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 18,
                                                    fontWeight: 700,
                                                    color: '#fff',
                                                    fontFamily: 'var(--font-display)',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {data.store_name[0].toUpperCase()}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{data.store_name}</p>
                                                <p style={{ color: 'var(--flockr-muted)', fontSize: 12, margin: '2px 0 0' }}>
                                                    {data.product_categories.join(', ')} · {data.location || 'Nigeria'}
                                                </p>
                                            </div>
                                        </div>
                                        {data.description && (
                                            <p style={{ color: 'var(--flockr-muted)', fontSize: 13, margin: '10px 0 0', lineHeight: 1.5 }}>
                                                {data.description.slice(0, 100)}
                                                {data.description.length > 100 ? '...' : ''}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                                    <button type="button" onClick={prev} style={ghostBtn}>
                                        <RiArrowLeftLine size={16} /> Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing || !data.description || !data.location}
                                        style={{
                                            ...primaryBtn,
                                            flex: 1,
                                            opacity: processing || !data.description || !data.location ? 0.5 : 1,
                                        }}
                                    >
                                        <RiRocketLine size={17} />
                                        <span>{processing ? 'Setting up...' : 'Launch My Store'}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus, textarea:focus { border-color: var(--flockr-orange) !important; outline: none; box-shadow: 0 0 0 3px rgba(255,92,0,0.12); }
        input::placeholder, textarea::placeholder { color: var(--flockr-subtle); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
        </>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <p
                style={{
                    color: 'var(--flockr-muted)',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    margin: '0 0 8px',
                }}
            >
                {label}
            </p>
            {children}
            {error && <p style={{ color: 'var(--flockr-red)', fontSize: 12, margin: '5px 0 0' }}>{error}</p>}
        </div>
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
