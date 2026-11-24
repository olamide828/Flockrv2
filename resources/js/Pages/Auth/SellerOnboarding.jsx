import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { AuthLogo } from '@/Components/Auth/AuthShell';
import { INTERESTS } from '@/Components/Auth/interests';
import { useEffect, useState } from 'react';
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
    RiLoader4Line,
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
    RiTruckLine,
    RiUserLine,
    RiWhatsappLine,
} from 'react-icons/ri';

const CATEGORIES = [
    { label: 'Fashion & Clothing',    Icon: RiShirtLine       },
    { label: 'Beauty & Skincare',     Icon: RiPaintBrushLine  },
    { label: 'Electronics & Gadgets', Icon: RiSmartphoneLine  },
    { label: 'Food & Drinks',         Icon: RiRestaurantLine  },
    { label: 'Home & Living',         Icon: RiHome4Line       },
    { label: 'Health & Wellness',     Icon: RiCapsuleLine     },
    { label: 'Accessories & Jewelry', Icon: RiHandbagLine     },
    { label: 'Kids & Baby',           Icon: RiBearSmileLine   },
    { label: 'Books & Education',     Icon: RiBookLine        },
    { label: 'Gaming',                Icon: RiGamepadLine     },
    { label: 'Auto Parts',            Icon: RiCarLine         },
    { label: 'Sports & Fitness',      Icon: RiFootballLine    },
    { label: 'Organic & Natural',     Icon: RiLeafLine        },
    { label: 'Art & Crafts',          Icon: RiPaletteLine     },
    { label: 'Other',                 Icon: RiMoreLine        },
];

const MAX_CATEGORIES = 3;
const MIN_INTERESTS = 3;
// which step owns which server error
const FIELD_STEP = { store_name: 1, business_type: 1, whatsapp: 1, product_categories: 2, interests: 3, description: 4, location: 4, pickup_street: 4, pickup_city: 4, pickup_state: 4, pickup_state_code: 4, pickup_postal_code: 4 };

export default function SellerOnboarding() {
    const [step,               setStep]               = useState(1);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const TOTAL_STEPS = 4;
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [touched, setTouched] = useState(false);

    // Terminal API states/cities
    const [states,        setStates]        = useState([]);
    const [cities,        setCities]        = useState([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        store_name:         '',
        business_type:      'individual',
        product_categories: [],
        description:        '',
        location:           '',
        whatsapp:           '',
        interests:          [],
        pickup_street:      '',
        pickup_city:        '',
        pickup_state:       '',
        pickup_state_code:  '',
        pickup_postal_code: '',
    });

    // Load Terminal states when step 3 is reached
    useEffect(() => {
        if (step !== 4 || states.length > 0) return;
        let cancelled = false;
        setLoadingStates(true);
        axios.get('/api/locations/states')
            .then(r => { if (!cancelled) setStates(r.data?.states ?? []); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoadingStates(false); });
        return () => { cancelled = true; };
    }, [step]);

    // Load cities when state changes
    useEffect(() => {
        if (!data.pickup_state_code) { setCities([]); return; }
        let cancelled = false;
        setLoadingCities(true);
        axios.get('/api/locations/cities', { params: { state_code: data.pickup_state_code } })
            .then(r => { if (!cancelled) setCities(r.data?.cities ?? []); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoadingCities(false); });
        return () => { cancelled = true; };
    }, [data.pickup_state_code]);

    const handleStateChange = e => {
        const selected = states.find(s => s.isoCode === e.target.value);
        setData(prev => ({
            ...prev,
            pickup_state_code: selected?.isoCode ?? '',
            pickup_state:      selected?.name    ?? '',
            pickup_city:       '',
        }));
    };

    const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
    const prev = () => setStep(s => Math.max(s - 1, 1));

    const toggleCategory = label => {
        setSelectedCategories(prev => {
            if (prev.includes(label)) {
                const next = prev.filter(c => c !== label);
                setData('product_categories', next);
                return next;
            }
            if (prev.length >= MAX_CATEGORIES) return prev;
            const next = [...prev, label];
            setData('product_categories', next);
            return next;
        });
    };

    const toggleInterest = label => {
        setSelectedInterests(prev => {
            const next = prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label];
            setData('interests', next);
            return next;
        });
    };

    const stepErrors = {
        1: [!data.store_name.trim() && 'Enter your store name', !data.business_type && 'Choose a business type'].filter(Boolean),
        2: [data.product_categories.length === 0 && 'Pick at least one category'].filter(Boolean),
        3: [],
        4: [!data.description.trim() && 'Describe your store', !data.location.trim() && 'Add your store location', !data.pickup_street.trim() && 'Add your pickup street', !data.pickup_state && 'Select a state', !data.pickup_city && 'Select a city'].filter(Boolean),
    };
    const stepOk = n => stepErrors[n].length === 0;
    const canSubmit = stepOk(4);
    const serverErrors = Object.entries(errors);

    const goNext = () => { setTouched(true); if (stepOk(step)) { setTouched(false); next(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };

    const submit = async e => {
        e.preventDefault();
        setTouched(true);
        const firstBad = [1, 2, 4].find(n => !stepOk(n));
        if (firstBad) { setStep(firstBad); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        await axios.get('/sanctum/csrf-cookie');
        post('/seller/onboarding', {
            onError: errs => {
                const first = Math.min(...Object.keys(errs).map(k => FIELD_STEP[k] ?? 4));
                setStep(first);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    const Hint = ({ n }) => (touched && !stepOk(n)) ? (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
            {stepErrors[n].map(m => <p key={m} style={{ margin: 0, color: '#F87171', fontSize: 12.5, lineHeight: 1.6 }}>• {m}</p>)}
        </div>
    ) : null;

    return (
        <>
            <Head title="Set Up Your Store" />
            <div style={{ minHeight: '100vh', background: 'var(--flockr-black)', display: 'flex', flexDirection: 'column' }}>
                {/* Top bar */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <AuthLogo size={26} />
                    <span style={{ color: 'var(--flockr-muted)', fontSize: 13 }}>Step {step} of {TOTAL_STEPS}</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ height: '100%', width: `${(step / TOTAL_STEPS) * 100}%`, background: 'var(--flockr-orange)', transition: 'width 0.4s ease' }} />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
                    <div style={{ width: '100%', maxWidth: 480 }}>
                        {serverErrors.length > 0 && (
                            <div role="alert" style={{ marginBottom: 20, padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12 }}>
                                <p style={{ margin: '0 0 4px', color: '#F87171', fontSize: 13, fontWeight: 700 }}>We couldn't set up your store yet</p>
                                {serverErrors.map(([k, v]) => <p key={k} style={{ margin: 0, color: '#FCA5A5', fontSize: 12.5, lineHeight: 1.6 }}>• {v}</p>)}
                            </div>
                        )}

                        {/* ── Step 1: Store basics ──────────────────────────── */}
                        {step === 1 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <StepHeader Icon={RiStoreLine} title="Set up your store" sub="Tell buyers who you are and what you sell" />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <Field label="Store / Business Name" error={errors.store_name}>
                                        <input value={data.store_name} onChange={e => setData('store_name', e.target.value)} placeholder="e.g. Adaeze Fabrics, ChiTech Store" style={inputStyle} />
                                    </Field>

                                    <Field label="Business Type" error={errors.business_type}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                            {[
                                                { value: 'individual',          Icon: RiUserLine,     label: 'Individual',          sub: 'Just me, selling my own stuff'    },
                                                { value: 'registered_business', Icon: RiBuildingLine, label: 'Registered Business', sub: 'I have a registered company'        },
                                            ].map(opt => {
                                                const active = data.business_type === opt.value;
                                                return (
                                                    <button key={opt.value} type="button" onClick={() => setData('business_type', opt.value)}
                                                        style={{ padding: '14px 12px', background: active ? 'rgba(255,92,0,0.12)' : 'var(--flockr-card)', border: `1.5px solid ${active ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                                                        <opt.Icon size={18} color={active ? 'var(--flockr-orange)' : 'var(--flockr-muted)'} style={{ marginBottom: 8 }} />
                                                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{opt.label}</p>
                                                        <p style={{ color: 'var(--flockr-muted)', fontSize: 11, margin: 0, lineHeight: 1.4 }}>{opt.sub}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Field>

                                    <Field label="WhatsApp Number (optional)" error={errors.whatsapp}>
                                        <div style={{ position: 'relative' }}>
                                            <RiWhatsappLine size={16} color="var(--flockr-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                            <input value={data.whatsapp} onChange={e => setData('whatsapp', e.target.value)} placeholder="08012345678" type="tel" style={{ ...inputStyle, paddingLeft: 38 }} />
                                        </div>
                                    </Field>
                                </div>

                                <Hint n={1} />
                                <button type="button" onClick={goNext}
                                    style={{ ...primaryBtn, marginTop: 20, opacity: stepOk(1) ? 1 : 0.6 }}>
                                    <span>Continue</span><RiArrowRightLine size={18} />
                                </button>
                            </div>
                        )}

                        {/* ── Step 2: Categories ────────────────────────────── */}
                        {step === 2 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <StepHeader Icon={RiShoppingBagLine} title="What do you sell?" sub={`Pick up to ${MAX_CATEGORIES} categories`} />

                                {data.product_categories.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 14px', background: 'rgba(255,92,0,0.08)', border: '1px solid rgba(255,92,0,0.2)', borderRadius: 999 }}>
                                        <RiCheckLine size={14} color="var(--flockr-orange)" />
                                        <span style={{ color: 'var(--flockr-orange)', fontSize: 13, fontWeight: 600 }}>{data.product_categories.length}/{MAX_CATEGORIES} selected</span>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {CATEGORIES.map(({ label, Icon }) => {
                                        const active = selectedCategories.includes(label);
                                        const maxed  = !active && selectedCategories.length >= MAX_CATEGORIES;
                                        return (
                                            <button key={label} type="button" onClick={() => toggleCategory(label)}
                                                style={{ padding: '10px 12px', background: active ? 'rgba(255,92,0,0.12)' : 'var(--flockr-card)', border: `1.5px solid ${active ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, cursor: maxed ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'all 0.15s', opacity: maxed ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Icon size={16} color={active ? 'var(--flockr-orange)' : 'var(--flockr-muted)'} style={{ flexShrink: 0 }} />
                                                <span style={{ color: active ? '#fff' : 'var(--flockr-muted)', fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>
                                                {active && <RiCheckLine size={14} color="var(--flockr-orange)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                            </button>
                                        );
                                    })}
                                </div>

                                <Hint n={2} />
                                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                    <button type="button" onClick={prev} style={ghostBtn}><RiArrowLeftLine size={16} /> Back</button>
                                    <button type="button" onClick={goNext} style={{ ...primaryBtn, flex: 1, opacity: stepOk(2) ? 1 : 0.6 }}>
                                        <span>Continue</span><RiArrowRightLine size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: What you like (feeds your own feed) ───── */}
                        {step === 3 && (
                            <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                <StepHeader Icon={RiShoppingBagLine} title="What do you like?" sub={`Pick at least ${MIN_INTERESTS} so we can fill your feed with videos you'll enjoy`} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {INTERESTS.map(({ label, emoji }) => {
                                        const active = selectedInterests.includes(label);
                                        return (
                                            <button key={label} type="button" onClick={() => toggleInterest(label)}
                                                style={{ padding: '10px 12px', background: active ? 'rgba(255,92,0,0.12)' : 'var(--flockr-card)', border: `1.5px solid ${active ? 'var(--flockr-orange)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span aria-hidden style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
                                                <span style={{ color: active ? '#fff' : 'var(--flockr-muted)', fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>
                                                {active && <RiCheckLine size={14} color="var(--flockr-orange)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p style={{ color: 'var(--flockr-muted)', fontSize: 12, margin: '12px 0 0' }}>{selectedInterests.length} selected{selectedInterests.length < MIN_INTERESTS ? ` — ${MIN_INTERESTS - selectedInterests.length} more recommended` : ''}</p>
                                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                    <button type="button" onClick={prev} style={ghostBtn}><RiArrowLeftLine size={16} /> Back</button>
                                    <button type="button" onClick={goNext} style={{ ...primaryBtn, flex: 1 }}>
                                        <span>{selectedInterests.length === 0 ? 'Skip for now' : 'Continue'}</span><RiArrowRightLine size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 4: Bio + Location + Pickup ──────────────── */}
                        {step === 4 && (
                            <form onSubmit={submit} style={{ animation: 'fadeIn 0.3s ease' }}>
                                <StepHeader Icon={RiMapPinLine} title="Almost done!" sub="Help buyers know more about your store" />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                    <Field label="Store Description" error={errors.description}>
                                        <textarea
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder={`Tell buyers what makes ${data.store_name || 'your store'} special.`}
                                            rows={4} maxLength={500}
                                            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                                        />
                                        <p style={{ textAlign: 'right', color: 'var(--flockr-subtle)', fontSize: 11, margin: '4px 0 0' }}>{data.description.length}/500</p>
                                    </Field>

                                    <Field label="Store Location" error={errors.location}>
                                        <div style={{ position: 'relative' }}>
                                            <RiMapPinLine size={16} color="var(--flockr-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                            <input value={data.location} onChange={e => setData('location', e.target.value)} placeholder="e.g. Yaba, Lagos · Wuse, Abuja" style={{ ...inputStyle, paddingLeft: 38 }} />
                                        </div>
                                    </Field>

                                    {/* ── Pickup address (Terminal API) ─────── */}
                                    <div style={{ background: 'rgba(255,107,53,0.04)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: 16, padding: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <RiTruckLine size={16} color="#FF6B35" />
                                            <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700 }}>Courier Pickup Address</p>
                                        </div>
                                        <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5 }}>
                                            Where couriers collect your packages. Must match a valid TShip location.
                                        </p>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <Field label="Street Address *" error={errors.pickup_street}>
                                                <input
                                                    value={data.pickup_street}
                                                    onChange={e => setData('pickup_street', e.target.value.slice(0, 45))}
                                                    placeholder="House/shop number and street name"
                                                    style={inputStyle}
                                                />
                                                <p style={{ margin: '4px 0 0', color: data.pickup_street.length > 40 ? '#EAB308' : 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'right' }}>
                                                    {data.pickup_street.length}/45
                                                </p>
                                            </Field>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <Field label="State *" error={errors.pickup_state}>
                                                    <select
                                                        value={data.pickup_state_code}
                                                        onChange={handleStateChange}
                                                        disabled={loadingStates}
                                                        style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', opacity: loadingStates ? 0.5 : 1 }}
                                                    >
                                                        <option value="">{loadingStates ? 'Loading…' : 'Select state'}</option>
                                                        {states.map((s, i) => (
                                                            <option key={s.isoCode ?? s._id ?? i} value={s.isoCode}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    {loadingStates && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                                            <RiLoader4Line size={11} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 0.8s linear infinite' }} />
                                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Loading states…</span>
                                                        </div>
                                                    )}
                                                </Field>

                                                <Field label="City *" error={errors.pickup_city}>
                                                    <select
                                                        value={data.pickup_city}
                                                        onChange={e => setData('pickup_city', e.target.value)}
                                                        disabled={!data.pickup_state_code || loadingCities}
                                                        style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', opacity: (!data.pickup_state_code || loadingCities) ? 0.5 : 1 }}
                                                    >
                                                        <option value="">
                                                            {!data.pickup_state_code ? 'Select state first' : loadingCities ? 'Loading…' : 'Select city'}
                                                        </option>
                                                        {cities.map((c, i) => (
                                                            <option key={(c.name ?? '') + i} value={c.name}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                            </div>
                                        </div>

                                        {/* Pickup preview */}
                                        {data.pickup_city && data.pickup_state && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '6px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, width: 'fit-content' }}>
                                                <RiCheckLine size={12} color="#10B981" />
                                                <span style={{ color: '#10B981', fontSize: 11, fontWeight: 600 }}>
                                                    {data.pickup_street}, {data.pickup_city}, {data.pickup_state}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Store preview */}
                                {data.store_name && (
                                    <div style={{ marginTop: 20, background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
                                        <p style={{ color: 'var(--flockr-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Preview</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--flockr-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', flexShrink: 0 }}>
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
                                                {data.description.slice(0, 100)}{data.description.length > 100 ? '...' : ''}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                    <button type="button" onClick={prev} style={ghostBtn}><RiArrowLeftLine size={16} /> Back</button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        style={{ ...primaryBtn, flex: 1, opacity: processing ? 0.6 : canSubmit ? 1 : 0.6 }}
                                    >
                                        <RiRocketLine size={17} />
                                        <span>{processing ? 'Setting up...' : 'Launch My Store'}</span>
                                    </button>
                                </div>

                                <Hint n={4} />
                                {!canSubmit && !touched && (
                                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 8 }}>
                                        Still needed: {stepErrors[4].join(', ').toLowerCase()}
                                    </p>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes spin   { to { transform:rotate(360deg); } }
                input:focus, textarea:focus, select:focus { border-color: var(--flockr-orange) !important; outline: none; box-shadow: 0 0 0 3px rgba(255,92,0,0.12); }
                input::placeholder, textarea::placeholder { color: var(--flockr-subtle); }
                select option { background: #1a1a1a; }
                ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
            `}</style>
        </>
    );
}

function StepHeader({ Icon, title, sub }) {
    return (
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px', background: 'rgba(255,92,0,0.12)', border: '1px solid rgba(255,92,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={28} color="var(--flockr-orange)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#fff', margin: '0 0 8px' }}>{title}</h1>
            <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: 0 }}>{sub}</p>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <p style={{ color: 'var(--flockr-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>{label}</p>
            {children}
            {error && <p style={{ color: 'var(--flockr-red)', fontSize: 12, margin: '5px 0 0' }}>{error}</p>}
        </div>
    );
}

const inputStyle = {
    width: '100%', padding: '13px 14px',
    background: 'var(--flockr-card)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    fontFamily: 'var(--font-body)', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const primaryBtn = {
    width: '100%', padding: '15px',
    background: 'var(--flockr-orange)', border: 'none',
    borderRadius: 999, color: '#fff', fontSize: 15, fontWeight: 700,
    fontFamily: 'var(--font-display)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};

const ghostBtn = {
    padding: '15px 20px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 999, color: 'var(--flockr-muted)', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};