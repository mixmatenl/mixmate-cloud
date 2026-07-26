import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchApi as api } from '../api.js'

const REQUIRED_FIELDS = ['first_name', 'last_name', 'phone', 'address', 'postal_code', 'city', 'iban', 'bsn', 'date_of_birth', 'birth_place']

function inp(readOnly) {
  return {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: `1.5px solid ${readOnly ? '#f0f0f0' : '#e5e5ea'}`, fontSize: 14,
    outline: 'none', background: readOnly ? '#f9f9f9' : '#fff',
    boxSizing: 'border-box', fontFamily: 'inherit',
    color: readOnly ? '#aeaeb2' : '#1d1d1f',
  }
}

function Field({ label, value, onChange, type = 'text', readOnly = false, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: required && !value ? '#ff3b30' : '#6e6e73', marginBottom: 5 }}>
        {label}{required ? ' *' : ''}
      </label>
      <input type={type} value={value || ''} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        style={{ ...inp(readOnly), borderColor: required && !value ? '#ffc4c4' : readOnly ? '#f0f0f0' : '#e5e5ea' }}
      />
    </div>
  )
}

function Card({ children, style }) {
  return <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f0f0f0', ...style }}>{children}</div>
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>{children}</div>
}

// ── Dashboard sectie ─────────────────────────────────────────────────────────

function Dashboard({ data, openTasks, needsData }) {
  const festivals = data.festivals || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Gegevens invullen banner — hoogste prioriteit */}
      {needsData && (
        <a href="/personeel?s=gegevens" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)', borderRadius: 18, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Vul je gegevens in</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', lineHeight: 1.4 }}>Verplicht voor de verzekering — daarna zie je je festivals en tickets</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </a>
      )}

      {/* Openstaande taken */}
      {openTasks.length > 0 && (
        <Card style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '2px 9px', fontSize: 12, color: '#c2410c' }}>{openTasks.length}</span>
            Openstaande taken
          </div>
          {openTasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f7' }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, border: '2px solid #d1d1d6', marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{t.label}</div>
                {t.key === 'confirm_data' && (
                  <a href="/personeel?s=gegevens" style={{ fontSize: 12, color: '#007aff', textDecoration: 'none' }}>Ga naar Persoonlijke gegevens →</a>
                )}
                {t.key === 'change_password' && (
                  <div style={{ fontSize: 12, color: '#6e6e73' }}>Wijzig je wachtwoord via je accountinstellingen</div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {openTasks.length === 0 && (
        <Card style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>Alle taken zijn afgerond!</div>
        </Card>
      )}

      {/* Festivals overzicht */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 12 }}>
          Jouw festivals
        </div>

        {!data.data_confirmed ? (
          <Card style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🔒</div>
            <div style={{ fontSize: 14, color: '#6e6e73' }}>Zichtbaar na het invullen van je gegevens</div>
          </Card>
        ) : festivals.length === 0 ? (
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 14, color: '#aeaeb2' }}>Je bent nog niet aan een festival toegevoegd.</div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {festivals.map(f => <FestivalCard key={f.id} f={f} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline ticket viewer ──────────────────────────────────────────────────────

function TicketViewer({ ticket, token }) {
  const url = `/api/hr/tickets/${ticket.id}/download?token=${encodeURIComponent(token)}`
  const isPdf = ticket.mime_type?.includes('pdf')
  const isImg = ticket.mime_type?.startsWith('image')
  const dateLabel = ticket.ticket_date
    ? new Date(ticket.ticket_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div style={{ marginBottom: 16 }}>
      {dateLabel && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>{dateLabel}</div>
      )}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e5ea', background: '#f5f5f7' }}>
        {isImg && (
          <img src={`/api/hr/tickets/${ticket.id}/download`} alt={ticket.original_name}
            style={{ width: '100%', display: 'block', maxHeight: 500, objectFit: 'contain', background: '#000' }} />
        )}
        {isPdf && (
          <iframe src={`/api/hr/tickets/${ticket.id}/download`} title={ticket.original_name}
            style={{ width: '100%', height: 480, border: 'none', display: 'block' }} />
        )}
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: isImg || isPdf ? '1px solid #e5e5ea' : 'none' }}>
          <span style={{ fontSize: 13, color: '#3a3a3c', fontWeight: 500 }}>{ticket.original_name}</span>
          <a href={`/api/hr/tickets/${ticket.id}/download`} download={ticket.original_name}
            style={{ fontSize: 13, color: '#007aff', textDecoration: 'none', fontWeight: 600 }}>Downloaden ↓</a>
        </div>
      </div>
    </div>
  )
}

// ── Festivals sectie ─────────────────────────────────────────────────────────

function FestivalCard({ f }) {
  const [open, setOpen] = useState(false)
  const hasTickets = f.tickets?.length > 0

  return (
    <Card style={{ marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fff8ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>🎪</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{f.name}</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
            {f.location}{f.location && f.date_start ? ' · ' : ''}{f.date_start}
            {f.date_end && f.date_end !== f.date_start ? ` t/m ${f.date_end}` : ''}
          </div>
          {f.role && <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Rol: {f.role}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {hasTickets && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#ff9500', background: '#fff8ed', borderRadius: 8, padding: '3px 9px' }}>
              {f.tickets.length} ticket{f.tickets.length !== 1 ? 's' : ''}
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 20px' }}>
          {!hasTickets && (
            <div style={{ fontSize: 14, color: '#aeaeb2', textAlign: 'center', padding: '12px 0' }}>Nog geen tickets beschikbaar.</div>
          )}
          {f.tickets?.map(t => <TicketViewer key={t.id} ticket={t} />)}
        </div>
      )}
    </Card>
  )
}

function FestivalsSection({ data }) {
  if (!data.data_confirmed) {
    return (
      <div>
        <SectionTitle>Festivals</SectionTitle>
        <Card style={{ padding: 28 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Gegevens nog niet bevestigd</div>
            <div style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
              Vul al je persoonlijke gegevens volledig in en sla ze op. Pas daarna zijn je festivals en tickets zichtbaar. Dit is verplicht voor de verzekering.
            </div>
            <div style={{ marginTop: 20, display: 'inline-block', background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '10px 18px', fontSize: 13, color: '#92400e', fontWeight: 500 }}>
              Ga naar Persoonlijke gegevens → vul alles in → sla op
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const festivals = data.festivals || []
  if (festivals.length === 0) {
    return (
      <div>
        <SectionTitle>Festivals</SectionTitle>
        <Card style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>
          Je bent nog niet aan een festival toegevoegd.
        </Card>
      </div>
    )
  }

  return (
    <div>
      <SectionTitle>Festivals</SectionTitle>
      {festivals.map(f => <FestivalCard key={f.id} f={f} />)}
    </div>
  )
}

// ── Contractgegevens sectie ──────────────────────────────────────────────────

function ContractSection({ data }) {
  const CONTRACT_LABELS = { vast: 'Vast contract', flex: 'Flex contract', oproep: 'Oproepkracht' }
  return (
    <div>
      <SectionTitle>Contractgegevens</SectionTitle>
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
          <div style={{ background: '#f5f5f7', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 4 }}>Uurloon</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: -0.5 }}>
              {data.hourly_rate ? `€${Number(data.hourly_rate).toFixed(2)}` : '—'}
            </div>
          </div>
          <div style={{ background: '#f5f5f7', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 4 }}>Contracttype</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginTop: 4 }}>
              {CONTRACT_LABELS[data.contract_type] || data.contract_type || '—'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: '12px 14px', background: '#f0f6ff', borderRadius: 12, fontSize: 13, color: '#3a5a8a', lineHeight: 1.5 }}>
          Voor vragen over je contract of salaris neem je contact op met Robin via{' '}
          <a href="mailto:r.muller@mixmate.nl" style={{ color: '#007aff' }}>r.muller@mixmate.nl</a>.
        </div>
      </Card>
    </div>
  )
}

// ── Persoonlijke gegevens sectie ─────────────────────────────────────────────

function GegevensSection({ data, onDataUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...data })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function f(key) {
    return {
      value: form[key] || '',
      onChange: v => setForm(p => ({ ...p, [key]: v })),
      readOnly: !editing,
    }
  }

  const missingFields = REQUIRED_FIELDS.filter(k => !form[k]?.trim?.())
  const allFilled = missingFields.length === 0

  async function save() {
    setSaving(true); setError('')
    try {
      await api(`/api/hr/employees/${data.id}`, { method: 'PUT', body: JSON.stringify(form) })
      if (allFilled && !data.data_confirmed) {
        const confirmTask = data.tasks?.find(t => t.key === 'confirm_data' && !t.completed)
        if (confirmTask) {
          try { await api(`/api/hr/me/tasks/${confirmTask.id}/complete`, { method: 'POST' }) } catch {}
        }
      }
      setSaved(true); setEditing(false)
      setTimeout(() => setSaved(false), 3000)
      onDataUpdate()
    } catch (e) {
      setError(e.message || 'Opslaan mislukt.')
    }
    setSaving(false)
  }

  return (
    <div>
      <SectionTitle>Persoonlijke gegevens</SectionTitle>

      {!data.data_confirmed && (
        <div style={{ background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 14, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
          <strong>Alle velden met * zijn verplicht.</strong> Zodra alles is ingevuld worden je festivals en tickets zichtbaar.
          {missingFields.length > 0 && !editing && (
            <div style={{ marginTop: 6, color: '#c2410c' }}>
              Nog {missingFields.length} {missingFields.length === 1 ? 'veld' : 'velden'} open.
            </div>
          )}
        </div>
      )}

      <Card style={{ padding: '20px 20px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Voornaam" required {...f('first_name')} />
          <Field label="Achternaam" required {...f('last_name')} />
        </div>
        <Field label="E-mailadres" value={data.email} readOnly />
        <Field label="Telefoonnummer" required {...f('phone')} />
        <Field label="Adres" required {...f('address')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0 16px' }}>
          <Field label="Postcode" required {...f('postal_code')} />
          <Field label="Stad" required {...f('city')} />
        </div>
        <Field label="IBAN" required {...f('iban')} />
        <Field label="BSN" required {...f('bsn')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Geboortedatum" required type="date" {...f('date_of_birth')} />
          <Field label="Geboorteplaats" required {...f('birth_place')} />
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#fff1f0', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {saved && <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, color: '#15803d', fontSize: 13, marginBottom: 12 }}>✓ Gegevens opgeslagen{allFilled && !data.data_confirmed ? ' — je festivals zijn nu zichtbaar!' : ''}</div>}

        <div style={{ display: 'flex', gap: 8, paddingBottom: 8 }}>
          {!editing
            ? <button onClick={() => setEditing(true)} style={btnSt('#1d1d1f', '#fff')}>Bewerken</button>
            : <>
                <button onClick={save} disabled={saving} style={btnSt('#1d1d1f', '#fff')}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
                <button onClick={() => { setEditing(false); setForm({ ...data }) }} style={btnSt('#f5f5f7', '#1d1d1f')}>Annuleren</button>
              </>
          }
        </div>
      </Card>
    </div>
  )
}

// ── Probleem melden sectie ───────────────────────────────────────────────────

function MeldingSection({ data }) {
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const CATEGORIES = ['Arbeidsomstandigheden', 'Roostering', 'Uitbetaling', 'Veiligheid', 'Anders']

  async function send() {
    if (!category || !message.trim()) { setError('Kies een categorie en vul een omschrijving in.'); return }
    setSending(true); setError('')
    try {
      await api('/api/support', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description: message,
          urgency: 'Normaal',
          ticket_type: 'service',
          name: `${data.first_name} ${data.last_name}`.trim() || data.email,
          email: data.email,
        }),
      })
      setSent(true); setCategory(''); setMessage('')
    } catch (e) { setError(e.message || 'Versturen mislukt.') }
    setSending(false)
  }

  return (
    <div>
      <SectionTitle>Probleem melden</SectionTitle>
      <Card style={{ padding: 20 }}>
        {sent && (
          <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, color: '#15803d', fontSize: 14, fontWeight: 500, marginBottom: 16 }}>
            ✓ Je melding is ontvangen. We nemen zo snel mogelijk contact op.
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>Categorie *</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
            <option value="">Kies een categorie…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>Omschrijving *</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
            placeholder="Beschrijf het probleem zo duidelijk mogelijk…"
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
        {error && <div style={{ color: '#ff3b30', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button onClick={send} disabled={sending} style={btnSt('#1d1d1f', '#fff')}>{sending ? 'Versturen…' : 'Melding versturen'}</button>
      </Card>
    </div>
  )
}

// ── Hoofd component ──────────────────────────────────────────────────────────

export default function Personeel() {
  const location = useLocation()
  const [data, setData] = useState(null)
  const [loadErr, setLoadErr] = useState('')

  const section = new URLSearchParams(location.search).get('s') || 'dashboard'

  async function load() {
    try {
      const d = await api('/api/hr/me')
      setData(d)
    } catch {
      setLoadErr('Kon profielgegevens niet laden.')
    }
  }

  useEffect(() => { load() }, [])

  if (loadErr) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 20px', textAlign: 'center', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 16, color: '#1d1d1f' }}>{loadErr}</div>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e5e5ea', borderTop: '3px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const allTasks = data.tasks || []
  const openTasks = allTasks.filter(t => !t.completed)
  const needsData = !data.data_confirmed

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1d1d1f', letterSpacing: -0.5 }}>
          Hallo, {data.first_name || data.email.split('@')[0]} 👋
        </div>
        <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>MIXMATE Personeelsportaal</div>
      </div>

      {section === 'dashboard' && <Dashboard data={data} openTasks={openTasks} needsData={needsData} />}
      {section === 'festivals'  && <FestivalsSection data={data} />}
      {section === 'contract'   && <ContractSection data={data} />}
      {section === 'gegevens'   && <GegevensSection data={data} onDataUpdate={load} />}
      {section === 'melding'    && <MeldingSection data={data} />}
    </div>
  )
}

function btnSt(bg, color) {
  return {
    padding: '10px 20px', background: bg, color, border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
}
