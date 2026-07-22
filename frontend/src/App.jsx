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
import Webshop from './pages/Webshop.jsx'
import Bestellen from './pages/Bestellen.jsx'
import Layout from './components/Layout.jsx'
import InstallBanner from './components/InstallBanner.jsx'
import { api } from './api.js'

function EyeIcon({ open }) {
  return open
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}

function strength(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8)  s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

function StrengthBar({ pw }) {
  const s = strength(pw)
  const colors = ['#e5e5ea', '#ff3b30', '#ff9500', '#34c759', '#34c759']
  const labels = ['', 'Zwak', 'Matig', 'Goed', 'Sterk']
  const filled = Math.min(s, 4)
  if (!pw) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= filled ? colors[filled] : '#e5e5ea',
            transition: 'background .2s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[filled], fontWeight: 600 }}>{labels[filled]}</div>
    </div>
  )
}

function ChangePasswordModal({ onDone }) {
  const [pw1, setPw1]       = useState('')
  const [pw2, setPw2]       = useState('')
  const [show1, setShow1]   = useState(false)
  const [show2, setShow2]   = useState(false)
  const [err, setErr]       = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (pw1.length < 8) { setErr('Wachtwoord moet minimaal 8 tekens zijn.'); return }
    if (pw1 !== pw2)    { setErr('Wachtwoorden komen niet overeen.'); return }
    setSaving(true)
    try {
      await api.setPassword(pw1)
      setDone(true)
      setTimeout(onDone, 1200)
    } catch (e) {
      setErr(e.message || 'Er ging iets mis.')
      setSaving(false)
    }
  }

  const match = pw2.length > 0 && pw1 === pw2
  const mismatch = pw2.length > 0 && pw1 !== pw2

  const inp = (show) => ({
    flex: 1, border: 'none', outline: 'none', fontSize: 15,
    fontFamily: 'inherit', background: 'transparent', color: '#1d1d1f',
    padding: '13px 0 13px 14px',
  })

  const field = (active) => ({
    display: 'flex', alignItems: 'center',
    border: `1.5px solid ${active ? '#1d1d1f' : '#e5e5ea'}`,
    borderRadius: 12, background: '#fff', transition: 'border-color .15s',
    overflow: 'hidden',
  })

  if (done) return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#34c759',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          animation: 'popIn .3s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Wachtwoord ingesteld</div>
        <style>{`@keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}`}</style>
      </div>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,.22)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1d1d1f 0%, #3a3a3c 100%)',
          padding: '32px 28px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,.12)', border: '1.5px solid rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -.3 }}>
            Nieuw wachtwoord instellen
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.5 }}>
            Uw tijdelijke wachtwoord is verlopen.<br/>Kies een persoonlijk wachtwoord om verder te gaan.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
              Nieuw wachtwoord
            </label>
            <div style={field(document.activeElement?.name === 'pw1')}>
              <input
                name="pw1"
                type={show1 ? 'text' : 'password'}
                value={pw1}
                onChange={e => setPw1(e.target.value)}
                placeholder="Minimaal 8 tekens"
                style={inp(show1)}
                autoFocus
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShow1(v => !v)} style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: '0 14px', color: '#aeaeb2',
              }}>
                <EyeIcon open={show1} />
              </button>
            </div>
            <StrengthBar pw={pw1} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>
              Herhaal wachtwoord
            </label>
            <div style={{
              ...field(document.activeElement?.name === 'pw2'),
              borderColor: match ? '#34c759' : mismatch ? '#ff3b30' : '#e5e5ea',
            }}>
              <input
                name="pw2"
                type={show2 ? 'text' : 'password'}
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                placeholder="Nogmaals uw wachtwoord"
                style={inp(show2)}
                autoComplete="new-password"
              />
              {match && (
                <div style={{ padding: '0 14px', color: '#34c759' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              {!match && (
                <button type="button" onClick={() => setShow2(v => !v)} style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: '0 14px', color: '#aeaeb2',
                }}>
                  <EyeIcon open={show2} />
                </button>
              )}
            </div>
            {mismatch && <div style={{ marginTop: 6, fontSize: 12, color: '#ff3b30' }}>Wachtwoorden komen niet overeen</div>}
          </div>

          {err && (
            <div style={{
              background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30',
              borderRadius: 10, padding: '11px 14px', fontSize: 13, lineHeight: 1.4,
            }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || pw1.length < 8 || !match}
            style={{
              marginTop: 4,
              background: pw1.length >= 8 && match ? '#1d1d1f' : '#e5e5ea',
              color: pw1.length >= 8 && match ? '#fff' : '#aeaeb2',
              border: 'none', borderRadius: 12, padding: '14px',
              fontSize: 15, fontWeight: 600, cursor: pw1.length >= 8 && match && !saving ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'background .2s, color .2s',
            }}
          >
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                Opslaan…
              </span>
            ) : 'Wachtwoord instellen'}
          </button>

          <p style={{ margin: 0, fontSize: 12, color: '#aeaeb2', textAlign: 'center', lineHeight: 1.5 }}>
            Dit scherm sluit automatisch na het instellen van uw wachtwoord.
          </p>
        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
        <Route path="/bestellen" element={<Bestellen />} />
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
        <Route path="/admin"    element={<Admin />} />
        <Route path="/webshop"  element={<Webshop />} />
        <Route path="/bestellen" element={<Bestellen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallBanner />
    </Layout>
  )
}
