import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MachineDetail from './pages/MachineDetail.jsx'
import Support from './pages/Support.jsx'
import Account from './pages/Account.jsx'
import Rapporten from './pages/Rapporten.jsx'
import Meldingen from './pages/Meldingen.jsx'
import Admin from './pages/Admin.jsx'
import Layout from './components/Layout.jsx'
import InstallBanner from './components/InstallBanner.jsx'
import { api } from './api.js'

function ChangePasswordModal({ onDone }) {
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (pw1.length < 8) { setErr('Wachtwoord moet minimaal 8 tekens zijn.'); return }
    if (pw1 !== pw2)    { setErr('Wachtwoorden komen niet overeen.'); return }
    setSaving(true)
    try {
      await api.setPassword(pw1)
      onDone()
    } catch (e) {
      setErr(e.message || 'Er ging iets mis.')
    }
    setSaving(false)
  }

  const inp = {
    width: '100%', border: '1px solid #e5e5ea', borderRadius: 10,
    padding: '11px 14px', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.18)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>🔒</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#1d1d1f', textAlign: 'center' }}>
          Nieuw wachtwoord instellen
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6e6e73', textAlign: 'center', lineHeight: 1.5 }}>
          Uw wachtwoord is gereset. Kies een nieuw wachtwoord om verder te gaan.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>
              Nieuw wachtwoord
            </div>
            <input
              type="password"
              value={pw1}
              onChange={e => setPw1(e.target.value)}
              placeholder="Minimaal 8 tekens"
              style={inp}
              autoFocus
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>
              Herhaal wachtwoord
            </div>
            <input
              type="password"
              value={pw2}
              onChange={e => setPw2(e.target.value)}
              placeholder="Nogmaals uw nieuwe wachtwoord"
              style={inp}
            />
          </div>
          {err && (
            <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !pw1 || !pw2}
            style={{
              marginTop: 4, background: '#1d1d1f', color: '#fff', border: 'none',
              borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600,
              cursor: saving || !pw1 || !pw2 ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: saving || !pw1 || !pw2 ? .5 : 1,
            }}
          >
            {saving ? 'Opslaan…' : 'Wachtwoord instellen'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('mm_token', urlToken)
      localStorage.setItem('mixmate_token', urlToken)
      const name  = params.get('name')  || ''
      const email = params.get('email') || ''
      if (name || email) {
        const u = JSON.stringify({ name, email })
        localStorage.setItem('mm_user', u)
        localStorage.setItem('mixmate_user', u)
      }
      window.history.replaceState({}, '', window.location.pathname)
      return urlToken
    }
    return localStorage.getItem('mm_token')
  })
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mm_user') || 'null') } catch { return null }
  })

  function onLogin(token, user) {
    localStorage.setItem('mm_token', token)
    localStorage.setItem('mm_user', JSON.stringify(user))
    localStorage.setItem('mixmate_token', token)
    localStorage.setItem('mixmate_user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  function onLogout() {
    localStorage.removeItem('mm_token')
    localStorage.removeItem('mm_user')
    localStorage.removeItem('mixmate_token')
    localStorage.removeItem('mixmate_user')
    setToken(null)
    setUser(null)
  }

  function onPasswordChanged() {
    const updated = { ...user, must_change_password: false }
    localStorage.setItem('mm_user', JSON.stringify(updated))
    localStorage.setItem('mixmate_user', JSON.stringify(updated))
    setUser(updated)
  }

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={onLogin} />} />
      </Routes>
    )
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      {user?.must_change_password && <ChangePasswordModal onDone={onPasswordChanged} />}
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Dashboard user={user} onLogout={onLogout} />} />
        <Route path="/machine/:machineId" element={<MachineDetail user={user} onLogout={onLogout} />} />
        <Route path="/rapporten" element={<Rapporten />} />
        <Route path="/meldingen" element={<Meldingen />} />
        <Route path="/support" element={<Support user={user} />} />
        <Route path="/account" element={<Account user={user} onLogout={onLogout} />} />
        <Route path="/admin"   element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallBanner />
    </Layout>
  )
}
