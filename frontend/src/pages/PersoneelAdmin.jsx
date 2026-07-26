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

  async function deleteEmployee(emp) {
    if (!window.confirm(`${emp.first_name} ${emp.last_name} definitief verwijderen? Dit verwijdert ook hun portaalaccount en alle gekoppelde taken.`)) return
    try {
      await api(`/api/hr/employees/${emp.id}`, { method: 'DELETE' })
      load()
    } catch (e) { alert(e.message) }
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
            <Btn small onClick={() => deleteEmployee(emp)} color="#fff1f0" textColor="#dc2626">Verwijderen</Btn>
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

// ── Taken tab ──────────────────────────────────────────────────────────────────

function TakenTab() {
  const [overview, setOverview] = useState(null)
  const [festivals, setFestivals] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ label: '', scope: 'all', employee_id: '', festival_id: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [ov, fe, em] = await Promise.all([
        api('/api/hr/tasks/overview'),
        api('/api/hr/festivals'),
        api('/api/hr/employees'),
      ])
      setOverview(ov)
      setFestivals(fe)
      setEmployees(em)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createTask() {
    if (!form.label.trim()) return setError('Voer een taakomschrijving in.')
    setCreating(true); setError('')
    try {
      const body = { label: form.label }
      if (form.scope === 'one' && form.employee_id) body.employee_ids = [parseInt(form.employee_id)]
      else if (form.scope === 'festival' && form.festival_id) body.festival_id = parseInt(form.festival_id)
      else body.all_employees = true
      await api('/api/hr/tasks/create', { method: 'POST', body: JSON.stringify(body) })
      setForm({ label: '', scope: 'all', employee_id: '', festival_id: '' })
      setShowCreate(false)
      load()
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  async function deleteTask(id) {
    if (!window.confirm('Taak verwijderen?')) return
    try {
      await api(`/api/hr/tasks/${id}`, { method: 'DELETE' })
      load()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#aeaeb2' }}>Laden…</div>

  const allTasks = overview ? overview.flatMap(emp =>
    (emp.tasks || []).filter(t => !t.key?.startsWith('confirm_data') && !t.key?.startsWith('change_password')).map(t => ({ ...t, emp_name: `${emp.first_name} ${emp.last_name}` }))
  ) : []
  const open = allTasks.filter(t => !t.completed)
  const done = allTasks.filter(t => t.completed)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Taken beheer</div>
        <Btn onClick={() => setShowCreate(true)}>+ Taak aanmaken</Btn>
      </div>

      {showCreate && (
        <Modal title="Nieuwe taak aanmaken" onClose={() => setShowCreate(false)}>
          <Field label="Taakomschrijving" value={form.label} onChange={v => setForm(f => ({ ...f, label: v }))} required />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>Toewijzen aan</label>
            <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value, employee_id: '', festival_id: '' }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
              <option value="all">Alle medewerkers</option>
              <option value="festival">Alle medewerkers van een festival</option>
              <option value="one">Specifieke medewerker</option>
            </select>
          </div>
          {form.scope === 'festival' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>Festival</label>
              <select value={form.festival_id} onChange={e => setForm(f => ({ ...f, festival_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Kies een festival…</option>
                {festivals.map(fe => <option key={fe.id} value={fe.id}>{fe.name}</option>)}
              </select>
            </div>
          )}
          {form.scope === 'one' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>Medewerker</label>
              <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e5ea', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
                <option value="">Kies een medewerker…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
          )}
          {error && <div style={{ color: '#ff3b30', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn onClick={createTask} disabled={creating}>{creating ? 'Aanmaken…' : 'Taak aanmaken'}</Btn>
            <Btn color="#f5f5f7" textColor="#1d1d1f" onClick={() => setShowCreate(false)}>Annuleren</Btn>
          </div>
        </Modal>
      )}

      {open.length === 0 && done.length === 0 && (
        <Card style={{ padding: 32, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen taken aangemaakt.</Card>
      )}

      {open.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Open ({open.length})</div>
          {open.map(t => (
            <Card key={t.id} style={{ padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid #e5e5ea', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>{t.emp_name}</div>
              </div>
              <Btn small color="#fff1f0" textColor="#dc2626" onClick={() => deleteTask(t.id)}>✕</Btn>
            </Card>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Afgerond ({done.length})</div>
          {done.map(t => (
            <Card key={t.id} style={{ padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.6 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: '#34c759', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2,6 5,9 10,3"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', textDecoration: 'line-through' }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>{t.emp_name}</div>
              </div>
              <Btn small color="#fff1f0" textColor="#dc2626" onClick={() => deleteTask(t.id)}>✕</Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Hoofd component ────────────────────────────────────────────────────────────

export default function PersoneelAdmin() {
  const location = useLocation()
  const urlTab = new URLSearchParams(location.search).get('t')
  const resolvedTab = urlTab === 'festivals' ? 'festivals' : urlTab === 'taken' ? 'taken' : 'medewerkers'
  const [tab, setTab] = useState(resolvedTab)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t')
    if (t === 'festivals') setTab('festivals')
    else if (t === 'taken') setTab('taken')
    else if (t === 'add' || t === 'medewerkers') setTab('medewerkers')
  }, [location.search])

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1d1d1f', letterSpacing: -0.5 }}>Personeelsbeheer</div>
        <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>Alleen zichtbaar voor jou</div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f5f5f7', borderRadius: 12, padding: 4 }}>
        {['medewerkers', 'festivals', 'taken'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? '#1d1d1f' : '#6e6e73',
            fontSize: 13, fontWeight: tab === t ? 600 : 400, fontFamily: 'inherit',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>
            {t === 'medewerkers' ? '👥 Medewerkers' : t === 'festivals' ? '🎪 Festivals' : '✅ Taken'}
          </button>
        ))}
      </div>

      {tab === 'medewerkers' && <EmployeesTab openAdd={urlTab === 'add'} />}
      {tab === 'festivals' && <FestivalsTab />}
      {tab === 'taken' && <TakenTab />}
    </div>
  )
}
