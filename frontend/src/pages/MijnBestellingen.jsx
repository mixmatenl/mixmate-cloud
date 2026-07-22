import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const STATUS_LABELS = {
  nieuw:       { label: 'Ontvangen',   color: '#007aff', bg: '#e8f4ff' },
  bevestigd:   { label: 'Bevestigd',   color: '#ff9500', bg: '#fff8ee' },
  verzonden:   { label: 'Verzonden',   color: '#5856d6', bg: '#f0efff' },
  afgeleverd:  { label: 'Afgeleverd',  color: '#34c759', bg: '#edfaf1' },
  geannuleerd: { label: 'Geannuleerd', color: '#ff3b30', bg: '#fff1f0' },
}

const PAYMENT_LABELS = {
  openstaand: { label: 'Openstaand', color: '#ff9500' },
  betaald:    { label: 'Betaald',    color: '#34c759' },
  te_laat:    { label: 'Te laat',    color: '#ff3b30' },
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.05)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  )
}

export default function MijnBestellingen() {
  const [orders, setOrders] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getMyOrders().then(setOrders).catch(() => setOrders([]))
  }, [])

  function reorder(order) {
    const quantities = {}
    for (const item of order.items) {
      quantities[item.product_id] = item.quantity
    }
    sessionStorage.setItem('reorder_quantities', JSON.stringify(quantities))
    navigate('/bestellen')
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', margin: '0 0 4px', letterSpacing: -.4 }}>Mijn bestellingen</h1>
        <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>Overzicht van al uw bestellingen bij MIXMATE Glazenwinkel.</p>
      </div>

      {orders === null ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#aeaeb2' }}>Laden…</div>
      ) : orders.length === 0 ? (
        <Card style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Nog geen bestellingen</div>
          <p style={{ fontSize: 14, color: '#aeaeb2', margin: '0 0 20px' }}>U heeft nog geen glazen besteld via het portaal.</p>
          <button onClick={() => navigate('/bestellen')} style={{
            background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Glazen bestellen
          </button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => {
            const st = STATUS_LABELS[order.status] || STATUS_LABELS.nieuw
            const pt = PAYMENT_LABELS[order.payment_status] || PAYMENT_LABELS.openstaand
            const total_excl = order.total_excl ?? 0
            const btw = total_excl * (order.btw_rate_snapshot / 100)
            const total_incl = total_excl + btw
            const isOpen = expanded === order.id

            return (
              <Card key={order.id}>
                <div
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
                        {order.invoice_number || `Bestelling #${order.id}`}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 6, padding: '2px 8px' }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: pt.color }}>
                        · {pt.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 3 }}>
                      {new Date(order.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · '}
                      {order.items?.length} product{order.items?.length !== 1 ? 'en' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', flexShrink: 0 }}>
                    € {total_incl.toFixed(2).replace('.', ',')}
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"
                    style={{ flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}
                  >
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #f2f2f7', padding: '16px 20px' }}>
                    {/* Producten */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                      <thead>
                        <tr>
                          {['Product', 'Aantal', 'Prijs excl. BTW'].map(h => (
                            <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: .3, padding: '0 0 8px', textAlign: h === 'Product' ? 'left' : 'right', borderBottom: '1px solid #f2f2f7' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.map(item => (
                          <tr key={item.id}>
                            <td style={{ fontSize: 14, color: '#1d1d1f', padding: '10px 0', borderBottom: '1px solid #f2f2f7' }}>{item.product_name}</td>
                            <td style={{ fontSize: 14, color: '#6e6e73', padding: '10px 0', borderBottom: '1px solid #f2f2f7', textAlign: 'right' }}>{item.quantity}×</td>
                            <td style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', padding: '10px 0', borderBottom: '1px solid #f2f2f7', textAlign: 'right' }}>
                              € {(item.price_excl * item.quantity).toFixed(2).replace('.', ',')}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={2} style={{ fontSize: 13, color: '#6e6e73', padding: '12px 0 0' }}>Totaal incl. BTW ({order.btw_rate_snapshot}%)</td>
                          <td style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', padding: '12px 0 0', textAlign: 'right' }}>
                            € {total_incl.toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Afleveradres */}
                    {order.address_line1 && (
                      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 16, lineHeight: 1.6 }}>
                        <strong style={{ color: '#1d1d1f' }}>Afleveradres:</strong>{' '}
                        {order.address_line1}, {order.postal_code} {order.city}
                      </div>
                    )}

                    {/* Opmerking */}
                    {order.notes && (
                      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 16, fontStyle: 'italic' }}>
                        "{order.notes}"
                      </div>
                    )}

                    <button
                      onClick={() => reorder(order)}
                      style={{
                        background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10,
                        padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Opnieuw bestellen
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
