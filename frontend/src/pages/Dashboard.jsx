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

export default function Dashboard({ user, onLogout }) {
  const [machines,   setMachines]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting,   setDeleting]   = useState(false)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    try { setMachines(await api.getMachines()) }
    catch { onLogout() }
    finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await api.unpairMachine(confirmDel.machine_id)
      setMachines(prev => prev.filter(m => m.machine_id !== confirmDel.machine_id))
      setConfirmDel(null)
    } catch (err) { alert('Fout: ' + err.message) }
    finally { setDeleting(false) }
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>

        {/* Titel + knop */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>Mijn machines</h1>
            {!loading && machines.length > 0 && (
              <p style={{ fontSize: 14, color: '#6e6e73', margin: '4px 0 0' }}>{machines.length} {machines.length === 1 ? 'machine' : 'machines'} gekoppeld</p>
            )}
          </div>
          <button onClick={() => setShowWizard(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1d1d1f', color: '#fff', border: 'none',
            borderRadius: 20, padding: '10px 18px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Toevoegen
          </button>
        </div>

        {/* Skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: 20, height: 88, animation: 'pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* Lege staat */}
        {!loading && machines.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 24, padding: '60px 32px', textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24, background: '#f5f5f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Nog geen machine</h2>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 28px' }}>
              Koppel je MIXMATE machine om hem op afstand te beheren.
            </p>
            <button onClick={() => setShowWizard(true)} style={{
              background: '#1d1d1f', color: '#fff', border: 'none',
              borderRadius: 14, padding: '14px 28px', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}>
              Machine koppelen
            </button>
          </div>
        )}

        {/* Machine lijst */}
        {!loading && machines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {machines.map(m => (
              <div key={m.machine_id} style={{
                background: '#fff', borderRadius: 20,
                display: 'flex', alignItems: 'center',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              }}>
                <button onClick={() => navigate(`/machine/${m.machine_id}`)} style={{
                  flex: 1, padding: '20px 20px', display: 'flex', alignItems: 'center',
                  gap: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <MachineIcon model={m.model} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: '#6e6e73' }}>
                      {m.model || 'MIXMATE'}{m.version ? ` · v${m.version}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: 4,
                        background: m.online ? '#30d158' : '#c7c7cc',
                        boxShadow: m.online ? '0 0 0 3px rgba(48,209,88,.2)' : 'none',
                      }} />
                      <span style={{ fontSize: 12, color: m.online ? '#30d158' : '#c7c7cc', fontWeight: 500 }}>
                        {m.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </button>
                <button onClick={() => setConfirmDel(m)} style={{
                  padding: '20px 18px', background: 'none', border: 'none',
                  borderLeft: '1px solid #f5f5f7', cursor: 'pointer', color: '#c7c7cc',
                  transition: 'color .15s',
                }} onMouseEnter={e => e.currentTarget.style.color='#ff3b30'}
                   onMouseLeave={e => e.currentTarget.style.color='#c7c7cc'}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wizard */}
      {showWizard && (
        <PairWizard
          onClose={() => setShowWizard(false)}
          onPaired={m => { setMachines(prev => [...prev, m]); navigate(`/machine/${m.machine_id}`) }}
        />
      )}

      {/* Verwijder bevestiging */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, maxWidth: 360, width: '100%' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#fff1f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Machine verwijderen?</h2>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: 24 }}>
              <strong style={{ color: '#1d1d1f' }}>{confirmDel.name}</strong> wordt losgekoppeld van je account. De machine blijft gewoon werken maar moet opnieuw gekoppeld worden.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting} style={{
                background: '#ff3b30', color: '#fff', border: 'none', borderRadius: 14,
                padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: deleting ? .5 : 1,
              }}>{deleting ? 'Verwijderen…' : 'Verwijderen'}</button>
              <button onClick={() => setConfirmDel(null)} style={{
                background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 14,
                padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>Annuleren</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  )
}
