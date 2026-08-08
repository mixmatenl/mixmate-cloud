import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import QRCode from 'qrcode'

// ── QR canvas ─────────────────────────────────────────────────────────────────

function QRCanvas({ url }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !url) return
    QRCode.toCanvas(ref.current, url, {
      width: 220,
      margin: 2,
      color: { dark: '#1d1d1f', light: '#ffffff' },
    })
  }, [url])
  return <canvas ref={ref} style={{ borderRadius: 12, display: 'block' }} />
}

// ── Tijdlijn ──────────────────────────────────────────────────────────────────

function ExpiryBadge({ expiresHours }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)',
      fontSize: 12, fontWeight: 600, color: '#34c759',
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34c759' }} />
      Geldig {expiresHours} uur
    </div>
  )
}

// ── Machine kaart ─────────────────────────────────────────────────────────────

function MachineCard({ machine }) {
  const [session,  setSession]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState(false)

  async function generateQR() {
    setLoading(true)
    try {
      const s = await api.adminRaw('POST', `/api/admin/machines/${machine.machine_id}/maintenance-token`)
      setSession(s)
    } catch (e) {
      alert(e.message)
    }
    setLoading(false)
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(session.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const s = {
    card: {
      background: '#fff', borderRadius: 16,
      border: '1px solid rgba(0,0,0,0.08)',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 16,
    },
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 12, fontWeight: 600, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.4 },
    name: { fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 },
    onlineDot: {
      width: 7, height: 7, borderRadius: '50%',
      background: machine.online ? '#34c759' : '#d1d1d6',
      display: 'inline-block', marginRight: 5,
    },
    onlineText: { fontSize: 12, color: machine.online ? '#34c759' : '#aeaeb2', fontWeight: 500 },
    btn: {
      padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
      cursor: loading ? 'wait' : 'pointer', border: 'none',
      background: '#1d1d1f', color: '#fff',
      opacity: loading ? 0.6 : 1, transition: 'opacity .15s',
    },
  }

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.row}>
        <div>
          <div style={s.name}>{machine.name || machine.machine_id}</div>
          <div>
            <span style={s.onlineDot} />
            <span style={s.onlineText}>{machine.online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        {!session && (
          <button style={s.btn} onClick={generateQR} disabled={loading}>
            {loading ? 'Genereren…' : 'QR genereren'}
          </button>
        )}
        {session && (
          <ExpiryBadge expiresHours={session.expires_hours} />
        )}
      </div>

      {/* QR sectie */}
      {session && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ background: '#fff', padding: 8, borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
            <QRCanvas url={session.url} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ ...s.label, marginBottom: 6 }}>Instructies voor monteur</div>
              <ol style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#3c3c43', lineHeight: 2 }}>
                <li>Scan de QR-code met de camera van de tablet</li>
                <li>De onderhoudspagina opent direct in de browser</li>
                <li>Geen login nodig — de sessie verloopt na {session.expires_hours} uur</li>
                <li>Alle wijzigingen worden live naar de machine gestuurd</li>
              </ol>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={copyUrl}
                style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.1)', background: copied ? 'rgba(52,199,89,0.08)' : '#f5f5f7', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: copied ? '#34c759' : '#1d1d1f' }}
              >
                {copied ? '✓ Gekopieerd' : 'Link kopiëren'}
              </button>
              <button
                onClick={() => setSession(null)}
                style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.1)', background: '#f5f5f7', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#6e6e73' }}
              >
                Sluiten
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#aeaeb2', padding: '8px 12px', background: '#f9f9f9', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
              De QR-code geeft toegang tot alle onderhoudsfuncties van <strong>{machine.name || machine.machine_id}</strong>. Deel hem niet buiten het onderhoudsteam.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hoofdpagina ───────────────────────────────────────────────────────────────

export default function Onderhoud() {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const d = await api.adminSearchCustomers('')
      setCustomers(d.customers || [])
    } catch {}
    setLoading(false)
  }

  const allMachines = customers.flatMap(c =>
    (c.machines || []).map(m => ({ ...m, customer_name: c.name }))
  )
  const filtered = search.trim()
    ? allMachines.filter(m =>
        (m.name || m.machine_id).toLowerCase().includes(search.toLowerCase()) ||
        m.customer_name?.toLowerCase().includes(search.toLowerCase())
      )
    : allMachines

  const s = {
    page: { padding: '32px 40px', maxWidth: 900, margin: '0 auto' },
    h1: { fontSize: 24, fontWeight: 700, color: '#1d1d1f', marginBottom: 4, letterSpacing: -0.5 },
    sub: { fontSize: 14, color: '#8e8e93', marginBottom: 28, lineHeight: 1.5 },
    searchBox: {
      width: '100%', boxSizing: 'border-box',
      padding: '10px 14px', borderRadius: 10,
      border: '1px solid rgba(0,0,0,0.1)', fontSize: 14,
      marginBottom: 24, outline: 'none', color: '#1d1d1f',
      background: '#fff',
    },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  }

  if (loading) return (
    <div style={{ ...s.page, color: '#8e8e93', fontSize: 14 }}>Laden…</div>
  )

  return (
    <div style={s.page}>
      <div style={s.h1}>Onderhoudbeheer</div>
      <div style={s.sub}>
        Genereer een tijdelijke QR-code voor een monteur. Na het scannen krijgen zij toegang tot alle onderhoudsfuncties van die machine — rechtstreeks vanuit hun tablet.
      </div>

      <input
        style={s.searchBox}
        placeholder="Zoek op machinenaam of klantnaam…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 && (
        <div style={{ color: '#aeaeb2', fontSize: 14 }}>Geen machines gevonden.</div>
      )}

      <div style={s.grid}>
        {filtered.map(m => (
          <MachineCard key={m.machine_id} machine={m} />
        ))}
      </div>
    </div>
  )
}
