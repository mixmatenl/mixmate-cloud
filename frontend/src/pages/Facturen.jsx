import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchApi } from '../api.js'

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      border: '1px solid rgba(0,0,0,.05)', ...style,
    }}>
      {children}
    </div>
  )
}

const SOURCE_LABEL = { mixcare: 'MIXCARE', manual: 'Handmatig', glass: 'Glazen' }
const SOURCE_COLOR = { mixcare: '#5856d6', manual: '#34c759', glass: '#007aff' }

export default function Facturen() {
  const [invoices, setInvoices] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchApi('/api/account/invoices')
      .then(setInvoices)
      .catch(() => setInvoices([]))
  }, [])

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('nl-NL') : '—'
  const fmtEur = (n) => n != null
    ? `€ ${Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

  const openstaand = (invoices || []).filter(i => i.status !== 'betaald')
  const totalOpen = openstaand.reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', fontSize: 14, fontWeight: 500, padding: 0, marginBottom: 24, fontFamily: 'inherit' }}
      >
        ← Terug
      </button>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1d1d1f', margin: '0 0 4px', letterSpacing: -0.5 }}>Facturen</h1>
      <p style={{ fontSize: 15, color: '#6e6e73', margin: '0 0 28px' }}>Overzicht van al uw MIXMATE facturen.</p>

      {invoices === null ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6e6e73' }}>Laden…</div>
      ) : invoices.length === 0 ? (
        <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Nog geen facturen</div>
          <div style={{ fontSize: 14, color: '#6e6e73' }}>Uw facturen verschijnen hier zodra ze zijn aangemaakt.</div>
        </Card>
      ) : (
        <>
          {openstaand.length > 0 && (
            <div style={{ background: '#fff8e6', border: '1px solid #f59e0b', borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', marginBottom: 2 }}>
                  {openstaand.length} openstaande factuur{openstaand.length !== 1 ? 'en' : ''}
                </div>
                <div style={{ fontSize: 13, color: '#92400e' }}>
                  Totaal openstaand: <strong>{fmtEur(totalOpen)}</strong> incl. BTW
                </div>
              </div>
            </div>
          )}

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {invoices.map((inv, i) => (
              <div key={`${inv.source}-${inv.id}`} style={{ padding: '16px 20px', borderBottom: i < invoices.length - 1 ? '1px solid #f2f2f7' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', fontFamily: 'monospace' }}>{inv.invoice_number}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: (SOURCE_COLOR[inv.source] || '#6e6e73') + '18',
                        color: SOURCE_COLOR[inv.source] || '#6e6e73',
                      }}>{SOURCE_LABEL[inv.source] || inv.source}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: inv.status === 'betaald' ? '#e8faf0' : '#fff8e6',
                        color: inv.status === 'betaald' ? '#30d158' : '#f59e0b',
                      }}>{inv.status === 'betaald' ? 'Betaald' : 'Openstaand'}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#3a3a3c', marginBottom: 4 }}>{inv.subject}</div>
                    {inv.machine_name && <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 4 }}>{inv.machine_name}</div>}
                    <div style={{ fontSize: 12, color: '#aeaeb2' }}>
                      {fmtEur(inv.amount)} incl. BTW
                      {inv.due_date && ` · Vervaldatum: ${fmt(inv.due_date)}`}
                      {` · ${fmt(inv.created_at)}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      <p style={{ fontSize: 13, color: '#aeaeb2', textAlign: 'center', marginTop: 32 }}>
        Vragen over een factuur?{' '}
        <a href="mailto:info@mixmate.nl" style={{ color: '#007aff' }}>info@mixmate.nl</a>
      </p>
    </div>
  )
}
