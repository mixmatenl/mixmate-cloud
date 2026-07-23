import React, { useEffect, useRef, useState } from 'react'

const POLL_INTERVAL = 5000

export default function MachineApp() {
  const [machines, setMachines]       = useState([])
  const [connected, setConnected]     = useState(null)  // { name, url }
  const [certWarning, setCertWarning] = useState(false)
  const [loading, setLoading]         = useState(true)
  const iframeRef = useRef(null)
  const pollRef   = useRef(null)

  function fetchMachines() {
    fetch('/api/machineapp/machines')
      .then(r => r.json())
      .then(data => { setMachines(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchMachines()
    pollRef.current = setInterval(fetchMachines, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [])

  function connect(machine) {
    setConnected(machine)
    setCertWarning(false)
  }

  function disconnect() {
    setConnected(null)
    setCertWarning(false)
  }

  function handleIframeError() {
    setCertWarning(true)
  }

  if (connected) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column' }}>
        {/* Topbalk */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#111', borderBottom: '1px solid #222',
          flexShrink: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158' }} />
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{connected.name}</span>
            <span style={{ color: '#555', fontSize: 12 }}>{connected.local_ip}</span>
          </div>
          <button
            onClick={disconnect}
            style={{ color: '#ff453a', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Verbreken
          </button>
        </div>

        {certWarning ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20, background: '#0a0a0a' }}>
            <div style={{ fontSize: 48 }}>🔒</div>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, textAlign: 'center' }}>Certificaat accepteren</h2>
            <p style={{ color: '#888', fontSize: 15, textAlign: 'center', maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
              De machine gebruikt een zelfondertekend certificaat. Open de machine eerst direct zodat je het kunt accepteren.
            </p>
            <a
              href={connected.url}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '14px 28px', background: '#fff', color: '#000',
                borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: 'none',
              }}
            >
              Certificaat accepteren →
            </a>
            <button
              onClick={() => { setCertWarning(false) }}
              style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
            >
              Probeer opnieuw
            </button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={connected.url}
            style={{ flex: 1, border: 'none', width: '100%' }}
            title={connected.name}
            onError={handleIframeError}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: '#1c1c1e',
            border: '1px solid #2c2c2e', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 20,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/>
            </svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.5 }}>
            MIXMATE Machine
          </h1>
          <p style={{ color: '#555', fontSize: 15, margin: 0 }}>
            Verbind met een machine in de buurt
          </p>
        </div>

        {/* Machines lijst */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#444', fontSize: 14, padding: 40 }}>
            Zoeken naar machines…
          </div>
        ) : machines.length === 0 ? (
          <div style={{
            background: '#111', border: '1px solid #222', borderRadius: 20,
            padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
            <p style={{ color: '#fff', fontWeight: 600, fontSize: 17, margin: '0 0 8px' }}>
              Geen machines gevonden
            </p>
            <p style={{ color: '#555', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Zorg dat de machine aan staat en verbonden is met hetzelfde netwerk.
            </p>
            <button
              onClick={fetchMachines}
              style={{
                marginTop: 24, padding: '12px 24px', background: '#1c1c1e',
                border: '1px solid #333', borderRadius: 12, color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Opnieuw zoeken
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {machines.map(m => (
              <button
                key={m.machine_id}
                onClick={() => connect(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: '#111', border: '1px solid #222',
                  borderRadius: 20, padding: '18px 20px',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#444'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#222'}
              >
                {/* Icoon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: '#1c1c1e',
                  border: '1px solid #2c2c2e', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/>
                  </svg>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                    {m.name}
                  </div>
                  <div style={{ color: '#555', fontSize: 13 }}>
                    {m.local_ip} · poort {m.local_port}
                  </div>
                </div>

                {/* Status dot + pijl */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#30d158' }} />
                    <span style={{ color: '#30d158', fontSize: 12, fontWeight: 600 }}>Online</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}

        <p style={{ color: '#333', fontSize: 12, textAlign: 'center', marginTop: 32 }}>
          Machines worden automatisch bijgewerkt
        </p>
      </div>
    </div>
  )
}
