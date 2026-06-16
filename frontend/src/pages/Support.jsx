import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

function SettingGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: .3, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>{label}</div>}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, children, noBorder }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: noBorder ? 'none' : '1px solid #f2f2f7' }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#aeaeb2', marginBottom: 6, letterSpacing: .2 }}>{label}</label>}
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', border: 'none', outline: 'none', fontSize: 15,
  color: '#1d1d1f', background: 'transparent', fontFamily: 'inherit',
  resize: 'none',
}

const selectStyle = {
  width: '100%', border: 'none', outline: 'none', fontSize: 15,
  color: '#1d1d1f', background: 'transparent', fontFamily: 'inherit',
  appearance: 'none', cursor: 'pointer',
}

export default function Support({ user }) {
  const [machines, setMachines] = useState([])
  const [form, setForm] = useState({
    machine_id: '',
    category: '',
    urgency: 'Normaal',
    description: '',
    preferred_date: '',
    preferred_time: '',
  })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getMachines().then(setMachines).catch(() => {})
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const selectedMachine = machines.find(m => m.machine_id === form.machine_id)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.category || !form.description || !form.preferred_date || !form.preferred_time) {
      setError('Vul alle verplichte velden in.')
      return
    }
    setLoading(true); setError(null)
    try {
      await api.submitSupport({
        machine_name: selectedMachine?.name || form.machine_id || 'Niet opgegeven',
        machine_id: form.machine_id || 'Niet opgegeven',
        category: form.category,
        urgency: form.urgency,
        description: form.description,
        preferred_date: form.preferred_date,
        preferred_time: form.preferred_time,
        customer_name: user?.name || '',
        customer_email: user?.email || '',
      })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 24, background: '#e8faf0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 10 }}>Melding ontvangen</h2>
        <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6, marginBottom: 32 }}>
          We nemen zo snel mogelijk contact met je op via <strong style={{ color: '#1d1d1f' }}>{user?.email}</strong>.
        </p>
        <button onClick={() => { setSent(false); setForm({ machine_id: '', category: '', urgency: 'Normaal', description: '', preferred_date: '', preferred_time: '' }) }}
          style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Nieuwe melding
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>Problemen melden</h1>
      <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: 32 }}>Beschrijf het probleem en een monteur neemt contact op.</p>

      <form onSubmit={handleSubmit}>

        <SettingGroup label="Machine">
          <SettingRow label="Selecteer machine" noBorder>
            {machines.length > 0 ? (
              <div style={{ position: 'relative' }}>
                <select value={form.machine_id} onChange={e => set('machine_id', e.target.value)} style={selectStyle}>
                  <option value="">Kies een machine…</option>
                  {machines.map(m => (
                    <option key={m.machine_id} value={m.machine_id}>{m.name} ({m.model || 'MIXMATE'})</option>
                  ))}
                  <option value="__manual">Handmatig invoeren</option>
                </select>
                <svg style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            ) : (
              <input style={inputStyle} placeholder="Machine ID" value={form.machine_id} onChange={e => set('machine_id', e.target.value)} />
            )}
          </SettingRow>
          {form.machine_id === '__manual' && (
            <SettingRow label="Machine ID" noBorder>
              <input style={inputStyle} placeholder="bijv. MM-2024-00123" value={form._manualId || ''} onChange={e => set('_manualId', e.target.value)} />
            </SettingRow>
          )}
        </SettingGroup>

        <SettingGroup label="Probleem">
          <SettingRow label="Categorie">
            <div style={{ position: 'relative' }}>
              <select value={form.category} onChange={e => set('category', e.target.value)} required style={selectStyle}>
                <option value="">Kies een categorie…</option>
                <option>Machine start niet op</option>
                <option>Recepten probleem</option>
                <option>CO2 probleem</option>
                <option>Vloeistoflekkage</option>
                <option>Scherm of software</option>
                <option>Pompprobleem</option>
                <option>Spoelprogramma werkt niet</option>
                <option>Overig</option>
              </select>
              <svg style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </SettingRow>

          <SettingRow label="Urgentie">
            <div style={{ display: 'flex', gap: 8 }}>
              {['Normaal', 'Urgent — machine staat stil'].map(u => (
                <button key={u} type="button" onClick={() => set('urgency', u)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, border: '1.5px solid',
                  borderColor: form.urgency === u ? '#1d1d1f' : '#e5e5ea',
                  background: form.urgency === u ? '#1d1d1f' : '#f2f2f7',
                  color: form.urgency === u ? '#fff' : '#6e6e73',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}>
                  {u === 'Normaal' ? 'Normaal' : '🔴 Urgent'}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Beschrijving" noBorder>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Beschrijf zo duidelijk mogelijk wat er mis gaat, wanneer het probleem begon en wat je al hebt geprobeerd…"
              rows={5}
              required
              style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
            />
          </SettingRow>
        </SettingGroup>

        <SettingGroup label="Afspraak voorkeur">
          <SettingRow label="Datum">
            <input
              type="date"
              value={form.preferred_date}
              onChange={e => set('preferred_date', e.target.value)}
              required
              style={inputStyle}
            />
          </SettingRow>
          <SettingRow label="Tijdstip" noBorder>
            <div style={{ position: 'relative' }}>
              <select value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)} required style={selectStyle}>
                <option value="">Kies een tijdstip…</option>
                <option>Ochtend (08:00 – 12:00)</option>
                <option>Middag (12:00 – 17:00)</option>
                <option>Avond (17:00 – 20:00)</option>
              </select>
              <svg style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </SettingRow>
        </SettingGroup>

        <SettingGroup label="Contactgegevens">
          <SettingRow label="Naam">
            <div style={{ fontSize: 15, color: '#1d1d1f' }}>{user?.name || '—'}</div>
          </SettingRow>
          <SettingRow label="E-mailadres" noBorder>
            <div style={{ fontSize: 15, color: '#1d1d1f' }}>{user?.email || '—'}</div>
          </SettingRow>
        </SettingGroup>

        {error && (
          <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', background: '#1d1d1f', color: '#fff', border: 'none',
          borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .5 : 1,
          fontFamily: 'inherit', transition: 'opacity .15s',
        }}>
          {loading ? 'Versturen…' : 'Melding indienen'}
        </button>
      </form>
    </div>
  )
}
