import AppLayout from '@/Layouts/AppLayout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useToast } from '@/Components/Toast';
import { useEffect, useRef, useState } from 'react';
import {
    RiAddLine,
    RiArrowLeftLine,
    RiArrowRightLine,
    RiCheckLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiFlashlightLine,
    RiGiftLine,
    RiImageLine,
    RiLoader4Line,
    RiMapPinLine,
    RiMapPinAddLine,
    RiSecurePaymentLine,
    RiShieldCheckLine,
    RiShoppingCart2Line,
    RiSubtractLine,
    RiTruckLine,
    RiVerifiedBadgeLine,
} from 'react-icons/ri';

// ── Nigerian states ───────────────────────────────────────────────────────────
const NG_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
    'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
    'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
    'Yobe','Zamfara',
];

// ── Address form modal ────────────────────────────────────────────────────────
function AddressFormModal({ onClose, onSaved, editing = null }) {
    const [form, setForm] = useState({
        label:          editing?.label          ?? 'Home',
        recipient_name: editing?.recipient_name ?? '',
        phone:          editing?.phone          ?? '',
        street:         editing?.street         ?? '',
        city:           editing?.city           ?? '',
        state:          editing?.state          ?? '',
        postal_code:    editing?.postal_code    ?? '',
        is_default:     editing?.is_default     ?? false,
    });
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSave = async () => {
        if (!form.recipient_name || !form.phone || !form.street || !form.city || !form.state) {
            setError('Please fill in all required fields.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            if (editing) {
                const { data } = await axios.put(`/api/addresses/${editing.id}`, form);
                onSaved(data.address, 'update');
            } else {
                const { data } = await axios.post('/api/addresses', form);
                onSaved(data.address, 'add');
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.message ?? 'Failed to save address.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#111', borderRadius: '24px 24px 0 0', padding: '0 0 40px', maxHeight: '90vh', overflowY: 'auto', zIndex: 1 }}>
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                </div>

                <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700 }}>
                        {editing ? 'Edit Address' : 'Add New Address'}
                    </h3>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <RiCloseLine size={18} />
                    </button>
                </div>

                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Label */}
                    <div>
                        <p style={labelStyle}>Address Label</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['Home', 'Work', 'Other'].map(l => (
                                <button key={l} onClick={() => set('label', l)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: form.label === l ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.label === l ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.08)'}`, color: form.label === l ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <AddrField label="Recipient Name *">
                        <input value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="Full name of recipient" style={inp} />
                    </AddrField>

                    <AddrField label="Phone Number *">
                        <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="080xxxxxxxx" type="tel" style={inp} />
                    </AddrField>

                    <AddrField label="Street Address *">
                        <input value={form.street} onChange={e => set('street', e.target.value)} placeholder="House number, street name" style={inp} />
                    </AddrField>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <AddrField label="City *">
                            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Ikeja" style={inp} />
                        </AddrField>
                        <AddrField label="State *">
                            <select value={form.state} onChange={e => set('state', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                                <option value="">Select state</option>
                                {NG_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </AddrField>
                    </div>

                    {/* Default toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                        <div onClick={() => set('is_default', !form.is_default)} style={{ width: 42, height: 24, borderRadius: 999, background: form.is_default ? '#FF6B35' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', top: 3, left: form.is_default ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Set as default address</span>
                    </label>

                    {error && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{error}</p>}

                    <button onClick={handleSave} disabled={saving} style={{ padding: '14px', background: saving ? 'rgba(255,107,53,0.4)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                        {saving ? <><RiLoader4Line size={16} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : <><RiCheckLine size={16} />{editing ? 'Update Address' : 'Save Address'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Checkout modal ────────────────────────────────────────────────────────────
function CheckoutModal({ items, addresses, subtotal, onClose, onSuccess, showToast }) {
    const STEPS = ['address', 'delivery', 'confirm'];
    const [step,            setStep]            = useState('address');
    const [selectedAddr,    setSelectedAddr]    = useState(addresses.find(a => a.is_default) ?? addresses[0] ?? null);
    const [addrList,        setAddrList]        = useState(addresses);
    const [showAddrForm,    setShowAddrForm]    = useState(addresses.length === 0);
    const [editingAddr,     setEditingAddr]     = useState(null);
    const [rates,           setRates]           = useState([]);
    const [loadingRates,    setLoadingRates]    = useState(false);
    const [selectedRate,    setSelectedRate]    = useState(null);
    const [couponCode,      setCouponCode]      = useState('');
    const [couponOpen,      setCouponOpen]      = useState(false);
    const [couponApplied,   setCouponApplied]   = useState(null);
    const [couponError,     setCouponError]     = useState('');
    const [couponLoading,   setCouponLoading]   = useState(false);
    const [checking,        setChecking]        = useState(false);
  

    // Primary seller ID (for rate lookup — first seller in cart)
    const primarySellerId = items[0]?.product?.seller?.id;

    const fetchRates = async (addr) => {
        if (!addr || !primarySellerId) return;
        setLoadingRates(true);
        setRates([]);
        setSelectedRate(null);
        try {
            const { data } = await axios.post('/api/shipping/rates', {
                address_id: addr.id,
                seller_id:  primarySellerId,
                items:      items.map(i => i.id),
            });
            setRates(data.rates ?? []);
            if (data.rates?.length > 0) setSelectedRate(data.rates[0]);
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Could not load shipping rates.', 'error');
        } finally {
            setLoadingRates(false);
        }
    };

    const goToDelivery = () => {
        setStep('delivery');
        fetchRates(selectedAddr);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError('');
        try {
            const { data } = await axios.post('/api/cart/validate-coupon', { code: couponCode });
            setCouponApplied(data.coupon);
            setCouponError('');
        } catch (err) {
            setCouponError(err.response?.data?.message ?? 'Invalid coupon.');
            setCouponApplied(null);
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponApplied(null);
        setCouponCode('');
        setCouponError('');
    };

    const courierFee    = selectedRate ? selectedRate.amount : 0;
    const discount      = couponApplied ? Math.min(couponApplied.amount, subtotal) : 0;
    const grandTotal    = subtotal + courierFee - discount;

    const handleCheckout = async () => {
        if (!selectedAddr || !selectedRate) return;
        setChecking(true);
        try {
            const { data } = await axios.post('/api/cart/checkout', {
                address_id:  selectedAddr.id,
                rate_id:     selectedRate.rate_id,
                carrier:     selectedRate.carrier,
                courier_fee: selectedRate.amount,
                coupon_code: couponApplied?.code ?? null,
            });
            window.location.href = data.authorization_url;
        } catch (err) {
            showToast(err.response?.data?.message ?? 'Checkout failed. Please try again.', 'error')
            setChecking(false);
        }
    };

    const handleAddrSaved = (addr, type) => {
        if (type === 'add') {
            setAddrList(prev => [addr, ...prev]);
            setSelectedAddr(addr);
        } else {
            setAddrList(prev => prev.map(a => a.id === addr.id ? addr : a));
            if (selectedAddr?.id === addr.id) setSelectedAddr(addr);
        }
        setShowAddrForm(false);
        setEditingAddr(null);
    };

    const handleDeleteAddr = async (addr) => {
        if (!confirm('Remove this address?')) return;
        try {
            await axios.delete(`/api/addresses/${addr.id}`);
            const updated = addrList.filter(a => a.id !== addr.id);
            setAddrList(updated);
            if (selectedAddr?.id === addr.id) setSelectedAddr(updated[0] ?? null);
        } catch {}
    };

    return (
        <>
            {showAddrForm && (
                <AddressFormModal
                    editing={editingAddr}
                    onClose={() => { setShowAddrForm(false); setEditingAddr(null); }}
                    onSaved={handleAddrSaved}
                />
            )}

            <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />

                <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: '#0f0f0f', borderRadius: '28px 28px 0 0', maxHeight: '92vh', overflowY: 'auto', zIndex: 1, paddingBottom: 32 }}>
                    {/* Handle bar */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
                        <div style={{ width: 44, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
                    </div>

                    {/* Header */}
                    <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        {step !== 'address' && (
                            <button onClick={() => setStep(step === 'confirm' ? 'delivery' : 'address')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                <RiArrowLeftLine size={17} />
                            </button>
                        )}
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 700, flex: 1 }}>
                            {step === 'address'  ? 'Delivery Address'   : ''}
                            {step === 'delivery' ? 'Choose Courier'     : ''}
                            {step === 'confirm'  ? 'Order Summary'      : ''}
                        </h3>
                        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <RiCloseLine size={18} />
                        </button>
                    </div>

                    {/* Step indicator */}
                    <div style={{ display: 'flex', gap: 4, padding: '10px 20px 16px' }}>
                        {STEPS.map((s, i) => (
                            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: STEPS.indexOf(step) >= i ? '#FF6B35' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
                        ))}
                    </div>

                    <div style={{ padding: '0 20px' }}>

                        {/* ── STEP 1: Address ──────────────────────────────── */}
                        {step === 'address' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {addrList.map(addr => (
                                    <div
                                        key={addr.id}
                                        onClick={() => setSelectedAddr(addr)}
                                        style={{ padding: '14px 16px', borderRadius: 16, background: selectedAddr?.id === addr.id ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${selectedAddr?.id === addr.id ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            {/* Radio */}
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedAddr?.id === addr.id ? '#FF6B35' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                                {selectedAddr?.id === addr.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{addr.label}</span>
                                                    {addr.is_default && <span style={{ padding: '1px 8px', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 999, color: '#FF6B35', fontSize: 10, fontWeight: 700 }}>DEFAULT</span>}
                                                </div>
                                                <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{addr.recipient_name}</p>
                                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{addr.phone}</p>
                                                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{addr.street}, {addr.city}, {addr.state}</p>
                                            </div>

                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button onClick={e => { e.stopPropagation(); setEditingAddr(addr); setShowAddrForm(true); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>✏️</button>
                                                <button onClick={e => { e.stopPropagation(); handleDeleteAddr(addr); }} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                                                    <RiDeleteBinLine size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {addrList.length < 5 && (
                                    <button onClick={() => { setEditingAddr(null); setShowAddrForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 16, background: 'none', border: '1.5px dashed rgba(255,255,255,0.12)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, transition: 'border-color 0.15s' }}>
                                        <RiMapPinAddLine size={18} color="#FF6B35" />
                                        Add new address
                                    </button>
                                )}

                                <button
                                    onClick={goToDelivery}
                                    disabled={!selectedAddr}
                                    style={{ padding: '14px', background: !selectedAddr ? 'rgba(255,107,53,0.3)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: !selectedAddr ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                                >
                                    <RiTruckLine size={16} /> Choose Delivery Method
                                </button>
                            </div>
                        )}

                        {/* ── STEP 2: Courier rates ─────────────────────── */}
                        {step === 'delivery' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Selected address chip */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                                    <RiMapPinLine size={14} color="#FF6B35" />
                                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 }}>
                                        Delivering to: {selectedAddr?.street}, {selectedAddr?.city}
                                    </span>
                                    <button onClick={() => setStep('address')} style={{ color: '#FF6B35', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
                                </div>

                                {loadingRates && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', justifyContent: 'center' }}>
                                        <RiLoader4Line size={20} color="#FF6B35" style={{ animation: 'spin 0.8s linear infinite' }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Getting shipping rates…</span>
                                    </div>
                                )}

                              

                                {!loadingRates && rates.map(rate => (
                                    <div
                                        key={rate.rate_id}
                                        onClick={() => setSelectedRate(rate)}
                                        style={{ padding: '14px 16px', borderRadius: 16, background: selectedRate?.rate_id === rate.rate_id ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${selectedRate?.rate_id === rate.rate_id ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
                                    >
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedRate?.rate_id === rate.rate_id ? '#FF6B35' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {selectedRate?.rate_id === rate.rate_id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B35' }} />}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, color: '#fff', fontSize: 14, fontWeight: 700 }}>{rate.carrier}</p>
                                            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{rate.service} · {rate.estimated_days}</p>
                                        </div>

                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ margin: 0, color: '#FF6B35', fontWeight: 800, fontSize: 15 }}>₦{Number(rate.amount).toLocaleString()}</p>
                                            {rate.pickup_eta && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Pickup: {rate.pickup_eta}</p>}
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setStep('confirm')}
                                    disabled={!selectedRate || loadingRates}
                                    style={{ padding: '14px', background: (!selectedRate || loadingRates) ? 'rgba(255,107,53,0.3)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 700, cursor: (!selectedRate || loadingRates) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* ── STEP 3: Confirm ──────────────────────────── */}
                        {step === 'confirm' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* Delivery summary */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <RiMapPinLine size={14} color="#FF6B35" />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivering to</span>
                                    </div>
                                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{selectedAddr?.recipient_name} · {selectedAddr?.phone}</p>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{selectedAddr?.street}, {selectedAddr?.city}, {selectedAddr?.state}</p>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <RiTruckLine size={18} color="#FF6B35" />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{selectedRate?.carrier} · {selectedRate?.service}</p>
                                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{selectedRate?.estimated_days}</p>
                                    </div>
                                    <span style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14 }}>₦{Number(selectedRate?.amount ?? 0).toLocaleString()}</span>
                                </div>

                                {/* Coupon field */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setCouponOpen(v => !v)}
                                        style={{ width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
                                    >
                                        <RiGiftLine size={16} color={couponApplied ? '#10B981' : '#FF6B35'} />
                                        <span style={{ color: couponApplied ? '#10B981' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, flex: 1 }}>
                                            {couponApplied ? `${couponApplied.code} — ₦${Number(couponApplied.amount).toLocaleString()} off` : 'Have a promo code?'}
                                        </span>
                                        {couponApplied
                                            ? <button onClick={e => { e.stopPropagation(); handleRemoveCoupon(); }} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                            : <RiArrowRightLine size={14} color="rgba(255,255,255,0.3)" style={{ transform: couponOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                        }
                                    </button>

                                    {couponOpen && !couponApplied && (
                                        <div style={{ padding: '0 14px 14px', display: 'flex', gap: 8 }}>
                                            <input
                                                value={couponCode}
                                                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                placeholder="Enter code e.g. FLKRATE-XXXX-XXXX"
                                                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                                style={{ ...inp, flex: 1, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', letterSpacing: 1 }}
                                            />
                                            <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} style={{ padding: '10px 14px', background: '#FF6B35', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: (!couponCode || couponLoading) ? 0.5 : 1 }}>
                                                {couponLoading ? '…' : 'Apply'}
                                            </button>
                                        </div>
                                    )}
                                    {couponError && <p style={{ color: '#EF4444', fontSize: 12, margin: '0 14px 12px', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{couponError}</p>}
                                </div>

                                {/* Price breakdown */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <SummaryRow label="Subtotal"  value={`₦${subtotal.toLocaleString()}`} />
                                    <SummaryRow label="Delivery"  value={`₦${Number(selectedRate?.amount ?? 0).toLocaleString()}`} />
                                    {couponApplied && (
                                        <SummaryRow label={`Promo (${couponApplied.code})`} value={`-₦${Number(discount).toLocaleString()}`} valueColor="#10B981" />
                                    )}
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
                                    <SummaryRow label="Total" value={`₦${Math.max(0, grandTotal).toLocaleString()}`} bold />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
                                    <RiShieldCheckLine size={14} color="#10B981" />
                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Secure payment via Paystack. Buyer protection included.</span>
                                </div>

                                

                                <button
                                    onClick={handleCheckout}
                                    disabled={checking}
                                    style={{ padding: '15px', background: checking ? 'rgba(255,107,53,0.5)' : '#FF6B35', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                                >
                                    {checking
                                        ? <><RiLoader4Line size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Redirecting to payment…</>
                                        : <><RiSecurePaymentLine size={18} /> Pay ₦{Math.max(0, grandTotal).toLocaleString()}</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Main CartIndex ────────────────────────────────────────────────────────────
export default function CartIndex({ cartItems: initialItems = [], addresses: initialAddresses = [] }) {
    const { showToast, ToastComponent } = useToast();
    const [items,          setItems]          = useState(initialItems);
    const [addresses,      setAddresses]      = useState(initialAddresses);
    const [loading,        setLoading]        = useState({});
    const [error,          setError]          = useState('');
    const [showClearModal, setShowClearModal] = useState(false);
    const [showCheckout,   setShowCheckout]   = useState(false);

    const subtotal = items.reduce((s, i) => s + Number(i.product?.price ?? 0) * i.quantity, 0);
    const isEmpty  = items.length === 0;

    const grouped = items.reduce((acc, item) => {
        const sid = item.product?.seller?.id ?? 'unknown';
        if (!acc[sid]) acc[sid] = { seller: item.product?.seller, items: [] };
        acc[sid].items.push(item);
        return acc;
    }, {});

    const updateQuantity = async (item, delta) => {
        const newQty = item.quantity + delta;
        if (newQty < 1) return removeItem(item);
        setLoading(l => ({ ...l, [item.id]: true }));
        try {
            await axios.patch(`/api/cart/${item.id}`, { quantity: newQty });
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
        } catch (e) {
            showToast(e.response?.data?.message ?? 'Failed to update.', 'error')
        } finally {
            setLoading(l => ({ ...l, [item.id]: false }));
        }
    };

    const removeItem = async (item) => {
        setLoading(l => ({ ...l, [item.id]: true }));
        try {
            await axios.delete(`/api/cart/${item.id}`);
            setItems(prev => prev.filter(i => i.id !== item.id));
        } catch {
            showToast('Failed to remove item.', 'error')
        } finally {
            setLoading(l => ({ ...l, [item.id]: false }));
        }
    };

    const clearCart = async () => {
        setShowClearModal(false);
        try {
            await axios.delete('/api/cart');
            setItems([]);
        } catch {
            showToast('Failed to clear cart.', 'error');
        }
    };

    return (
        <>
            <Head title="Cart" />
            <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>

                {/* Header */}
                <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => window.history.back()} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <RiArrowLeftLine size={18} />
                        </button>
                        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>My Cart</h1>
                        {!isEmpty && (
                            <span style={{ marginLeft: 6, padding: '2px 10px', borderRadius: 999, background: 'rgba(255,107,53,0.15)', color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>
                                {items.length} item{items.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        {!isEmpty && (
                            <button onClick={() => setShowClearModal(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 140px' }}>
                   

                    {/* Empty state */}
                    {isEmpty && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 16 }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RiShoppingCart2Line size={32} color="rgba(255,255,255,0.2)" />
                            </div>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Your cart is empty</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Discover products from Nigerian sellers.</p>
                            <Link href="/shop" style={{ padding: '12px 28px', background: '#FF6B35', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', marginTop: 8 }}>
                                Start Shopping
                            </Link>
                        </div>
                    )}

                    {/* Cart items grouped by seller */}
                    {!isEmpty && Object.values(grouped).map(({ seller, items: sellerItems }) => (
                        <div key={seller?.id ?? 'unknown'} style={{ marginBottom: 20, background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' }}>
                            {/* Seller header */}
                            <Link href={`/@${seller?.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                                <img src={seller?.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(seller?.name ?? 'S')}&background=1a1a1a`} alt={seller?.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{seller?.name}</span>
                                        {seller?.is_verified && <RiVerifiedBadgeLine size={13} color="#FF6B35" />}
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>@{seller?.username}</span>
                                </div>
                                <RiArrowRightLine size={16} color="rgba(255,255,255,0.3)" />
                            </Link>

                            {sellerItems.map((item, idx) => {
                                const product   = item.product;
                                const itemTotal = Number(product?.price ?? 0) * item.quantity;
                                const isLoading = loading[item.id];

                                return (
                                    <div key={item.id} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderBottom: idx < sellerItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                                        <Link href={`/@${seller?.username}/products/${product?.slug}`} style={{ flexShrink: 0 }}>
                                            <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
                                                {product?.primary_image
                                                    ? <img src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiImageLine size={24} color="rgba(255,255,255,0.2)" /></div>
                                                }
                                            </div>
                                        </Link>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Link href={`/@${seller?.username}/products/${product?.slug}`} style={{ textDecoration: 'none' }}>
                                                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product?.name}</p>
                                            </Link>
                                            <p style={{ color: '#FF6B35', fontWeight: 700, fontSize: 14, margin: '0 0 10px' }}>
                                                ₦{Number(product?.price ?? 0).toLocaleString()} × {item.quantity} = ₦{itemTotal.toLocaleString()}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
                                                    <button onClick={() => updateQuantity(item, -1)} disabled={isLoading} style={{ width: 34, height: 34, border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiSubtractLine size={15} /></button>
                                                    <span style={{ minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item, 1)} disabled={isLoading || item.quantity >= (product?.stock_quantity ?? 99)} style={{ width: 34, height: 34, border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiAddLine size={15} /></button>
                                                </div>
                                                <button onClick={() => removeItem(item)} disabled={isLoading} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                                                    <RiDeleteBinLine size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Order summary (static — courier is chosen in modal) */}
                    {!isEmpty && (
                        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '18px 20px', marginTop: 8 }}>
                            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Order Summary</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <SummaryRow label="Subtotal"     value={`₦${subtotal.toLocaleString()}`} />
                                <SummaryRow label="Delivery"     value="Calculated at checkout" valueColor="rgba(255,255,255,0.35)" />
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                                <SummaryRow label="Est. Total"   value={`₦${subtotal.toLocaleString()}+`} bold />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky checkout button */}
                {!isEmpty && (
                    <div style={{ position: 'fixed', left: 0, right: 0, padding: '12px 20px 28px', background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)', zIndex: 50 }} className="cart-sticky-bar bottom-[40px] lg:bottom-0">
                        <div style={{ maxWidth: 720, margin: '0 auto' }}>
                            <button
                                onClick={() => setShowCheckout(true)}
                                style={{ width: '100%', padding: '16px', background: '#FF6B35', border: 'none', borderRadius: 999, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                <RiFlashlightLine size={18} />
                                Checkout · ₦{subtotal.toLocaleString()}
                            </button>
                        </div>
                    </div>
                )}

                {/* Clear cart modal */}
                {showClearModal && (
                    <>
                        <div onClick={() => setShowClearModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100 }} />
                        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(360px,90vw)', background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, zIndex: 101 }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <RiDeleteBinLine size={24} color="#EF4444" />
                            </div>
                            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>Clear your cart?</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
                                This will remove all {items.length} item{items.length !== 1 ? 's' : ''}. This cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowClearModal(false)} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={clearCart} style={{ flex: 1, padding: '13px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Clear Cart</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Checkout modal */}
            {showCheckout && (
                <CheckoutModal
    items={items}
    addresses={addresses}
    subtotal={subtotal}
    onClose={() => setShowCheckout(false)}
    onSuccess={() => setShowCheckout(false)}
    showToast={showToast}
/>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (min-width: 768px) { .cart-sticky-bar { left: 240px !important; } }
                select option { background: #1a1a1a; }
            `}</style>
        
        {ToastComponent}
        
        </>
    );
}

CartIndex.layout = page => <AppLayout>{page}</AppLayout>;

function SummaryRow({ label, value, bold, valueColor }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: bold ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 400 }}>{label}</span>
            <span style={{ color: valueColor ?? (bold ? '#FF6B35' : '#fff'), fontSize: bold ? 16 : 13, fontWeight: bold ? 800 : 500 }}>{value}</span>
        </div>
    );
}

function AddrField({ label, children }) {
    return (
        <div>
            <p style={labelStyle}>{label}</p>
            {children}
        </div>
    );
}

const labelStyle = { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' };

const inp = {
    width: '100%', padding: '12px 13px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
};