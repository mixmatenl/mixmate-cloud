import React, { useState } from 'react'
import { api } from '../api.js'

const inp = {
  width: '100%', border: 'none', outline: 'none', fontSize: 15,
  color: '#1d1d1f', background: 'transparent', fontFamily: 'inherit',
  resize: 'none',
}

function Row({ label, children, noBorder }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: noBorder ? 'none' : '1px solid #f2f2f7' }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#aeaeb2', marginBottom: 6, letterSpacing: .2 }}>{label}</label>}
      {children}
    </div>
  )
}

function Group({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: .3, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>{label}</div>}
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        {children}
      </div>
    </div>
  )
}

const INTERESSES = [
  'Extra MIXMATE machine',
  'Upgrade bestaande machine',
  'Nieuw servicecontract',
  'Reserveonderdelen',
  'Meerdere locaties',
  'Anders',
]

export default function Offerte({ user }) {
  const [form, setForm] = useState({
    interesse: '',
    aantal: '1',
    beschrijving: '',
  })
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.interesse || !form.beschrijving) {
      setError('Vul alle verplichte velden in.')
      return
    }
    setLoading(true); setError(null)
    try {
      await api.submitSupport({
        ticket_type:    'offerte',
        category:       form.interesse,
        description:    `Aantal machines: ${form.aantal}\n\n${form.beschrijving}`,
        machine_name:   '',
        machine_id:     '',
        urgency:        '',
        preferred_date: '',
        preferred_time: '',
        customer_name:  user?.name  || '',
        customer_email: user?.email || '',
      })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Er is iets misgegaan.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 24, background: '#e8faf0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 10 }}>Aanvraag verzonden</h2>
        <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6, marginBottom: 32 }}>
          We nemen zo snel mogelijk contact op via <strong style={{ color: '#1d1d1f' }}>{user?.email}</strong>.
        </p>
        <button onClick={() => { setSent(false); setForm({ interesse: '', aantal: '1', beschrijving: '' }) }}
          style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Nieuwe aanvraag
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>Offerte aanvragen</h1>
      <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: 32 }}>Geef aan waar uw interesse naar uitgaat en we sturen een passende offerte.</p>

      <form onSubmit={submit}>
        <Group label="Interesse">
          <Row label="Waarvoor wilt u een offerte?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              {INTERESSES.map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="radio" name="interesse" value={opt}
                    checked={form.interesse === opt}
                    onChange={() => set('interesse', opt)}
                    style={{ accentColor: '#1d1d1f', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 15, color: '#1d1d1f' }}>{opt}</span>
                </label>
              ))}
            </div>
          </Row>
          <Row label="Aantal machines (indicatie)" noBorder>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              {['1', '2–5', '5–10', '10+'].map(n => (
                <button key={n} type="button" onClick={() => set('aantal', n)} style={{
                  padding: '8px 16px', borderRadius: 10, border: '1.5px solid',
                  borderColor: form.aantal === n ? '#1d1d1f' : '#e5e5ea',
                  background: form.aantal === n ? '#1d1d1f' : '#f2f2f7',
                  color: form.aantal === n ? '#fff' : '#6e6e73',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {n}
                </button>
              ))}
            </div>
          </Row>
        </Group>

        <Group label="Toelichting">
          <Row label="Aanvullende informatie" noBorder>
            <textarea
              value={form.beschrijving}
              onChange={e => set('beschrijving', e.target.value)}
              placeholder="Omschrijf uw situatie, eventuele eisen of vragen…"
              rows={5}
              required
              style={{ ...inp, resize: 'vertical', minHeight: 100 }}
            />
          </Row>
        </Group>

        <Group label="Contactgegevens">
          <Row label="Naam">
            <div style={{ fontSize: 15, color: '#1d1d1f' }}>{user?.name || '—'}</div>
          </Row>
          <Row label="E-mailadres" noBorder>
            <div style={{ fontSize: 15, color: '#1d1d1f' }}>{user?.email || '—'}</div>
          </Row>
        </Group>

        {error && (
          <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', background: '#1d1d1f', color: '#fff', border: 'none',
          borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .5 : 1,
          fontFamily: 'inherit', transition: 'opacity .15s',
        }}>
          {loading ? 'Versturen…' : 'Offerte aanvragen'}
        </button>
      </form>
    </div>
  )
}
