import React, { useEffect, useState } from 'react'
import { api } from '../api'

const STATUS = {
  open:            { label: 'Open',            color: '#ff9500', bg: '#fff8f0', border: '#ffd6a0' },
  ingepland:       { label: 'Afspraak gepland', color: '#007aff', bg: '#f0f6ff', border: '#a8d0ff' },
  in_behandeling:  { label: 'In behandeling',  color: '#5856d6', bg: '#f3f2ff', border: '#c4c2f5' },
  opgelost:        { label: 'Opgelost',         color: '#34c759', bg: '#f0faf3', border: '#a3e6b4' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.open
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, color: s.color,
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

function TicketCard({ ticket }) {
  const [open, setOpen] = useState(false)
  const hasAppointment = ticket.status === 'ingepland' && ticket.appointment_at

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16,
      overflow: 'hidden', transition: 'box-shadow .15s',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: '#f2f2f7', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#636366',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{ticket.category}</span>
            <StatusBadge status={ticket.status} />
          </div>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>
            {ticket.machine_name || 'Machine'}{ticket.machine_serial ? ` · ${ticket.machine_serial}` : ''}
            <span style={{ margin: '0 6px', color: '#c7c7cc' }}>·</span>
            {new Date(ticket.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {hasAppointment && (
          <div style={{
            background: '#f0f6ff', border: '1px solid #a8d0ff', borderRadius: 10,
            padding: '6px 12px', flexShrink: 0, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#007aff', textTransform: 'uppercase', letterSpacing: .5 }}>Afspraak</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginTop: 2 }}>
              {new Date(ticket.appointment_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
            </div>
            <div style={{ fontSize: 12, color: '#6e6e73' }}>
              {new Date(ticket.appointment_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Uitklap detail */}
      {open && (
        <div style={{ borderTop: '1px solid #f2f2f7', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Afspraak banner */}
          {hasAppointment && (
            <div style={{
              background: '#f0f6ff', border: '1px solid #a8d0ff', borderRadius: 12,
              padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <div style={{ fontSize: 24 }}>📅</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', marginBottom: 2 }}>
                  Afspraak: {formatDate(ticket.appointment_at)}
                </div>
                {ticket.appointment_note && (
                  <div style={{ fontSize: 13, color: '#3a3a3c', marginTop: 4 }}>{ticket.appointment_note}</div>
                )}
              </div>
            </div>
          )}

          {/* Voortgangsstappen */}
          <ProgressSteps status={ticket.status} />

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Urgentie"      value={ticket.urgency} />
            <Field label="Voorkeur"      value={`${ticket.preferred_date} ${ticket.preferred_time}`} />
            <Field label="Machine"       value={ticket.machine_name} />
            <Field label="Serienummer"   value={ticket.machine_serial} mono />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Beschrijving</div>
            <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
          </div>

          <div style={{ fontSize: 12, color: '#aeaeb2' }}>Melding #{ticket.id}</div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, mono }) {
  if (!value) return null
  return (
    <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1d1d1f', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

const STEPS = [
  { key: 'open',           label: 'Ontvangen' },
  { key: 'ingepland',      label: 'Afspraak gepland' },
  { key: 'in_behandeling', label: 'In behandeling' },
  { key: 'opgelost',       label: 'Opgelost' },
]

function ProgressSteps({ status }) {
  const currentIdx = STEPS.findIndex(s => s.key === status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STEPS.map((step, i) => {
        const done    = i <= currentIdx
        const current = i === currentIdx
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: i < STEPS.length - 1 ? '0 0 auto' : undefined }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? (current ? '#007aff' : '#34c759') : '#f2f2f7',
                border: current ? '2px solid #007aff' : 'none',
                transition: 'all .2s',
              }}>
                {done && !current
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <div style={{ width: 8, height: 8, borderRadius: '50%', background: current ? '#fff' : '#c7c7cc' }} />
                }
              </div>
              <span style={{ fontSize: 10, fontWeight: current ? 700 : 500, color: done ? '#1d1d1f' : '#aeaeb2', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < currentIdx ? '#34c759' : '#f2f2f7', minWidth: 12, marginBottom: 16 }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function Meldingen() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.getTickets()
      .then(setTickets)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const open     = tickets.filter(t => t.status === 'open')
  const active   = tickets.filter(t => t.status === 'ingepland' || t.status === 'in_behandeling')
  const resolved = tickets.filter(t => t.status === 'opgelost')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1d1d1f', letterSpacing: -.5, margin: '0 0 4px' }}>Mijn meldingen</h1>
      <p style={{ fontSize: 15, color: '#6e6e73', margin: '0 0 32px' }}>Overzicht van al uw servicemeldingen en de voortgang.</p>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 28, height: 28, border: '2px solid #e5e5ea', borderTopColor: '#007aff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 12, padding: '14px 16px', fontSize: 14 }}>{error}</div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aeaeb2' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <p style={{ fontSize: 15, margin: 0 }}>Nog geen meldingen ingediend.</p>
        </div>
      )}

      {active.length > 0 && (
        <Section label="Actief">
          {active.map(t => <TicketCard key={t.id} ticket={t} />)}
        </Section>
      )}

      {open.length > 0 && (
        <Section label="Open">
          {open.map(t => <TicketCard key={t.id} ticket={t} />)}
        </Section>
      )}

      {resolved.length > 0 && (
        <Section label="Opgelost">
          {resolved.map(t => <TicketCard key={t.id} ticket={t} />)}
        </Section>
      )}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}
