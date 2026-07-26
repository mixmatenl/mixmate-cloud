import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function PersoneelInvite({ onLogin }) {
  const { token } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/hr/invite/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setInfo)
      .catch(() => setError('Deze uitnodigingslink is ongeldig of verlopen.'))
      .finally(() => setLoading(false))
  }, [token])

  async function submit(e) {
    e.preventDefault()
    if (pw.length < 8) return setError('Wachtwoord moet minimaal 8 tekens zijn')
    if (pw !== pw2) return setError('Wachtwoorden komen niet overeen')
    setSaving(true)
    setError('')
    try {
      const r = await fetch(`/api/hr/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Fout')
      const user = { name: d.name, email: d.email, is_employee: true }
      localStorage.setItem('mm_token', d.token)
      localStorage.setItem('mixmate_token', d.token)
      localStorage.setItem('mm_user', JSON.stringify(user))
      localStorage.setItem('mixmate_user', JSON.stringify(user))
      onLogin?.(d.token, user)
      // Hard redirect zodat App.jsx opnieuw laadt met correcte user-state
      window.location.href = '/personeel'
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={styles.center}><div style={styles.spinner} /></div>

  if (error && !info) return (
    <div style={styles.center}>
      <div style={styles.card}>
        <div style={styles.icon}>⚠️</div>
        <div style={styles.title}>Link verlopen</div>
        <div style={styles.sub}>{error}</div>
        <a href="/personeel" style={styles.btn}>Naar portaal</a>
      </div>
    </div>
  )

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={styles.logo}>M</div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>MIXMATE</span>
        </div>
        <div style={styles.title}>Welkom, {info?.first_name}!</div>
        <div style={styles.sub}>Stel je wachtwoord in om toegang te krijgen tot het personeelsportaal.</div>
        <form onSubmit={submit} style={{ marginTop: 24 }}>
          <label style={styles.label}>Wachtwoord</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} style={styles.input} placeholder="Minimaal 8 tekens" required />
          <label style={styles.label}>Herhaal wachtwoord</label>
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} style={styles.input} placeholder="Herhaal je wachtwoord" required />
          {error && <div style={styles.err}>{error}</div>}
          <button type="submit" disabled={saving} style={styles.submitBtn}>
            {saving ? 'Bezig…' : 'Account instellen →'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', padding: 16, fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' },
  card: { background: '#fff', borderRadius: 24, padding: '36px 32px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  logo: { width: 36, height: 36, borderRadius: 10, background: '#1d1d1f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 },
  icon: { fontSize: 40, marginBottom: 12, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 8, letterSpacing: -0.4 },
  sub: { fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e5e5ea', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  err: { marginTop: 12, padding: '10px 14px', background: '#fff1f0', borderRadius: 10, color: '#dc2626', fontSize: 13 },
  submitBtn: { marginTop: 20, width: '100%', padding: '14px 0', background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  btn: { display: 'inline-block', marginTop: 16, padding: '12px 24px', background: '#1d1d1f', color: '#fff', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 600 },
  spinner: { width: 32, height: 32, border: '3px solid #e5e5ea', borderTop: '3px solid #1d1d1f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
}
