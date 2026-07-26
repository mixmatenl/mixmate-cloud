import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchApi as api } from '../api.js'

// ── helpers ────────────────────────────────────────────────────────────────────

function Card({ children, style }) {
  return <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #f0f0f0', ...style }}>{children}</div>
}

function Btn({ children, onClick, color = '#1d1d1f', textColor = '#fff', disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '7px 14px' : '10px 20px',
      background: color, color: textColor, border: 'none', borderRadius: 10,
      fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, fontFamily: 'inherit',
    }}>{children}</button>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>{label}{required && ' *'}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} required={required}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 28, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6e6e73' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Medewerkers tab ────────────────────────────────────────────────────────────

function EmployeesTab({ openAdd }) {
  const [employees, setEmployees] = useState([])
  const [showAdd, setShowAdd] = useState(!!openAdd)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const d = await api('/api/hr/employees')
    setEmployees(d)
  }
  useEffect(() => { load() }, [])

  async function add(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api('/api/hr/employees', { method: 'POST', body: JSON.stringify(form) })
      setShowAdd(false); setForm({}); load()
    } catch (err) {
      setError(err.message || 'Fout')
    } finally { setSaving(false) }
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api(`/api/hr/employees/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) })
      setSelected(null); setForm({}); load()
    } catch (err) {
      setError(err.message || 'Fout')
    } finally { setSaving(false) }
  }

  async function resendInvite(emp) {
    await api(`/api/hr/employees/${emp.id}/resend-invite`, { method: 'POST' })
    alert(`Uitnodiging opnieuw verstuurd naar ${emp.email}`)
  }

  function openEdit(emp) { setSelected(emp); setForm({ ...emp }); setError('') }

  const F = key => ({ value: form[key] || '', onChange: v => setForm(p => ({ ...p, [key]: v })) })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Medewerkers ({employees.length})</div>
        <Btn onClick={() => { setShowAdd(true); setForm({}); setError('') }}>+ Medewerker toevoegen</Btn>
      </div>

      {employees.length === 0 && <div style={{ color: '#aeaeb2', fontSize: 14, padding: '20px 0' }}>Nog geen medewerkers toegevoegd.</div>}

      {employees.map(emp => (
        <Card key={emp.id} style={{ padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
            {(emp.first_name?.[0] || '?').toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{emp.first_name} {emp.last_name}</div>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>{emp.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {emp.open_tasks > 0 && <span style={{ fontSize: 12, background: '#fff8ed', color: '#c2410c', borderRadius: 8, padding: '3px 8px', fontWeight: 600 }}>{emp.open_tasks} taken</span>}
            {!emp.customer_id && <span style={{ fontSize: 12, background: '#f0f9ff', color: '#0369a1', borderRadius: 8, padding: '3px 8px', fontWeight: 600 }}>Uitgenodigd</span>}
            {!emp.active && <span style={{ fontSize: 12, background: '#f5f5f7', color: '#8e8e93', borderRadius: 8, padding: '3px 8px' }}>Inactief</span>}
            <Btn small onClick={() => openEdit(emp)} color="#f5f5f7" textColor="#1d1d1f">Bewerken</Btn>
            {!emp.customer_id && <Btn small onClick={() => resendInvite(emp)} color="#f0f9ff" textColor="#0369a1">Heruitnodigen</Btn>}
          </div>
        </Card>
      ))}

      {/* Toevoegen modal */}
      {showAdd && (
        <Modal title="Medewerker toevoegen" onClose={() => setShowAdd(false)}>
          <form onSubmit={add}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label="Voornaam" {...F('first_name')} required />
              <Field label="Achternaam" {...F('last_name')} required />
            </div>
            <Field label="E-mailadres" {...F('email')} type="email" required />
            <Field label="Telefoonnummer" {...F('phone')} />
            <Field label="Adres" {...F('address')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0 12px' }}>
              <Field label="Postcode" {...F('postal_code')} />
              <Field label="Stad" {...F('city')} />
            </div>
            <Field label="IBAN" {...F('iban')} />
            <Field label="BSN" {...F('bsn')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label="Geboortedatum" {...F('date_of_birth')} type="date" />
              <Field label="Geboorteplaats" {...F('birth_place')} />
            </div>
            <Field label="Uurloon (€)" {...F('hourly_rate')} type="number" />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>Contracttype</label>
              <select value={form.contract_type || ''} onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Kies…</option>
                <option value="vast">Vast</option>
                <option value="flex">Flex</option>
                <option value="oproep">Oproep</option>
              </select>
            </div>
            <Field label="Notities" {...F('notes')} />
            <div style={{ padding: '10px 14px', background: '#f0f9ff', borderRadius: 10, fontSize: 12, color: '#0369a1', marginBottom: 12 }}>
              Ontbrekende velden worden gevraagd aan de medewerker via het portaal.
            </div>
            {error && <div style={{ padding: '10px 14px', background: '#fff1f0', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn color="#f5f5f7" textColor="#1d1d1f" onClick={() => setShowAdd(false)}>Annuleren</Btn>
              <Btn disabled={saving}>{saving ? 'Toevoegen…' : 'Toevoegen & uitnodigen'}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Bewerken modal */}
      {selected && (
        <Modal title={`${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label="Voornaam" {...F('first_name')} required />
              <Field label="Achternaam" {...F('last_name')} required />
            </div>
            <Field label="Telefoonnummer" {...F('phone')} required />
            <Field label="Adres" {...F('address')} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0 12px' }}>
              <Field label="Postcode" {...F('postal_code')} required />
              <Field label="Stad" {...F('city')} required />
            </div>
            <Field label="IBAN" {...F('iban')} required />
            <Field label="BSN" {...F('bsn')} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label="Geboortedatum" {...F('date_of_birth')} type="date" required />
              <Field label="Geboorteplaats" {...F('birth_place')} required />
            </div>
            <Field label="Uurloon (€)" {...F('hourly_rate')} type="number" />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>Contracttype</label>
              <select value={form.contract_type || ''} onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Kies…</option>
                <option value="vast">Vast</option>
                <option value="flex">Flex</option>
                <option value="oproep">Oproep</option>
              </select>
            </div>
            <Field label="Notities" {...F('notes')} />
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="active" checked={form.active !== false} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
              <label htmlFor="active" style={{ fontSize: 14, color: '#1d1d1f' }}>Actief</label>
            </div>
            {error && <div style={{ padding: '10px 14px', background: '#fff1f0', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn color="#f5f5f7" textColor="#1d1d1f" onClick={() => setSelected(null)}>Annuleren</Btn>
              <Btn disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Festivals tab ──────────────────────────────────────────────────────────────

function FestivalsTab() {
  const [festivals, setFestivals] = useState([])
  const [employees, setEmployees] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  async function load() {
    const [f, e] = await Promise.all([api('/api/hr/festivals'), api('/api/hr/employees')])
    setFestivals(f); setEmployees(e)
  }
  useEffect(() => { load() }, [])

  async function loadDetail(id) {
    const d = await api(`/api/hr/festivals/${id}`)
    setDetail(d)
  }

  async function add(e) {
    e.preventDefault(); setSaving(true); setError('')
    try { await api('/api/hr/festivals', { method: 'POST', body: JSON.stringify(form) }); setShowAdd(false); setForm({}); load() }
    catch (err) { setError(err.message || 'Fout') }
    finally { setSaving(false) }
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('')
    try { await api(`/api/hr/festivals/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) }); setSelected(null); setForm({}); load() }
    catch (err) { setError(err.message || 'Fout') }
    finally { setSaving(false) }
  }

  async function assign(festivalId, employeeId, role) {
    try { await api(`/api/hr/festivals/${festivalId}/assignments`, { method: 'POST', body: JSON.stringify({ employee_id: Number(employeeId), role }) }); loadDetail(festivalId) }
    catch (err) { alert(err.message) }
  }

  async function removeAssignment(festivalId, assignmentId) {
    await api(`/api/hr/festivals/${festivalId}/assignments/${assignmentId}`, { method: 'DELETE' })
    loadDetail(festivalId)
  }

  async function uploadTicket(festivalId, file, empId) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const url = empId ? `/api/hr/festivals/${festivalId}/tickets?employee_id=${empId}` : `/api/hr/festivals/${festivalId}/tickets`
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('mm_token')}` }, body: fd })
    if (!r.ok) alert('Upload mislukt')
    setUploading(false)
    loadDetail(festivalId)
  }

  async function deleteTicket(ticketId, festivalId) {
    if (!confirm('Ticket verwijderen?')) return
    await api(`/api/hr/tickets/${ticketId}`, { method: 'DELETE' })
    loadDetail(festivalId)
  }

  const F = key => ({ value: form[key] || '', onChange: v => setForm(p => ({ ...p, [key]: v })) })

  function festivalFormFields(onSubmit) {
    return (
      <form onSubmit={onSubmit}>
        <Field label="Festivalnaam" {...F('name')} required />
        <Field label="Locatie" {...F('location')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Field label="Startdatum" {...F('date_start')} type="date" />
          <Field label="Einddatum" {...F('date_end')} type="date" />
        </div>
        <Field label="Omschrijving" {...F('description')} />
        {error && <div style={{ padding: '10px 14px', background: '#fff1f0', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn color="#f5f5f7" textColor="#1d1d1f" onClick={() => { setShowAdd(false); setSelected(null) }}>Annuleren</Btn>
          <Btn disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</Btn>
        </div>
      </form>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Festivals ({festivals.length})</div>
        <Btn onClick={() => { setShowAdd(true); setForm({}); setError('') }}>+ Festival toevoegen</Btn>
      </div>

      {festivals.map(f => (
        <Card key={f.id} style={{ padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{f.name}</div>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>{f.location} · {f.date_start}{f.date_end && f.date_end !== f.date_start ? ` t/m ${f.date_end}` : ''}</div>
          </div>
          <span style={{ fontSize: 12, color: '#8e8e93' }}>{f.employee_count} mw · {f.ticket_count} tickets</span>
          <Btn small color="#f5f5f7" textColor="#1d1d1f" onClick={() => { setSelected(f); setForm({ ...f }); setError(''); loadDetail(f.id) }}>Beheren</Btn>
        </Card>
      ))}

      {showAdd && <Modal title="Festival toevoegen" onClose={() => setShowAdd(false)}>{festivalFormFields(add)}</Modal>}

      {selected && detail && (
        <Modal title={selected.name} onClose={() => { setSelected(null); setDetail(null) }}>
          {festivalFormFields(save)}

          {/* Medewerkers */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 12 }}>Medewerkers</div>
            {detail.employees.map(e => (
              <div key={e.assignment_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: '#f9f9f9', borderRadius: 10 }}>
                <span style={{ fontSize: 14, flex: 1 }}>{e.first_name} {e.last_name}</span>
                {e.role && <span style={{ fontSize: 12, color: '#6e6e73' }}>{e.role}</span>}
                <Btn small color="#fff1f0" textColor="#dc2626" onClick={() => removeAssignment(selected.id, e.assignment_id)}>✕</Btn>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <select id="emp-sel" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Medewerker kiezen…</option>
                {employees.filter(e => !detail.employees.find(de => de.id === e.id)).map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
              <input id="role-inp" placeholder="Rol (optioneel)" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
              <Btn small onClick={() => {
                const empId = document.getElementById('emp-sel').value
                const role = document.getElementById('role-inp').value
                if (empId) assign(selected.id, empId, role)
              }}>Toevoegen</Btn>
            </div>
          </div>

          {/* Tickets */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', marginBottom: 12 }}>Tickets uploaden</div>
            {detail.tickets.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px', background: '#f9f9f9', borderRadius: 10 }}>
                <span style={{ fontSize: 16 }}>{t.mime_type?.includes('pdf') ? '📄' : '🖼️'}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{t.original_name}</span>
                {t.employee_id && <span style={{ fontSize: 12, color: '#6e6e73' }}>Persoonlijk</span>}
                <a href={`/api/hr/tickets/${t.id}/download`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0369a1', textDecoration: 'none' }}>↓</a>
                <Btn small color="#fff1f0" textColor="#dc2626" onClick={() => deleteTicket(t.id, selected.id)}>✕</Btn>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <select id="ticket-emp" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Voor iedereen</option>
                {detail.employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) { const empId = document.getElementById('ticket-emp').value || null; uploadTicket(selected.id, f, empId) }; e.target.value = '' }} />
              <Btn small disabled={uploading} onClick={() => fileRef.current.click()}>{uploading ? 'Uploaden…' : '↑ Upload ticket'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Hoofd component ────────────────────────────────────────────────────────────

export default function PersoneelAdmin() {
  const location = useLocation()
  const urlTab = new URLSearchParams(location.search).get('t')
  const [tab, setTab] = useState(urlTab === 'festivals' ? 'festivals' : 'medewerkers')

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1d1d1f', letterSpacing: -0.5 }}>Personeelsbeheer</div>
        <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>Alleen zichtbaar voor jou</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f5f5f7', borderRadius: 12, padding: 4 }}>
        {['medewerkers', 'festivals'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#1d1d1f' : '#6e6e73',
            fontSize: 14, fontWeight: tab === t ? 600 : 400, fontFamily: 'inherit',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            textTransform: 'capitalize',
          }}>
            {t === 'medewerkers' ? '👥 Medewerkers' : '🎪 Festivals'}
          </button>
        ))}
      </div>

      {tab === 'medewerkers' && <EmployeesTab openAdd={urlTab === 'add'} />}
      {tab === 'festivals' && <FestivalsTab />}
    </div>
  )
}
