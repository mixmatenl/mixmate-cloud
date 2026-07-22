import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

const inp = {
  width: '100%', border: '1px solid #e5e5ea', borderRadius: 10,
  padding: '11px 13px', fontSize: 15, fontFamily: 'inherit',
  outline: 'none', background: '#fff', color: '#1d1d1f', boxSizing: 'border-box',
}

const label = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73',
  textTransform: 'uppercase', letterSpacing: .3, marginBottom: 6,
}

export default function Bestellen() {
  const [products, setProducts]   = useState([])
  const [quantities, setQuantities] = useState({})
  const [step, setStep]           = useState('producten') // producten | gegevens | bevestigd
  const [form, setForm]           = useState({ customer_name: '', customer_company: '', customer_email: '', customer_phone: '', address_line1: '', postal_code: '', city: '', country: 'Nederland', notes: '' })
  const [sending, setSending]     = useState(false)
  const [err, setErr]             = useState('')

  useEffect(() => {
    api.getShopProductsPublic()
      .then(p => setProducts(p))
      .catch(() => {})
  }, [])

  function setQty(id, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setQuantities(q => ({ ...q, [id]: n }))
  }

  const selectedItems = products.filter(p => (quantities[p.id] || 0) >= p.min_order)
  const totalItems = selectedItems.reduce((s, p) => s + (quantities[p.id] || 0), 0)

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setSending(true); setErr('')
    try {
      await api.placeShopOrder({
        ...form,
        items: selectedItems.map(p => ({ product_id: p.id, quantity: quantities[p.id] })),
      })
      setStep('bevestigd')
    } catch (e) {
      setErr(e.message || 'Er ging iets mis. Probeer het opnieuw.')
    }
    setSending(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', margin: '0 0 6px', letterSpacing: -.4 }}>MIXMATE Glassenwinkel</h1>
          <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>Kies uw producten en vul uw gegevens in. U ontvangt een factuur per e-mail.</p>
        </div>

        {step === 'bevestigd' ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: '40px 32px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#edfaf1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px' }}>Bestelling ontvangen</h2>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, margin: '0 0 24px' }}>
              Bedankt voor uw bestelling, <strong>{form.customer_name}</strong>. We sturen u een bevestiging naar <strong>{form.customer_email}</strong> en nemen zo snel mogelijk contact met u op.
            </p>
            <button onClick={() => { setStep('producten'); setQuantities({}) }} style={{ background: '#f2f2f7', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#1d1d1f' }}>
              Nieuwe bestelling
            </button>
          </div>
        ) : step === 'producten' ? (
          <>
            {/* Productenlijst */}
            {products.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen producten beschikbaar.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {products.map(p => {
                  const qty = quantities[p.id] || 0
                  const selected = qty >= p.min_order
                  return (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', boxShadow: `0 1px 3px rgba(0,0,0,.05)`, border: `1.5px solid ${selected ? '#1d1d1f' : 'transparent'}`, transition: 'border-color .15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{p.name}</div>
                          {p.description && <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.5 }}>{p.description}</div>}
                          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>€ {p.price_excl.toFixed(2).replace('.', ',')} <span style={{ fontSize: 12, fontWeight: 400, color: '#aeaeb2' }}>excl. BTW / {p.unit}</span></span>
                            {p.min_order > 1 && <span style={{ fontSize: 12, color: '#ff9500', background: '#fff8ee', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>min. {p.min_order}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => setQty(p.id, qty - 1)} style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid #e5e5ea', background: '#f2f2f7', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d1d1f' }}>−</button>
                          <input type="number" min="0" value={qty || ''} onChange={e => setQty(p.id, e.target.value)} placeholder="0" style={{ width: 52, textAlign: 'center', border: '1.5px solid #e5e5ea', borderRadius: 10, padding: '6px 0', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
                          <button onClick={() => setQty(p.id, qty + 1)} style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid #e5e5ea', background: '#f2f2f7', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d1d1f' }}>+</button>
                        </div>
                      </div>
                      {qty > 0 && qty < p.min_order && (
                        <div style={{ marginTop: 10, fontSize: 12, color: '#ff9500', fontWeight: 500 }}>
                          Minimum afname is {p.min_order} {p.unit}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Doorgaan */}
            <button
              onClick={() => setStep('gegevens')}
              disabled={selectedItems.length === 0}
              style={{
                width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                background: selectedItems.length > 0 ? '#1d1d1f' : '#e5e5ea',
                color: selectedItems.length > 0 ? '#fff' : '#aeaeb2',
                fontSize: 16, fontWeight: 600, cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'background .2s',
              }}
            >
              {selectedItems.length > 0 ? `Doorgaan met ${totalItems} product${totalItems !== 1 ? 'en' : ''}` : 'Selecteer minimaal één product'}
            </button>
          </>
        ) : (
          /* Gegevens formulier */
          <div>
            {/* Samenvatting */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 10 }}>Uw bestelling</div>
              {selectedItems.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#1d1d1f', marginBottom: 4 }}>
                  <span>{quantities[p.id]}× {p.name}</span>
                  <span style={{ fontWeight: 600 }}>€ {(p.price_excl * quantities[p.id]).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
              <button onClick={() => setStep('producten')} style={{ marginTop: 10, fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                ← Producten wijzigen
              </button>
            </div>

            <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: '20px 18px', boxShadow: '0 1px 3px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Uw gegevens</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>Naam *</label>
                  <input required value={form.customer_name} onChange={e => setField('customer_name', e.target.value)} placeholder="Voornaam Achternaam" style={inp} />
                </div>
                <div>
                  <label style={label}>Bedrijf</label>
                  <input value={form.customer_company} onChange={e => setField('customer_company', e.target.value)} placeholder="Bedrijfsnaam" style={inp} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>E-mailadres *</label>
                  <input required type="email" value={form.customer_email} onChange={e => setField('customer_email', e.target.value)} placeholder="naam@bedrijf.nl" style={inp} />
                </div>
                <div>
                  <label style={label}>Telefoon</label>
                  <input type="tel" value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)} placeholder="+31 6 00000000" style={inp} />
                </div>
              </div>
              <div>
                <label style={label}>Afleveradres</label>
                <input value={form.address_line1} onChange={e => setField('address_line1', e.target.value)} placeholder="Straatnaam en huisnummer" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={label}>Postcode</label>
                  <input value={form.postal_code} onChange={e => setField('postal_code', e.target.value)} placeholder="1234 AB" style={inp} />
                </div>
                <div>
                  <label style={label}>Stad</label>
                  <input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="Amsterdam" style={inp} />
                </div>
              </div>
              <div>
                <label style={label}>Opmerkingen</label>
                <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Eventuele opmerkingen of wensen…" rows={3} style={{ ...inp, resize: 'vertical' }} />
              </div>

              {err && (
                <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 10, padding: '11px 14px', fontSize: 13 }}>{err}</div>
              )}

              <button type="submit" disabled={sending} style={{
                padding: '16px', borderRadius: 12, border: 'none',
                background: '#1d1d1f', color: '#fff',
                fontSize: 16, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: sending ? .7 : 1,
              }}>
                {sending ? 'Bestelling plaatsen…' : 'Bestelling plaatsen'}
              </button>
              <p style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                Na het plaatsen ontvangt u een bevestiging per e-mail. De factuur wordt apart verstuurd.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
