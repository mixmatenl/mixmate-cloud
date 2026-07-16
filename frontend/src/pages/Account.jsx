import React, { useEffect, useState } from 'react'
import { api } from '../api'

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

function InfoRow({ label, value, noBorder }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: noBorder ? 'none' : '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 15, color: '#1d1d1f' }}>{label}</span>
      <span style={{ fontSize: 15, color: '#aeaeb2' }}>{value}</span>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 51, height: 31, borderRadius: 16, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: checked ? '#34c759' : '#e5e5ea',
        position: 'relative', transition: 'background .2s', flexShrink: 0, padding: 0,
        opacity: disabled ? .6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 27, height: 27, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.18)',
        transition: 'left .2s',
      }} />
    </button>
  )
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Account({ user, onLogout }) {
  const [subscribed, setSubscribed]   = useState(null)
  const [toggling, setToggling]       = useState(false)
  const [toggleMsg, setToggleMsg]     = useState(null)

  useEffect(() => {
    api.accountMe()
      .then(r => setSubscribed(r.newsletter_subscribed))
      .catch(() => {})
  }, [])

  async function handleToggle(val) {
    setToggling(true)
    try {
      const r = await api.toggleNewsletter(val)
      setSubscribed(r.newsletter_subscribed)
      setToggleMsg(r.newsletter_subscribed ? 'Aangemeld voor nieuwsbrief.' : 'Afgemeld van nieuwsbrief.')
    } catch {
      setToggleMsg('Er ging iets mis.')
    }
    setToggling(false)
    setTimeout(() => setToggleMsg(null), 3000)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', marginBottom: 32 }}>Account</h1>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 36, background: '#1d1d1f',
          color: '#fff', fontSize: 24, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{initials(user?.name || user?.email)}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>{user?.name || 'Gebruiker'}</div>
          <div style={{ fontSize: 14, color: '#6e6e73', marginTop: 2 }}>{user?.email}</div>
        </div>
      </div>

      <SettingGroup label="Gegevens">
        <InfoRow label="Naam"        value={user?.name  || '—'} />
        <InfoRow label="E-mailadres" value={user?.email || '—'} noBorder />
      </SettingGroup>

      <SettingGroup label="Beveiliging">
        <InfoRow label="Wachtwoord" value="••••••••" noBorder />
      </SettingGroup>

      <SettingGroup label="Communicatie">
        <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, color: '#1d1d1f', marginBottom: 2 }}>Nieuwsbrief</div>
            <div style={{ fontSize: 13, color: '#6e6e73' }}>
              Ontvang updates en nieuws van MIXMATE per e-mail
            </div>
            {toggleMsg && (
              <div style={{ fontSize: 12, color: '#34c759', marginTop: 4, fontWeight: 600 }}>{toggleMsg}</div>
            )}
          </div>
          <Toggle
            checked={!!subscribed}
            onChange={handleToggle}
            disabled={toggling || subscribed === null}
          />
        </div>
      </SettingGroup>

      <SettingGroup>
        <button onClick={onLogout} style={{
          width: '100%', padding: '14px 16px', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 15, fontWeight: 500, color: '#ff3b30',
          fontFamily: 'inherit', textAlign: 'left',
        }}>
          Uitloggen
        </button>
      </SettingGroup>
    </div>
  )
}
