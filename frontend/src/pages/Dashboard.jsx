import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function MachineIcon({ model }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 14, background: '#f5f5f7',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
        <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </div>
  )
}

// Stap-voor-stap koppelwizard
function PairWizard({ onClose, onPaired }) {
  const [step,    setStep]    = useState(1)   // 1=uitleg  2=code  3=succes
  const [code,    setCode]    = useState(['','','','','',''])
  const [pairing, setPairing] = useState(false)
  const [err,     setErr]     = useState(null)
  const [machine, setMachine] = useState(null)
  const inputs = useRef([])

  function handleDigit(i, val) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = v
    setCode(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setCode(text.split(''))
      inputs.current[5]?.focus()
    }
  }

  async function submit() {
    const full = code.join('')
    if (full.length !== 6) return
    setPairing(true); setErr(null)
    try {
      const m = await api.pairMachine(full)
      setMachine(m)
      setStep(3)
    } catch (e) {
      setErr(e.message)
    } finally {
      setPairing(false)
    }
  }

  function done() {
    onPaired(machine)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && step !== 3 && onClose()}>
      <div style={{
        background: '#fff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480,
        padding: '32px 32px 48px',
        animation: 'slideUp .3s cubic-bezier(.32,1.1,.7,1)',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: '#e5e5ea', borderRadius: 2, margin: '0 auto 28px' }} />

        {step === 1 && <>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, background: '#f5f5f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/>
                <path d="M17 17h3v3h-3z"/><path d="M14 20h3"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 10 }}>Machine koppelen</h2>
            <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
              Zorg dat je machine aanstaat en verbonden is met internet.
            </p>
          </div>

          <div style={{ background: '#f5f5f7', borderRadius: 16, padding: '20px 24px', marginBottom: 28 }}>
            {[
              ['1', 'Open Instellingen op de machine'],
              ['2', 'Tik op Cloud koppeling'],
              ['3', 'De koppelcode verschijnt op het scherm'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: n !== '3' ? '1px solid #e5e5ea' : 'none' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14, background: '#1d1d1f',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{n}</div>
                <span style={{ fontSize: 14, color: '#1d1d1f' }}>{t}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setStep(2)} style={{
            width: '100%', background: '#1d1d1f', color: '#fff',
            border: 'none', borderRadius: 14, padding: '16px', fontSize: 16,
            fontWeight: 600, cursor: 'pointer',
          }}>
            Code invoeren
          </button>
          <button onClick={onClose} style={{
            width: '100%', background: 'none', border: 'none',
            color: '#6e6e73', fontSize: 15, marginTop: 12, cursor: 'pointer', padding: 8,
          }}>Annuleren</button>
        </>}

        {step === 2 && <>
          <button onClick={() => setStep(1)} style={{
            background: 'none', border: 'none', color: '#007aff',
            fontSize: 15, cursor: 'pointer', padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Terug
          </button>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Voer de code in</h2>
            <p style={{ fontSize: 14, color: '#6e6e73' }}>De 6-cijferige code staat op het scherm van je machine.</p>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12 }} onPaste={handlePaste}>
            {code.map((d, i) => (
              <input key={i}
                ref={el => inputs.current[i] = el}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                maxLength={1}
                inputMode="numeric"
                autoFocus={i === 0}
                style={{
                  width: 52, height: 64, textAlign: 'center',
                  fontSize: 28, fontWeight: 700, fontFamily: 'monospace',
                  border: `2px solid ${d ? '#1d1d1f' : '#e5e5ea'}`,
                  borderRadius: 12, outline: 'none',
                  color: '#1d1d1f', background: d ? '#f5f5f7' : '#fff',
                  transition: 'border-color .15s, background .15s',
                }}
              />
            ))}
          </div>

          {err && <p style={{ color: '#ff3b30', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{err}</p>}

          <button
            onClick={submit}
            disabled={pairing || code.join('').length !== 6}
            style={{
              width: '100%', background: '#1d1d1f', color: '#fff',
              border: 'none', borderRadius: 14, padding: '16px', fontSize: 16,
              fontWeight: 600, cursor: 'pointer', marginTop: 8,
              opacity: (pairing || code.join('').length !== 6) ? .4 : 1,
              transition: 'opacity .15s',
            }}
          >
            {pairing ? 'Koppelen…' : 'Koppelen'}
          </button>
        </>}

        {step === 3 && <>
          <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: '#f0fdf4', border: '2px solid #bbf7d0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'popIn .4s cubic-bezier(.32,1.4,.7,1)',
            }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Gekoppeld</h2>
            <p style={{ fontSize: 15, color: '#6e6e73', marginBottom: 8 }}>
              <strong style={{ color: '#1d1d1f' }}>{machine?.name || 'Je machine'}</strong> is succesvol toegevoegd aan je account.
            </p>
            {machine?.model && (
              <span style={{
                display: 'inline-block', background: '#f5f5f7', color: '#6e6e73',
                fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                letterSpacing: .3, marginBottom: 32,
              }}>{machine.model}</span>
            )}
            <button onClick={done} style={{
              width: '100%', background: '#1d1d1f', color: '#fff',
              border: 'none', borderRadius: 14, padding: '16px', fontSize: 16,
              fontWeight: 600, cursor: 'pointer', display: 'block',
            }}>
              Ga naar machine
            </button>
          </div>
        </>}
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes popIn   { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  )
}

const CACHE_KEY = 'mm_machines_cache'

export default function Dashboard({ user, onLogout }) {
  const [machines,   setMachines]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') } catch { return [] }
  })
  const [loading,    setLoading]    = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.getMachines()
      setMachines(data)
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    }
    catch (err) {
      // Alleen uitloggen bij een verlopen/ongeldige sessie, niet bij server- of netwerkfouten
      if (err.status === 401 || err.message === 'Niet geautoriseerd' || err.message === 'Ongeldige token') {
        onLogout()
      }
      // Anders: toon gecachte data als die er is
    }
    finally { setLoading(false) }
  }

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px' }}>

        {/* Titel + knop */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111110', margin: 0, letterSpacing: '-0.03em' }}>Machines</h1>
            {!loading && machines.length > 0 && (
              <p style={{ fontSize: 13, color: '#9B9B9B', margin: '3px 0 0', fontWeight: 400 }}>{machines.length} {machines.length === 1 ? 'machine' : 'machines'} gekoppeld</p>
            )}
          </div>
          <button onClick={() => setShowWizard(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#111110', color: '#fff', border: 'none',
            borderRadius: 8, padding: '8px 14px', fontSize: 13,
            fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.01em',
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Machine koppelen
          </button>
        </div>

        {/* Lege staat — onboarding */}
        {!loading && machines.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '52px 32px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F5F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A0A09A" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#111110', marginBottom: 6, letterSpacing: '-0.02em' }}>Koppel je eerste machine</h2>
            <p style={{ fontSize: 13, color: '#9B9B9B', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 28px' }}>
              Beheer je MIXMATE op afstand — recepten, flushing en realtime status.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
              {[
                { n: '1', label: 'Schakel machine in' },
                { n: '2', label: 'Klik op koppelen' },
                { n: '3', label: 'Vul serienummer in' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111110', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{step.n}</div>
                    <div style={{ fontSize: 11.5, color: '#9B9B9B', lineHeight: 1.4, textAlign: 'center' }}>{step.label}</div>
                  </div>
                  {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(0,0,0,0.08)', flexShrink: 0, marginBottom: 22 }} />}
                </div>
              ))}
            </div>

            <button onClick={() => setShowWizard(true)} style={{
              background: '#111110', color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 20px', fontSize: 13,
              fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.01em',
            }}>
              Machine koppelen
            </button>
          </div>
        )}

        {/* Machine lijst */}
        {machines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {machines.map((m, idx) => (
              <button key={m.machine_id} onClick={() => navigate(`/machine/${m.machine_id}`)} style={{
                background: 'transparent', width: '100%',
                padding: '14px 18px', display: 'flex', alignItems: 'center',
                gap: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: idx < machines.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <MachineIcon model={m.model} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111110', letterSpacing: '-0.01em' }}>{m.name}</span>
                    {m.flush_overdue && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#b45309', background: '#fef3c7', borderRadius: 5, padding: '1px 6px', flexShrink: 0, letterSpacing: '0.01em' }}>
                        Spoelen
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#A0A09A' }}>
                    {m.model || 'MIXMATE'}{m.version ? ` · v${m.version}` : ''}
                    {m.days_since_flush !== null && m.days_since_flush !== undefined
                      ? ` · ${m.days_since_flush === 0 ? 'Vandaag gespoeld' : m.days_since_flush === 1 ? 'Gisteren gespoeld' : `${m.days_since_flush}d geleden gespoeld`}`
                      : ' · Nog nooit gespoeld'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: m.online ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.04)', borderRadius: 20, padding: '3px 9px' }}>
                    <div style={{ position: 'relative', width: 6, height: 6, flexShrink: 0 }}>
                      {m.online && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', opacity: 0.3, animation: 'pulse 2s infinite' }} />}
                      <div style={{ position: 'absolute', inset: '1px', borderRadius: '50%', background: m.online ? '#22c55e' : '#D0CFC9' }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: m.online ? '#16a34a' : '#A0A09A', fontWeight: 500 }}>
                      {m.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D0CFC9" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Skeleton */}
        {loading && machines.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {[1,2].map((i, idx) => (
              <div key={i} style={{ height: 68, background: 'linear-gradient(90deg,#f5f4f1 25%,#eeede9 50%,#f5f4f1 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', borderBottom: idx === 0 ? '1px solid rgba(0,0,0,0.05)' : 'none' }} />
            ))}
          </div>
        )}
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.8}}`}</style>
      </div>

      {/* Wizard */}
      {showWizard && (
        <PairWizard
          onClose={() => setShowWizard(false)}
          onPaired={m => { setMachines(prev => [...prev, m]); navigate(`/machine/${m.machine_id}`) }}
        />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  )
}
