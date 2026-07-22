import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

const TABS = ['Bestellingen', 'Producten', 'Rapportage', 'Instellingen']

const STATUS_LABELS = {
  nieuw:       { label: 'Nieuw',       color: '#007aff', bg: '#e8f4ff' },
  bevestigd:   { label: 'Bevestigd',   color: '#ff9500', bg: '#fff8ee' },
  verzonden:   { label: 'Verzonden',   color: '#5856d6', bg: '#f0efff' },
  afgeleverd:  { label: 'Afgeleverd',  color: '#34c759', bg: '#edfaf1' },
  geannuleerd: { label: 'Geannuleerd', color: '#ff3b30', bg: '#fff1f0' },
}

const inp = {
  width: '100%', border: '1px solid #e5e5ea', borderRadius: 10,
  padding: '10px 13px', fontSize: 15, fontFamily: 'inherit',
  outline: 'none', background: '#fff', color: '#1d1d1f', boxSizing: 'border-box',
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.05)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: .3, textTransform: 'uppercase', padding: '0 4px', marginBottom: 8 }}>
      {children}
    </div>
  )
}

// ── Bestellingen ──────────────────────────────────────────────────────────────

function OrderRow({ order, onOpen }) {
  const st = STATUS_LABELS[order.status] || STATUS_LABELS.nieuw
  const total_excl = order.total_excl ?? 0
  const btw = total_excl * (order.btw_rate_snapshot / 100)
  const total_incl = total_excl + btw

  return (
    <div
      onClick={() => onOpen(order)}
      style={{ padding: '14px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
          {order.customer_company || order.customer_name}
        </div>
        <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>
          {new Date(order.created_at).toLocaleDateString('nl-NL')} · {order.customer_email}
          {order.invoice_number && ` · ${order.invoice_number}`}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', flexShrink: 0 }}>
        € {total_incl.toFixed(2).replace('.', ',')}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 8, padding: '3px 9px', flexShrink: 0 }}>
        {st.label}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
    </div>
  )
}

function OrderModal({ order: initial, onClose, onRefresh }) {
  const [order, setOrder]       = useState(initial)
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [status, setStatus]     = useState(initial.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [invoiceHtml, setInvoiceHtml]   = useState(null)

  // Terugbetaling
  const [showRefund, setShowRefund]   = useState(false)
  const [refundAmt, setRefundAmt]     = useState(initial.refund_amount || '')
  const [refundReason, setRefundReason] = useState(initial.refund_reason || '')
  const [savingRefund, setSavingRefund] = useState(false)

  const total_excl = order.items?.reduce((s, i) => s + i.price_excl * i.quantity, 0) ?? 0
  const btw = total_excl * (order.btw_rate_snapshot / 100)
  const total_incl = total_excl + btw
  const refund = order.refund_amount || 0

  async function sendInvoice() {
    setSending(true)
    try {
      const r = await api.sendInvoice(order.id)
      setOrder(o => ({ ...o, invoice_number: r.invoice_number, invoice_sent_at: new Date().toISOString() }))
      setInvoiceHtml(r.html)
      setSent(true)
      onRefresh()
    } catch (e) { alert(e.message) }
    setSending(false)
  }

  async function changeStatus(s) {
    setStatus(s); setSavingStatus(true)
    try { await api.updateOrderStatus(order.id, s); onRefresh() } catch {}
    setSavingStatus(false)
  }

  async function saveRefund() {
    setSavingRefund(true)
    try {
      await api.setRefund(order.id, parseFloat(refundAmt) || 0, refundReason)
      setOrder(o => ({ ...o, refund_amount: parseFloat(refundAmt) || 0, refund_reason: refundReason }))
      setShowRefund(false)
      onRefresh()
    } catch (e) { alert(e.message) }
    setSavingRefund(false)
  }

  function openInvoicePreview() {
    const w = window.open('', '_blank')
    w.document.write(invoiceHtml || '<p>Laad eerst de factuur</p>')
    w.document.close()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#f2f2f7', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f' }}>{order.customer_company || order.customer_name}</div>
            {order.invoice_number && <div style={{ fontSize: 13, color: '#aeaeb2' }}>{order.invoice_number}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(0,0,0,.08)', border: 'none', borderRadius: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Status</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <button key={key} onClick={() => changeStatus(key)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: status === key ? 600 : 400,
                border: `1.5px solid ${status === key ? val.color : '#e5e5ea'}`,
                background: status === key ? val.bg : '#fff',
                color: status === key ? val.color : '#6e6e73',
                cursor: 'pointer', fontFamily: 'inherit', opacity: savingStatus ? .6 : 1,
              }}>{val.label}</button>
            ))}
          </div>
        </div>

        {/* Klantgegevens */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Klant</SectionLabel>
          <Card>
            {[
              ['Naam', order.customer_name],
              ['Bedrijf', order.customer_company],
              ['E-mail', order.customer_email],
              ['Telefoon', order.customer_phone],
              ['Adres', order.address_line1],
              ['Postcode / stad', `${order.postal_code} ${order.city}`.trim()],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={l} style={{ padding: '10px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#aeaeb2', width: 120, flexShrink: 0 }}>{l}</span>
                <span style={{ fontSize: 13, color: '#1d1d1f' }}>{v}</span>
              </div>
            ))}
            {order.notes && (
              <div style={{ padding: '10px 16px', fontSize: 13, color: '#6e6e73', fontStyle: 'italic' }}>{order.notes}</div>
            )}
          </Card>
        </div>

        {/* Producten + bedragen */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Producten</SectionLabel>
          <Card>
            {order.items?.map((item, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{item.product_name}</div>
                  <div style={{ fontSize: 12, color: '#aeaeb2' }}>{item.quantity}× € {item.price_excl.toFixed(2).replace('.', ',')} excl. BTW</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>€ {(item.price_excl * item.quantity).toFixed(2).replace('.', ',')}</div>
              </div>
            ))}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#6e6e73' }}>BTW {order.btw_rate_snapshot}%</span>
              <span style={{ fontSize: 13, color: '#6e6e73' }}>€ {btw.toFixed(2).replace('.', ',')}</span>
            </div>
            <div style={{ padding: '10px 16px', borderBottom: refund > 0 ? '1px solid #f2f2f7' : 'none', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Totaal incl. BTW</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>€ {total_incl.toFixed(2).replace('.', ',')}</span>
            </div>
            {refund > 0 && (
              <>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#ff3b30' }}>Terugbetaald{order.refund_reason ? ` – ${order.refund_reason}` : ''}</span>
                  <span style={{ fontSize: 13, color: '#ff3b30', fontWeight: 600 }}>− € {refund.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>Netto ontvangen</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#34c759' }}>€ {(total_incl - refund).toFixed(2).replace('.', ',')}</span>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Terugbetaling */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowRefund(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ff3b30', fontFamily: 'inherit', padding: '0 4px', fontWeight: 500 }}>
            {showRefund ? '↑ Verbergen' : (refund > 0 ? `✎ Terugbetaling aanpassen (€ ${refund.toFixed(2).replace('.', ',')})` : '+ Terugbetaling registreren')}
          </button>
          {showRefund && (
            <Card style={{ padding: 16, marginTop: 8 }}>
              <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 12 }}>
                Vul het bedrag in dat terugbetaald is aan de klant. Dit wordt meegenomen in de maandrapportage.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Bedrag (€)</div>
                  <input type="number" min="0" step="0.01" value={refundAmt} onChange={e => setRefundAmt(e.target.value)} placeholder="0,00" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Reden</div>
                  <input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Bijv. beschadigde levering" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveRefund} disabled={savingRefund} style={{ background: '#ff3b30', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: savingRefund ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: savingRefund ? .7 : 1 }}>
                  {savingRefund ? 'Opslaan…' : 'Opslaan'}
                </button>
                <button onClick={() => setShowRefund(false)} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleren</button>
              </div>
            </Card>
          )}
        </div>

        {/* Factuur acties */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={sendInvoice} disabled={sending} style={{
            flex: 1, padding: '14px', borderRadius: 12, border: 'none',
            background: sent ? '#34c759' : '#1d1d1f', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: sending ? .7 : 1,
          }}>
            {sending ? 'Versturen…' : sent ? '✓ Factuur verstuurd' : order.invoice_sent_at ? 'Factuur opnieuw versturen' : 'Factuur versturen'}
          </button>
          {(sent || order.invoice_sent_at) && invoiceHtml && (
            <button onClick={openInvoicePreview} style={{
              padding: '14px 18px', borderRadius: 12, border: '1.5px solid #e5e5ea',
              background: '#fff', color: '#1d1d1f', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Bekijken
            </button>
          )}
        </div>

        {order.invoice_sent_at && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#aeaeb2', textAlign: 'center' }}>
            Factuur verstuurd op {new Date(order.invoice_sent_at).toLocaleDateString('nl-NL')}
          </div>
        )}
      </div>
    </div>
  )
}

function Bestellingen() {
  const [orders, setOrders]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter]     = useState('alle')

  const load = useCallback(async () => {
    try { setOrders(await api.getShopOrders()) } catch {}
  }, [])

  useEffect(() => { load() }, [])

  const filtered = orders?.filter(o => filter === 'alle' || o.status === filter) ?? []

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['alle', 'Alle'], ...Object.entries(STATUS_LABELS).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: filter === key ? 600 : 400,
            border: `1.5px solid ${filter === key ? '#1d1d1f' : '#e5e5ea'}`,
            background: filter === key ? '#1d1d1f' : '#fff',
            color: filter === key ? '#fff' : '#6e6e73',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{label}</button>
        ))}
      </div>

      <Card>
        {orders === null ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen bestellingen.</div>
        ) : filtered.map(o => (
          <OrderRow key={o.id} order={o} onOpen={setSelected} />
        ))}
      </Card>

      {selected && (
        <OrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}

// ── Producten ─────────────────────────────────────────────────────────────────

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price_excl: product?.price_excl ?? '',
    purchase_price: product?.purchase_price ?? '',
    unit: product?.unit ?? 'stuk',
    min_order: product?.min_order ?? 1,
    active: product?.active ?? true,
    image_url: product?.image_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [imgLoading, setImgLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Afbeelding mag maximaal 2 MB zijn.'); return }
    setImgLoading(true)
    const reader = new FileReader()
    reader.onload = ev => { set('image_url', ev.target.result); setImgLoading(false) }
    reader.readAsDataURL(file)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        ...form,
        price_excl: parseFloat(form.price_excl) || 0,
        purchase_price: parseFloat(form.purchase_price) || 0,
        min_order: parseInt(form.min_order) || 1,
      })
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <Card style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 16 }}>
        {product ? 'Product bewerken' : 'Nieuw product'}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Afbeelding upload */}
        <div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Afbeelding</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <label style={{ cursor: 'pointer', flexShrink: 0 }}>
              <div style={{
                width: 96, height: 96, borderRadius: 12, border: '1.5px dashed #c7c7cc',
                background: form.image_url ? 'transparent' : '#f9f9f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative',
              }}>
                {form.image_url ? (
                  <img src={form.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : imgLoading ? (
                  <span style={{ fontSize: 12, color: '#aeaeb2' }}>Laden…</span>
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
            </label>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: 8 }}>
                Klik op het vlak om een afbeelding te uploaden (max. 2 MB). Of plak een externe URL hieronder.
              </div>
              <input
                type="url"
                value={form.image_url.startsWith('data:') ? '' : form.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://… (optioneel)"
                style={{ ...inp, fontSize: 13 }}
              />
              {form.image_url && (
                <button type="button" onClick={() => set('image_url', '')}
                  style={{ marginTop: 6, fontSize: 12, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Afbeelding verwijderen
                </button>
              )}
            </div>
          </div>
        </div>

        <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Naam *" style={inp} />
        <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Omschrijving" rows={3} style={{ ...inp, resize: 'vertical' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Verkoopprijs excl. BTW (€)</div>
            <input required type="number" min="0" step="0.01" value={form.price_excl} onChange={e => set('price_excl', e.target.value)} placeholder="0,00" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Inkoopprijs excl. BTW (€)</div>
            <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} placeholder="0,00" style={inp} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Eenheid</div>
            <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="stuk, doos, set…" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Min. afname</div>
            <input type="number" min="1" value={form.min_order} onChange={e => set('min_order', e.target.value)} style={inp} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#1d1d1f' }}>
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 16, height: 16 }} />
          Zichtbaar in bestelformulier
        </label>
        <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #f2f2f7', paddingTop: 12 }}>
          <button type="submit" disabled={saving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button type="button" onClick={onCancel} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleren</button>
        </div>
      </form>
    </Card>
  )
}

function Producten() {
  const [products, setProducts] = useState(null)
  const [editing, setEditing]   = useState(null)

  const load = useCallback(async () => {
    try { setProducts(await api.getShopProducts()) } catch {}
  }, [])

  useEffect(() => { load() }, [])

  async function save(data) {
    if (editing === 'new') await api.createShopProduct(data)
    else await api.updateShopProduct(editing.id, data)
    setEditing(null)
    load()
  }

  async function del(p) {
    if (!confirm(`"${p.name}" verwijderen?`)) return
    try { await api.deleteShopProduct(p.id); load() } catch (e) { alert(e.message) }
  }

  return (
    <div>
      {editing && (
        <ProductForm product={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setEditing('new')} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nieuw product</button>
      </div>

      <Card>
        {products === null ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
        ) : products.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Nog geen producten.</div>
        ) : products.map((p, i) => (
          <div key={p.id} style={{ padding: '12px 16px', borderBottom: i < products.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: '#f2f2f7', flexShrink: 0, overflow: 'hidden' }}>
              {p.image_url
                ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: p.active ? '#1d1d1f' : '#aeaeb2' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>
                Verkoop € {p.price_excl.toFixed(2).replace('.', ',')} · Inkoop € {(p.purchase_price || 0).toFixed(2).replace('.', ',')} · {p.unit}
                {p.min_order > 1 && ` · min. ${p.min_order}`}
                {!p.active && ' · verborgen'}
              </div>
            </div>
            <button onClick={() => setEditing(p)} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Bewerk</button>
            <button onClick={() => del(p)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Verwijder</button>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── Rapportage ────────────────────────────────────────────────────────────────

const MAANDEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']

function Rapportage() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true); setReport(null)
    try { setReport(await api.getShopReport(year, month)) } catch (e) { alert(e.message) }
    setLoading(false)
  }

  function printReport() {
    window.print()
  }

  const t = report?.totals

  return (
    <div>
      {/* Periode selectie */}
      <Card style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Jaar</div>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...inp, width: 'auto' }}>
              {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Maand</div>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...inp, width: 'auto' }}>
              {MAANDEN.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <button onClick={load} disabled={loading} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? .7 : 1 }}>
            {loading ? 'Laden…' : 'Rapport ophalen'}
          </button>
          {report && (
            <button onClick={printReport} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Afdrukken / PDF
            </button>
          )}
        </div>
      </Card>

      {report && (
        <>
          {/* Samenvatting */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Samenvatting — {MAANDEN[month - 1]} {year}</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {[
                ['Omzet excl. BTW', `€ ${t.total_excl.toFixed(2).replace('.', ',')}`, '#1d1d1f'],
                ['BTW af te dragen', `€ ${t.total_btw.toFixed(2).replace('.', ',')}`, '#ff9500'],
                ['Omzet incl. BTW', `€ ${t.total_incl.toFixed(2).replace('.', ',')}`, '#007aff'],
                ['Terugbetalingen', `− € ${t.total_refund.toFixed(2).replace('.', ',')}`, '#ff3b30'],
                ['Netto excl. BTW', `€ ${t.net_excl.toFixed(2).replace('.', ',')}`, '#34c759'],
                ['Netto BTW', `€ ${t.net_btw.toFixed(2).replace('.', ',')}`, '#5856d6'],
                ['Netto incl. BTW', `€ ${t.net_incl.toFixed(2).replace('.', ',')}`, '#34c759'],
              ].map(([label, value, color]) => (
                <Card key={label} style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#aeaeb2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
                </Card>
              ))}
            </div>
          </div>

          {/* BTW toelichting */}
          <Card style={{ padding: '12px 16px', marginBottom: 20, background: '#fff8ee', borderRadius: 12 }}>
            <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6 }}>
              <strong style={{ color: '#ff9500' }}>Belastingaangifte:</strong>{' '}
              Netto omzet excl. BTW: <strong>€ {t.net_excl.toFixed(2).replace('.', ',')}</strong> — Netto BTW af te dragen: <strong>€ {t.net_btw.toFixed(2).replace('.', ',')}</strong>
              {t.total_refund > 0 && <> (na aftrek van € {t.total_refund.toFixed(2).replace('.', ',')} aan terugbetalingen)</>}.
            </div>
          </Card>

          {/* Bestellingenlijst */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Bestellingen ({report.orders.length})</SectionLabel>
            {report.orders.length === 0 ? (
              <Card><div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen bestellingen in deze periode.</div></Card>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                  <thead>
                    <tr style={{ background: '#f2f2f7' }}>
                      {['Datum','Factuur','Klant','Status','Excl. BTW','BTW','Incl. BTW','Terugbet.','Netto incl.'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((r, i) => (
                      <tr key={r.id} style={{ borderTop: '1px solid #f2f2f7', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 12px', color: '#1d1d1f', whiteSpace: 'nowrap' }}>{new Date(r.date).toLocaleDateString('nl-NL')}</td>
                        <td style={{ padding: '10px 12px', color: '#aeaeb2', whiteSpace: 'nowrap' }}>{r.invoice_number || '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#1d1d1f' }}>{r.customer}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_LABELS[r.status]?.color, background: STATUS_LABELS[r.status]?.bg, borderRadius: 6, padding: '2px 8px' }}>
                            {STATUS_LABELS[r.status]?.label || r.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#1d1d1f', whiteSpace: 'nowrap' }}>€ {r.total_excl.toFixed(2).replace('.', ',')}</td>
                        <td style={{ padding: '10px 12px', color: '#6e6e73', whiteSpace: 'nowrap' }}>€ {r.btw_amount.toFixed(2).replace('.', ',')}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap' }}>€ {r.total_incl.toFixed(2).replace('.', ',')}</td>
                        <td style={{ padding: '10px 12px', color: r.refund_amount > 0 ? '#ff3b30' : '#aeaeb2', whiteSpace: 'nowrap' }}>
                          {r.refund_amount > 0 ? `− € ${r.refund_amount.toFixed(2).replace('.', ',')}` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#34c759', whiteSpace: 'nowrap' }}>€ {r.net_incl.toFixed(2).replace('.', ',')}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid #1d1d1f', background: '#f2f2f7' }}>
                      <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 700, color: '#1d1d1f' }}>Totaal</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap' }}>€ {t.total_excl.toFixed(2).replace('.', ',')}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#6e6e73', whiteSpace: 'nowrap' }}>€ {t.total_btw.toFixed(2).replace('.', ',')}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap' }}>€ {t.total_incl.toFixed(2).replace('.', ',')}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#ff3b30', whiteSpace: 'nowrap' }}>
                        {t.total_refund > 0 ? `− € ${t.total_refund.toFixed(2).replace('.', ',')}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#34c759', whiteSpace: 'nowrap' }}>€ {t.net_incl.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Instellingen ──────────────────────────────────────────────────────────────

function SettingsSection({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <SectionLabel>{label}</SectionLabel>
      <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </Card>
    </div>
  )
}

function SettingsField({ label, name, type = 'text', placeholder, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>{label}</div>
      <input
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        style={inp}
      />
    </div>
  )
}

function Instellingen() {
  const [form, setForm]     = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    api.getShopSettings().then(setForm).catch(() => {})
  }, [])

  function handleChange(e) {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'number' ? parseFloat(value) : value }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.saveShopSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  if (!form) return <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Laden…</div>

  return (
    <form onSubmit={submit}>
      <SettingsSection label="Bedrijfsgegevens">
        <SettingsField label="Bedrijfsnaam"   name="company_name"  value={form.company_name}  onChange={handleChange} placeholder="MIXMATE B.V." />
        <SettingsField label="Adres regel 1"  name="address_line1" value={form.address_line1} onChange={handleChange} placeholder="Straatnaam 1" />
        <SettingsField label="Adres regel 2"  name="address_line2" value={form.address_line2} onChange={handleChange} placeholder="Verdieping, unit…" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
          <SettingsField label="Postcode" name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="1234 AB" />
          <SettingsField label="Stad"     name="city"        value={form.city}        onChange={handleChange} placeholder="Amsterdam" />
        </div>
        <SettingsField label="Land"         name="country"    value={form.country}    onChange={handleChange} placeholder="Nederland" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SettingsField label="KVK-nummer"  name="kvk"        value={form.kvk}        onChange={handleChange} placeholder="12345678" />
          <SettingsField label="BTW-nummer"  name="btw_number" value={form.btw_number} onChange={handleChange} placeholder="NL123456789B01" />
        </div>
        <SettingsField label="IBAN"          name="iban"       value={form.iban}       onChange={handleChange} placeholder="NL00 BANK 0000 0000 00" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SettingsField label="E-mailadres"    name="email" value={form.email} onChange={handleChange} placeholder="info@bedrijf.nl" />
          <SettingsField label="Telefoonnummer" name="phone" value={form.phone} onChange={handleChange} placeholder="+31 6 00000000" />
        </div>
        <SettingsField label="Website" name="website" value={form.website} onChange={handleChange} placeholder="www.mixmate.nl" />
      </SettingsSection>

      <SettingsSection label="Factuurinstellingen">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SettingsField label="BTW-percentage (%)"    name="btw_rate"     type="number" value={form.btw_rate}     onChange={handleChange} placeholder="21" />
          <SettingsField label="Betaaltermijn (dagen)" name="payment_days" type="number" value={form.payment_days} onChange={handleChange} placeholder="14" />
        </div>
        <SettingsField label="Factuurprefix" name="invoice_prefix" value={form.invoice_prefix} onChange={handleChange} placeholder="INV" />
        <div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Voetnoot factuur</div>
          <textarea name="invoice_note" value={form.invoice_note ?? ''} onChange={handleChange} placeholder="Bijv. betalingsvoorwaarden, bedankje…" rows={3} style={{ ...inp, resize: 'vertical' }} />
        </div>
      </SettingsSection>

      <button type="submit" disabled={saving} style={{
        background: saved ? '#34c759' : '#1d1d1f', color: '#fff', border: 'none',
        borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 600,
        cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1,
        transition: 'background .2s',
      }}>
        {saving ? 'Opslaan…' : saved ? '✓ Opgeslagen' : 'Instellingen opslaan'}
      </button>
    </form>
  )
}

// ── Hoofd component ───────────────────────────────────────────────────────────

export default function Webshop() {
  const [tab, setTab] = useState('Bestellingen')

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px' }}>Webshop</h1>
        <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>
          Bestelformulier: <a href="/bestellen" target="_blank" style={{ color: '#007aff', textDecoration: 'none' }}>portaal.mixmate.nl/bestellen</a>
        </p>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 4, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 0', background: tab === t ? '#1d1d1f' : 'none',
            border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? '#fff' : '#6e6e73', transition: 'all .15s',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'Bestellingen' && <Bestellingen />}
      {tab === 'Producten'    && <Producten />}
      {tab === 'Rapportage'   && <Rapportage />}
      {tab === 'Instellingen' && <Instellingen />}

      <style>{`
        @media print {
          body > * { display: none !important; }
          #root > * > * > * > div { display: none !important; }
        }
      `}</style>
    </div>
  )
}
