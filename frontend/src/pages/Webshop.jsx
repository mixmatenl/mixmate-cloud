import React, { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api.js'

const TABS = ['Producten', 'Series', 'Rapportage', 'Instellingen']

const PAYMENT_LABELS = {
  openstaand: { label: 'Openstaand', color: '#ff9500', bg: '#fff8ee' },
  betaald:    { label: 'Betaald',    color: '#34c759', bg: '#edfaf1' },
  te_laat:    { label: 'Te laat',    color: '#ff3b30', bg: '#fff1f0' },
}

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
  const pt = PAYMENT_LABELS[order.payment_status] || PAYMENT_LABELS.openstaand
  const total_excl = order.total_excl ?? 0
  const btw = total_excl * (order.btw_rate_snapshot / 100)
  const total_incl = total_excl + btw

  return (
    <div
      onClick={() => onOpen && onOpen(order)}
      style={{ padding: '14px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 10, cursor: onOpen ? 'pointer' : 'default' }}
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
      <div style={{ fontSize: 11, fontWeight: 600, color: pt.color, background: pt.bg, borderRadius: 8, padding: '3px 8px', flexShrink: 0 }}>
        {pt.label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 8, padding: '3px 8px', flexShrink: 0 }}>
        {st.label}
      </div>
      {onOpen && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>}
    </div>
  )
}

function OrderModal({ order: initial, onClose, onRefresh, onDelete }) {
  const [order, setOrder]       = useState(initial)
  const [sending, setSending]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [status, setStatus]     = useState(initial.status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState(initial.payment_status || 'openstaand')
  const [savingPayment, setSavingPayment] = useState(false)
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

  async function changePaymentStatus(ps) {
    setPaymentStatus(ps); setSavingPayment(true)
    try { await api.updatePaymentStatus(order.id, ps); onRefresh() } catch {}
    setSavingPayment(false)
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

        {/* Betaalstatus */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Betaalstatus</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(PAYMENT_LABELS).map(([key, val]) => (
              <button key={key} onClick={() => changePaymentStatus(key)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: paymentStatus === key ? 600 : 400,
                border: `1.5px solid ${paymentStatus === key ? val.color : '#e5e5ea'}`,
                background: paymentStatus === key ? val.bg : '#fff',
                color: paymentStatus === key ? val.color : '#6e6e73',
                cursor: 'pointer', fontFamily: 'inherit', opacity: savingPayment ? .6 : 1,
              }}>{val.label}</button>
            ))}
          </div>
          {order.paid_at && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#aeaeb2' }}>
              Betaald op {new Date(order.paid_at).toLocaleDateString('nl-NL')}
            </div>
          )}
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

        <div style={{ marginTop: 20, borderTop: '1px solid #e5e5ea', paddingTop: 16 }}>
          <button onClick={async () => {
            if (!confirm('Bestelling verwijderen? Dit kan niet ongedaan worden gemaakt.')) return
            try { await api.deleteOrder(order.id); onDelete() } catch (e) { alert(e.message) }
          }} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #ff3b30',
            background: 'transparent', color: '#ff3b30', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Bestelling verwijderen
          </button>
        </div>
      </div>
    </div>
  )
}

function Bestellingen() {
  const [orders, setOrders]       = useState(null)
  const [selected, setSelected]   = useState(null)
  const [filter, setFilter]       = useState('alle')
  const [selectMode, setSelectMode] = useState(false)
  const [checked, setChecked]     = useState(new Set())
  const [deleting, setDeleting]   = useState(false)

  const load = useCallback(async () => {
    try { setOrders(await api.getShopOrders()) } catch {}
  }, [])

  useEffect(() => { load() }, [])

  const filtered = orders?.filter(o => filter === 'alle' || o.status === filter) ?? []

  function toggleCheck(id) {
    setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleAll() {
    if (checked.size === filtered.length) setChecked(new Set())
    else setChecked(new Set(filtered.map(o => o.id)))
  }

  async function deleteSelected() {
    if (!confirm(`${checked.size} bestelling(en) verwijderen?`)) return
    setDeleting(true)
    for (const id of checked) {
      try { await api.deleteOrder(id) } catch {}
    }
    setChecked(new Set())
    setSelectMode(false)
    setDeleting(false)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['alle', 'Alle'], ...Object.entries(STATUS_LABELS).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: filter === key ? 600 : 400,
            border: `1.5px solid ${filter === key ? '#1d1d1f' : '#e5e5ea'}`,
            background: filter === key ? '#1d1d1f' : '#fff',
            color: filter === key ? '#fff' : '#6e6e73',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {selectMode && checked.size > 0 && (
            <button onClick={deleteSelected} disabled={deleting} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: '1.5px solid #ff3b30', background: '#ff3b30', color: '#fff',
              cursor: 'pointer', fontFamily: 'inherit', opacity: deleting ? .6 : 1,
            }}>{deleting ? 'Verwijderen…' : `${checked.size} verwijderen`}</button>
          )}
          <button onClick={() => { setSelectMode(s => !s); setChecked(new Set()) }} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 400,
            border: '1.5px solid #e5e5ea', background: selectMode ? '#f2f2f7' : '#fff',
            color: '#6e6e73', cursor: 'pointer', fontFamily: 'inherit',
          }}>{selectMode ? 'Annuleren' : 'Selecteren'}</button>
        </div>
      </div>

      {selectMode && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
          <input type="checkbox" checked={checked.size === filtered.length} onChange={toggleAll} style={{ width: 16, height: 16, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: '#6e6e73' }}>Alles selecteren ({filtered.length})</span>
        </div>
      )}

      <Card>
        {orders === null ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen bestellingen.</div>
        ) : filtered.map(o => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center' }}>
            {selectMode && (
              <div style={{ padding: '0 0 0 16px' }}>
                <input type="checkbox" checked={checked.has(o.id)} onChange={() => toggleCheck(o.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <OrderRow order={o} onOpen={selectMode ? null : setSelected} />
            </div>
          </div>
        ))}
      </Card>

      {selected && (
        <OrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { load(); setSelected(null) }}
          onDelete={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}

// ── Producten ─────────────────────────────────────────────────────────────────

function ProductForm({ product, onSave, onCancel }) {
  const [allSeries, setAllSeries] = useState([])
  useEffect(() => { api.getShopSeries().then(setAllSeries).catch(() => {}) }, [])

  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    volume_ml: product?.volume_ml ?? '',
    price_excl: product?.price_excl ?? '',
    purchase_price: product?.purchase_price ?? '',
    unit: product?.unit ?? 'stuk',
    min_order: product?.min_order ?? 1,
    active: product?.active ?? true,
    image_url: product?.image_url ?? '',
    series_id: product?.series_id ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [imgLoading, setImgLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const generateDescription = async () => {
    setAiLoading(true)
    try {
      const { name: aiName, description, series_id } = await api.aiDescription(form)
      if (aiName) set('name', aiName)
      if (description) set('description', description)
      if (series_id) set('series_id', series_id)
    } catch (e) {
      alert('AI mislukt: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Afbeelding mag maximaal 10 MB zijn.'); return }
    setImgLoading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else       { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        set('image_url', canvas.toDataURL('image/jpeg', 0.82))
        setImgLoading(false)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        ...form,
        volume_ml: parseFloat(form.volume_ml) || 0,
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
        <div style={{ position: 'relative' }}>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Omschrijving" rows={3} style={{ ...inp, resize: 'vertical', paddingRight: 130 }} />
          <button type="button" onClick={generateDescription} disabled={aiLoading || !form.name} title="Genereer beschrijving met AI" style={{
            position: 'absolute', top: 8, right: 8,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: aiLoading ? '#f2f2f7' : '#f0efff', border: '1px solid #5856d6',
            color: aiLoading ? '#999' : '#5856d6', cursor: aiLoading ? 'default' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {aiLoading ? '…' : '✨ AI'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Glasinhoud (ml)</div>
            <input type="number" min="0" step="1" value={form.volume_ml} onChange={e => set('volume_ml', e.target.value)} placeholder="bv. 300" style={inp} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
            <div style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.4 }}>Wordt gebruikt om te controleren of een cocktail in dit glas past op de machine.</div>
          </div>
        </div>
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
        <div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Serie</div>
          <select value={form.series_id ?? ''} onChange={e => set('series_id', e.target.value ? Number(e.target.value) : null)} style={{ ...inp, background: '#fff' }}>
            <option value="">— Geen serie —</option>
            {allSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
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

// Bookmarklet die op een Faire-productpagina draait (minified, URL-encoded)
const FAIRE_BOOKMARKLET = `javascript:(function(){
  try{
  if(!location.hostname.includes('faire.com')){alert('Open dit op een Faire-productpagina.');return;}
  var payload={name:'',description:'',price_excl:0,image_url:'',min_order:1,unit:'stuk'};

  // Poging 1: __NEXT_DATA__ JSON
  var nd=document.getElementById('__NEXT_DATA__');
  if(nd){try{
    var data=JSON.parse(nd.textContent);
    var tm=location.pathname.match(/\\/(p_[a-z0-9]+)/);
    if(tm){var token=tm[1];
      var find=function(o,t,d){if(d>8||!o||typeof o!=='object')return null;if(Array.isArray(o)){for(var i=0;i<o.length;i++){var r=find(o[i],t,d+1);if(r)return r;}}else{if(o.token===t&&o.name)return o;var ks=Object.keys(o);for(var i=0;i<ks.length;i++){var r=find(o[ks[i]],t,d+1);if(r)return r;}}return null;};
      var p=find(data,token,0);
      if(p){var imgs=p.images||p.photos||[];payload.name=p.name||'';payload.description=(p.description||p.shortDescription||'').replace(/<[^>]+>/g,'').trim();payload.price_excl=parseFloat(((p.retailWholesalePrice||p.wholesalePrice||p.priceMin||0)/100).toFixed(2));payload.image_url=imgs.length>0?(imgs[0].url||imgs[0].src||imgs[0]||''):'';payload.min_order=parseInt(p.minimumOrderQuantity||p.moq||1);}
    }
  }catch(e){}}

  // Poging 2: JSON-LD structured data
  if(!payload.name){var lds=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<lds.length;i++){try{var ld=JSON.parse(lds[i].textContent);if(Array.isArray(ld))ld=ld[0];if(ld&&ld.name){payload.name=ld.name;payload.description=(ld.description||'').replace(/<[^>]+>/g,'').trim();var op=ld.offers||{};payload.price_excl=parseFloat(op.price||0)||0;payload.image_url=ld.image||'';break;}}catch(e){}}}

  // Poging 3: Open Graph meta + DOM
  if(!payload.name){
    var og=function(prop){var m=document.querySelector('meta[property="'+prop+'"]');return m?m.getAttribute('content'):'';};
    var h1=document.querySelector('h1');
    payload.name=og('og:title')||(h1?h1.innerText.trim():'');
    payload.description=og('og:description');
    payload.image_url=og('og:image');
  }

  // Prijs uit DOM als nog steeds 0
  if(!payload.price_excl){
    var priceEl=document.querySelector('[data-testid="wholesale-price"],[class*="wholesalePrice"],[class*="wholesale-price"],[class*="price"]');
    if(priceEl){var pm=priceEl.innerText.match(/[\\d,\\.]+/);if(pm)payload.price_excl=parseFloat(pm[0].replace(',','.'));}
  }

  // Min afname uit DOM
  var moqEl=document.querySelector('[data-testid="moq"],[class*="minOrder"],[class*="minimum-order"]');
  if(moqEl){var mm=moqEl.innerText.match(/\\d+/);if(mm)payload.min_order=parseInt(mm[0]);}

  // Doos-grootte uit tekst "Doos van X"
  if(payload.min_order===1){var bodyTxt=document.body.innerText;var dm=bodyTxt.match(/[Dd]oos van (\\d+)/);if(dm)payload.min_order=parseInt(dm[1]);}

  if(!payload.name){alert('Kon geen productdata vinden op deze pagina.');return;}
  var enc=btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  window.location.href='https://portaal.mixmate.nl/webshop?tab=Producten&faire='+enc;
  }catch(err){alert('Faire bookmarklet fout: '+err.message);}
})();`

function FaireImport({ onImported }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const bookmarkRef = useRef(null)

  // React sanitizeert javascript: hrefs — zet de href direct op de DOM na render
  useEffect(() => {
    if (open && bookmarkRef.current) {
      bookmarkRef.current.setAttribute('href', FAIRE_BOOKMARKLET)
    }
  }, [open])

  const copyCode = () => {
    navigator.clipboard.writeText(FAIRE_BOOKMARKLET).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '9px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600,
        border: '1.5px solid #e5e5ea', background: '#fff', color: '#1d1d1f',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Importeer via Faire
      </button>
    )
  }

  return (
    <Card style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Importeer via Faire</div>
        <button onClick={() => setOpen(false)} style={{ background: 'rgba(0,0,0,.06)', border: 'none', borderRadius: 20, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 16, lineHeight: 1.6 }}>
        Voeg de bladwijzer eenmalig toe. Daarna: open een Faire-productpagina → klik de bladwijzer → product staat direct ingevuld.
      </div>

      {/* Stap 1 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1d1d1f', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>1</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>
            Sleep naar je bladwijzerbalk <span style={{ fontWeight: 400, color: '#6e6e73' }}>of klik "Kopieer" en maak handmatig een bladwijzer</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              ref={bookmarkRef}
              href="#"
              onClick={e => e.preventDefault()}
              draggable
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: '#f0efff', border: '1.5px solid #5856d6', color: '#5856d6',
                textDecoration: 'none', cursor: 'grab', userSelect: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Faire → MIXMATE
            </a>
            <button onClick={copyCode} style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: copied ? '#e8f5e9' : '#f2f2f7',
              border: `1.5px solid ${copied ? '#4caf50' : '#e5e5ea'}`,
              color: copied ? '#2e7d32' : '#1d1d1f',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {copied ? '✓ Gekopieerd!' : 'Kopieer code'}
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#8e8e93', lineHeight: 1.5 }}>
            Handmatig (Chrome): druk <strong>⌘D</strong> → Meer opties → vervang de URL door de gekopieerde code.
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f2f2f7', margin: '14px 0' }} />

      {/* Stap 2 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1d1d1f', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>2</div>
        <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6 }}>
          Ga naar een <a href="https://www.faire.com" target="_blank" rel="noreferrer" style={{ color: '#007aff' }}>Faire-productpagina</a> en klik de bladwijzer <strong>"Faire → MIXMATE"</strong>. Het portaal opent automatisch met het product ingevuld.
        </div>
      </div>
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

  // Vang ?faire=<base64> op uit de URL (gezet door de extensie)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const faire = params.get('faire')
    if (!faire) return
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(faire))))
      const url = new URL(window.location.href)
      url.searchParams.delete('faire')
      window.history.replaceState({}, '', url.toString())

      // Koppel automatisch aan serie op basis van naam (deel na '–')
      const brandMatch = data.name?.match(/–\s*(.+)$/)
      if (brandMatch) {
        const brandName = brandMatch[1].trim()
        api.getShopSeries().then(allSeries => {
          const found = allSeries.find(s => s.name.toLowerCase() === brandName.toLowerCase())
          if (found) {
            setEditing({ ...data, id: undefined, series_id: found.id })
          } else {
            api.createShopSeries({ name: brandName, description: '', sort_order: 0 }).then(created => {
              setEditing({ ...data, id: undefined, series_id: created.id })
            }).catch(() => setEditing({ ...data, id: undefined }))
          }
        }).catch(() => setEditing({ ...data, id: undefined }))
      } else {
        setEditing({ ...data, id: undefined })
      }
    } catch {}
  }, [])

  async function save(data) {
    if (editing === 'new' || !editing?.id) await api.createShopProduct(data)
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 12 }}>
        <FaireImport onImported={data => setEditing({ ...data, id: undefined })} />
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

// ── Series ────────────────────────────────────────────────────────────────────

function SeriesForm({ series, onSave, onCancel }) {
  const [form, setForm] = useState(series || { name: '', description: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (series?.id) await api.updateShopSeries(series.id, form)
      else await api.createShopSeries(form)
      onSave()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 6 }}>Naam serie</div>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="bijv. Melodia" style={inp} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 6 }}>Omschrijving</div>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Korte beschrijving van de serie…" rows={2} style={{ ...inp, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ flex: 1, background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .7 : 1 }}>
          {saving ? 'Opslaan…' : series?.id ? 'Opslaan' : 'Serie toevoegen'}
        </button>
        <button type="button" onClick={onCancel} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleren</button>
      </div>
    </form>
  )
}

function Series() {
  const [series, setSeries]   = useState(null)
  const [editing, setEditing] = useState(null) // null | 'new' | series-object
  const [products, setProducts] = useState([])

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([api.getShopSeries(), api.getShopProducts()])
    setSeries(s); setProducts(p)
  }, [])

  useEffect(() => { load() }, [])

  async function del(s) {
    if (!confirm(`Serie "${s.name}" verwijderen? Producten worden niet verwijderd.`)) return
    await api.deleteShopSeries(s.id)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>Glazenseries</div>
        {editing === null && (
          <button onClick={() => setEditing('new')} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nieuwe serie
          </button>
        )}
      </div>

      {editing === 'new' && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 14 }}>Nieuwe serie</div>
          <SeriesForm onSave={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} />
        </Card>
      )}

      {series === null ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
      ) : series.length === 0 && editing !== 'new' ? (
        <Card><div style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Nog geen series. Voeg er een toe.</div></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {series.map(s => {
            const count = products.filter(p => p.series_id === s.id).length
            return editing?.id === s.id ? (
              <Card key={s.id} style={{ padding: 20 }}>
                <SeriesForm series={s} onSave={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} />
              </Card>
            ) : (
              <Card key={s.id} style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{s.name}</div>
                    {s.description && <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.5 }}>{s.description}</div>}
                    <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 6 }}>{count} product{count !== 1 ? 'en' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditing(s)} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Bewerken</button>
                    <button onClick={() => del(s)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Verwijder</button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 12 }}>Producten per serie</div>
        <Card>
          {products.map(p => {
            const cur = series?.find(s => s.id === p.series_id)
            return (
              <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontSize: 14, color: '#1d1d1f' }}>{p.name}</div>
                <select
                  value={p.series_id || ''}
                  onChange={async e => {
                    const sid = e.target.value ? parseInt(e.target.value) : null
                    await api.updateShopProduct(p.id, { series_id: sid })
                    load()
                  }}
                  style={{ fontSize: 13, border: '1px solid #e5e5ea', borderRadius: 8, padding: '5px 10px', fontFamily: 'inherit', color: '#1d1d1f', background: '#fff', cursor: 'pointer' }}
                >
                  <option value="">— Geen serie —</option>
                  {series?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

// ── Hoofd component ───────────────────────────────────────────────────────────

export default function Webshop() {
  const params = new URLSearchParams(window.location.search)
  const urlTab = params.get('tab')
  const [tab, setTab] = useState(TABS.includes(urlTab) ? urlTab : 'Producten')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const t = p.get('tab')
    if (t && TABS.includes(t)) setTab(t)
  }, [window.location.search])

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

      {tab === 'Producten'    && <Producten />}
      {tab === 'Series'       && <Series />}
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
