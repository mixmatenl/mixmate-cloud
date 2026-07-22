import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

const TABS = ['Bestellingen', 'Producten', 'Instellingen']

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

  const total_excl = order.items?.reduce((s, i) => s + i.price_excl * i.quantity, 0) ?? 0
  const btw = total_excl * (order.btw_rate_snapshot / 100)
  const total_incl = total_excl + btw

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

  function openInvoicePreview() {
    const w = window.open('', '_blank')
    w.document.write(invoiceHtml || '<p>Laad eerst de factuur</p>')
    w.document.close()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '0 0 0 0' }}>
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

        {/* Producten */}
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
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Totaal incl. BTW</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>€ {total_incl.toFixed(2).replace('.', ',')}</span>
            </div>
          </Card>
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
      {/* Filter */}
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
    unit: product?.unit ?? 'stuk',
    min_order: product?.min_order ?? 1,
    active: product?.active ?? true,
    sort_order: product?.sort_order ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try { await onSave({ ...form, price_excl: parseFloat(form.price_excl) || 0, min_order: parseInt(form.min_order) || 1 }) }
    catch (e) { alert(e.message) }
    setSaving(false)
  }

  return (
    <Card style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 16 }}>
        {product ? 'Product bewerken' : 'Nieuw product'}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Naam *" style={inp} />
        <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Omschrijving" rows={3} style={{ ...inp, resize: 'vertical' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Prijs excl. BTW (€)</div>
            <input required type="number" min="0" step="0.01" value={form.price_excl} onChange={e => set('price_excl', e.target.value)} placeholder="0,00" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Eenheid</div>
            <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="stuk, doos, set…" style={inp} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Min. afname</div>
            <input type="number" min="1" value={form.min_order} onChange={e => set('min_order', e.target.value)} style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Volgorde</div>
            <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} style={inp} />
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: p.active ? '#1d1d1f' : '#aeaeb2' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>
                € {p.price_excl.toFixed(2).replace('.', ',')} excl. BTW · {p.unit}
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

// ── Instellingen ──────────────────────────────────────────────────────────────

function Instellingen() {
  const [form, setForm]   = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    api.getShopSettings().then(setForm).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

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

  const Section = ({ label, children }) => (
    <div style={{ marginBottom: 28 }}>
      <SectionLabel>{label}</SectionLabel>
      <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </Card>
    </div>
  )

  const Field = ({ label, k, type = 'text', placeholder }) => (
    <div>
      <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>{label}</div>
      <input type={type} value={form[k] ?? ''} onChange={e => set(k, type === 'number' ? parseFloat(e.target.value) : e.target.value)} placeholder={placeholder} style={inp} />
    </div>
  )

  return (
    <form onSubmit={submit}>
      <Section label="Bedrijfsgegevens">
        <Field label="Bedrijfsnaam" k="company_name" placeholder="MIXMATE B.V." />
        <Field label="Adres regel 1" k="address_line1" placeholder="Straatnaam 1" />
        <Field label="Adres regel 2" k="address_line2" placeholder="Verdieping, unit…" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
          <Field label="Postcode" k="postal_code" placeholder="1234 AB" />
          <Field label="Stad" k="city" placeholder="Amsterdam" />
        </div>
        <Field label="Land" k="country" placeholder="Nederland" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="KVK-nummer" k="kvk" placeholder="12345678" />
          <Field label="BTW-nummer" k="btw_number" placeholder="NL123456789B01" />
        </div>
        <Field label="IBAN" k="iban" placeholder="NL00 BANK 0000 0000 00" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="E-mailadres" k="email" placeholder="info@bedrijf.nl" />
          <Field label="Telefoonnummer" k="phone" placeholder="+31 6 00000000" />
        </div>
        <Field label="Website" k="website" placeholder="www.mixmate.nl" />
      </Section>

      <Section label="Factuurinstellingen">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="BTW-percentage (%)" k="btw_rate" type="number" placeholder="21" />
          <Field label="Betaaltermijn (dagen)" k="payment_days" type="number" placeholder="14" />
        </div>
        <Field label="Factuurprefix" k="invoice_prefix" placeholder="INV" />
        <div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Voetnoot factuur</div>
          <textarea value={form.invoice_note ?? ''} onChange={e => set('invoice_note', e.target.value)} placeholder="Bijv. betalingsvoorwaarden, bedankje…" rows={3} style={{ ...inp, resize: 'vertical' }} />
        </div>
      </Section>

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
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px' }}>Webshop</h1>
        <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>
          Bestelformulier: <a href="/bestellen" target="_blank" style={{ color: '#007aff', textDecoration: 'none' }}>portaal.mixmate.nl/bestellen</a>
        </p>
      </div>

      {/* Tabs */}
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
      {tab === 'Instellingen' && <Instellingen />}
    </div>
  )
}
