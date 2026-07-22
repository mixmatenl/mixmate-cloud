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

const inp = {
  width: '100%', border: '1px solid #e5e5ea', borderRadius: 10,
  padding: '11px 13px', fontSize: 15, fontFamily: 'inherit',
  outline: 'none', background: '#fff', color: '#1d1d1f', boxSizing: 'border-box',
}

export default function Account({ user, onLogout }) {
  const [subscribed, setSubscribed]   = useState(null)
  const [toggling, setToggling]       = useState(false)
  const [toggleMsg, setToggleMsg]     = useState(null)

  const [profile, setProfile]         = useState(null)
  const [saving, setSaving]           = useState(false)
  const [savedMsg, setSavedMsg]       = useState(null)

  useEffect(() => {
    api.accountMe()
      .then(r => {
        setSubscribed(r.newsletter_subscribed)
        setProfile({
          company:      r.company      || '',
          phone:        r.phone        || '',
          address_line1: r.address_line1 || '',
          postal_code:  r.postal_code  || '',
          city:         r.city         || '',
          country:      r.country      || 'Nederland',
        })
      })
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

  function setField(k, v) { setProfile(p => ({ ...p, [k]: v })) }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateProfile(profile)
      setSavedMsg('Opgeslagen')
      setTimeout(() => setSavedMsg(null), 2500)
    } catch {
      setSavedMsg('Er ging iets mis.')
    }
    setSaving(false)
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

      {/* Bedrijfsgegevens – bewerkbaar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: .3, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
          Bedrijfsgegevens
        </div>
        <div style={{ fontSize: 13, color: '#aeaeb2', marginBottom: 12, paddingLeft: 4 }}>
          Deze gegevens worden automatisch ingevuld bij het plaatsen van een bestelling.
        </div>
        {profile ? (
          <form onSubmit={saveProfile} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)', padding: '16px 16px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Bedrijfsnaam</div>
                  <input value={profile.company} onChange={e => setField('company', e.target.value)} placeholder="Bedrijfsnaam" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Telefoonnummer</div>
                  <input type="tel" value={profile.phone} onChange={e => setField('phone', e.target.value)} placeholder="+31 6 00000000" style={inp} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Afleveradres</div>
                <input value={profile.address_line1} onChange={e => setField('address_line1', e.target.value)} placeholder="Straatnaam en huisnummer" style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Postcode</div>
                  <input value={profile.postal_code} onChange={e => setField('postal_code', e.target.value)} placeholder="1234 AB" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Stad</div>
                  <input value={profile.city} onChange={e => setField('city', e.target.value)} placeholder="Amsterdam" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                <button type="submit" disabled={saving} style={{
                  background: savedMsg === 'Opgeslagen' ? '#34c759' : '#1d1d1f', color: '#fff',
                  border: 'none', borderRadius: 10, padding: '10px 20px',
                  fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: saving ? .7 : 1, transition: 'background .2s',
                }}>
                  {saving ? 'Opslaan…' : savedMsg === 'Opgeslagen' ? '✓ Opgeslagen' : 'Opslaan'}
                </button>
                {savedMsg && savedMsg !== 'Opgeslagen' && (
                  <span style={{ fontSize: 13, color: '#ff3b30' }}>{savedMsg}</span>
                )}
              </div>
            </div>
          </form>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
        )}
      </div>

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
