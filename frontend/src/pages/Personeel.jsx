import React, { useState, useEffect } from 'react'
import { fetchApi as api } from '../api.js'

function TaskItem({ task, onComplete }) {
  const [loading, setLoading] = useState(false)
  async function complete() {
    setLoading(true)
    await onComplete(task.id)
    setLoading(false)
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', background: task.completed ? '#f9f9f9' : '#fff',
      borderRadius: 14, border: '1px solid #f0f0f0', marginBottom: 8,
      opacity: task.completed ? 0.5 : 1,
    }}>
      <div onClick={task.completed ? undefined : complete} style={{
        width: 24, height: 24, borderRadius: 12,
        border: task.completed ? 'none' : '2px solid #d1d1d6',
        background: task.completed ? '#34c759' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: task.completed ? 'default' : 'pointer', flexShrink: 0,
        transition: 'all 0.2s',
      }}>
        {task.completed && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
        {loading && !task.completed && <div style={{ width: 10, height: 10, border: '2px solid #d1d1d6', borderTop: '2px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: task.completed ? 400 : 600, color: '#1d1d1f', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.label}</div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', readOnly = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 5 }}>{label}</label>
      <input
        type={type} value={value || ''} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 12,
          border: '1.5px solid #e5e5ea', fontSize: 14, outline: 'none',
          background: readOnly ? '#f9f9f9' : '#fff', boxSizing: 'border-box',
          fontFamily: 'inherit', color: readOnly ? '#aeaeb2' : '#1d1d1f',
        }}
      />
    </div>
  )
}

export default function Personeel() {
  const [data, setData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function load() {
    try {
      const d = await api('/api/hr/me')
      setData(d)
      setForm(d)
    } catch {
      setError('Kon profielgegevens niet laden.')
    }
  }

  useEffect(() => { load() }, [])

  async function completeTask(taskId) {
    await api(`/api/hr/me/tasks/${taskId}/complete`, { method: 'POST' })
    load()
  }

  const REQUIRED_FIELDS = ['first_name', 'last_name', 'phone', 'address', 'postal_code', 'city', 'iban', 'bsn', 'date_of_birth', 'birth_place']

  async function save() {
    setSaving(true)
    setError('')
    try {
      await api(`/api/hr/employees/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      const allFilled = REQUIRED_FIELDS.every(k => form[k]?.trim?.())
      if (allFilled && !data.data_confirmed) {
        const confirmTask = data.tasks?.find(t => t.key === 'confirm_data' && !t.completed)
        if (confirmTask) {
          await api(`/api/hr/me/tasks/${confirmTask.id}/complete`, { method: 'POST' })
        }
      }
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
      load()
    } catch (e) {
      setError('Opslaan mislukt.')
    } finally {
      setSaving(false)
    }
  }

  function f(key) { return { value: form[key] || '', onChange: v => setForm(p => ({ ...p, [key]: v })), readOnly: !editing } }

  const openTasks = data?.tasks?.filter(t => !t.completed) || []

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e5e5ea', borderTop: '3px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1d1d1f', letterSpacing: -0.5 }}>
          Hallo, {data.first_name} 👋
        </div>
        <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 4 }}>Personeelsportaal MIXMATE</div>
      </div>

      {/* Takenlijst */}
      {openTasks.length > 0 && (
        <div style={{ background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 18, padding: '20px 20px 12px', marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c2410c', marginBottom: 12 }}>
            📋 {openTasks.length} {openTasks.length === 1 ? 'taak' : 'taken'} te doen
          </div>
          {data.tasks.map(t => <TaskItem key={t.id} task={t} onComplete={completeTask} />)}
        </div>
      )}
      {openTasks.length === 0 && data.tasks.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 18, padding: '16px 20px', marginBottom: 28, fontSize: 14, color: '#15803d', fontWeight: 600 }}>
          ✓ Alle taken zijn afgerond
        </div>
      )}

      {/* Persoonlijke gegevens */}
      <Section title="Persoonlijke gegevens">
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 20px 8px', border: '1px solid #f0f0f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Voornaam" {...f('first_name')} />
            <Field label="Achternaam" {...f('last_name')} />
          </div>
          <Field label="E-mailadres" value={data.email} readOnly />
          <Field label="Telefoonnummer" {...f('phone')} />
          <Field label="Adres" {...f('address')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0 16px' }}>
            <Field label="Postcode" {...f('postal_code')} />
            <Field label="Stad" {...f('city')} />
          </div>
          <Field label="IBAN" {...f('iban')} />
          <Field label="BSN" {...f('bsn')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Geboortedatum" {...f('date_of_birth')} type="date" />
            <Field label="Geboorteplaats" {...f('birth_place')} />
          </div>

          {error && <div style={{ padding: '10px 14px', background: '#fff1f0', borderRadius: 10, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {saved && <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, color: '#15803d', fontSize: 13, marginBottom: 12 }}>Opgeslagen ✓</div>}

          <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
            {!editing
              ? <button onClick={() => setEditing(true)} style={btnStyle('#1d1d1f', '#fff')}>Bewerken</button>
              : <>
                  <button onClick={save} disabled={saving} style={btnStyle('#1d1d1f', '#fff')}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
                  <button onClick={() => { setEditing(false); setForm(data) }} style={btnStyle('#f5f5f7', '#1d1d1f')}>Annuleren</button>
                </>
            }
          </div>
        </div>
      </Section>

      {/* Salaris */}
      <Section title="Salaris">
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px', border: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, color: '#6e6e73' }}>Uurloon</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', marginTop: 2 }}>
                €{Number(data.hourly_rate).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#6e6e73' }}>Contract</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginTop: 2, textTransform: 'capitalize' }}>{data.contract_type || '—'}</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Festivals */}
      {data.festivals?.length > 0 && (
        <Section title="Festivals">
          {!data.data_confirmed && (
            <div style={{ background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 14, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
              Vul eerst je persoonlijke gegevens in en bevestig ze om je tickets te kunnen inzien. Dit is verplicht voor de verzekering.
            </div>
          )}
          {data.festivals.map(f => (
            <div key={f.id} style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid #f0f0f0', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: f.tickets?.length ? 14 : 0 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{f.name}</div>
                  <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 3 }}>{f.location} · {f.date_start}{f.date_end && f.date_end !== f.date_start ? ` t/m ${f.date_end}` : ''}</div>
                  {f.role && <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 2 }}>Rol: {f.role}</div>}
                </div>
              </div>
              {f.tickets?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tickets</div>
                  {f.tickets.map(t => (
                    <a key={t.id} href={`/api/hr/tickets/${t.id}/download`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f5f5f7', borderRadius: 12, textDecoration: 'none', color: '#1d1d1f', marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{t.mime_type?.includes('pdf') ? '📄' : '🎟️'}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{t.original_name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8e8e93' }}>Downloaden ↓</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

function btnStyle(bg, color) {
  return {
    padding: '10px 20px', background: bg, color, border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }
}
