import React, { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api, fetchApi } from '../api'

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

const SERVICE_STATUS = {
  open:           { label: 'Open',             color: '#ff9500', bg: '#fff8f0', border: '#ffd6a0' },
  ingepland:      { label: 'Afspraak gepland', color: '#007aff', bg: '#f0f6ff', border: '#a8d0ff' },
  in_behandeling: { label: 'In behandeling',   color: '#5856d6', bg: '#f3f2ff', border: '#c4c2f5' },
  opgelost:       { label: 'Opgelost',         color: '#34c759', bg: '#f0faf3', border: '#a3e6b4' },
}

const OFFERTE_STATUS = {
  open:           { label: 'Open',                    color: '#ff9500', bg: '#fff8f0', border: '#ffd6a0' },
  in_behandeling: { label: 'In behandeling',          color: '#5856d6', bg: '#f3f2ff', border: '#c4c2f5' },
  ingepland:      { label: 'Adviesgesprek gepland',   color: '#007aff', bg: '#f0f6ff', border: '#a8d0ff' },
  prijsvoorstel:  { label: 'Prijsvoorstel verstuurd', color: '#30b0c7', bg: '#f0fafe', border: '#a0dcee' },
  opgelost:       { label: 'Afgesloten',              color: '#34c759', bg: '#f0faf3', border: '#a3e6b4' },
}

function statusInfo(ticket) {
  const map = (ticket.ticket_type || 'service') === 'offerte' ? OFFERTE_STATUS : SERVICE_STATUS
  return map[ticket.status] || map.open
}

function StatusBadge({ ticket }) {
  const info = statusInfo(ticket)
  return <span style={s.badge(info.color, info.bg, info.border)}>{info.label}</span>
}

function useIsMobile() {
  const [mobile, setMobile] = React.useState(typeof window !== 'undefined' && window.innerWidth < 720)
  React.useEffect(() => {
    const h = () => setMobile(window.innerWidth < 720)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mobile
}

const TABS = ['Meldingen', 'Offertes', 'Klanten', 'Nieuwsbrief']

// ── Klanten tab ───────────────────────────────────────────────────────────────
function KlantenTab() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
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

  function handleDelete(id) {
    setResults(r => (r || []).filter(c => c.id !== id))
    setSelected(null)
  }

  if (isMobile && selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ ...s.btnSm, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Terug
        </button>
        <KlantDetail key={selected.id} klant={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
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
            <div key={c.id} onClick={() => setSelected(c)}
              style={{ ...s.row, background: selected?.id === c.id ? '#f0f6ff' : undefined, borderBottom: '1px solid #f2f2f7' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#636366', flexShrink: 0 }}>
                {(c.name || c.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{c.name || '—'}</div>
                <div style={{ fontSize: 12, color: '#6e6e73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {c.newsletter_subscribed && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#007aff', background: '#f0f6ff', border: '1px solid #a8d0ff', borderRadius: 20, padding: '2px 7px' }}>
                    nieuwsbrief
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#aeaeb2' }}>{c.machine_count} machine{c.machine_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && !isMobile && <KlantDetail key={selected.id} klant={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />}
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} style={{
      width: 44, height: 26, borderRadius: 13, border: 'none',
      cursor: disabled ? 'default' : 'pointer',
      background: checked ? '#34c759' : '#e5e5ea',
      position: 'relative', transition: 'background .2s', flexShrink: 0, padding: 0,
      opacity: disabled ? .6 : 1,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 20 : 2,
        width: 22, height: 22, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
        transition: 'left .18s',
      }} />
    </button>
  )
}

function KlantDetail({ klant: initialKlant, onClose, onDelete }) {
  const [klant, setKlant]         = useState(initialKlant)
  const [name, setName]           = useState(initialKlant.name || '')
  const [email, setEmail]         = useState(initialKlant.email || '')
  const [newsletter, setNewsletter] = useState(!!initialKlant.newsletter_subscribed)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState(null)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg]   = useState(null)
  const [deleting, setDeleting]   = useState(false)
  const [restarting, setRestarting]   = useState({})
  const [machineMsgs, setMachineMsgs] = useState({})

  const dirty = name !== klant.name || email !== klant.email || newsletter !== !!klant.newsletter_subscribed

  async function save() {
    setSaving(true); setSaveMsg(null)
    try {
      const updated = await api.adminUpdateCustomer(klant.id, { name, email, newsletter_subscribed: newsletter })
      setKlant(updated)
      setName(updated.name)
      setEmail(updated.email)
      setNewsletter(!!updated.newsletter_subscribed)
      setSaveMsg({ ok: true, text: 'Opgeslagen.' })
    } catch (e) { setSaveMsg({ ok: false, text: e.message }) }
    setSaving(false)
    setTimeout(() => setSaveMsg(null), 4000)
  }

  async function resetPassword() {
    if (!window.confirm(`Wachtwoord van ${klant.name || klant.email} resetten? Er wordt een tijdelijk wachtwoord per e-mail verstuurd.`)) return
    setResetting(true); setResetMsg(null)
    try {
      await api.adminResetPassword(klant.id)
      setResetMsg({ ok: true, text: 'Tijdelijk wachtwoord verstuurd.' })
    } catch (e) { setResetMsg({ ok: false, text: e.message }) }
    setResetting(false)
    setTimeout(() => setResetMsg(null), 5000)
  }

  async function deleteAccount() {
    if (!window.confirm(`Account van ${klant.name || klant.email} definitief verwijderen? Alle meldingen en machines worden ook verwijderd.`)) return
    if (!window.confirm('Weet u het zeker? Dit kan niet ongedaan worden gemaakt.')) return
    setDeleting(true)
    try {
      await api.adminDeleteCustomer(klant.id)
      onDelete(klant.id)
      onClose()
    } catch (e) { alert(e.message); setDeleting(false) }
  }

  async function restartMachine(machineId) {
    setRestarting(r => ({ ...r, [machineId]: true }))
    try {
      await api.adminRestartMachine(machineId)
      setMachineMsgs(m => ({ ...m, [machineId]: { ok: true, text: 'Herstart verstuurd.' } }))
    } catch (e) {
      setMachineMsgs(m => ({ ...m, [machineId]: { ok: false, text: e.message } }))
    }
    setRestarting(r => ({ ...r, [machineId]: false }))
    setTimeout(() => setMachineMsgs(m => { const n = { ...m }; delete n[machineId]; return n }), 4000)
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f' }}>{klant.name || klant.email}</div>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>{klant.email}</div>
        </div>
        <button onClick={onClose} style={s.btnSm}>Sluiten</button>
      </div>

      {/* Instellingen kaart */}
      <div style={s.card}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f2f2f7' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>Accountinstellingen</div>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Naam</div>
              <input value={name} onChange={e => setName(e.target.value)} style={s.inp} placeholder="Naam" />
            </div>
            <div>
              <div style={labelStyle}>E-mailadres</div>
              <input value={email} onChange={e => setEmail(e.target.value)} style={s.inp} placeholder="email@bedrijf.nl" type="email" />
            </div>
          </div>

          {/* Nieuwsbrief toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9f9fb', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 14, color: '#1d1d1f', fontWeight: 500 }}>Nieuwsbrief</div>
              <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 1 }}>Ontvangt updates per e-mail</div>
            </div>
            <Toggle checked={newsletter} onChange={setNewsletter} />
          </div>

          {saveMsg && (
            <div style={{ fontSize: 13, fontWeight: 600, color: saveMsg.ok ? '#34c759' : '#ff3b30' }}>
              {saveMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={save} disabled={saving || !dirty} style={{ ...s.btn, opacity: saving || !dirty ? .4 : 1, cursor: saving || !dirty ? 'default' : 'pointer' }}>
              {saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
            </button>
          </div>
        </div>
      </div>

      {/* Beveiliging kaart */}
      <div style={s.card}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f2f2f7' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>Beveiliging</div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, color: '#1d1d1f' }}>Wachtwoord resetten</div>
            <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 1 }}>Stuurt een tijdelijk wachtwoord per e-mail</div>
            {resetMsg && <div style={{ fontSize: 12, fontWeight: 600, color: resetMsg.ok ? '#34c759' : '#ff3b30', marginTop: 4 }}>{resetMsg.text}</div>}
          </div>
          <button onClick={resetPassword} disabled={resetting} style={{ ...s.btnSm, color: '#ff9500', background: '#fff8f0', flexShrink: 0 }}>
            {resetting ? 'Versturen…' : 'Reset wachtwoord'}
          </button>
        </div>
      </div>

      {/* Machines */}
      <div style={s.label}>Machines ({klant.machines?.length || 0})</div>
      {(klant.machines || []).length === 0 && <div style={{ color: '#aeaeb2', fontSize: 14 }}>Geen machines gekoppeld.</div>}
      {(klant.machines || []).map(m => (
        <div key={m.machine_id} style={s.card}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{m.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: m.online ? '#34c759' : '#aeaeb2' }}>{m.online ? '● Online' : '○ Offline'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6e6e73', fontFamily: 'monospace' }}>{m.machine_id}</div>
              {m.model && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>{m.model}{m.version ? ` · v${m.version}` : ''}</div>}
              {m.serial_number && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>S/N: {m.serial_number}{m.serial_number_confirmed ? ' ✓' : ''}</div>}
            </div>
            <button onClick={() => restartMachine(m.machine_id)} disabled={!m.online || restarting[m.machine_id]}
              style={{ ...s.btnSm, background: m.online ? '#fff1f0' : '#f2f2f7', color: m.online ? '#ff3b30' : '#aeaeb2', cursor: m.online && !restarting[m.machine_id] ? 'pointer' : 'not-allowed' }}>
              {restarting[m.machine_id] ? 'Herstarten…' : 'Herstart'}
            </button>
          </div>
          {machineMsgs[m.machine_id] && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid #f2f2f7', fontSize: 13, color: machineMsgs[m.machine_id].ok ? '#34c759' : '#ff3b30' }}>
              {machineMsgs[m.machine_id].text}
            </div>
          )}
        </div>
      ))}

      {/* Danger zone */}
      <div style={{ border: '1px solid #ffd6d3', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #ffd6d3', background: '#fff8f7' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ff3b30' }}>Account verwijderen</div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5 }}>
            Verwijdert het account inclusief alle meldingen en machines.<br />
            <strong style={{ color: '#ff3b30' }}>Dit kan niet ongedaan worden gemaakt.</strong>
          </div>
          <button onClick={deleteAccount} disabled={deleting} style={{ ...s.btnSm, background: '#ff3b30', color: '#fff', flexShrink: 0 }}>
            {deleting ? 'Verwijderen…' : 'Account verwijderen'}
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Ticket lijst + detail ─────────────────────────────────────────────────────
function TicketTab({ ticketType, initialFilter }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(initialFilter || 'open')
  const [selected, setSelected] = useState(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    api.adminGetTickets()
      .then(all => setTickets(all.filter(t => (t.ticket_type || 'service') === ticketType)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ticketType])

  function updateTicket(updated) {
    if (updated === null) {
      setTickets(ts => ts.filter(t => t.id !== selected?.id))
      setSelected(null)
      return
    }
    setTickets(ts => ts.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    setSelected(t => t?.id === updated.id ? { ...t, ...updated } : t)
  }

  const isOfferte = ticketType === 'offerte'

  const activeStatuses = isOfferte
    ? ['in_behandeling', 'ingepland', 'prijsvoorstel']
    : ['ingepland', 'in_behandeling']

  const filtered = filter === 'alle' ? tickets : tickets.filter(t =>
    filter === 'actief' ? activeStatuses.includes(t.status) : t.status === filter
  )

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

  const filterBtns = isOfferte
    ? [['open','Open'], ['actief','Actief'], ['prijsvoorstel','Voorstel'], ['opgelost','Afgesloten'], ['alle','Alle']]
    : [['open','Open'], ['actief','Actief'], ['opgelost','Opgelost'], ['alle','Alle']]

  return (
    <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {filterBtns.map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              ...s.btnSm,
              background: filter === val ? '#1d1d1f' : '#f2f2f7',
              color:      filter === val ? '#fff'    : '#1d1d1f',
            }}>
              {lbl}
              <span style={{ marginLeft: 6, background: filter === val ? 'rgba(255,255,255,.2)' : '#e5e5ea', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                {val === 'alle' ? tickets.length
                  : val === 'actief' ? tickets.filter(t => activeStatuses.includes(t.status)).length
                  : tickets.filter(t => t.status === val).length}
              </span>
            </button>
          ))}
        </div>

        <div style={s.card}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: '#aeaeb2' }}>Laden…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen {isOfferte ? 'offertes' : 'meldingen'}.</div>}
          {filtered.map(t => (
            <div key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
              style={{ ...s.row, background: selected?.id === t.id ? '#f0f6ff' : undefined, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{t.category}</span>
                  <StatusBadge ticket={t} />
                  {t.urgency?.includes('Urgent') && <span style={s.badge('#ff3b30','#fff1f0','#ffd6d3')}>Urgent</span>}
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

// ── Ticket detail (service vs offerte) ────────────────────────────────────────
function TicketDetail({ ticket, onClose, onUpdate }) {
  const isOfferte = (ticket.ticket_type || 'service') === 'offerte'
  const statusMap = isOfferte ? OFFERTE_STATUS : SERVICE_STATUS

  const [status,    setStatus]    = useState(ticket.status)
  const [apptAt,    setApptAt]    = useState(ticket.appointment_at ? ticket.appointment_at.slice(0, 16) : '')
  const [apptNote,  setApptNote]  = useState(ticket.appointment_note || '')
  const [saving,    setSaving]    = useState(false)
  const [savedMsg,  setSavedMsg]  = useState(null)
  const [message,   setMessage]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [responses, setResponses] = useState(null)
  const [prijs,        setPrijs]        = useState('')
  const [sendingPrijs, setSendingPrijs] = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => {
    api.adminGetResponses(ticket.id).then(setResponses).catch(() => setResponses([]))
  }, [ticket.id])

  async function deleteTicket() {
    if (!window.confirm(`Melding #${ticket.id} definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) return
    setDeleting(true)
    try {
      await api.adminDeleteTicket(ticket.id)
      onUpdate(null)
      onClose()
    } catch (e) { alert(e.message); setDeleting(false) }
  }

  async function save() {
    setSaving(true); setSavedMsg(null)
    try {
      const updated = await api.adminUpdateTicket(ticket.id, {
        status,
        appointment_at:   apptAt || null,
        appointment_note: apptNote,
      })
      onUpdate(updated)
      const emailNote = apptAt
        ? isOfferte ? ' Klant ontvangt uitnodiging voor adviesgesprek.' : ' Klant ontvangt afspraakbevestiging.'
        : ''
      setSavedMsg({ ok: true, text: 'Opgeslagen.' + emailNote })
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

  async function verstuurPrijsvoorstel() {
    if (!message.trim() && !prijs.trim()) return
    setSendingPrijs(true)
    try {
      const tekst = [
        prijs.trim() ? `Prijsvoorstel: ${prijs.trim()}` : '',
        message.trim(),
      ].filter(Boolean).join('\n\n')

      const r = await api.adminAddResponse(ticket.id, tekst)
      setResponses(rs => [...(rs || []), r])
      setMessage('')
      setPrijs('')

      const updated = await api.adminUpdateTicket(ticket.id, { status: 'prijsvoorstel', appointment_at: apptAt || null, appointment_note: apptNote })
      onUpdate({ ...updated, response_count: (ticket.response_count || 0) + 1 })
      setStatus('prijsvoorstel')
      setSavedMsg({ ok: true, text: 'Prijsvoorstel verstuurd per e-mail.' })
      setTimeout(() => setSavedMsg(null), 5000)
    } catch (e) { setSavedMsg({ ok: false, text: e.message }) }
    setSendingPrijs(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>
            {isOfferte ? 'Offerte' : 'Melding'} #{ticket.id} — {ticket.category}
          </div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{ticket.customer_name} · {ticket.customer_email}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={deleteTicket} disabled={deleting} style={{ ...s.btnSm, color: '#ff3b30', background: '#fff1f0' }}>
            {deleting ? 'Verwijderen…' : 'Verwijderen'}
          </button>
          <button onClick={onClose} style={s.btnSm}>Sluiten</button>
        </div>
      </div>

      {/* Info kaart */}
      <div style={s.card}>
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderBottom: '1px solid #f2f2f7' }}>
          {isOfferte ? (
            <>
              <MiniField label="Model"     value={ticket.machine_name} />
              <MiniField label="Bedrijf"   value={ticket.customer_company} />
              <MiniField label="Telefoon"  value={ticket.customer_phone} />
            </>
          ) : (
            <>
              <MiniField label="Machine"     value={ticket.machine_name} />
              <MiniField label="Serienummer" value={ticket.machine_serial} mono />
              <MiniField label="Urgentie"    value={ticket.urgency} />
              <MiniField label="Voorkeur"    value={`${ticket.preferred_date || ''} ${ticket.preferred_time || ''}`.trim()} />
            </>
          )}
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={s.label}>Beschrijving</div>
          <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
        </div>
      </div>

      {/* Status + actie kaart */}
      <div style={s.card}>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Status */}
          <div>
            <div style={s.label}>Status</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(statusMap).map(([val, info]) => (
                <button key={val} onClick={() => setStatus(val)} style={{
                  ...s.btnSm,
                  background: status === val ? info.bg    : '#f2f2f7',
                  color:      status === val ? info.color : '#1d1d1f',
                  border:     status === val ? `1px solid ${info.border}` : '1px solid transparent',
                  fontWeight: status === val ? 700 : 600,
                }}>
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* Offerte: Prijsvoorstel versturen */}
          {isOfferte && (
            <div style={{ background: '#f9f9fb', border: '1px solid #e5e5ea', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ ...s.label, marginBottom: 0 }}>Prijsvoorstel versturen</div>
              <input
                value={prijs}
                onChange={e => setPrijs(e.target.value)}
                placeholder="Prijs (bijv. € 4.950 excl. btw)"
                style={{ ...s.inp, background: '#fff' }}
              />
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Toelichting bij het voorstel (optioneel)…"
                rows={3}
                style={{ ...s.inp, resize: 'none', background: '#fff' }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) verstuurPrijsvoorstel() }}
              />
              <button
                onClick={verstuurPrijsvoorstel}
                disabled={sendingPrijs || (!prijs.trim() && !message.trim())}
                style={{ ...s.btn, background: '#30b0c7', opacity: sendingPrijs || (!prijs.trim() && !message.trim()) ? .4 : 1 }}
              >
                {sendingPrijs ? 'Versturen…' : 'Verstuur prijsvoorstel per e-mail'}
              </button>
            </div>
          )}

          {/* Afspraak / adviesgesprek */}
          <div>
            <div style={s.label}>{isOfferte ? 'Adviesgesprek inplannen' : 'Afspraakdatum en -tijd'}</div>
            <input type="datetime-local" value={apptAt} onChange={e => setApptAt(e.target.value)} style={{ ...s.inp, width: 'auto' }} />
          </div>

          <div>
            <div style={s.label}>{isOfferte ? 'Opmerking bij gesprek' : 'Opmerking bij afspraak'}</div>
            <input
              value={apptNote}
              onChange={e => setApptNote(e.target.value)}
              placeholder={isOfferte ? 'bijv. Teams-link of locatie' : 'bijv. Monteur Jan Smit komt langs'}
              style={s.inp}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={save} disabled={saving} style={{ ...s.btn, opacity: saving ? .5 : 1 }}>
              {saving ? 'Opslaan…' : 'Opslaan & verstuur e-mail'}
            </button>
            {savedMsg && <span style={{ fontSize: 13, color: savedMsg.ok ? '#34c759' : '#ff3b30' }}>{savedMsg.text}</span>}
          </div>
        </div>
      </div>

      {/* Reacties — voor service; voor offerte alleen als er al reacties zijn of men wil antwoorden */}
      <div style={s.card}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f2f2f7' }}>
          <div style={s.label}>Berichten aan klant</div>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {responses === null && <div style={{ color: '#aeaeb2', fontSize: 13, padding: 8 }}>Laden…</div>}
          {responses?.length === 0 && <div style={{ color: '#aeaeb2', fontSize: 13, padding: 8 }}>Nog geen berichten.</div>}
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
        {/* Extra bericht (alleen voor service, of aanvullend voor offerte) */}
        {!isOfferte && (
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
        )}
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

// ── Nieuwsbrief tab ───────────────────────────────────────────────────────────
function BestellingenTab({ filter }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.getShopOrders()
      .then(all => {
        const filtered = !filter ? all : all.filter(o => {
          if (filter === 'nieuw')       return ['nieuw', 'in_behandeling'].includes(o.status)
          if (filter === 'verzonden')   return o.status === 'verzonden'
          if (filter === 'geannuleerd') return o.status === 'geannuleerd'
          if (filter === 'facturen')    return !!o.invoice_number
          return true
        })
        setOrders(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  function refresh() {
    setLoading(true)
    api.getShopOrders()
      .then(all => {
        const filtered = !filter ? all : all.filter(o => {
          if (filter === 'nieuw')       return ['nieuw', 'in_behandeling'].includes(o.status)
          if (filter === 'verzonden')   return o.status === 'verzonden'
          if (filter === 'geannuleerd') return o.status === 'geannuleerd'
          if (filter === 'facturen')    return !!o.invoice_number
          return true
        })
        setOrders(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#aeaeb2' }}>Laden…</div>
  if (orders.length === 0) return <div style={{ ...s.card, padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen bestellingen gevonden.</div>

  return (
    <div style={s.card}>
      {orders.map(o => {
        const STATUS_LABELS = {
          nieuw: { label: 'Nieuw', color: '#1d1d1f', bg: '#f2f2f7' },
          in_behandeling: { label: 'In behandeling', color: '#ff9500', bg: '#fff8ed' },
          verzonden: { label: 'Verzonden', color: '#34c759', bg: '#f0fdf4' },
          geannuleerd: { label: 'Geannuleerd', color: '#ff3b30', bg: '#fff1f0' },
        }
        const st = STATUS_LABELS[o.status] || STATUS_LABELS.nieuw
        return (
          <div key={o.id} onClick={() => setSelected(o)}
            style={{ padding: '14px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{o.customer_company || o.customer_name}</div>
              <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>
                {new Date(o.created_at).toLocaleDateString('nl-NL')} · {o.customer_email}
                {o.invoice_number && ` · ${o.invoice_number}`}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>€{((o.total_excl || 0) * (1 + (o.btw_rate_snapshot || 21) / 100)).toFixed(2)}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 8, padding: '3px 8px' }}>{st.label}</div>
          </div>
        )
      })}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ background: '#f2f2f7', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{selected.customer_company || selected.customer_name}</div>
                {selected.invoice_number && <div style={{ fontSize: 13, color: '#aeaeb2' }}>{selected.invoice_number}</div>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(0,0,0,.08)', border: 'none', borderRadius: 20, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 4 }}>{selected.customer_email} · {selected.customer_phone}</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 16 }}>{selected.shipping_address}</div>
            {selected.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e5ea', fontSize: 14 }}>
                <span>{item.quantity}× {item.product_name}</span>
                <span>€{(item.price_excl * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['nieuw','in_behandeling','verzonden','geannuleerd'].map(st => (
                <button key={st} onClick={async () => { await api.updateOrderStatus(selected.id, st); refresh(); setSelected(null) }}
                  style={{ padding: '7px 14px', borderRadius: 10, border: '1.5px solid #e5e5ea', background: selected.status === st ? '#1d1d1f' : '#fff', color: selected.status === st ? '#fff' : '#1d1d1f', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
            {!selected.invoice_number && (
              <button onClick={async () => { await api.sendInvoice(selected.id); refresh(); setSelected(null) }}
                style={{ marginTop: 12, width: '100%', padding: '12px', background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Factuur versturen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NieuwsbriefHistorie() {
  const [items, setItems] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchApi('/api/admin/newsletter/history')
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  if (items === null) return <div style={{ padding: 40, textAlign: 'center', color: '#aeaeb2' }}>Laden…</div>
  if (items.length === 0) return (
    <div style={{ ...s.card, padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>
      Nog geen nieuwsbrieven verstuurd.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map(item => (
        <div key={item.id} style={s.card}>
          <div
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>{item.subject}</div>
              <div style={{ fontSize: 12, color: '#aeaeb2' }}>
                {new Date(item.sent_at).toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' · '}
                <span style={{ color: '#34c759', fontWeight: 600 }}>{item.sent_count} verstuurd</span>
                {item.failed_count > 0 && <span style={{ color: '#ff3b30', marginLeft: 8, fontWeight: 600 }}>{item.failed_count} mislukt</span>}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" strokeLinecap="round"
              style={{ transform: expanded === item.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {expanded === item.id && (
            <div style={{ borderTop: '1px solid #f2f2f7', padding: '16px 20px' }}>
              <div style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{item.content}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function NieuwsbriefTab({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab === 'historie' ? 'historie' : 'opstellen')
  const [subject,     setSubject]     = useState('')
  const [content,     setContent]     = useState('')
  const [subscribers, setSubscribers] = useState(null)
  const [sending,     setSending]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [confirm,     setConfirm]     = useState(false)

  useEffect(() => {
    api.adminNewsletterSubscribers()
      .then(setSubscribers)
      .catch(() => {})
  }, [])

  async function send() {
    setSending(true); setResult(null); setConfirm(false)
    try {
      const r = await api.adminNewsletterSend(subject, content)
      setResult({ ok: true, text: `Verstuurd naar ${r.sent} abonnee${r.sent !== 1 ? 's' : ''}.${r.failed ? ` ${r.failed} mislukt.` : ''}` })
      setSubject('')
      setContent('')
      api.adminNewsletterSubscribers().then(setSubscribers).catch(() => {})
    } catch (e) {
      setResult({ ok: false, text: e.message })
    }
    setSending(false)
  }

  const canSend = subject.trim() && content.trim() && subscribers?.count > 0

  if (activeTab === 'historie') return <NieuwsbriefHistorie />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Abonnee-kaart */}
      <div style={{ ...s.card, padding: '20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1d1d1f', letterSpacing: -1, lineHeight: 1 }}>
              {subscribers === null ? '…' : subscribers.count}
            </div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
              {subscribers?.count === 1 ? 'abonnee' : 'abonnees'} aangemeld
            </div>
          </div>
          {subscribers?.count > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 260 }}>
              {subscribers.subscribers.slice(0, 6).map(s => (
                <span key={s.email} style={{ fontSize: 11, background: '#f2f2f7', borderRadius: 20, padding: '3px 9px', color: '#3a3a3c', whiteSpace: 'nowrap' }}>
                  {s.name || s.email}
                </span>
              ))}
              {subscribers.count > 6 && (
                <span style={{ fontSize: 11, background: '#f2f2f7', borderRadius: 20, padding: '3px 9px', color: '#6e6e73' }}>
                  +{subscribers.count - 6} meer
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose */}
      <div style={s.card}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f2f2f7' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f' }}>Nieuwsbrief opstellen</div>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={s.label}>Onderwerp</div>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="bijv. Nieuws van MIXMATE — zomer 2025"
              style={{ ...s.inp }}
            />
          </div>
          <div>
            <div style={s.label}>Inhoud</div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Schrijf hier de tekst van uw nieuwsbrief…&#10;&#10;U kunt meerdere alinea's gebruiken door een witregel toe te voegen."
              rows={10}
              style={{ ...s.inp, resize: 'vertical', lineHeight: 1.65 }}
            />
            <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 6 }}>
              Lege regels worden automatisch omgezet naar alinea's.
            </div>
          </div>

          {result && (
            <div style={{
              background: result.ok ? '#f0faf3' : '#fff1f0',
              border: `1px solid ${result.ok ? '#a3e6b4' : '#ffd6d3'}`,
              color: result.ok ? '#1a7a3a' : '#ff3b30',
              borderRadius: 10, padding: '12px 14px', fontSize: 14, fontWeight: 500,
            }}>
              {result.text}
            </div>
          )}

          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              disabled={!canSend}
              style={{ ...s.btn, opacity: canSend ? 1 : .4, cursor: canSend ? 'pointer' : 'default' }}
            >
              Versturen naar {subscribers?.count ?? '…'} abonnee{subscribers?.count !== 1 ? 's' : ''}
            </button>
          ) : (
            <div style={{ background: '#fff8f0', border: '1px solid #ffd6a0', borderRadius: 12, padding: '16px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>
                Weet u het zeker?
              </div>
              <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 14 }}>
                De nieuwsbrief wordt direct verstuurd naar {subscribers?.count} abonnee{subscribers?.count !== 1 ? 's' : ''}. Dit kan niet ongedaan worden gemaakt.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={send} disabled={sending} style={{ ...s.btn, background: '#ff9500', opacity: sending ? .5 : 1 }}>
                  {sending ? 'Versturen…' : 'Ja, verstuur nu'}
                </button>
                <button onClick={() => setConfirm(false)} style={s.btnSm}>Annuleren</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Hoofd component ───────────────────────────────────────────────────────────
const FILTER_MAP = {
  meldingen: { open: 'open', actief: 'actief', opgelost: 'opgelost' },
  offertes:  { open: 'open', actief: 'actief', voorstel: 'prijsvoorstel', afgesloten: 'opgelost' },
  bestellingen: { nieuw: 'nieuw', verzonden: 'verzonden', facturen: 'facturen', geannuleerd: 'geannuleerd' },
}

export default function Admin() {
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const sp = new URLSearchParams(location.search)
  // Backwards compat: old ?tab= links
  const oldTab = sp.get('tab')
  const legacyMap = { Meldingen: 'meldingen', Offertes: 'offertes', Klanten: 'klanten', Nieuwsbrief: 'nieuwsbrief' }
  const section = sp.get('s') || (oldTab ? legacyMap[oldTab] : 'meldingen')
  const urlFilter = sp.get('f')

  const ticketFilter = FILTER_MAP[section]?.[urlFilter] || undefined

  const titles = {
    meldingen:    'Service meldingen',
    offertes:     'Offerte aanvragen',
    klanten:      'Klanten opzoeken',
    nieuwsbrief:  'Nieuwsbrief',
    bestellingen: 'Bestellingen',
  }
  const subs = {
    meldingen:    'Binnenkomende serviceverzoeken van klanten.',
    offertes:     'Offerte-aanvragen via de website.',
    klanten:      'Zoek klanten op en bekijk hun machines.',
    nieuwsbrief:  'Verstuur een nieuwsbrief naar aangemelde klanten.',
    bestellingen: 'Webshop bestellingen per status.',
  }
  const filterLabels = {
    open: ' — Open', actief: ' — Actief', opgelost: ' — Opgelost', voorstel: ' — Voorstel', afgesloten: ' — Afgesloten',
    opstellen: ' — Nieuwe opstellen', historie: ' — Historie',
    nieuw: ' — Nieuw', verzonden: ' — Verzonden', facturen: ' — Facturen', geannuleerd: ' — Geannuleerd',
  }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 style={s.h1}>{titles[section] || 'Beheer'}{urlFilter ? (filterLabels[urlFilter] || '') : ''}</h1>
        <span style={s.badge('#fff', '#1d1d1f', '#1d1d1f')}>Admin</span>
      </div>
      <p style={s.sub}>{subs[section] || ''}</p>

      {section === 'meldingen'    && <TicketTab key={`mel-${urlFilter}`} ticketType="service" initialFilter={ticketFilter} />}
      {section === 'offertes'     && <TicketTab key={`off-${urlFilter}`} ticketType="offerte" initialFilter={ticketFilter} />}
      {section === 'klanten'      && <KlantenTab />}
      {section === 'nieuwsbrief'  && <NieuwsbriefTab initialTab={urlFilter} />}
      {section === 'bestellingen' && <BestellingenTab filter={urlFilter} />}
    </div>
  )
}
