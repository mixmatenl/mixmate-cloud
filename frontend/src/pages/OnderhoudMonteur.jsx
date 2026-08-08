import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'

// ── Proxy helper ──────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || ''

async function proxy(token, method, path, body) {
  const res = await fetch(`${BASE}/api/maintenance/${token}/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, body }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Fout')
  }
  return res.json()
}

// ── UI primitieven ────────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: '1px solid rgba(0,0,0,0.08)',
      padding: '20px 24px', ...style,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>{children}</div>
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f2f2f7' }}>
      <span style={{ fontSize: 14, color: '#3c3c43' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', fontFamily: mono ? 'monospace' : 'inherit' }}>{value ?? '—'}</span>
    </div>
  )
}

function Btn({ children, onClick, danger, disabled, loading, small }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      padding: small ? '7px 14px' : '10px 18px',
      borderRadius: 10, border: danger ? '1px solid rgba(255,59,48,0.25)' : 'none',
      background: danger ? 'rgba(255,59,48,0.07)' : '#1d1d1f',
      color: danger ? '#ff3b30' : '#fff',
      fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled || loading ? 'default' : 'pointer',
      opacity: disabled || loading ? 0.5 : 1,
    }}>
      {loading ? 'Bezig…' : children}
    </button>
  )
}

function Alert({ msg, ok }) {
  if (!msg) return null
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, fontSize: 13, marginTop: 12,
      background: ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
      border: `1px solid ${ok ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)'}`,
      color: ok ? '#34c759' : '#ff3b30',
    }}>
      {msg}
    </div>
  )
}

// ── Tab: Machine info ─────────────────────────────────────────────────────────

function TabMachine({ token }) {
  const [info, setInfo] = useState(null)
  const [model, setModel] = useState(null)

  useEffect(() => {
    proxy(token, 'GET', '/api/system/info').then(setInfo).catch(() => {})
    proxy(token, 'GET', '/api/system/machine').then(setModel).catch(() => {})
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle>Systeeminformatie</SectionTitle>
        <Row label="Versie"       value={info?.version} mono />
        <Row label="Hostnaam"     value={info?.hostname} />
        <Row label="IP-adres"     value={info?.ip} mono />
        <Row label="Opstarttijd"  value={info?.uptime} />
        <Row label="CPU temp."    value={info?.cpu_temp ? `${info.cpu_temp}°C` : null} />
        <Row label="Geheugen"     value={info?.memory} />
        <Row label="Schijfruimte" value={info?.disk} />
      </Card>
      {model && (
        <Card>
          <SectionTitle>Machinemodel</SectionTitle>
          <Row label="Model"      value={model.model} />
          <Row label="CO₂"        value={model.has_co2 ? 'Ja' : 'Nee'} />
          <Row label="Kleppen"    value={model.has_valves ? 'Ja' : 'Nee'} />
        </Card>
      )}
    </div>
  )
}

// ── Tab: GPIO Pompen ──────────────────────────────────────────────────────────

function TabPompen({ token }) {
  const [pumps,       setPumps]       = useState([])
  const [ingredients, setIngredients] = useState([])
  const [saving,      setSaving]      = useState(null)
  const [msg,         setMsg]         = useState(null)

  useEffect(() => {
    proxy(token, 'GET', '/api/pumps').then(d => setPumps(Array.isArray(d) ? d : [])).catch(() => {})
    proxy(token, 'GET', '/api/ingredients').then(d => setIngredients(Array.isArray(d) ? d : [])).catch(() => {})
  }, [token])

  async function save(pump) {
    setSaving(pump.id); setMsg(null)
    try {
      await proxy(token, 'PATCH', `/api/pumps/${pump.id}`, {
        gpio_pin: pump.gpio_pin,
        ingredient_id: pump.ingredient_id,
        flow_rate_ml_per_s: pump.flow_rate_ml_per_s,
      })
      setMsg({ ok: true, text: `Pomp ${pump.number} opgeslagen` })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setSaving(null)
  }

  function update(id, field, val) {
    setPumps(p => p.map(x => x.id === id ? { ...x, [field]: val } : x))
  }

  const inp = {
    padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
    fontSize: 13, width: '100%', boxSizing: 'border-box',
  }

  return (
    <div>
      <Alert msg={msg?.text} ok={msg?.ok} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {pumps.map(pump => (
          <Card key={pump.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>Pomp {pump.number}</span>
              <Btn small onClick={() => save(pump)} loading={saving === pump.id}>Opslaan</Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>GPIO PIN</div>
                <input style={inp} type="number" value={pump.gpio_pin ?? ''} onChange={e => update(pump.id, 'gpio_pin', +e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>Flow (ml/s)</div>
                <input style={inp} type="number" step="0.1" value={pump.flow_rate_ml_per_s ?? ''} onChange={e => update(pump.id, 'flow_rate_ml_per_s', +e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>Ingrediënt</div>
                <select style={{ ...inp }} value={pump.ingredient_id ?? ''} onChange={e => update(pump.id, 'ingredient_id', e.target.value ? +e.target.value : null)}>
                  <option value="">Geen</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            </div>
          </Card>
        ))}
        {pumps.length === 0 && <div style={{ color: '#aeaeb2', fontSize: 14 }}>Geen pompen gevonden.</div>}
      </div>
    </div>
  )
}

// ── Tab: Weegschaal ───────────────────────────────────────────────────────────

function TabWeegschaal({ token }) {
  const [pins,    setPins]    = useState(null)
  const [weight,  setWeight]  = useState(null)
  const [scale,   setScale]   = useState('')
  const [known,   setKnown]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [msg,     setMsg]     = useState(null)

  useEffect(() => {
    proxy(token, 'GET', '/api/system/loadcell-pins').then(setPins).catch(() => {})
    proxy(token, 'GET', '/api/weight/scale-factor').then(d => setScale(d.scale_factor ?? '')).catch(() => {})
    pollWeight()
  }, [token])

  async function pollWeight() {
    try {
      const d = await proxy(token, 'GET', '/api/weight')
      setWeight(d.weight_g)
    } catch {}
  }

  async function tare() {
    setBusy(true); setMsg(null)
    try {
      await proxy(token, 'POST', '/api/weight/tare')
      setMsg({ ok: true, text: 'Tara ingesteld' })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  async function calibrate() {
    if (!known || isNaN(+known)) { setMsg({ ok: false, text: 'Voer een geldig gewicht in' }); return }
    setBusy(true); setMsg(null)
    try {
      const d = await proxy(token, 'POST', '/api/weight/calibrate', { known_weight_g: +known })
      setScale(d.scale_factor)
      setMsg({ ok: true, text: `Gekalibreerd — schaalfactor: ${d.scale_factor?.toFixed(2)}` })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  async function savePins() {
    if (!pins) return
    setBusy(true); setMsg(null)
    try {
      await proxy(token, 'POST', '/api/system/loadcell-pins', { dout_pin: +pins.dout_pin, sck_pin: +pins.sck_pin })
      setMsg({ ok: true, text: 'Pinnen opgeslagen' })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  const inp = { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle>Huidig gewicht</SectionTitle>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#1d1d1f', letterSpacing: -1, marginBottom: 16 }}>
          {weight != null ? `${weight.toFixed(1)} g` : '—'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={pollWeight}>Verversen</Btn>
          <Btn onClick={tare} loading={busy}>Tara</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle>Kalibratie</SectionTitle>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#8e8e93', marginBottom: 4 }}>Huidig schaalfactor: <strong>{scale || '—'}</strong></div>
          <div style={{ fontSize: 12, color: '#aeaeb2', marginBottom: 12 }}>Leg een bekend gewicht op de weegschaal en voer het in:</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input style={inp} type="number" placeholder="Gewicht in gram" value={known} onChange={e => setKnown(e.target.value)} />
            <Btn onClick={calibrate} loading={busy} disabled={!known}>Kalibreren</Btn>
          </div>
        </div>
        <Alert msg={msg?.text} ok={msg?.ok} />
      </Card>

      {pins && (
        <Card>
          <SectionTitle>GPIO Pinnen</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>DOUT pin</div>
              <input style={inp} type="number" value={pins.dout_pin ?? ''} onChange={e => setPins(p => ({ ...p, dout_pin: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 4 }}>SCK pin</div>
              <input style={inp} type="number" value={pins.sck_pin ?? ''} onChange={e => setPins(p => ({ ...p, sck_pin: e.target.value }))} />
            </div>
          </div>
          <Btn onClick={savePins} loading={busy}>Opslaan</Btn>
        </Card>
      )}
    </div>
  )
}

// ── Tab: Geschiedenis ─────────────────────────────────────────────────────────

function TabGeschiedenis({ token }) {
  const [stats,  setStats]  = useState(null)
  const [pours,  setPours]  = useState([])

  useEffect(() => {
    proxy(token, 'GET', '/api/pours/stats').then(setStats).catch(() => {})
    proxy(token, 'GET', '/api/pours?limit=50').then(d => setPours(Array.isArray(d) ? d : [])).catch(() => {})
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Totaal gietingen', value: stats.total_pours },
            { label: 'Vandaag',          value: stats.today_pours },
            { label: 'Meest populair',   value: stats.top_recipe || '—' },
          ].map(s => (
            <Card key={s.label} style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1d1d1f', letterSpacing: -0.5 }}>{s.value ?? '—'}</div>
              <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}
      <Card>
        <SectionTitle>Laatste gietingen</SectionTitle>
        {pours.length === 0 && <div style={{ color: '#aeaeb2', fontSize: 14 }}>Geen gietingen gevonden.</div>}
        {pours.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f2f2f7', fontSize: 14 }}>
            <span style={{ color: '#1d1d1f', fontWeight: 500 }}>{p.recipe_name || 'Onbekend'}</span>
            <span style={{ color: '#8e8e93' }}>{p.created_at ? new Date(p.created_at).toLocaleString('nl-NL') : '—'}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── Tab: Updates ──────────────────────────────────────────────────────────────

function TabUpdates({ token }) {
  const [info,    setInfo]    = useState(null)
  const [update,  setUpdate]  = useState(null)
  const [busy,    setBusy]    = useState(false)
  const [msg,     setMsg]     = useState(null)

  useEffect(() => {
    proxy(token, 'GET', '/api/system/version').then(setInfo).catch(() => {})
  }, [token])

  async function checkUpdates() {
    setBusy(true); setMsg(null)
    try {
      const d = await proxy(token, 'GET', '/api/system/check-updates')
      setUpdate(d)
      if (!d.update_available) setMsg({ ok: true, text: 'Machine heeft de nieuwste versie.' })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  async function doUpdate() {
    if (!confirm('Software-update starten? De machine herstart automatisch.')) return
    setBusy(true); setMsg(null)
    try {
      await proxy(token, 'POST', '/api/system/update')
      setMsg({ ok: true, text: 'Update gestart — machine herstart zo meteen.' })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle>Versie-informatie</SectionTitle>
        <Row label="Huidige versie" value={info?.version} mono />
        <Row label="Branch"         value={info?.branch} mono />
        <Row label="Commit"         value={info?.commit?.slice(0, 7)} mono />
      </Card>
      <Card>
        <SectionTitle>Software-update</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Btn onClick={checkUpdates} loading={busy}>Controleren op updates</Btn>
          {update?.update_available && <Btn onClick={doUpdate} loading={busy}>Update installeren</Btn>}
        </div>
        {update?.update_available && (
          <div style={{ fontSize: 13, color: '#ff9f0a', padding: '8px 12px', background: 'rgba(255,159,10,0.08)', borderRadius: 8, border: '1px solid rgba(255,159,10,0.2)' }}>
            Nieuwe versie beschikbaar: <strong>{update.latest_version}</strong>
          </div>
        )}
        <Alert msg={msg?.text} ok={msg?.ok} />
      </Card>
    </div>
  )
}

// ── Tab: Systeem ──────────────────────────────────────────────────────────────

function TabSysteem({ token }) {
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState(null)

  async function act(label, path) {
    if (!confirm(`${label}?`)) return
    setBusy(true); setMsg(null)
    try {
      await proxy(token, 'POST', path)
      setMsg({ ok: true, text: `${label} gestart.` })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <SectionTitle>Machine acties</SectionTitle>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => act('Machine herstarten', '/api/system/restart')} loading={busy}>Herstarten</Btn>
          <Btn onClick={() => act('Machine uitschakelen', '/api/system/shutdown')} loading={busy} danger>Uitschakelen</Btn>
        </div>
        <Alert msg={msg?.text} ok={msg?.ok} />
      </Card>
      <Card>
        <SectionTitle>PIN beheer</SectionTitle>
        <PinBeheer token={token} />
      </Card>
    </div>
  )
}

function PinBeheer({ token }) {
  const [bartPin, setBartPin]   = useState('')
  const [adminOld, setAdminOld] = useState('')
  const [adminNew, setAdminNew] = useState('')
  const [busy, setBusy]         = useState(false)
  const [msg,  setMsg]          = useState(null)

  const inp = { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', fontSize: 14, width: '100%', boxSizing: 'border-box' }

  async function saveBart() {
    setBusy(true); setMsg(null)
    try {
      await proxy(token, 'POST', '/api/auth/set-pin', { admin_pin: '0502', new_pin: bartPin })
      setMsg({ ok: true, text: 'Bartender PIN opgeslagen' }); setBartPin('')
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  async function removeBart() {
    if (!confirm('Bartender PIN verwijderen?')) return
    setBusy(true); setMsg(null)
    try {
      await proxy(token, 'POST', '/api/auth/set-pin', { admin_pin: '0502', new_pin: '' })
      setMsg({ ok: true, text: 'Bartender PIN verwijderd' })
    } catch (e) { setMsg({ ok: false, text: e.message }) }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#8e8e93', marginBottom: 8 }}>Bartender PIN instellen</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inp, fontFamily: 'monospace', letterSpacing: 4 }} type="password" inputMode="numeric" maxLength={8} placeholder="Nieuwe PIN" value={bartPin} onChange={e => setBartPin(e.target.value.replace(/\D/g, ''))} />
          <Btn onClick={saveBart} loading={busy} disabled={!bartPin}>Opslaan</Btn>
          <Btn onClick={removeBart} loading={busy} danger>Verwijderen</Btn>
        </div>
      </div>
      <Alert msg={msg?.text} ok={msg?.ok} />
    </div>
  )
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'machine',      label: 'Machine info' },
  { id: 'pompen',       label: 'GPIO Pompen' },
  { id: 'weegschaal',   label: 'Weegschaal' },
  { id: 'geschiedenis', label: 'Geschiedenis' },
  { id: 'updates',      label: 'Updates' },
  { id: 'systeem',      label: 'Systeem & PIN' },
]

export default function OnderhoudMonteur() {
  const { token } = useParams()
  const [status, setStatus] = useState(null)
  const [error,  setError]  = useState(null)
  const [tab,    setTab]    = useState('machine')

  useEffect(() => {
    fetch(`${BASE}/api/maintenance/${token}/status`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.detail)))
      .then(setStatus)
      .catch(e => setError(typeof e === 'string' ? e : 'Ongeldige of verlopen QR-code'))
  }, [token])

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Sessie verlopen</div>
        <div style={{ fontSize: 14, color: '#8e8e93', lineHeight: 1.6 }}>{error}<br />Vraag een nieuwe QR-code aan via het portaal.</div>
      </div>
    </div>
  )

  if (!status) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ color: '#8e8e93', fontSize: 14 }}>Verbinden…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ padding: '16px 0 0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              MIXMATE Onderhoud
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>{status.machine_name}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: status.online ? 'rgba(52,199,89,0.1)' : 'rgba(0,0,0,0.05)',
                color: status.online ? '#34c759' : '#8e8e93',
                border: `1px solid ${status.online ? 'rgba(52,199,89,0.25)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                {status.online ? 'Online' : 'Offline'}
              </span>
              {status.customer_name && (
                <span style={{ fontSize: 13, color: '#8e8e93' }}>— {status.customer_name}</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? '#1d1d1f' : '#8e8e93',
                borderBottom: `2px solid ${tab === t.id ? '#1d1d1f' : 'transparent'}`,
                whiteSpace: 'nowrap', transition: 'color .15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inhoud */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 48px' }}>
        {!status.online && (
          <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)', fontSize: 13, color: '#ff9f0a' }}>
            ⚠️ Machine is offline. Commando's kunnen niet worden uitgevoerd.
          </div>
        )}
        {tab === 'machine'      && <TabMachine      token={token} />}
        {tab === 'pompen'       && <TabPompen        token={token} />}
        {tab === 'weegschaal'   && <TabWeegschaal    token={token} />}
        {tab === 'geschiedenis' && <TabGeschiedenis  token={token} />}
        {tab === 'updates'      && <TabUpdates       token={token} />}
        {tab === 'systeem'      && <TabSysteem       token={token} />}
      </div>
    </div>
  )
}
