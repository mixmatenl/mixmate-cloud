import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

const inp = {
  width: '100%', border: '1px solid #e5e5ea', borderRadius: 10,
  padding: '11px 13px', fontSize: 15, fontFamily: 'inherit',
  outline: 'none', background: '#fff', color: '#1d1d1f', boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73',
  textTransform: 'uppercase', letterSpacing: .3, marginBottom: 6,
}

function fmtEur(n) {
  return '€ ' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function CartIcon({ count }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -6, right: -8, background: '#FF751F',
          color: '#fff', borderRadius: '50%', width: 18, height: 18,
          fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{count}</span>
      )}
    </div>
  )
}

function QtyControl({ qty, min, onSet }) {
  const boxes = min > 1 ? Math.floor(qty / min) : qty
  const loose = min > 1 ? qty % min : 0

  if (qty === 0) return (
    <button type="button" onClick={() => onSet(min)} style={{
      background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 12,
      padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      fontFamily: 'inherit', whiteSpace: 'nowrap',
    }}>
      + Doos ({min})
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      {/* Hoeveelheid rij */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#f2f2f7', borderRadius: 12, overflow: 'hidden' }}>
        <button type="button" onClick={() => onSet(qty <= min ? 0 : qty - 1)} style={{
          width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 18, color: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>−</button>
        <span style={{ minWidth: 32, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#1d1d1f', padding: '0 4px' }}>{qty}</span>
        <button type="button" onClick={() => onSet(qty + 1)} style={{
          width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 18, color: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
      </div>
      {/* Doos toevoegen */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {min > 1 && (
          <span style={{ fontSize: 11, color: '#aeaeb2' }}>
            {boxes > 0 && `${boxes} doos${boxes > 1 ? 'en' : ''}`}{loose > 0 && `${boxes > 0 ? ' + ' : ''}${loose} los`}
          </span>
        )}
        <button type="button" onClick={() => onSet(qty + min)} style={{
          background: '#f2f2f7', border: 'none', borderRadius: 8,
          padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', color: '#1d1d1f', whiteSpace: 'nowrap',
        }}>+ Doos</button>
      </div>
    </div>
  )
}

function Cart({ items, quantities, onRemove, onCheckout, onBack, compact }) {
  const total = items.reduce((s, p) => s + p.price_excl * (quantities[p.id] || 0), 0)
  const totalQty = items.reduce((s, p) => s + (quantities[p.id] || 0), 0)

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#aeaeb2' }}>
      <CartIcon count={0} />
      <div style={{ marginTop: 12, fontSize: 14 }}>Uw winkelwagen is leeg</div>
    </div>
  )

  return (
    <div>
      {items.map(p => (
        <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f2f2f7' }}>
          {p.image_url && (
            <img src={p.image_url} alt={p.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>{quantities[p.id]}× {fmtEur(p.price_excl)}</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{fmtEur(p.price_excl * quantities[p.id])}</div>
            <button type="button" onClick={() => onRemove(p.id)} style={{ fontSize: 11, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4, fontFamily: 'inherit' }}>
              Verwijderen
            </button>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#6e6e73' }}>
        <span>Subtotaal excl. BTW</span>
        <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{fmtEur(total)}</span>
      </div>
      <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 16 }}>BTW wordt vermeld op de factuur</div>
      {!compact && (
        <button type="button" onClick={onCheckout} style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: '#1d1d1f', color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Bestellen ({totalQty} {totalQty === 1 ? 'product' : 'producten'})
        </button>
      )}
    </div>
  )
}

export default function Bestellen({ user }) {
  const [products, setProducts]     = useState([])
  const [quantities, setQuantities] = useState({})
  const [step, setStep]             = useState('producten')
  const [form, setForm]             = useState(null)
  const [sending, setSending]       = useState(false)
  const [err, setErr]               = useState('')
  const [series, setSeries]         = useState([])
  const [cartOpen, setCartOpen]     = useState(false)
  const [pastOrders, setPastOrders] = useState([])

  useEffect(() => {
    api.getShopProductsPublic().then(setProducts).catch(() => {})
    api.getShopSeriesPublic().then(setSeries).catch(() => {})
    api.getMyOrders().then(orders => setPastOrders(orders.slice(0, 3))).catch(() => {})
    const saved = sessionStorage.getItem('reorder_quantities')
    if (saved) { try { setQuantities(JSON.parse(saved)) } catch {} sessionStorage.removeItem('reorder_quantities') }
    api.accountMe().then(r => {
      setForm({
        customer_company: r.company       || '',
        customer_phone:   r.phone         || '',
        address_line1:    r.address_line1 || '',
        postal_code:      r.postal_code   || '',
        city:             r.city          || '',
        country:          r.country       || 'Nederland',
        notes:            '',
      })
    }).catch(() => {
      setForm({ customer_company: '', customer_phone: '', address_line1: '', postal_code: '', city: '', country: 'Nederland', notes: '' })
    })
  }, [])

  function setQty(id, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setQuantities(q => ({ ...q, [id]: n }))
  }
  function removeFromCart(id) { setQty(id, 0) }

  const activeProducts = products.filter(p => p.active)
  const selectedItems  = activeProducts.filter(p => (quantities[p.id] || 0) >= p.min_order)
  const totalQty       = selectedItems.reduce((s, p) => s + (quantities[p.id] || 0), 0)
  const totalPrice     = selectedItems.reduce((s, p) => s + p.price_excl * (quantities[p.id] || 0), 0)

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

  // Groepeer producten per serie
  const seriesGroups = series
    .map(s => ({ series: s, products: activeProducts.filter(p => p.series_id === s.id) }))
    .filter(g => g.products.length > 0)
  const unsorted = activeProducts.filter(p => !p.series_id)

  if (step === 'bevestigd') return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#edfaf1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', margin: '0 0 12px' }}>Bestelling geplaatst!</h2>
      <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.7, margin: '0 0 32px' }}>
        Bedankt, <strong>{user?.name}</strong>. We sturen een bevestiging naar <strong>{user?.email}</strong> en nemen zo snel mogelijk contact op.
      </p>
      <button onClick={() => { setStep('producten'); setQuantities({}) }}
        style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Nieuwe bestelling plaatsen
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) { .bestellen-grid { display: block !important; } .cart-sidebar { display: none !important; } }
        @media (min-width: 769px) { .cart-fab { display: none !important; } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '28px 32px 0', maxWidth: 1100, margin: '0 auto' }}>
        {step === 'gegevens' && (
          <button type="button" onClick={() => setStep('producten')} style={{ background: 'none', border: 'none', color: '#007aff', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '0 0 16px', fontFamily: 'inherit' }}>
            ← Terug naar producten
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1d1d1f', margin: '0 0 4px', letterSpacing: -.5 }}>
              {step === 'producten' ? 'Glazen bestellen' : 'Uw gegevens'}
            </h1>
            <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>
              {step === 'producten' ? 'Kies uw producten per serie.' : 'Controleer uw gegevens en plaats de bestelling.'}
            </p>
          </div>
          {/* Stappen indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {['producten','gegevens'].map((s, i) => (
              <React.Fragment key={s}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  background: step === s ? '#1d1d1f' : (step === 'gegevens' && i === 0) ? '#34c759' : '#e5e5ea',
                  color: (step === s || (step === 'gegevens' && i === 0)) ? '#fff' : '#aeaeb2',
                }}>
                  {step === 'gegevens' && i === 0 ? '✓' : i + 1}
                </div>
                {i === 0 && <div style={{ width: 32, height: 2, background: step === 'gegevens' ? '#34c759' : '#e5e5ea', borderRadius: 1 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bestellen-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, maxWidth: 1100, margin: '0 auto', padding: '0 32px 64px', alignItems: 'start' }}>

        {/* Linker kolom: producten of gegevens */}
        <div>
          {step === 'producten' ? (
            <div>
              {/* Recent besteld */}
              {pastOrders.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader icon="🕐" title="Recent besteld" subtitle="Klik op een bestelling om deze opnieuw te plaatsen" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pastOrders.map(order => {
                      const date = new Date(order.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
                      const total = order.total_excl
                      const knownItems = order.items.filter(i => activeProducts.find(p => p.id === i.product_id))
                      return (
                        <div key={order.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#aeaeb2', marginBottom: 4 }}>{date}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.4 }}>
                              {knownItems.slice(0, 3).map(i => {
                                const p = activeProducts.find(pr => pr.id === i.product_id)
                                return p ? `${i.quantity}× ${p.name}` : null
                              }).filter(Boolean).join(', ')}
                              {knownItems.length > 3 && ` +${knownItems.length - 3} meer`}
                            </div>
                            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>{fmtEur(total)} excl. BTW</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                              background: order.status === 'verzonden' ? '#edfaf1' : order.status === 'nieuw' ? '#fff8e6' : '#f2f2f7',
                              color: order.status === 'verzonden' ? '#30d158' : order.status === 'nieuw' ? '#f59e0b' : '#6e6e73',
                            }}>{order.status === 'verzonden' ? 'Verzonden' : order.status === 'nieuw' ? 'In behandeling' : order.status}</span>
                            {knownItems.length > 0 && (
                              <button type="button" onClick={() => {
                                const newQtys = {}
                                knownItems.forEach(i => { newQtys[i.product_id] = i.quantity })
                                setQuantities(newQtys)
                              }} style={{
                                background: '#f2f2f7', border: 'none', borderRadius: 8, padding: '7px 12px',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#1d1d1f', whiteSpace: 'nowrap',
                              }}>
                                Opnieuw bestellen
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Catalogus */}
              {activeProducts.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen producten beschikbaar.</div>
              ) : (
                <>
                  {seriesGroups.map(g => (
                    <div key={g.series.id} style={{ marginBottom: 32 }}>
                      <SectionHeader title={g.series.name} subtitle={g.series.description} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {g.products.map(p => <ProductRow key={p.id} p={p} qty={quantities[p.id] || 0} onSet={v => setQty(p.id, v)} />)}
                      </div>
                    </div>
                  ))}
                  {unsorted.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      {seriesGroups.length > 0 && <SectionHeader title="Overige producten" />}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {unsorted.map(p => <ProductRow key={p.id} p={p} qty={quantities[p.id] || 0} onSet={v => setQty(p.id, v)} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Stap 2 – gegevens */
            form && (
              <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,.05)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', paddingBottom: 12, borderBottom: '1px solid #f2f2f7' }}>Aflevergegevens</div>
                <p style={{ margin: 0, fontSize: 13, color: '#aeaeb2', lineHeight: 1.5 }}>
                  Velden zijn vooringevuld vanuit uw account. U kunt ze hier aanpassen voor deze bestelling.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelStyle}>Bedrijf</label>
                    <input value={form.customer_company} onChange={e => setField('customer_company', e.target.value)} placeholder="Bedrijfsnaam" style={inp} /></div>
                  <div><label style={labelStyle}>Telefoon</label>
                    <input type="tel" value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)} placeholder="+31 6 00000000" style={inp} /></div>
                </div>
                <div><label style={labelStyle}>Afleveradres</label>
                  <input value={form.address_line1} onChange={e => setField('address_line1', e.target.value)} placeholder="Straatnaam en huisnummer" style={inp} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div><label style={labelStyle}>Postcode</label>
                    <input value={form.postal_code} onChange={e => setField('postal_code', e.target.value)} placeholder="1234 AB" style={inp} /></div>
                  <div><label style={labelStyle}>Stad</label>
                    <input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="Amsterdam" style={inp} /></div>
                </div>
                <div><label style={labelStyle}>Opmerkingen</label>
                  <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Eventuele opmerkingen…" rows={3} style={{ ...inp, resize: 'vertical' }} /></div>
                {err && <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 10, padding: '11px 14px', fontSize: 13 }}>{err}</div>}
                <button type="submit" disabled={sending} style={{
                  padding: '16px', borderRadius: 12, border: 'none', background: '#1d1d1f', color: '#fff',
                  fontSize: 16, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: sending ? .7 : 1,
                }}>{sending ? 'Bestelling plaatsen…' : 'Bestelling plaatsen'}</button>
                <p style={{ fontSize: 12, color: '#aeaeb2', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                  Na het plaatsen ontvangt u een bevestiging per e-mail. De factuur wordt apart verstuurd.
                </p>
              </form>
            )
          )}
        </div>

        {/* Rechter kolom: winkelwagen (desktop) */}
        <div className="cart-sidebar" style={{ position: 'sticky', top: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #f2f2f7' }}>
              <CartIcon count={totalQty} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Winkelwagen</span>
              {totalQty > 0 && <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{fmtEur(totalPrice)}</span>}
            </div>
            <Cart items={selectedItems} quantities={quantities} onRemove={removeFromCart}
              onCheckout={() => setStep('gegevens')} compact={step === 'gegevens'} />
            {step === 'gegevens' && selectedItems.length > 0 && (
              <button type="button" onClick={() => setStep('producten')}
                style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, border: '1px solid #e5e5ea', background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#6e6e73' }}>
                ← Producten wijzigen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating cart button (mobiel) */}
      {step === 'producten' && (
        <button className="cart-fab" type="button" onClick={() => setCartOpen(!cartOpen)} style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: selectedItems.length > 0 ? '#1d1d1f' : '#e5e5ea',
          color: selectedItems.length > 0 ? '#fff' : '#aeaeb2',
          border: 'none', borderRadius: 50, padding: '14px 28px',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap',
        }}>
          <CartIcon count={totalQty} />
          {selectedItems.length > 0 ? `Bekijk winkelwagen · ${fmtEur(totalPrice)}` : 'Selecteer producten'}
        </button>
      )}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <div>
        {icon && <span style={{ fontSize: 16, marginRight: 6 }}>{icon}</span>}
        <span style={{ fontSize: 17, fontWeight: 800, color: '#1d1d1f', letterSpacing: -.3 }}>{title}</span>
      </div>
      {subtitle && <span style={{ fontSize: 13, color: '#aeaeb2' }}>{subtitle}</span>}
    </div>
  )
}

function ProductRow({ p, qty, onSet }) {
  const selected = qty >= p.min_order
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '14px 16px',
      border: `1.5px solid ${selected ? '#1d1d1f' : 'transparent'}`,
      boxShadow: '0 1px 3px rgba(0,0,0,.04)', transition: 'border-color .15s',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {p.image_url ? (
        <img src={p.image_url} alt={p.name} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 60, height: 60, borderRadius: 10, background: '#f2f2f7', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3 }}>{p.name}</div>
        {p.description && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 3, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</div>}
        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>
            {fmtEur(p.price_excl)}
            <span style={{ fontSize: 12, fontWeight: 400, color: '#aeaeb2' }}> excl. BTW / {p.unit}</span>
          </span>
          {p.min_order > 1 && (
            <span style={{ fontSize: 11, color: '#FF751F', background: '#fff3eb', borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>
              min. {p.min_order}
            </span>
          )}
        </div>
      </div>
      <QtyControl qty={qty} min={p.min_order} onSet={onSet} />
    </div>
  )
}
