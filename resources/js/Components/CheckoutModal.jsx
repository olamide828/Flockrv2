import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    RiArrowLeftLine,
    RiArrowRightLine,
    RiCheckLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiGiftLine,
    RiLoader4Line,
    RiMapPinAddLine,
    RiMapPinLine,
    RiSecurePaymentLine,
    RiShieldCheckLine,
    RiTruckLine,
} from 'react-icons/ri';

// ─────────────────────────────────────────────────────────────────────────────
// AddressFormModal — loads Terminal-valid states/cities dynamically
// ─────────────────────────────────────────────────────────────────────────────
function AddressFormModal({ onClose, onSaved, editing = null, showToast }) {
    const [form, setForm] = useState({
        label:          editing?.label          ?? 'Home',
        recipient_name: editing?.recipient_name ?? '',
        phone:          editing?.phone          ?? '',
        street:         editing?.street         ?? '',
        landmark:       editing?.landmark       ?? '',
        city:           editing?.city           ?? '',
        state:          editing?.state          ?? '',
        state_code:     editing?.state_code     ?? '',
        is_default:     editing?.is_default     ?? false,
    });
    const [states,        setStates]        = useState([]);
    const [cities,        setCities]        = useState([]);
    const [loadingStates, setLoadingStates] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);
    const [saving,        setSaving]        = useState(false);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // Load states on mount; if editing, also pre-load cities
    useEffect(() => {
        axios.get('/api/locations/states')
            .then(async r => {
                setStates(r.data.states ?? []);
                if (editing?.state_code) {
                    const cr = await axios.get('/api/locations/cities', {
                        params: { state_code: editing.state_code },
                    });
                    setCities(cr.data.cities ?? []);
                }
            })
            .catch(() => showToast?.('Could not load states. Check your connection.', 'error'))
            .finally(() => setLoadingStates(false));
    }, []);

    // Reload cities when state changes
    useEffect(() => {
        if (!form.state_code) { setCities([]); return; }
        setLoadingCities(true);
        axios.get('/api/locations/cities', { params: { state_code: form.state_code } })
            .then(r => setCities(r.data.cities ?? []))
            .catch(() => showToast?.('Could not load cities.', 'error'))
            .finally(() => setLoadingCities(false));
    }, [form.state_code]);

    const handleStateChange = e => {
        const s = states.find(st => st.isoCode === e.target.value);
        setForm(p => ({ ...p, state_code: s?.isoCode ?? '', state: s?.name ?? '', city: '' }));
    };

    const validatePhone = phone => {
        const clean = phone.replace(/\s/g, '');
        return /^(\+234|234|0)[789]\d{9}$/.test(clean);
    };

    const handleSave = async () => {
        if (!form.recipient_name.trim()) { showToast?.('Recipient name is required.', 'error'); return; }
        if (!form.phone.trim()) { showToast?.('Phone number is required.', 'error'); return; }
        if (!validatePhone(form.phone)) { showToast?.('Enter a valid Nigerian number e.g. 08012345678 or +2348012345678', 'error'); return; }
        if (!form.street.trim()) { showToast?.('Street address is required.', 'error'); return; }
        if (!form.state) { showToast?.('Please select a state.', 'error'); return; }
        if (!form.city) { showToast?.('Please select a city.', 'error'); return; }

        setSaving(true);
        try {
            if (editing) {
                const { data } = await axios.put('/api/addresses/' + editing.id, form);
                onSaved(data.address, 'update');
            } else {
                const { data } = await axios.post('/api/addresses', form);
                onSaved(data.address, 'add');
            }
            onClose();
        } catch (err) {
            const msg = err.code === 'ERR_NETWORK'
                ? 'No internet connection.'
                : (err.response?.data?.message ?? 'Failed to save address.');
            showToast?.(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#111', borderRadius: '24px 24px 0 0', padding: '0 0 40px', maxHeight: '92vh', overflowY: 'auto', zIndex: 1, scrollbarWidth: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
                    <div style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 16px' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700 }}>{editing ? 'Edit Address' : 'Add New Address'}</h3>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RiCloseLine size={18} /></button>
                </div>

                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Label pills */}
                    <div>
                        <p style={lbSt}>Label</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['Home', 'Work', 'Other'].map(l => (
                                <button key={l} onClick={() => set('label', l)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: form.label === l ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (form.label === l ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)'), color: form.label === l ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
                            ))}
                        </div>
                    </div>

                    <F label="Recipient Name *"><input value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="Full name of recipient" style={inp} /></F>

                    <F label="Phone Number *">
                        <input
                            value={form.phone}
                            onChange={e => set('phone', e.target.value)}
                            placeholder="08012345678 or +2348012345678"
                            type="tel"
                            style={inp}
                        />
                        <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>Nigerian format: 080xxxxxxxx or +2348xxxxxxxx</p>
                    </F>

                    <F label="Street Address *"><input value={form.street} onChange={e => set('street', e.target.value)} placeholder="House number, street name" style={inp} /></F>

                    <F label="Landmark (optional)"><input value={form.landmark} onChange={e => set('landmark', e.target.value)} placeholder="e.g. Near First Bank, Opposite Shoprite" style={inp} /></F>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <F label="State *">
                            <select value={form.state_code} onChange={handleStateChange} disabled={loadingStates} style={{ ...inp, appearance: 'none', opacity: loadingStates ? 0.5 : 1 }}>
                                <option value="">{loadingStates ? 'Loading…' : 'Select state'}</option>
                                {states.map((s, i) => <option key={s.isoCode ?? s._id ?? i} value={s.isoCode}>{s.name}</option>)}
                            </select>
                        </F>
                        <F label="City *">
                            <select value={form.city} onChange={e => set('city', e.target.value)} disabled={!form.state_code || loadingCities} style={{ ...inp, appearance: 'none', opacity: (!form.state_code || loadingCities) ? 0.5 : 1 }}>
                                <option value="">{!form.state_code ? 'Select state first' : loadingCities ? 'Loading…' : 'Select city'}</option>
                                {cities.map((c, i) => <option key={(c.name ?? c._id ?? '') + '-' + i} value={c.name}>{c.name}</option>)}
                            </select>
                        </F>
                    </div>

                    {/* Default toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                        <div onClick={() => set('is_default', !form.is_default)} style={{ width: 42, height: 24, borderRadius: 999, background: form.is_default ? '#FF6B35' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', top: 3, left: form.is_default ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Set as default address</span>
                    </label>

                    <button onClick={handleSave} disabled={saving} style={{ padding: '14px', background: saving ? 'rgba(255,107,53,0.4)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                        {saving ? <><RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : <><RiCheckLine size={16} />{editing ? 'Update Address' : 'Save Address'}</>}
                    </button>
                </div>
            </div>
            <style>{'@keyframes spin { to { transform: rotate(360deg); } } select option { background: #1a1a1a; }'}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CheckoutModal
// Props:
//   items          - cart items array
//   addresses      - initial saved addresses from Inertia or API
//   subtotal       - number
//   onClose        - fn()
//   showToast      - fn(msg, type)
//   singleProduct  - { productId, quantity } | null  (null = cart checkout)
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutModal({
    items = [],
    addresses: initialAddresses = [],
    subtotal = 0,
    onClose,
    showToast,
    singleProduct = null,
}) {
    const STEPS = ['address', 'delivery', 'confirm'];
    const [step,          setStep]          = useState('address');
    const [addrList,      setAddrList]      = useState(initialAddresses);
    const [selectedAddr,  setSelectedAddr]  = useState(
        initialAddresses.find(a => a.is_default) ?? initialAddresses[0] ?? null
    );
    const [showAddrForm,  setShowAddrForm]  = useState(initialAddresses.length === 0);
    const [editingAddr,   setEditingAddr]   = useState(null);

    const [rates,         setRates]         = useState([]);
    const [loadingRates,  setLoadingRates]  = useState(false);
    const [selectedRate,  setSelectedRate]  = useState(null);

    const [couponCode,    setCouponCode]    = useState('');
    const [couponOpen,    setCouponOpen]    = useState(false);
    const [couponApplied, setCouponApplied] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [checking,      setChecking]      = useState(false);

    const primarySellerId = items[0]?.product?.seller?.id ?? items[0]?.product?.seller_id;

    const fetchRates = async addr => {
        if (!addr || !primarySellerId) return;
        setLoadingRates(true);
        setRates([]);
        setSelectedRate(null);
        try {
            const { data } = await axios.post('/api/shipping/rates', {
                address_id: addr.id,
                seller_id:  primarySellerId,
                items:      items.map(i => i.id).filter(Boolean),
            });
            const loaded = data.rates ?? [];
            setRates(loaded);
            if (loaded.length > 0) setSelectedRate(loaded[0]);
        } catch (err) {
            const msg = err.code === 'ERR_NETWORK'
                ? 'No internet connection. Connect and try again.'
                : (err.response?.data?.message ?? 'Could not load shipping rates.');
            showToast?.(msg, 'error');
        } finally {
            setLoadingRates(false);
        }
    };

    const goToDelivery = () => { setStep('delivery'); fetchRates(selectedAddr); };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        try {
            const { data } = await axios.post('/api/cart/validate-coupon', { code: couponCode });
            setCouponApplied(data.coupon);
            showToast?.('Coupon applied — ₦' + Number(data.coupon.amount).toLocaleString() + ' off!', 'success');
        } catch (err) {
            const msg = err.code === 'ERR_NETWORK'
                ? 'No internet connection.'
                : (err.response?.data?.message ?? 'Invalid coupon.');
            showToast?.(msg, 'error');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => { setCouponApplied(null); setCouponCode(''); };

    const courierFee = selectedRate ? Number(selectedRate.amount) : 0;
    const discount   = couponApplied ? Math.min(Number(couponApplied.amount), subtotal) : 0;
    const grandTotal = Math.max(0, subtotal + courierFee - discount);

    const handleCheckout = async () => {
        if (!selectedAddr || !selectedRate) return;
        setChecking(true);
        try {
            let res;
            if (singleProduct) {
                res = await axios.post('/api/orders/checkout', {
                    product_id:  singleProduct.productId,
                    quantity:    singleProduct.quantity,
                    address_id:  selectedAddr.id,
                    rate_id:     selectedRate.rate_id,
                    carrier:     selectedRate.carrier,
                    courier_fee: selectedRate.amount,
                    coupon_code: couponApplied?.code ?? null,
                });
            } else {
                res = await axios.post('/api/cart/checkout', {
                    address_id:  selectedAddr.id,
                    rate_id:     selectedRate.rate_id,
                    carrier:     selectedRate.carrier,
                    courier_fee: selectedRate.amount,
                    coupon_code: couponApplied?.code ?? null,
                });
            }
            window.location.href = res.data.authorization_url;
        } catch (err) {
            const msg = err.code === 'ERR_NETWORK'
                ? 'No internet connection. Please check your network and try again.'
                : (err.response?.data?.message ?? 'Checkout failed. Please try again.');
            showToast?.(msg, 'error');
            setChecking(false);
        }
    };

    const handleAddrSaved = (addr, type) => {
        if (type === 'add') {
            setAddrList(prev => addr.is_default
                ? [addr, ...prev.map(a => ({ ...a, is_default: false }))]
                : [addr, ...prev]
            );
            setSelectedAddr(addr);
        } else {
            setAddrList(prev => prev.map(a =>
                a.id === addr.id ? addr : (addr.is_default ? { ...a, is_default: false } : a)
            ));
            if (selectedAddr?.id === addr.id) setSelectedAddr(addr);
        }
        setShowAddrForm(false);
        setEditingAddr(null);
    };

    const handleDeleteAddr = async addr => {
        if (!confirm('Remove this address?')) return;
        try {
            await axios.delete('/api/addresses/' + addr.id);
            const updated = addrList.filter(a => a.id !== addr.id);
            setAddrList(updated);
            if (selectedAddr?.id === addr.id) setSelectedAddr(updated[0] ?? null);
        } catch {
            showToast?.('Failed to remove address.', 'error');
        }
    };

    return (
        <>
            {showAddrForm && (
                <AddressFormModal
                    editing={editingAddr}
                    onClose={() => { setShowAddrForm(false); setEditingAddr(null); }}
                    onSaved={handleAddrSaved}
                    showToast={showToast}
                />
            )}

            <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />

                <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#0f0f0f', borderRadius: '28px 28px 0 0', maxHeight: '92vh', overflowY: 'auto', zIndex: 1, paddingBottom: 32, scrollbarWidth: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
                        <div style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                    </div>

                    {/* Header */}
                    <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        {step !== 'address' && (
                            <button onClick={() => setStep(step === 'confirm' ? 'delivery' : 'address')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                <RiArrowLeftLine size={17} />
                            </button>
                        )}
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, flex: 1 }}>
                            {step === 'address' && 'Delivery Address'}
                            {step === 'delivery' && 'Choose Courier'}
                            {step === 'confirm' && 'Order Summary'}
                        </h3>
                        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <RiCloseLine size={18} />
                        </button>
                    </div>

                    {/* Step progress bar */}
                    <div style={{ display: 'flex', gap: 4, padding: '10px 20px 16px' }}>
                        {STEPS.map((s, i) => (
                            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: STEPS.indexOf(step) >= i ? '#FF6B35' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                        ))}
                    </div>

                    <div style={{ padding: '0 20px' }}>

                        {/* ── STEP 1: Address ─────────────────────────────── */}
                        {step === 'address' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {addrList.map(addr => (
                                    <div key={addr.id} onClick={() => setSelectedAddr(addr)} style={{ padding: '14px 16px', borderRadius: 16, background: selectedAddr?.id === addr.id ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', border: '1.5px solid ' + (selectedAddr?.id === addr.id ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'), cursor: 'pointer', transition: 'all 0.15s' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid ' + (selectedAddr?.id === addr.id ? '#FF6B35' : 'rgba(255,255,255,0.2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                {selectedAddr?.id === addr.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{addr.label}</span>
                                                    {addr.is_default && <span style={{ padding: '1px 8px', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 999, color: '#FF6B35', fontSize: 10, fontWeight: 700 }}>DEFAULT</span>}
                                                </div>
                                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{addr.recipient_name}</p>
                                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{addr.phone}</p>
                                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                                                    {addr.street}{addr.landmark ? ', ' + addr.landmark : ''}, {addr.city}, {addr.state}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button onClick={e => { e.stopPropagation(); setEditingAddr(addr); setShowAddrForm(true); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>✏️</button>
                                                <button onClick={e => { e.stopPropagation(); handleDeleteAddr(addr); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}><RiDeleteBinLine size={13} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {addrList.length < 5 && (
                                    <button onClick={() => { setEditingAddr(null); setShowAddrForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 16, background: 'none', border: '1.5px dashed rgba(255,255,255,0.12)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>
                                        <RiMapPinAddLine size={18} color="#FF6B35" />
                                        Add new address
                                    </button>
                                )}

                                <button onClick={goToDelivery} disabled={!selectedAddr} style={{ padding: '14px', background: !selectedAddr ? 'rgba(255,107,53,0.3)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: !selectedAddr ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                                    <RiTruckLine size={16} /> Choose Delivery Method
                                </button>
                            </div>
                        )}

                        {/* ── STEP 2: Courier rates ─────────────────────── */}
                        {step === 'delivery' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                                    <RiMapPinLine size={14} color="#FF6B35" />
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 }}>Delivering to: {selectedAddr?.street}, {selectedAddr?.city}</span>
                                    <button onClick={() => setStep('address')} style={{ color: '#FF6B35', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
                                </div>

                                {loadingRates && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', justifyContent: 'center' }}>
                                        <RiLoader4Line size={20} color="#FF6B35" style={{ animation: 'spin 0.8s linear infinite' }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Getting shipping rates…</span>
                                    </div>
                                )}

                                {!loadingRates && rates.length === 0 && (
                                    <div style={{ padding: '20px', textAlign: 'center' }}>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 12px' }}>No shipping options available for this route.</p>
                                        <button onClick={() => fetchRates(selectedAddr)} style={{ color: '#FF6B35', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
                                    </div>
                                )}

                                {!loadingRates && rates.map(rate => (
                                    <div key={rate.rate_id} onClick={() => setSelectedRate(rate)} style={{ padding: '14px 16px', borderRadius: 16, background: selectedRate?.rate_id === rate.rate_id ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', border: '1.5px solid ' + (selectedRate?.rate_id === rate.rate_id ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid ' + (selectedRate?.rate_id === rate.rate_id ? '#FF6B35' : 'rgba(255,255,255,0.2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {selectedRate?.rate_id === rate.rate_id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>{rate.carrier}</p>
                                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{rate.service} · {rate.estimated_days}</p>
                                            {rate.pickup_eta && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Pickup: {rate.pickup_eta}</p>}
                                        </div>
                                        <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>₦{Number(rate.amount).toLocaleString()}</p>
                                    </div>
                                ))}

                                <button onClick={() => setStep('confirm')} disabled={!selectedRate || loadingRates} style={{ padding: '14px', background: (!selectedRate || loadingRates) ? 'rgba(255,107,53,0.3)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: (!selectedRate || loadingRates) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                                    Continue <RiArrowRightLine size={16} />
                                </button>
                            </div>
                        )}

                        {/* ── STEP 3: Confirm ──────────────────────────── */}
                        {step === 'confirm' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* Delivery summary */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <RiMapPinLine size={13} color="#FF6B35" />
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivering to</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{selectedAddr?.recipient_name} · {selectedAddr?.phone}</p>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                        {selectedAddr?.street}{selectedAddr?.landmark ? ', ' + selectedAddr.landmark : ''}, {selectedAddr?.city}, {selectedAddr?.state}
                                    </p>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <RiTruckLine size={18} color="#FF6B35" />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{selectedRate?.carrier} · {selectedRate?.service}</p>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{selectedRate?.estimated_days}</p>
                                    </div>
                                    <span style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14 }}>₦{Number(selectedRate?.amount ?? 0).toLocaleString()}</span>
                                </div>

                                {/* Coupon */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                                    <button onClick={() => setCouponOpen(v => !v)} style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                                        <RiGiftLine size={16} color={couponApplied ? '#10B981' : '#FF6B35'} />
                                        <span style={{ color: couponApplied ? '#10B981' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, flex: 1 }}>
                                            {couponApplied ? couponApplied.code + ' — ₦' + Number(couponApplied.amount).toLocaleString() + ' off' : 'Have a promo code?'}
                                        </span>
                                        {couponApplied
                                            ? <button onClick={e => { e.stopPropagation(); handleRemoveCoupon(); }} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                            : <RiArrowRightLine size={14} color="rgba(255,255,255,0.3)" style={{ transform: couponOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                        }
                                    </button>
                                    {couponOpen && !couponApplied && (
                                        <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8 }}>
                                            <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. FLKRATE-XXXX-XXXX" onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()} style={{ ...inp, flex: 1, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', letterSpacing: 1 }} />
                                            <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={{ padding: '10px 16px', background: '#FF6B35', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: (!couponCode || couponLoading) ? 0.5 : 1 }}>
                                                {couponLoading ? '…' : 'Apply'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Price breakdown */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <Row label="Subtotal" value={'₦' + subtotal.toLocaleString()} />
                                    <Row label="Delivery" value={'₦' + courierFee.toLocaleString()} />
                                    {couponApplied && <Row label={'Promo (' + couponApplied.code + ')'} value={'-₦' + discount.toLocaleString()} valueColor="#10B981" />}
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                                    <Row label="Total" value={'₦' + grandTotal.toLocaleString()} bold />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
                                    <RiShieldCheckLine size={14} color="#10B981" />
                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Secure payment via Paystack. Buyer protection included.</span>
                                </div>

                                <button onClick={handleCheckout} disabled={checking} style={{ padding: '15px', background: checking ? 'rgba(255,107,53,0.5)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                    {checking
                                        ? <><RiLoader4Line size={18} style={{ animation: 'spin 0.8s linear infinite' }} />Redirecting to payment…</>
                                        : <><RiSecurePaymentLine size={18} />Pay ₦{grandTotal.toLocaleString()}</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{'@keyframes spin { to { transform: rotate(360deg); } } select option { background: #1a1a1a; }'}</style>
        </>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Row({ label, value, bold, valueColor }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: bold ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 400 }}>{label}</span>
            <span style={{ color: valueColor ?? (bold ? '#FF6B35' : '#fff'), fontSize: bold ? 16 : 13, fontWeight: bold ? 800 : 500 }}>{value}</span>
        </div>
    );
}

function F({ label, children }) {
    return (
        <div>
            <p style={lbSt}>{label}</p>
            {children}
        </div>
    );
}

const lbSt = { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' };

const inp = {
    width: '100%', padding: '12px 13px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
};