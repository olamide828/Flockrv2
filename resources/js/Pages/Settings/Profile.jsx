import { useToast } from '@/Components/Toast';
import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import {
    FiCheckCircle,
    FiFileText,
    FiGift,
    FiHeart,
    FiInfo,
    FiMail,
    FiMapPin,
    FiMessageCircle,
    FiPackage,
    FiPhone,
    FiTruck,
    FiUsers,
} from 'react-icons/fi';
import {
    RiCheckLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiLoader4Line,
    RiMapPinAddLine,
    RiMapPinLine,
    RiPencilLine,
} from 'react-icons/ri';

// ── Luggage Tag Component ─────────────────────────────────────────────────────
function LuggageTag({ street, city, state, onEdit }) {
    // Generate a fake-but-convincing barcode pattern
    const barcodeWidths = [2,1,3,1,2,1,1,2,3,1,2,1,3,2,1,1,2,1,3,1,2,3,1,2,1,1,3,2,1,2];
    const shortCode = (street + city + state).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 12).padEnd(12, '0');

    return (
        <div style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
            border: '1.5px dashed rgba(255,107,53,0.4)',
            borderRadius: 18,
            padding: '20px 20px 16px',
            overflow: 'hidden',
            marginBottom: 2,
        }}>
            {/* Tear-away notch top-left */}
            <div style={{ position: 'absolute', top: -10, left: 24, width: 20, height: 20, borderRadius: '50%', background: 'var(--flockr-black)', border: '1.5px dashed rgba(255,107,53,0.4)' }} />
            <div style={{ position: 'absolute', top: -10, right: 24, width: 20, height: 20, borderRadius: '50%', background: 'var(--flockr-black)', border: '1.5px dashed rgba(255,107,53,0.4)' }} />

            {/* Background truck watermark */}
            <div style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.04, transform: 'scale(3)', pointerEvents: 'none' }}>
                <FiTruck size={60} color="#FF6B35" />
            </div>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        {/* TShip Verified badge */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px',
                            background: 'linear-gradient(90deg, rgba(255,107,53,0.15), rgba(255,107,53,0.08))',
                            border: '1px solid rgba(255,107,53,0.3)',
                            borderRadius: 999,
                        }}>
                            <FiCheckCircle size={10} color="#FF6B35" />
                            <span style={{ color: '#FF6B35', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TShip Verified</span>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px',
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.25)',
                            borderRadius: 999,
                        }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                            <span style={{ color: '#10B981', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Dispatch Active</span>
                        </div>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pickup Origin</p>
                </div>

                {/* Flockr logo mark */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#FF6B35', fontSize: 14, fontWeight: 900, fontFamily: 'var(--font-display)' }}>F</span>
                </div>
            </div>

            {/* Address content */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
                <RiMapPinLine size={16} color="#FF6B35" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                    <p style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{street}</p>
                    <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{city}, {state}</p>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.06em' }}>NG · WEST AFRICA</p>
                </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 4px, transparent 4px, transparent 8px)' }} />
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Barcode</span>
                <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 4px, transparent 4px, transparent 8px)' }} />
            </div>

            {/* Barcode + code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 36 }}>
                    {barcodeWidths.map((w, i) => (
                        <div key={i} style={{
                            width: w,
                            height: i % 3 === 0 ? 36 : i % 2 === 0 ? 28 : 22,
                            background: i % 4 === 0 ? 'rgba(255,107,53,0.7)' : 'rgba(255,255,255,0.5)',
                            borderRadius: 1,
                        }} />
                    ))}
                </div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.2em' }}>
                    {shortCode.match(/.{1,4}/g)?.join(' ')}
                </p>
            </div>

            {/* Edit button */}
            <button
                onClick={onEdit}
                style={{
                    position: 'absolute', top: 16, right: 60,
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 11,
                    fontWeight: 600, cursor: 'pointer',
                }}
            >
                <RiPencilLine size={11} /> Edit
            </button>

            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
    );
}

// ── Pickup Address Form with Terminal API states/cities ───────────────────────
function PickupAddressForm({ initial, onSaved, showToast }) {
    const [form, setForm] = useState({
        pickup_street:      initial.pickup_street      ?? '',
        pickup_city:        initial.pickup_city        ?? '',
        pickup_state:       initial.pickup_state       ?? '',
        pickup_state_code:  initial.pickup_state_code  ?? '',
        pickup_postal_code: initial.pickup_postal_code ?? '',
    });
    const [states,        setStates]        = useState([]);
    const [cities,        setCities]        = useState([]);
    const [loadingStates, setLoadingStates] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);
    const [saving,        setSaving]        = useState(false);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        axios.get('/api/locations/states')
            .then(async r => {
                setStates(r.data.states ?? []);
                if (initial.pickup_state_code) {
                    const cr = await axios.get('/api/locations/cities', {
                        params: { state_code: initial.pickup_state_code },
                    });
                    setCities(cr.data.cities ?? []);
                }
            })
            .catch(() => showToast('Could not load states. Check your connection.', 'error'))
            .finally(() => setLoadingStates(false));
    }, []);

    useEffect(() => {
        if (!form.pickup_state_code) { setCities([]); return; }
        setLoadingCities(true);
        axios.get('/api/locations/cities', { params: { state_code: form.pickup_state_code } })
            .then(r => setCities(r.data.cities ?? []))
            .catch(() => showToast('Could not load cities.', 'error'))
            .finally(() => setLoadingCities(false));
    }, [form.pickup_state_code]);

    const handleStateChange = e => {
        const s = states.find(st => st.isoCode === e.target.value);
        setForm(p => ({ ...p, pickup_state_code: s?.isoCode ?? '', pickup_state: s?.name ?? '', pickup_city: '' }));
    };

    const handleSave = async () => {
        if (!form.pickup_street.trim()) { showToast('Street address is required.', 'error'); return; }
        if (!form.pickup_state)         { showToast('Please select a state.', 'error'); return; }
        if (!form.pickup_city)          { showToast('Please select a city.', 'error'); return; }

    
        const phoneClean = form.phone.replace(/\s/g, '');
if (!/^(\+234|234|0)[789]\d{9}$/.test(phoneClean)) {
    showToast?.('Enter a valid Nigerian number e.g. 08012345678 or +2348012345678', 'error');
    return;
}

        setSaving(true);
        try {
            await axios.post('/api/seller/pickup-address', form);
            showToast('Pickup address saved!', 'success');
            onSaved(form);
        } catch (err) {
            const msg = err.code === 'ERR_NETWORK'
                ? 'No internet connection.'
                : (err.response?.data?.message ?? 'Failed to save address.');
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, color: 'var(--flockr-muted)', fontSize: 13, lineHeight: 1.5 }}>
                This is where couriers will collect your packages. Must match a valid TShip location.
            </p>

            <FormField label="Street Address">
                <input
                    value={form.pickup_street}
                    onChange={e => set('pickup_street', e.target.value)}
                    placeholder="House/shop number and street name"
                    style={inputStyle}
                />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormField label="State">
                    <select
                        value={form.pickup_state_code}
                        onChange={handleStateChange}
                        disabled={loadingStates}
                        style={{ ...inputStyle, appearance: 'none', opacity: loadingStates ? 0.5 : 1 }}
                    >
                        <option value="">{loadingStates ? 'Loading…' : 'Select state'}</option>
                        {states.map((s, i) => (
                            <option key={s.isoCode ?? s._id ?? i} value={s.isoCode}>{s.name}</option>
                        ))}
                    </select>
                </FormField>

                <FormField label="City">
                    <select
                        value={form.pickup_city}
                        onChange={e => set('pickup_city', e.target.value)}
                        disabled={!form.pickup_state_code || loadingCities}
                        style={{ ...inputStyle, appearance: 'none', opacity: (!form.pickup_state_code || loadingCities) ? 0.5 : 1 }}
                    >
                        <option value="">
                            {!form.pickup_state_code ? 'Select state first' : loadingCities ? 'Loading…' : 'Select city'}
                        </option>
                        {cities.map((c, i) => (
                            <option key={(c.name ?? '') + i} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                </FormField>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
                {saving
                    ? <><RiLoader4Line size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</>
                    : <><RiCheckLine size={15} />Save Pickup Address</>
                }
            </button>
        </div>
    );
}

// ── Address card (delivery addresses) ────────────────────────────────────────
function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
    const [deleting, setDeleting] = useState(false);
    const [setting,  setSetting]  = useState(false);

    const handleDelete = async () => {
        if (!confirm('Remove this address?')) return;
        setDeleting(true);
        try { await onDelete(address); } finally { setDeleting(false); }
    };

    const handleDefault = async () => {
        if (address.is_default) return;
        setSetting(true);
        try { await onSetDefault(address); } finally { setSetting(false); }
    };

    return (
        <div style={{ background: 'var(--flockr-card)', border: '1.5px solid ' + (address.is_default ? 'rgba(255,107,53,0.3)' : 'rgba(255,255,255,0.07)'), borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,107,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RiMapPinLine size={18} color="#FF6B35" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{address.label}</span>
                        {address.is_default && (
                            <span style={{ padding: '1px 8px', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 999, color: '#FF6B35', fontSize: 10, fontWeight: 700 }}>DEFAULT</span>
                        )}
                    </div>
                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600 }}>{address.recipient_name}</p>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{address.phone}</p>
                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                        {address.street}{address.landmark ? ', ' + address.landmark : ''}, {address.city}, {address.state}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {!address.is_default && (
                    <button onClick={handleDefault} disabled={setting} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {setting ? 'Setting…' : 'Set as default'}
                    </button>
                )}
                <button onClick={() => onEdit(address)} style={{ flex: 1, padding: '8px', borderRadius: 10, background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', color: '#FF6B35', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Edit
                </button>
                <button onClick={handleDelete} disabled={deleting} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {deleting ? <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RiDeleteBinLine size={14} />}
                </button>
            </div>
        </div>
    );
}

// ── Inline address form (for delivery addresses in settings) ──────────────────
function AddressForm({ editing, onSaved, onCancel, showToast }) {
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

    useEffect(() => {
        axios.get('/api/locations/states')
            .then(async r => {
                setStates(r.data.states ?? []);
                if (editing?.state_code) {
                    const cr = await axios.get('/api/locations/cities', { params: { state_code: editing.state_code } });
                    setCities(cr.data.cities ?? []);
                }
            })
            .catch(() => showToast?.('Could not load states.', 'error'))
            .finally(() => setLoadingStates(false));
    }, []);

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

    const handleSave = async () => {
        if (!form.recipient_name.trim()) { showToast?.('Recipient name is required.', 'error'); return; }
        if (!form.phone.trim()) { showToast?.('Phone number is required.', 'error'); return; }
        const phoneClean = form.phone.replace(/\s/g, '');
        if (!/^(\+234|234|0)[789]\d{9}$/.test(phoneClean)) { showToast?.('Enter a valid Nigerian number e.g. 08012345678', 'error'); return; }
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
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 14 }}>{editing ? 'Edit Address' : 'New Address'}</p>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cancel</button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                {['Home','Work','Other'].map(l => (
                    <button key={l} onClick={() => set('label', l)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: form.label === l ? 'rgba(255,107,53,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (form.label === l ? 'rgba(255,107,53,0.35)' : 'rgba(255,255,255,0.08)'), color: form.label === l ? '#FF6B35' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
                ))}
            </div>

            <FormField label="Recipient Name *"><input value={form.recipient_name} onChange={e => set('recipient_name', e.target.value)} placeholder="Full name" style={inputStyle} /></FormField>
            <FormField label="Phone *">
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08012345678 or +2348012345678" type="tel" style={inputStyle} />
            </FormField>
            <FormField label="Street Address *"><input value={form.street} onChange={e => set('street', e.target.value)} placeholder="House number, street name" style={inputStyle} /></FormField>
            <FormField label="Landmark (optional)"><input value={form.landmark} onChange={e => set('landmark', e.target.value)} placeholder="Near First Bank, Opposite Shoprite" style={inputStyle} /></FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormField label="State *">
                    <select value={form.state_code} onChange={handleStateChange} disabled={loadingStates} style={{ ...inputStyle, appearance: 'none', opacity: loadingStates ? 0.5 : 1 }}>
                        <option value="">{loadingStates ? 'Loading…' : 'Select state'}</option>
                        {states.map((s, i) => <option key={s.isoCode ?? i} value={s.isoCode}>{s.name}</option>)}
                    </select>
                </FormField>
                <FormField label="City *">
                    <select value={form.city} onChange={e => set('city', e.target.value)} disabled={!form.state_code || loadingCities} style={{ ...inputStyle, appearance: 'none', opacity: (!form.state_code || loadingCities) ? 0.5 : 1 }}>
                        <option value="">{!form.state_code ? 'Select state first' : loadingCities ? 'Loading…' : 'Select city'}</option>
                        {cities.map((c, i) => <option key={(c.name ?? '') + i} value={c.name}>{c.name}</option>)}
                    </select>
                </FormField>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div onClick={() => set('is_default', !form.is_default)} style={{ width: 40, height: 22, borderRadius: 999, background: form.is_default ? '#FF6B35' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 2, left: form.is_default ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Set as default</span>
            </label>

            <button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <><RiLoader4Line size={15} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : <><RiCheckLine size={15} />{editing ? 'Update' : 'Save Address'}</>}
            </button>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileSettings({ banks = [], addresses: initialAddresses = [], has_pickup_address = false }) {
    const { auth } = usePage().props;
    const { showToast, ToastComponent } = useToast();

    const [tab,         setTab]         = useState('profile');
    const [editing,     setEditing]     = useState(false);
    const [editingBank, setEditingBank] = useState(false);
    const [avatarPrev,  setAvatarPrev]  = useState(auth?.user?.avatar_url ?? null);
    const fileRef = useRef(null);

    // Pickup address state
    const [pickupSaved,      setPickupSaved]      = useState(has_pickup_address);
    const [editingPickup,    setEditingPickup]     = useState(false);
    const [pickupData,       setPickupData]        = useState({
        pickup_street:      auth?.user?.pickup_street      ?? '',
        pickup_city:        auth?.user?.pickup_city        ?? '',
        pickup_state:       auth?.user?.pickup_state       ?? '',
        pickup_state_code:  auth?.user?.pickup_state_code  ?? '',
        pickup_postal_code: auth?.user?.pickup_postal_code ?? '',
    });

    // Delivery addresses state
    const [addresses,    setAddresses]    = useState(initialAddresses);
    const [showAddrForm, setShowAddrForm] = useState(false);
    const [editingAddr,  setEditingAddr]  = useState(null);

    const { data, setData, post, processing, errors, recentlySuccessful, reset } = useForm({
        name:     auth?.user?.name     ?? '',
        username: auth?.user?.username ?? '',
        bio:      auth?.user?.bio      ?? '',
        location: auth?.user?.location ?? '',
        phone:    auth?.user?.phone    ?? '',
        avatar:   null,
    });

    const bankForm = useForm({ bank_code: '', account_number: '' });
    const pwForm   = useForm({ current_password: '', password: '', password_confirmation: '' });

    // Show toast on profile update instead of banner
    useEffect(() => {
        if (recentlySuccessful) {
            showToast('Profile updated!', 'success');
            setEditing(false);
        }
    }, [recentlySuccessful]);

    const handleAvatarChange = e => {
        const file = e.target.files[0];
        if (!file) return;
        setData('avatar', file);
        setAvatarPrev(URL.createObjectURL(file));
    };

    const submitProfile = e => {
        e.preventDefault();
        post('/settings/profile', { forceFormData: true, preserveScroll: true });
    };

    const cancelEdit = () => {
        setEditing(false);
        setAvatarPrev(auth?.user?.avatar_url ?? null);
        reset();
    };

    const handlePickupSaved = form => {
        setPickupData(form);
        setPickupSaved(true);
        setEditingPickup(false);
    };

    const handleAddrSaved = (addr, type) => {
        if (type === 'add') {
            setAddresses(prev => addr.is_default
                ? [addr, ...prev.map(a => ({ ...a, is_default: false }))]
                : [addr, ...prev]
            );
            showToast('Address saved!', 'success');
        } else {
            setAddresses(prev => prev.map(a => a.id === addr.id ? addr : (addr.is_default ? { ...a, is_default: false } : a)));
            showToast('Address updated!', 'success');
        }
        setShowAddrForm(false);
        setEditingAddr(null);
    };

    const handleDeleteAddr = async addr => {
        await axios.delete('/api/addresses/' + addr.id);
        const updated = addresses.filter(a => a.id !== addr.id);
        if (addr.is_default && updated.length > 0) {
            await axios.post('/api/addresses/' + updated[0].id + '/set-default');
            updated[0] = { ...updated[0], is_default: true };
        }
        setAddresses(updated);
        showToast('Address removed.', 'info');
    };

    const handleSetDefault = async addr => {
        await axios.post('/api/addresses/' + addr.id + '/set-default');
        setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === addr.id })));
        showToast('Default address updated.', 'success');
    };

    const isSeller = auth?.user?.role === 'seller';

    const TABS = [
        { key: 'profile',       label: 'Profile',  icon: PersonIcon },
        { key: 'addresses',     label: 'Addresses', icon: RiMapPinLine },
        { key: 'security',      label: 'Security',  icon: LockIcon },
        ...(isSeller ? [{ key: 'payouts', label: 'Payouts', icon: CardIcon }] : []),
        { key: 'notifications', label: 'Alerts',    icon: BellIcon },
    ];

    return (
        <>
            <Head title="Settings" />
            <div className="scroll-hidden h-screen overflow-y-auto" style={{ background: 'var(--flockr-black)' }}>

                {/* Top bar */}
                <div style={{ position: 'sticky', top: 0, zIndex: 30, width: '100%', boxSizing: 'border-box', background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--flockr-text)' }}>Settings</span>
                    {tab === 'profile' && !editing && (
                        <button onClick={() => setEditing(true)} style={{ background: 'rgba(255,92,0,0.12)', border: '1px solid rgba(255,92,0,0.35)', color: 'var(--flockr-orange)', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit Profile</button>
                    )}
                    {tab === 'profile' && editing && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={cancelEdit} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--flockr-muted)', borderRadius: 999, padding: '7px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={submitProfile} disabled={processing} style={{ background: 'var(--flockr-orange)', border: 'none', color: '#fff', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: processing ? 0.7 : 1 }}>{processing ? 'Saving…' : 'Save'}</button>
                        </div>
                    )}
                </div>

                {/* Tab strip */}
                <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.07)', scrollbarWidth: 'none' }}>
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button key={t.key} onClick={() => { setTab(t.key); setEditing(false); }} style={{ flex: '1 0 auto', minWidth: 70, padding: '14px 8px 12px', background: 'none', border: 'none', borderBottom: active ? '2px solid var(--flockr-orange)' : '2px solid transparent', color: active ? 'var(--flockr-text)' : 'var(--flockr-muted)', cursor: 'pointer', fontSize: 11, fontWeight: active ? 600 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <Icon size={18} color={active ? 'var(--flockr-orange)' : 'var(--flockr-muted)'} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 100px' }}>

                    {/* ── PROFILE TAB ──────────────────────────────────────────── */}
                    {tab === 'profile' && (
                        <div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 20px', gap: 14 }}>
                                <div style={{ position: 'relative' }}>
                                    {avatarPrev
                                        ? <img src={avatarPrev} alt={auth?.user?.name} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.1)' }} />
                                        : <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, var(--flockr-orange), #ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', border: '3px solid rgba(255,255,255,0.1)' }}>{(auth?.user?.name ?? 'U')[0].toUpperCase()}</div>
                                    }
                                    {editing && (
                                        <button type="button" onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: 'var(--flockr-orange)', border: '2px solid var(--flockr-black)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                                        </button>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                                </div>

                                {!editing && (
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ color: 'var(--flockr-text)', fontWeight: 700, fontSize: 20, fontFamily: 'var(--font-display)', margin: 0 }}>{auth?.user?.name}</p>
                                        <p style={{ color: 'var(--flockr-muted)', fontSize: 14, margin: '4px 0 0' }}>@{auth?.user?.username}</p>
                                        {auth?.user?.role && <span style={{ display: 'inline-block', marginTop: 8, background: 'rgba(255,92,0,0.12)', border: '1px solid rgba(255,92,0,0.3)', color: 'var(--flockr-orange)', borderRadius: 999, padding: '3px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{auth?.user?.role}</span>}
                                    </div>
                                )}

                                {!editing && (
                                    <div style={{ display: 'flex', gap: 32, marginTop: 4 }}>
                                        {[
                                            { label: 'Following', value: auth?.user?.following_count ?? 0 },
                                            { label: 'Followers', value: auth?.user?.followers_count ?? 0 },
                                            ...(isSeller ? [{ label: 'Sales', value: auth?.user?.total_sales ?? 0 }] : []),
                                        ].map(s => (
                                            <div key={s.label} style={{ textAlign: 'center' }}>
                                                <p style={{ color: 'var(--flockr-text)', fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', margin: 0 }}>{Number(s.value).toLocaleString()}</p>
                                                <p style={{ color: 'var(--flockr-muted)', fontSize: 12, margin: '2px 0 0' }}>{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {!editing && (
                                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {[
                                        { icon: FiFileText, label: 'Bio',      value: auth?.user?.bio },
                                        { icon: FiMapPin,   label: 'Location', value: auth?.user?.location },
                                        { icon: FiPhone,    label: 'Phone',    value: auth?.user?.phone },
                                        { icon: FiMail,     label: 'Email',    value: auth?.user?.email },
                                    ].map(row => {
                                        const RowIcon = row.icon;
                                        return (
                                            <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <RowIcon size={16} color="var(--flockr-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ color: 'var(--flockr-muted)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>{row.label}</p>
                                                    <p style={{ color: row.value ? 'var(--flockr-text)' : 'var(--flockr-subtle)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{row.value || 'No ' + row.label.toLowerCase() + ' added'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {editing && (
                                <form onSubmit={submitProfile} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <FormField label="Full Name" error={errors.name}><input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Your full name" style={inputStyle} /></FormField>
                                    <FormField label="Username" error={errors.username}>
                                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                                            <span style={{ padding: '0 0 0 14px', color: 'var(--flockr-muted)', fontSize: 14, flexShrink: 0 }}>@</span>
                                            <input value={data.username} onChange={e => setData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))} placeholder="username" style={{ ...inputStyle, border: 'none', background: 'none', paddingLeft: 6, borderRadius: 0 }} />
                                        </div>
                                    </FormField>
                                    <FormField label="Bio" error={errors.bio}><textarea value={data.bio} onChange={e => setData('bio', e.target.value)} placeholder="Tell people about yourself..." maxLength={500} rows={3} style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} /></FormField>
                                    <FormField label="Location" error={errors.location}><input value={data.location} onChange={e => setData('location', e.target.value)} placeholder="Lagos, Nigeria" style={inputStyle} /></FormField>
                                    <FormField label="Phone Number" error={errors.phone}><input value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="08012345678" type="tel" style={inputStyle} /></FormField>
                                    <button type="submit" disabled={processing} style={{ ...primaryBtnStyle, marginTop: 8, opacity: processing ? 0.7 : 1 }}>{processing ? 'Saving…' : 'Save Changes'}</button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* ── ADDRESSES TAB ────────────────────────────────────────── */}
                    {tab === 'addresses' && (
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* Seller pickup address — luggage tag or form */}
                            {isSeller && (
                                <div style={{ background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <FiTruck size={16} color="var(--flockr-orange)" />
                                            <p style={{ color: 'var(--flockr-text)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, margin: 0 }}>Pickup Address</p>
                                        </div>
                                        {pickupSaved && !editingPickup && (
                                            <span style={{ padding: '2px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 999, color: '#10B981', fontSize: 10, fontWeight: 700 }}>ACTIVE</span>
                                        )}
                                    </div>

                                    <div style={{ padding: 16 }}>
                                        {/* Show luggage tag if saved and not editing */}
                                        {pickupSaved && !editingPickup ? (
                                            <LuggageTag
                                                street={pickupData.pickup_street}
                                                city={pickupData.pickup_city}
                                                state={pickupData.pickup_state}
                                                onEdit={() => setEditingPickup(true)}
                                            />
                                        ) : (
                                            <PickupAddressForm
                                                initial={pickupData}
                                                onSaved={handlePickupSaved}
                                                showToast={showToast}
                                            />
                                        )}

                                        {/* No pickup address warning */}
                                        {!pickupSaved && !editingPickup && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 12, marginTop: 12 }}>
                                                <FiInfo size={14} color="#EAB308" style={{ flexShrink: 0 }} />
                                                <p style={{ margin: 0, color: 'rgba(234,179,8,0.8)', fontSize: 12 }}>Set your pickup address so couriers can collect orders from you.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Buyer delivery addresses */}
                            <div style={{ background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <p style={{ color: 'var(--flockr-text)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, margin: 0 }}>Delivery Addresses</p>
                                    <span style={{ color: 'var(--flockr-muted)', fontSize: 12 }}>{addresses.length}/5</span>
                                </div>
                                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {addresses.map(addr => (
                                        <AddressCard
                                            key={addr.id}
                                            address={addr}
                                            onEdit={a => { setEditingAddr(a); setShowAddrForm(true); }}
                                            onDelete={handleDeleteAddr}
                                            onSetDefault={handleSetDefault}
                                        />
                                    ))}

                                    {showAddrForm ? (
                                        <AddressForm
                                            editing={editingAddr}
                                            onSaved={handleAddrSaved}
                                            onCancel={() => { setShowAddrForm(false); setEditingAddr(null); }}
                                            showToast={showToast}
                                        />
                                    ) : addresses.length < 5 ? (
                                        <button onClick={() => { setEditingAddr(null); setShowAddrForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 14, background: 'none', border: '1.5px dashed rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>
                                            <RiMapPinAddLine size={18} color="#FF6B35" />
                                            Add delivery address
                                        </button>
                                    ) : null}

                                    {addresses.length === 0 && !showAddrForm && (
                                        <p style={{ color: 'var(--flockr-muted)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>No saved addresses yet. Add one to speed up checkout.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SECURITY TAB ─────────────────────────────────────────── */}
                    {tab === 'security' && (
                        <div style={{ padding: 16 }}>
                            <SectionCard title="Change Password">
                                <form onSubmit={e => { e.preventDefault(); pwForm.post('/settings/password'); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <FormField label="Current Password" error={pwForm.errors.current_password}><input type="password" value={pwForm.data.current_password} onChange={e => pwForm.setData('current_password', e.target.value)} placeholder="••••••••" style={inputStyle} /></FormField>
                                    <FormField label="New Password" error={pwForm.errors.password}><input type="password" value={pwForm.data.password} onChange={e => pwForm.setData('password', e.target.value)} placeholder="••••••••" style={inputStyle} /></FormField>
                                    <FormField label="Confirm New Password" error={pwForm.errors.password_confirmation}><input type="password" value={pwForm.data.password_confirmation} onChange={e => pwForm.setData('password_confirmation', e.target.value)} placeholder="••••••••" style={inputStyle} /></FormField>
                                    <button type="submit" disabled={pwForm.processing} style={primaryBtnStyle}>{pwForm.processing ? 'Updating…' : 'Update Password'}</button>
                                </form>
                            </SectionCard>
                            <div style={{ height: 20 }} />
                            <SectionCard title="Danger Zone">
                                <p style={{ color: 'var(--flockr-muted)', fontSize: 13, margin: '0 0 14px' }}>Once you delete your account, there is no going back.</p>
                                <button onClick={async () => { if (!confirm('Are you sure? This permanently deletes your account.')) return; try { await axios.delete('/api/users/me'); window.location.href = '/'; } catch { showToast('Failed to delete account.', 'error'); } }} style={{ width: '100%', padding: '13px', borderRadius: 999, background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', color: 'var(--flockr-red)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Delete Account</button>
                            </SectionCard>
                        </div>
                    )}

                    {/* ── PAYOUTS TAB ──────────────────────────────────────────── */}
                    {tab === 'payouts' && (
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {!pickupSaved && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 14 }}>
                                    <FiInfo size={16} color="#EAB308" style={{ flexShrink: 0 }} />
                                    <p style={{ margin: 0, color: 'rgba(234,179,8,0.8)', fontSize: 13 }}>
                                        Set your <button onClick={() => setTab('addresses')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EAB308', textDecoration: 'underline', fontSize: 13, padding: 0 }}>pickup address</button> so couriers can collect orders from you.
                                    </p>
                                </div>
                            )}

                            {auth?.user?.paystack_subaccount_code && !editingBank ? (
                                <>
                                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, padding: 24, minHeight: 220, background: 'linear-gradient(135deg, #ff5c00 0%, #ff8c00 45%, #ffb347 100%)', boxShadow: '0 20px 60px rgba(255,92,0,0.25)', color: '#fff' }}>
                                        <div style={{ position: 'absolute', top: -80, right: -80, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', filter: 'blur(10px)' }} />
                                        <div style={{ position: 'relative', zIndex: 2 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: 12, opacity: 0.8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Flockr Payout Card</p>
                                                    <h3 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{auth?.user?.account_name || auth?.user?.name}</h3>
                                                </div>
                                                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <CardIcon size={24} color="#fff" />
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 38 }}>
                                                <p style={{ margin: 0, fontSize: 11, opacity: 0.75, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Bank Account</p>
                                                <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace' }}>**** **** {auth?.user?.account_last4 ?? '0000'}</div>
                                            </div>
                                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: 11, opacity: 0.7, textTransform: 'uppercase' }}>Bank</p>
                                                    <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600 }}>{auth?.user?.bank_name ?? 'Nigerian Bank'}</p>
                                                </div>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.16)', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                                                    <FiCheckCircle size={13} /> Active
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <button onClick={() => setEditingBank(true)} style={{ height: 52, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'var(--flockr-card)', color: 'var(--flockr-text)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Edit Account</button>
                                        <button onClick={async () => { if (!confirm('Remove your payout account?')) return; try { await axios.delete('/settings/bank'); window.location.reload(); } catch { showToast('Failed to remove.', 'error'); } }} style={{ height: 52, borderRadius: 16, border: '1px solid rgba(255,59,92,0.25)', background: 'rgba(255,59,92,0.08)', color: 'var(--flockr-red)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Remove</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(255,179,0,0.2)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <FiInfo size={22} color="var(--flockr-amber)" style={{ flexShrink: 0 }} />
                                        <p style={{ color: 'var(--flockr-amber)', fontSize: 13, margin: 0 }}>Connect a bank account to receive your earnings.</p>
                                    </div>
                                    <SectionCard title="Bank Account">
                                        {editingBank && <button onClick={() => setEditingBank(false)} style={{ marginBottom: 12, background: 'none', border: 'none', color: 'var(--flockr-muted)', cursor: 'pointer', fontSize: 13 }}>Cancel Editing</button>}
                                        <form onSubmit={e => { e.preventDefault(); bankForm.post('/settings/bank', { preserveScroll: true }); }}>
                                            <FormField label="Bank" error={bankForm.errors.bank_code}>
                                                <select value={bankForm.data.bank_code} onChange={e => bankForm.setData('bank_code', e.target.value)} style={{ ...inputStyle, appearance: 'none' }} required>
                                                    <option value="">Select your bank</option>
                                                    {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                                                </select>
                                            </FormField>
                                            <FormField label="Account Number" error={bankForm.errors.account_number}>
                                                <input type="text" value={bankForm.data.account_number} onChange={e => bankForm.setData('account_number', e.target.value.replace(/\D/g,''))} placeholder="0123456789" maxLength={10} style={inputStyle} required />
                                            </FormField>
                                            <button type="submit" disabled={bankForm.processing} style={primaryBtnStyle}>{bankForm.processing ? 'Connecting…' : 'Connect Bank Account'}</button>
                                        </form>
                                    </SectionCard>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── NOTIFICATIONS TAB ────────────────────────────────────── */}
                    {tab === 'notifications' && (
                        <div style={{ padding: 16 }}>
                            <SectionCard title="Push Notifications">
                                {[
                                    { key: 'new_order',    label: 'New Orders',    sub: 'When someone buys your product',      icon: FiPackage },
                                    { key: 'new_follower', label: 'New Followers', sub: 'When someone follows you',            icon: FiUsers },
                                    { key: 'new_comment',  label: 'Comments',      sub: 'When someone comments on your video', icon: FiMessageCircle },
                                    { key: 'new_like',     label: 'Likes',         sub: 'When someone likes your video',       icon: FiHeart },
                                    { key: 'order_update', label: 'Order Updates', sub: 'Delivery and status changes',         icon: FiTruck },
                                    { key: 'promotions',   label: 'Promotions',    sub: 'Deals and special offers from Flockr',icon: FiGift },
                                ].map((item, i, arr) => {
                                    const ItemIcon = item.icon;
                                    return (
                                        <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ItemIcon size={18} color="var(--flockr-muted)" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ color: 'var(--flockr-text)', fontSize: 14, fontWeight: 500, margin: 0 }}>{item.label}</p>
                                                <p style={{ color: 'var(--flockr-muted)', fontSize: 12, margin: '2px 0 0' }}>{item.sub}</p>
                                            </div>
                                            <ToggleSwitch defaultOn={auth?.user?.notification_preferences?.[item.key] !== false} onChange={val => axios.patch('/settings/notifications', { [item.key]: val }).catch(() => {})} />
                                        </div>
                                    );
                                })}
                            </SectionCard>
                        </div>
                    )}
                </div>
            </div>

            {ToastComponent}
            <style>{'@keyframes spin { to { transform: rotate(360deg); } } select option { background: #1a1a1a; }'}</style>
        </>
    );
}

ProfileSettings.layout = page => <AppLayout>{page}</AppLayout>;

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionCard({ title, children }) {
    return (
        <div style={{ background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ color: 'var(--flockr-text)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, margin: 0 }}>{title}</p>
            </div>
            <div style={{ padding: 16 }}>{children}</div>
        </div>
    );
}

function FormField({ label, error, children }) {
    return (
        <div style={{ marginBottom: 4 }}>
            <p style={{ color: 'var(--flockr-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 7px' }}>{label}</p>
            {children}
            {error && <p style={{ color: 'var(--flockr-red)', fontSize: 12, margin: '5px 0 0' }}>{error}</p>}
        </div>
    );
}

function ToggleSwitch({ defaultOn, onChange }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: on ? 'var(--flockr-green)' : 'var(--flockr-muted)', minWidth: 22, textAlign: 'right', transition: 'color 0.2s' }}>{on ? 'ON' : 'OFF'}</span>
            <button type="button" onClick={() => { const next = !on; setOn(next); onChange(next); }} style={{ width: 50, height: 28, borderRadius: 999, border: 'none', background: on ? 'var(--flockr-green)' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} />
            </button>
        </div>
    );
}

const inputStyle     = { width: '100%', padding: '13px 14px', background: 'var(--flockr-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'var(--flockr-text)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' };
const primaryBtnStyle = { width: '100%', padding: '14px', background: 'var(--flockr-orange)', border: 'none', borderRadius: 999, color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', cursor: 'pointer' };

function PersonIcon({ size=20, color='currentColor' }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function LockIcon({ size=20, color='currentColor' }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>; }
function CardIcon({ size=20, color='currentColor' }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>; }
function BellIcon({ size=20, color='currentColor' }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>; }