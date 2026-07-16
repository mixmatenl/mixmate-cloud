import React, { useEffect, useState, useRef } from 'react'
import { api } from '../api'

// ── Stijlen ───────────────────────────────────────────────────────────────────
const s = {
  page:   { maxWidth: 900, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  h1:     { fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: -.5, margin: '0 0 4px' },
  sub:    { fontSize: 14, color: '#6e6e73', margin: '0 0 28px' },
  card:   { background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16, overflow: 'hidden' },
  row:    { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #f2f2f7', cursor: 'pointer' },
  label:  { fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 },
  inp:    { width: '100%', border: '1px solid #e5e5ea', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  btn:    { background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnSm:  { background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  badge:  (color, bg, border) => ({ fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }),
}

const STATUS_INFO = {
  open:           { label: 'Open',             color: '#ff9500', bg: '#fff8f0', border: '#ffd6a0' },
  ingepland:      { label: 'Afspraak gepland', color: '#007aff', bg: '#f0f6ff', border: '#a8d0ff' },
  in_behandeling: { label: 'In behandeling',  color: '#5856d6', bg: '#f3f2ff', border: '#c4c2f5' },
  opgelost:       { label: 'Opgelost',         color: '#34c759', bg: '#f0faf3', border: '#a3e6b4' },
}

function StatusBadge({ status }) {
  const info = STATUS_INFO[status] || STATUS_INFO.open
  return <span style={s.badge(info.color, info.bg, info.border)}>{info.label}</span>
}

// ── Mobile hook ───────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < 720)
  React.useEffect(() => {
    const h = () => setMobile(window.innerWidth < 720)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Meldingen', 'Offertes', 'Klanten']

// ── Klanten tab ───────────────────────────────────────────────────────────────
function KlantenTab() {
  const [q,         setQ]         = useState('')
  const [results,   setResults]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState(null)
  const isMobile = useIsMobile()
  const timer = useRef(null)

  function search(val) {
    setQ(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try { setResults(await api.adminSearchCustomers(val)) }
      catch { setResults([]) }
      setLoading(false)
    }, 350)
  }

  useEffect(() => { search('') }, [])

  // Op mobiel: toon detail fullscreen als geselecteerd
  if (isMobile && selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ ...s.btnSm, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Terug
        </button>
        <KlantDetail klant={selected} onClose={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
      <div>
        <div style={{ marginBottom: 14 }}>
          <input value={q} onChange={e => search(e.target.value)} placeholder="Zoek op naam of e-mailadres…" style={s.inp} />
        </div>
        <div style={s.card}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Zoeken…</div>}
          {results && results.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen klanten gevonden.</div>}
          {(results || []).map(c => (
            <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
              style={{ ...s.row, background: selected?.id === c.id ? '#f0f6ff' : undefined, borderBottom: '1px solid #f2f2f7' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#636366', flexShrink: 0 }}>
                {(c.name || c.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{c.name || '—'}</div>
                <div style={{ fontSize: 12, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
              </div>
              <div style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>{c.machine_count} machine{c.machine_count !== 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {selected && !isMobile && <KlantDetail klant={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function KlantDetail({ klant, onClose }) {
  const [restarting, setRestarting] = useState({})
  const [msgs,       setMsgs]       = useState({})

  async function restart(machineId) {
    setRestarting(r => ({ ...r, [machineId]: true }))
    try {
      await api.adminRestartMachine(machineId)
      setMsgs(m => ({ ...m, [machineId]: { ok: true, text: 'Herstart verstuurd.' } }))
    } catch (e) {
      setMsgs(m => ({ ...m, [machineId]: { ok: false, text: e.message } }))
    }
    setRestarting(r => ({ ...r, [machineId]: false }))
    setTimeout(() => setMsgs(m => { const n = { ...m }; delete n[machineId]; return n }), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f' }}>{klant.name}</div>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>{klant.email}</div>
        </div>
        <button onClick={onClose} style={s.btnSm}>Sluiten</button>
      </div>

      <div style={{ ...s.label }}>Machines ({klant.machines?.length || 0})</div>

      {(klant.machines || []).length === 0 && (
        <div style={{ color: '#aeaeb2', fontSize: 14 }}>Geen machines gekoppeld.</div>
      )}

      {(klant.machines || []).map(m => (
        <div key={m.machine_id} style={{ ...s.card }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{m.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: m.online ? '#34c759' : '#aeaeb2' }}>
                  {m.online ? '● Online' : '○ Offline'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6e6e73', fontFamily: 'monospace' }}>{m.machine_id}</div>
              {m.model && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>{m.model}{m.version ? ` · v${m.version}` : ''}</div>}
              {m.serial_number && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>S/N: {m.serial_number}{m.serial_number_confirmed ? ' ✓' : ''}</div>}
            </div>
            <button
              onClick={() => restart(m.machine_id)}
              disabled={!m.online || restarting[m.machine_id]}
              style={{ ...s.btnSm, background: m.online ? '#fff1f0' : '#f2f2f7', color: m.online ? '#ff3b30' : '#aeaeb2', cursor: m.online && !restarting[m.machine_id] ? 'pointer' : 'not-allowed' }}
            >
              {restarting[m.machine_id] ? 'Herstarten…' : 'Herstart'}
            </button>
          </div>
          {msgs[m.machine_id] && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid #f2f2f7', fontSize: 13, color: msgs[m.machine_id].ok ? '#34c759' : '#ff3b30' }}>
              {msgs[m.machine_id].text}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Gedeelde ticket lijst + detail (voor Meldingen en Offertes) ───────────────
function TicketTab({ ticketType }) {
  const [tickets,  setTickets]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('open')
  const [selected, setSelected] = useState(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    api.adminGetTickets()
      .then(all => setTickets(all.filter(t => (t.ticket_type || 'service') === ticketType)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticketType])

  function updateTicket(updated) {
    setTickets(ts => ts.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    setSelected(t => t?.id === updated.id ? { ...t, ...updated } : t)
  }

  const filtered = filter === 'alle' ? tickets : tickets.filter(t =>
    t.status === filter || (filter === 'actief' && (t.status === 'ingepland' || t.status === 'in_behandeling'))
  )

  // Mobiel: detail fullscreen
  if (isMobile && selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ ...s.btnSm, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Terug
        </button>
        <TicketDetail ticket={selected} onClose={() => setSelected(null)} onUpdate={updateTicket} />
      </div>
    )
  }

  return (
    <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[['open', 'Open'], ['actief', 'Actief'], ['opgelost', 'Opgelost'], ['alle', 'Alle']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              ...s.btnSm,
              background: filter === val ? '#1d1d1f' : '#f2f2f7',
              color:      filter === val ? '#fff'    : '#1d1d1f',
            }}>
              {lbl}
              <span style={{ marginLeft: 6, background: filter === val ? 'rgba(255,255,255,.2)' : '#e5e5ea', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                {val === 'alle' ? tickets.length
                  : val === 'actief' ? tickets.filter(t => t.status === 'ingepland' || t.status === 'in_behandeling').length
                  : tickets.filter(t => t.status === val).length}
              </span>
            </button>
          ))}
        </div>

        <div style={s.card}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: '#aeaeb2' }}>Laden…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen {ticketType === 'offerte' ? 'offertes' : 'meldingen'}.</div>}
          {filtered.map(t => (
            <div key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
              style={{ ...s.row, background: selected?.id === t.id ? '#f0f6ff' : undefined, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{t.category}</span>
                  <StatusBadge status={t.status} />
                  {t.urgency?.includes('Urgent') && <span style={s.badge('#ff3b30', '#fff1f0', '#ffd6d3')}>Urgent</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6e6e73' }}>
                  {t.customer_name}
                  {t.machine_name && <> · {t.machine_name}</>}
                  <span style={{ margin: '0 5px', color: '#c7c7cc' }}>·</span>
                  {new Date(t.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  {t.response_count > 0 && <span style={{ marginLeft: 8, color: '#007aff' }}>💬 {t.response_count}</span>}
                </div>
              </div>
              {t.appointment_at && (
                <div style={{ fontSize: 12, color: '#007aff', fontWeight: 600, flexShrink: 0 }}>
                  📅 {new Date(t.appointment_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selected && !isMobile && (
        <TicketDetail ticket={selected} onClose={() => setSelected(null)} onUpdate={updateTicket} />
      )}
    </div>
  )
}

function TicketDetail({ ticket, onClose, onUpdate }) {
  const [status,      setStatus]      = useState(ticket.status)
  const [apptAt,      setApptAt]      = useState(ticket.appointment_at ? ticket.appointment_at.slice(0, 16) : '')
  const [apptNote,    setApptNote]    = useState(ticket.appointment_note || '')
  const [saving,      setSaving]      = useState(false)
  const [savedMsg,    setSavedMsg]    = useState(null)
  const [message,     setMessage]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [responses,   setResponses]   = useState(null)

  useEffect(() => {
    api.adminGetResponses(ticket.id).then(setResponses).catch(() => setResponses([]))
  }, [ticket.id])

  async function save() {
    setSaving(true); setSavedMsg(null)
    try {
      const updated = await api.adminUpdateTicket(ticket.id, {
        status,
        appointment_at:   apptAt   || null,
        appointment_note: apptNote,
      })
      onUpdate(updated)
      setSavedMsg({ ok: true, text: 'Opgeslagen.' + (apptAt ? ' Klant ontvangt een e-mail.' : '') })
    } catch (e) { setSavedMsg({ ok: false, text: e.message }) }
    setSaving(false)
    setTimeout(() => setSavedMsg(null), 4000)
  }

  async function sendResponse() {
    if (!message.trim()) return
    setSending(true)
    try {
      const r = await api.adminAddResponse(ticket.id, message)
      setResponses(rs => [...(rs || []), r])
      setMessage('')
      onUpdate({ ...ticket, response_count: (ticket.response_count || 0) + 1 })
    } catch (e) { alert(e.message) }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Melding #{ticket.id} — {ticket.category}</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{ticket.customer_name} · {ticket.customer_email}</div>
        </div>
        <button onClick={onClose} style={s.btnSm}>Sluiten</button>
      </div>

      {/* Machine + beschrijving */}
      <div style={s.card}>
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderBottom: '1px solid #f2f2f7' }}>
          <MiniField label="Machine"     value={ticket.machine_name} />
          <MiniField label="Serienummer" value={ticket.machine_serial} mono />
          <MiniField label="Urgentie"    value={ticket.urgency} />
          <MiniField label="Voorkeur"    value={`${ticket.preferred_date} ${ticket.preferred_time}`} />
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ ...s.label }}>Beschrijving</div>
          <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
        </div>
      </div>

      {/* Status + afspraak */}
      <div style={s.card}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={s.label}>Status</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_INFO).map(([val, info]) => (
                <button key={val} onClick={() => setStatus(val)} style={{
                  ...s.btnSm,
                  background: status === val ? info.bg : '#f2f2f7',
                  color:      status === val ? info.color : '#1d1d1f',
                  border:     status === val ? `1px solid ${info.border}` : '1px solid transparent',
                  fontWeight: status === val ? 700 : 600,
                }}>
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={s.label}>Afspraakdatum en -tijd</div>
            <input type="datetime-local" value={apptAt} onChange={e => setApptAt(e.target.value)} style={{ ...s.inp, width: 'auto' }} />
          </div>

          <div>
            <div style={s.label}>Opmerking bij afspraak</div>
            <input value={apptNote} onChange={e => setApptNote(e.target.value)} placeholder="bijv. Monteur Jan Smit komt langs" style={s.inp} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={save} disabled={saving} style={{ ...s.btn, opacity: saving ? .5 : 1 }}>
              {saving ? 'Opslaan…' : 'Opslaan & verstuur e-mail'}
            </button>
            {savedMsg && <span style={{ fontSize: 13, color: savedMsg.ok ? '#34c759' : '#ff3b30' }}>{savedMsg.text}</span>}
          </div>
        </div>
      </div>

      {/* Reacties */}
      <div style={s.card}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f2f2f7' }}>
          <div style={s.label}>Reacties</div>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {responses === null && <div style={{ color: '#aeaeb2', fontSize: 13, padding: 8 }}>Laden…</div>}
          {responses?.length === 0 && <div style={{ color: '#aeaeb2', fontSize: 13, padding: 8 }}>Nog geen reacties.</div>}
          {(responses || []).map(r => (
            <div key={r.id} style={{ alignSelf: r.is_admin ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ fontSize: 11, color: '#aeaeb2', marginBottom: 3, textAlign: r.is_admin ? 'right' : 'left' }}>
                {r.author_name} · {new Date(r.created_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{
                background: r.is_admin ? '#1d1d1f' : '#f2f2f7',
                color: r.is_admin ? '#fff' : '#1d1d1f',
                borderRadius: r.is_admin ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding: '10px 14px', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {r.message}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f2f2f7', display: 'flex', gap: 10 }}>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Schrijf een reactie naar de klant…"
            rows={2}
            style={{ ...s.inp, resize: 'none', flex: 1 }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendResponse() }}
          />
          <button onClick={sendResponse} disabled={sending || !message.trim()} style={{ ...s.btn, flexShrink: 0, opacity: sending || !message.trim() ? .4 : 1 }}>
            {sending ? '…' : 'Stuur'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MiniField({ label, value, mono }) {
  if (!value) return null
  return (
    <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1d1d1f', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

// ── Hoofd component ───────────────────────────────────────────────────────────
export default function Admin() {
  const [tab,      setTab]      = useState('Meldingen')
  const [isAdmin,  setIsAdmin]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.adminMe()
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #e5e5ea', borderTopColor: '#007aff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!isAdmin) return (
    <div style={{ ...s.page, textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
      <h2 style={{ color: '#1d1d1f', margin: '0 0 8px' }}>Geen toegang</h2>
      <p style={{ color: '#6e6e73' }}>Dit gedeelte is alleen toegankelijk voor MIXMATE beheerders.</p>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 style={s.h1}>Beheerportaal</h1>
        <span style={s.badge('#fff', '#1d1d1f', '#1d1d1f')}>Admin</span>
      </div>
      <p style={s.sub}>Klanten, machines en servicemeldingen beheren.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f2f2f7', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...s.btnSm,
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#1d1d1f' : '#6e6e73',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            borderRadius: 9, padding: '8px 18px',
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Meldingen' && <TicketTab ticketType="service" />}
      {tab === 'Offertes'  && <TicketTab ticketType="offerte" />}
      {tab === 'Klanten'   && <KlantenTab />}
    </div>
  )
}
