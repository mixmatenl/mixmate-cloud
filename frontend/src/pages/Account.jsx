import React from 'react'

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

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Account({ user, onLogout }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
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
        <InfoRow label="Naam" value={user?.name || '—'} />
        <InfoRow label="E-mailadres" value={user?.email || '—'} noBorder />
      </SettingGroup>

      <SettingGroup label="Beveiliging">
        <InfoRow label="Wachtwoord" value="••••••••" noBorder />
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
