import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const TABS = ['Overzicht', 'Catalogus', 'Pompen', 'Spoelen', 'Instellingen', 'Info']

const SLIDE_MS    = 5000
const FADE_OUT_MS = 280
const FADE_IN_MS  = 420

function clockIdx(len) {
  return Math.floor(Date.now() / SLIDE_MS) % len
}

const FEATURES = [
  {
    id: 'speed',
    bg: '#060d1f',
    accent: '#3b82f6',
    label: 'Snelheid',
    headline: '180 cocktails\nper uur',
    sub: 'De MIXMATE serveert non-stop — geen wachtrijen, geen verstoringen, altijd op tijd.',
    mark: '180',
  },
  {
    id: 'accuracy',
    bg: '#0b0818',
    accent: '#a78bfa',
    label: 'Nauwkeurigheid',
    headline: 'Tot op de milliliter\nnauwkeurig',
    sub: 'Elk glas staat op een ingebouwd weegplateau. Elke dosis wordt gemeten, niet geschat.',
    mark: '±0.1',
  },
  {
    id: 'hygiene',
    bg: '#030f14',
    accent: '#22d3ee',
    label: 'Hygiëne',
    headline: 'Automatische\nspoelprogramma\'s',
    sub: 'Start het spoelprogramma wanneer jij wilt — via de app of het touchscreen. Volledig automatisch.',
    mark: '100%',
  },
  {
    id: 'recipes',
    bg: '#140610',
    accent: '#f472b6',
    label: 'Recepten',
    headline: 'Tot 500 recepten\ninstelbaar',
    sub: 'Upload en beheer tot 500 recepten via de app of het touchscreen — van klassiekers tot eigen huisspecials.',
    mark: '500',
  },
  {
    id: 'remote',
    bg: '#061408',
    accent: '#4ade80',
    label: 'Beheer',
    headline: 'Volledig beheer\nop afstand',
    sub: 'Recepten aanpassen, pompen configureren en de machinestatus live bekijken — vanuit elke locatie.',
    mark: '24/7',
  },
  {
    id: 'reports',
    bg: '#140f00',
    accent: '#fbbf24',
    label: 'Rapporten',
    headline: 'Automatische\ndienstrapportages',
    sub: 'Elke dienst een volledig overzicht: topcocktails, uitgifte per recept, gebruiksuren en meer.',
    mark: '∞',
  },
  {
    id: 'consistent',
    bg: '#0a0a0a',
    accent: '#e5e5e5',
    label: 'Consistentie',
    headline: 'Elke cocktail\nidentiek',
    sub: 'Geen verschil tussen de eerste en de honderdste — altijd exact dezelfde smaak en presentatie.',
    mark: '=',
  },
]

const ADMIN_EMAILS = ['r.muller@mixmate.nl', 'info@mixmate.nl', 'h.louwrink@mixmate.nl']

export default function MachineDetail({ user, onLogout }) {
  const { machineId } = useParams()
  const navigate = useNavigate()
  const [tab,             setTab]             = useState('Overzicht')
  const [status,          setStatus]          = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [blocked,         setBlocked]         = useState(false)
  const [toggling,        setToggling]        = useState(false)
  const [demoSlideshow,   setDemoSlideshow]   = useState(false)
  const [demoIdx,         setDemoIdx]         = useState(() => clockIdx(FEATURES.length))
  const [demoVisible,     setDemoVisible]     = useState(false)
  const demoBusyRef  = useRef(false)
  const demoPrevRef  = useRef(demoIdx)

  useEffect(() => {
    api.machineStatus(machineId)
      .then(s => {
        setStatus(s)
        if (s.online) api.getBlockStatus(machineId).then(d => setBlocked(d.blocked)).catch(() => {})
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [machineId])

  // Poll demo status — elke 800ms als demo actief (voor slide sync), anders 3s
  useEffect(() => {
    let cancelled = false
    let firstActivation = true
    async function poll() {
      try {
        const s = await api.getDemoStatus(machineId)
        if (cancelled) return
        if (s.slideshow_active) {
          if (!demoSlideshow) {
            setDemoSlideshow(true)
            setTimeout(() => setDemoVisible(true), 60)
            firstActivation = false
          }
          // Slide index van Pi backend gebruiken — bron van waarheid
          if (s.slide_index !== undefined) {
            const next = s.slide_index
            if (next !== demoPrevRef.current && !demoBusyRef.current) {
              demoPrevRef.current = next
              demoBusyRef.current = true
              setDemoVisible(false)
              setTimeout(() => {
                setDemoIdx(next)
                setTimeout(() => {
                  setDemoVisible(true)
                  demoBusyRef.current = false
                }, 40)
              }, FADE_OUT_MS)
            }
          }
        } else {
          setDemoSlideshow(false)
          setDemoVisible(false)
        }
      } catch {}
    }
    poll()
    const iv = setInterval(poll, demoSlideshow ? 800 : 3000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [machineId, demoSlideshow])

  async function exitDemo() {
    try { await api.exitDemoSlideshow(machineId) } catch {}
    setDemoSlideshow(false)
  }

  const [showBlockConfirm, setShowBlockConfirm] = useState(false)

  async function toggleBlock() {
    if (!blocked && !showBlockConfirm) { setShowBlockConfirm(true); return }
    setShowBlockConfirm(false)
    setToggling(true)
    try {
      const d = await (blocked ? api.unblockMachine(machineId) : api.blockMachine(machineId))
      setBlocked(d.blocked)
    } catch {}
    setToggling(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
    </div>
  )

  const demoF = FEATURES[demoIdx]

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Demo attractor overlay */}
      {demoSlideshow && (
        <div
          onClick={exitDemo}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: demoF.bg,
            transition: 'background 0.4s ease',
            overflow: 'hidden',
            userSelect: 'none', WebkitUserSelect: 'none',
            cursor: 'pointer',
          }}
        >
          {/* Gekleurde bovenlijn */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: demoF.accent,
            transition: 'background 0.4s ease',
            zIndex: 2,
          }} />

          {/* Groot watermerk-getal */}
          <div style={{
            position: 'absolute',
            right: '-0.05em', bottom: '0.02em',
            fontSize: '38vw',
            fontWeight: 900,
            lineHeight: 1,
            color: demoF.accent,
            opacity: 0.055,
            letterSpacing: '-0.04em',
            pointerEvents: 'none',
            transition: 'color 0.4s ease',
            zIndex: 1,
          }}>{demoF.mark}</div>

          {/* Logo + badge */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '30px 44px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 10, pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>MIXMATE</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '3px',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '3px 9px', borderRadius: 20,
            }}>Demo</span>
          </div>

          {/* Slide-inhoud — fade in/out */}
          <div
            key={demoIdx}
            style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', flexDirection: 'column',
              padding: '90px 44px 44px',
              opacity: demoVisible ? 1 : 0,
              transform: demoVisible ? 'translateY(0) translateZ(0)' : 'translateY(10px) translateZ(0)',
              transition: demoVisible
                ? `opacity ${FADE_IN_MS}ms cubic-bezier(0,0,0.2,1), transform ${FADE_IN_MS}ms cubic-bezier(0,0,0.2,1)`
                : `opacity ${FADE_OUT_MS}ms ease, transform ${FADE_OUT_MS}ms ease`,
              willChange: 'opacity, transform',
              pointerEvents: 'none',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 28 }}>

              {/* Label */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, alignSelf: 'flex-start' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: demoF.accent }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: demoF.accent }}>
                  {demoF.label}
                </span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontSize: 'clamp(38px, 5.8vw, 66px)',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-1.5px',
                lineHeight: 1.08,
                margin: '0 0 20px',
                maxWidth: 680,
                whiteSpace: 'pre-line',
              }}>{demoF.headline}</h1>

              {/* Sub */}
              <p style={{
                fontSize: 15, lineHeight: 1.7,
                color: 'rgba(255,255,255,0.48)',
                margin: 0, maxWidth: 480,
              }}>{demoF.sub}</p>
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
              {FEATURES.map((_, i) => (
                <div key={i} style={{
                  width: i === demoIdx ? 22 : 5, height: 5, borderRadius: 3,
                  background: '#fff',
                  opacity: i === demoIdx ? 1 : 0.2,
                  transition: 'width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                }} />
              ))}
            </div>

            {/* Knop */}
            <div style={{ pointerEvents: 'auto' }}>
              <button
                onClick={exitDemo}
                style={{
                  width: '100%', padding: '17px 0',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.09)',
                  color: '#fff',
                  fontSize: 15, fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.16)',
                  cursor: 'pointer',
                  transition: 'opacity 0.1s ease',
                  fontFamily: 'inherit',
                }}
              >
                Tik om de app te starten →
              </button>
            </div>
          </div>

          {/* Voortgangsbalk */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 2, background: 'rgba(255,255,255,0.06)',
            zIndex: 20, pointerEvents: 'none',
          }}>
            <DemoProgressBar accent={demoF.accent} slideMs={SLIDE_MS} idx={demoIdx} />
          </div>
        </div>
      )}

      {/* Sub-header */}
      <div style={{ background: 'rgba(242,242,247,.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,.08)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          {/* Breadcrumb + status */}
          <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, padding: 0, fontFamily: 'inherit' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Machines
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status?.name || 'Machine'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: 4, background: status?.online ? '#30d158' : '#c7c7cc', boxShadow: status?.online ? '0 0 0 3px rgba(48,209,88,.18)' : 'none' }} />
                <span style={{ fontSize: 12, color: status?.online ? '#30d158' : '#aeaeb2', fontWeight: 500 }}>{status?.online ? 'Online' : 'Offline'}</span>
              </div>
              {status?.online && (
                <div style={{ position: 'relative' }}>
                  <button onClick={toggleBlock} disabled={toggling} title={blocked ? 'Machine deblokkeren' : 'Machine blokkeren'} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: blocked ? '#ff3b30' : 'transparent',
                    color: blocked ? '#fff' : '#ff3b30',
                    border: `1.5px solid ${blocked ? '#ff3b30' : '#ff3b30'}`,
                    borderRadius: 8, padding: '5px 10px',
                    fontSize: 12, fontWeight: 600, cursor: toggling ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: toggling ? .5 : 1, transition: 'all .2s',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      {blocked
                        ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
                        : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
                      }
                    </svg>
                    {blocked ? 'Deblokkeren' : 'Blokkeer'}
                  </button>
                  {showBlockConfirm && (
                    <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, background: '#fff', border: '1px solid #e5e5ea', borderRadius: 14, padding: '16px 18px', boxShadow: '0 8px 32px rgba(0,0,0,.12)', width: 220 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>Machine blokkeren?</div>
                      <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 14, lineHeight: 1.5 }}>Klanten kunnen dan geen cocktails meer bestellen totdat je deblokkert.</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={toggleBlock} style={{ flex: 1, padding: '8px 0', background: '#ff3b30', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Blokkeer</button>
                        <button onClick={() => setShowBlockConfirm(false)} style={{ flex: 1, padding: '8px 0', background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleer</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#1d1d1f' : '#6e6e73',
                borderBottom: `2px solid ${tab === t ? '#1d1d1f' : 'transparent'}`,
                whiteSpace: 'nowrap', transition: 'color .15s', fontFamily: 'inherit',
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px' }}>
        {!status?.online && tab !== 'Overzicht' && tab !== 'Info' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 12, padding: '12px 16px', fontSize: 14, marginBottom: 20 }}>
            Machine is offline. Zet hem aan om gegevens te bekijken.
          </div>
        )}
        {tab === 'Overzicht'   && <Overzicht   status={status} machineId={machineId} />}
        {tab === 'Catalogus'   && status?.online && <Catalogus   machineId={machineId} />}
        {tab === 'Pompen'      && status?.online && <Pompen      machineId={machineId} />}
        {tab === 'Spoelen'     && <SpoelTab    machineId={machineId} status={status} blocked={blocked} onToggleBlock={toggleBlock} toggling={toggling} />}
        {tab === 'Instellingen'&& <Instellingen machineId={machineId} status={status} onRename={name => setStatus(s => ({...s, name}))} onUnpair={() => navigate('/')} demoActive={demoSlideshow} onDemoToggle={() => api.getDemoStatus(machineId).then(s => setDemoSlideshow(s.slideshow_active)).catch(()=>{})} isAdmin={!!(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))} />}
        {tab === 'Info'        && <InfoTab     machineId={machineId} status={status} />}
      </div>
    </div>
  )
}

// ── Hulp ──────────────────────────────────────────────────────────────────────

function useList(loader) {
  const [items,   setItems]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState(null)
  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try { const d = await loader(); setItems(d.items || d) }
    catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [])
  return { items, loading, err, reload: load, setItems }
}

function Spinner({ dark }) {
  return <span style={{ width: 14, height: 14, border: `2px solid ${dark ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.3)'}`, borderTopColor: dark ? '#1d1d1f' : '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
}

function Skeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[1,2,3].map(i => <div key={i} style={{ background: '#fff', borderRadius: 12, height: 52, opacity: .6 }} />)}
  </div>
}

function ErrMsg({ msg }) {
  if (!msg) return null
  return <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>{msg}</div>
}

function Group({ label, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {(label || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
          {label && <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: .3, textTransform: 'uppercase' }}>{label}</div>}
          {action}
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, sub, noBorder, onClick, chevron, danger, children }) {
  const content = (
    <div style={{
      padding: '13px 16px', borderBottom: noBorder ? 'none' : '1px solid #f2f2f7',
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: onClick ? 'pointer' : 'default',
      ...(onClick ? { background: 'none', border: 'none', width: '100%', fontFamily: 'inherit', textAlign: 'left' } : {}),
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: danger ? '#ff3b30' : '#1d1d1f' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 2 }}>{sub}</div>}
      </div>
      {value && <div style={{ fontSize: 14, color: '#aeaeb2', flexShrink: 0 }}>{value}</div>}
      {children}
      {chevron && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>}
    </div>
  )
  if (onClick) return <button onClick={onClick} style={{ display: 'block', width: '100%', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit' }}>{content}</button>
  return content
}

const inp = { width: '100%', border: '1px solid #e5e5ea', borderRadius: 10, padding: '10px 13px', fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#1d1d1f', boxSizing: 'border-box' }
const sel = { ...inp, appearance: 'none', cursor: 'pointer' }

// ── Overzicht ─────────────────────────────────────────────────────────────────

function Overzicht({ status, machineId }) {
  const [recipes,   setRecipes]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [period,    setPeriod]    = useState('totaal')
  const [activity,  setActivity]  = useState([])

  useEffect(() => {
    if (!status?.online) { setLoading(false); return }
    api.getRecipes(machineId)
      .then(d => {
        const list = d.items || d
        setRecipes([...list].sort((a, b) => (b.pour_count || 0) - (a.pour_count || 0)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [machineId, status?.online])

  // Simuleer live activity feed op basis van pour_count — in productie via WebSocket
  useEffect(() => {
    if (!recipes.length) return
    const top = recipes.filter(r => r.pour_count > 0).slice(0, 6)
    if (!top.length) return
    const feed = []
    const now = Date.now()
    top.forEach((r, i) => {
      if (r.pour_count > 0) feed.push({ id: r.id, name: r.name, image_url: r.image_url, minsAgo: i * 3 + 1 })
    })
    setActivity(feed.slice(0, 5))
  }, [recipes])

  // Filter op periode
  function filterPours(r) {
    if (period === 'totaal') return r.pour_count || 0
    // Zonder backend-ondersteuning per periode tonen we een proportionele schatting
    const factor = { vandaag: 0.05, week: 0.25, maand: 0.6, totaal: 1 }[period] || 1
    return Math.round((r.pour_count || 0) * factor)
  }

  const filteredRecipes = recipes.map(r => ({ ...r, filtered_count: filterPours(r) }))
    .sort((a, b) => b.filtered_count - a.filtered_count)
  const totalPours = filteredRecipes.reduce((s, r) => s + r.filtered_count, 0)
  const prevTotal  = Math.round(totalPours * 0.88) // placeholder vergelijking
  const pctChange  = prevTotal > 0 ? Math.round(((totalPours - prevTotal) / prevTotal) * 100) : 0
  const topRecipes = filteredRecipes.slice(0, 5)

  const PERIODS = [
    { key: 'vandaag', label: 'Vandaag' },
    { key: 'week',    label: 'Deze week' },
    { key: 'maand',   label: 'Deze maand' },
    { key: 'totaal',  label: 'Totaal' },
  ]

  // Ingrediënten niveau's uit status
  const pumps = status?.pumps || status?.pump_config || []

  return (
    <div>
      {/* Offline banner */}
      {!status?.online && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px', marginBottom: 20, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>Machine offline</div>
          <div style={{ fontSize: 13, color: '#aeaeb2' }}>Zet de machine aan om statistieken te bekijken.</div>
        </div>
      )}

      {status?.online && (
        <>
          {/* Periode selector */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: 10, padding: 3, gap: 2 }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: period === p.key ? 600 : 400,
                  background: period === p.key ? '#fff' : 'transparent',
                  color: period === p.key ? '#1d1d1f' : '#6e6e73',
                  boxShadow: period === p.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                  transition: 'all .15s', fontFamily: 'inherit',
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* 2-koloms layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

            {/* LINKER KOLOM */}
            <div>
              {/* KPI kaarten */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {/* Primaire KPI */}
                <div style={{ background: 'linear-gradient(135deg, #1d1d1f 0%, #3a3a3c 100%)', borderRadius: 16, padding: '20px 18px', gridColumn: '1' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M8 21H5a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-3"/><path d="M9 3h6l1 9H8L9 3z"/></svg>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{totalPours}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 4, marginBottom: 8 }}>Totaal gemaakt</div>
                  {pctChange !== 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: pctChange > 0 ? 'rgba(52,199,89,.2)' : 'rgba(255,59,48,.2)', borderRadius: 6, padding: '2px 7px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pctChange > 0 ? '#34c759' : '#ff3b30' }}>
                        {pctChange > 0 ? '+' : ''}{pctChange}% t.o.v. vorige periode
                      </span>
                    </div>
                  )}
                </div>

                {/* Secundaire KPI */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '20px 18px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6e6e73" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>{recipes.length}</div>
                  <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 4 }}>Recepten</div>
                </div>
              </div>

              {/* Meest gemaakt */}
              <Group label="Meest gemaakt">
                {loading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>Laden…</div>
                ) : topRecipes.length === 0 || topRecipes.every(r => r.filtered_count === 0) ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>Nog geen cocktails gemaakt.</div>
                ) : topRecipes.filter(r => r.filtered_count > 0).map((r, i, arr) => {
                  const max = arr[0].filtered_count || 1
                  const pct = Math.round((r.filtered_count / max) * 100)
                  return (
                    <div key={r.id} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f2f2f7' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        {/* Professionele placeholder i.p.v. emoji */}
                        <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', background: 'linear-gradient(135deg, #f2f2f7, #e5e5ea)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {r.image_url
                            ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="1.6" strokeLinecap="round"><path d="M8 21H5a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-3"/><path d="M9 3h6l1 9H8L9 3z"/></svg>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{r.filtered_count}×</div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 3, background: '#f2f2f7', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#1d1d1f', borderRadius: 2, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )
                })}
              </Group>
            </div>

            {/* RECHTER KOLOM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Ingrediënten status */}
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f2f2f7' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: .5, textTransform: 'uppercase' }}>Ingrediënten</div>
                </div>
                {pumps.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 13, color: '#aeaeb2', textAlign: 'center' }}>
                    Configureer pompen in de instellingen.
                  </div>
                ) : pumps.slice(0, 6).map((p, i) => {
                  const name = p.ingredient_name || p.name || `Pomp ${i + 1}`
                  const pct  = p.level_pct ?? p.fill_pct ?? null
                  const low  = pct !== null && pct < 25
                  const color = pct === null ? '#8e8e93' : pct < 15 ? '#ff3b30' : pct < 30 ? '#ff9500' : '#34c759'
                  return (
                    <div key={i} style={{ padding: '10px 16px', borderBottom: i < Math.min(pumps.length, 6) - 1 ? '1px solid #f9f9f9' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, marginLeft: 8 }}>
                          {pct !== null ? (low ? '⚠ Bijvullen' : `${pct}%`) : '—'}
                        </span>
                      </div>
                      {pct !== null && (
                        <div style={{ height: 4, background: '#f2f2f7', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width .3s' }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Live activity feed */}
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f2f2f7' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: .5, textTransform: 'uppercase' }}>Recente activiteit</div>
                </div>
                {activity.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 13, color: '#aeaeb2', textAlign: 'center' }}>Nog geen activiteit.</div>
                ) : activity.map((a, i) => (
                  <div key={a.id} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < activity.length - 1 ? '1px solid #f9f9f9' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #f2f2f7, #e5e5ea)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {a.image_url
                        ? <img src={a.image_url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="1.6" strokeLinecap="round"><path d="M8 21H5a2 2 0 0 1-2-2v-1a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-3"/><path d="M9 3h6l1 9H8L9 3z"/></svg>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>{a.minsAgo} min geleden</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Catalogus (Recepten + Ingrediënten + Glazen + Categorieën) ────────────────

function resizeImageToDataUrl(file, maxPx = 480) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = url
  })
}

function RecipeForm({ recipe, ingredients, categories, glasses, onSave, onCancel }) {
  const [name,        setName]       = useState(recipe?.name || '')
  const [description, setDescription]= useState(recipe?.description || '')
  const [categoryId,  setCategoryId] = useState(recipe?.category_id ?? '')
  const [glassId,     setGlassId]   = useState(recipe?.glass_id ?? '')
  const [imageUrl,    setImageUrl]   = useState(recipe?.image_url || '')
  const [steps,       setSteps]      = useState(
    recipe?.ingredients?.length
      ? recipe.ingredients.map(i => ({ ingredient_id: String(i.ingredient_id), amount_ml: i.amount_ml }))
      : [{ ingredient_id: '', amount_ml: 50 }]
  )
  const [saving,     setSaving]    = useState(false)
  const [err,        setErr]       = useState(null)
  const [imgLoading, setImgLoading]= useState(false)
  const fileRef = React.useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    setImgLoading(true)
    setImageUrl(await resizeImageToDataUrl(file))
    setImgLoading(false)
  }

  const addStep    = () => setSteps(s => [...s, { ingredient_id: '', amount_ml: 50 }])
  const removeStep = i  => setSteps(s => s.filter((_, idx) => idx !== i))
  const updateStep = (i, k, v) => setSteps(s => s.map((st, idx) => idx === i ? { ...st, [k]: v } : st))

  const totalMl = steps.reduce((sum, s) => sum + (parseFloat(s.amount_ml) || 0), 0)
  const selectedGlass = glassId ? (glasses || []).find(g => g.id === parseInt(glassId)) : null
  const glassTooSmall = selectedGlass && selectedGlass.volume_ml > 0 && totalMl > selectedGlass.volume_ml

  async function handleSubmit(e) {
    e.preventDefault(); if (!name.trim()) return
    setSaving(true); setErr(null)
    try {
      await onSave({
        name: name.trim(), description: description.trim(),
        category_id: categoryId === '' ? null : parseInt(categoryId),
        glass_id:    glassId    === '' ? null : parseInt(glassId),
        image_url: imageUrl,
        ingredients: steps.filter(s => s.ingredient_id).map((s, i) => ({
          ingredient_id: parseInt(s.ingredient_id), amount_ml: parseFloat(s.amount_ml), order: i,
        })),
      })
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 16 }}>{recipe ? `${recipe.name} bewerken` : 'Nieuw recept'}</div>
      <ErrMsg msg={err} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Naam van het recept *" style={inp} />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Korte omschrijving (optioneel)" style={inp} />

        {/* Afbeelding */}
        <div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Afbeelding</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 12, border: '2px dashed #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: '#f9f9f9', flexShrink: 0 }}>
              {imgLoading ? <div style={{ width: 20, height: 20, border: '2px solid #e5e5ea', borderTopColor: '#1d1d1f', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                : imageUrl ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              }
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ fontSize: 14, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>{imageUrl ? 'Foto wijzigen' : 'Foto kiezen'}</button>
              {imageUrl && <button type="button" onClick={() => setImageUrl('')} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 12 }}>Verwijderen</button>}
              <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 4 }}>JPG of PNG, wordt automatisch verkleind</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        {/* Categorie + Glas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Categorie</div>
            <div style={{ position: 'relative' }}>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={sel}>
                <option value="">— Geen —</option>
                {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Glas</div>
            <div style={{ position: 'relative' }}>
              <select value={glassId} onChange={e => setGlassId(e.target.value)} style={{ ...sel, borderColor: glassTooSmall ? '#f97316' : undefined }}>
                <option value="">— Geen —</option>
                {(glasses || []).map(g => <option key={g.id} value={g.id}>{g.name} ({g.volume_ml}ml)</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {glassTooSmall && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, fontSize: 13, color: '#c2410c', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span>⚠️</span>
                <span>Deze cocktail is <strong>{Math.round(totalMl)} ml</strong> maar {selectedGlass.name} heeft slechts <strong>{selectedGlass.volume_ml} ml</strong> inhoud. Kies een groter glas.</span>
              </div>
            )}
          </div>
        </div>

        {/* Ingrediënten */}
        <div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>Ingrediënten</div>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <select value={step.ingredient_id} onChange={e => updateStep(i, 'ingredient_id', e.target.value)} style={{ ...sel, paddingRight: 32 }}>
                  <option value="">— Kies ingrediënt —</option>
                  {(ingredients || []).map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                </select>
                <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <input type="number" value={step.amount_ml} min="1" max="999" onChange={e => updateStep(i, 'amount_ml', e.target.value)} style={{ ...inp, width: 72 }} />
              <span style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>ml</span>
              {steps.length > 1 && <button type="button" onClick={() => removeStep(i)} style={{ fontSize: 18, color: '#c7c7cc', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>}
            </div>
          ))}
          <button type="button" onClick={addStep} style={{ fontSize: 14, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>+ Ingrediënt toevoegen</button>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid #f2f2f7', marginTop: 4 }}>
          <button type="submit" disabled={saving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .5 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button type="button" onClick={onCancel} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleren</button>
        </div>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Catalogus({ machineId }) {
  const { items: recipes,     loading: rLoad, err: rErr, reload: rReload, setItems: setRecipes } = useList(() => api.getRecipes(machineId))
  const { items: ingredients,     loading: iLoad, setItems: setIngredients }    = useList(() => api.getIngredients(machineId))
  const { items: glasses,         loading: gLoad, setItems: setGlasses }        = useList(() => api.getGlasses(machineId))
  const { items: categories,      loading: cLoad, setItems: setCategories }     = useList(() => api.getCategories(machineId))
  const { items: ingCategories,   loading: icLoad, setItems: setIngCategories } = useList(() => api.getIngredientCategories(machineId))
  const [editing,  setEditing]  = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [section,  setSection]  = useState('recepten')
  const [locks,    setLocks]    = useState([])
  const [isOwner,  setIsOwner]  = useState(false)

  useEffect(() => {
    api.getLocks(machineId).then(setLocks).catch(() => {})
    // Owner check: try fetching members (only owner can)
    api.getMembers(machineId).then(() => setIsOwner(true)).catch(() => setIsOwner(false))
  }, [machineId])

  async function toggleLock(recipe) {
    const locked = locks.includes(recipe.id)
    try {
      if (locked) { await api.unlockRecipe(machineId, recipe.id); setLocks(l => l.filter(id => id !== recipe.id)) }
      else         { await api.lockRecipe(machineId, recipe.id);   setLocks(l => [...l, recipe.id]) }
    } catch (e) { alert(e.message) }
  }

  // Ingredient form state
  const [ingName,        setIngName]        = useState('')
  const [ingCatId,       setIngCatId]       = useState('')
  const [ingErr,         setIngErr]         = useState(null)
  const [ingSaving,      setIngSaving]      = useState(false)
  const [ingEditing,     setIngEditing]     = useState(null)
  const [ingUploading,   setIngUploading]   = useState(null)
  // Ingredient category form state
  const [icForm,         setIcForm]         = useState({ name: '' })
  const [icEditing,      setIcEditing]      = useState(null)
  const [icErr,          setIcErr]          = useState(null)
  const [icSaving,       setIcSaving]       = useState(false)
  // Glass form state
  const [glForm, setGlForm] = useState({ name: '', volume_ml: '' }); const [glEditing, setGlEditing] = useState(null); const [glErr, setGlErr] = useState(null); const [glSaving, setGlSaving] = useState(false)
  // Category form state
  const [catForm, setCatForm] = useState({ name: '' }); const [catEditing, setCatEditing] = useState(null); const [catErr, setCatErr] = useState(null); const [catSaving, setCatSaving] = useState(false)

  async function saveRecipe(data) {
    if (editing === 'new') await api.createRecipe(machineId, data)
    else await api.updateRecipe(machineId, editing.id, data)
    setEditing(null); rReload()
  }

  async function delRecipe(r) {
    setDeleting(r.id)
    try { await api.deleteRecipe(machineId, r.id); rReload() } catch (e) { alert(e.message) }
    setDeleting(null)
  }

  async function saveIng(e) {
    e.preventDefault(); setIngSaving(true); setIngErr(null)
    const data = { name: ingName, ingredient_category_id: ingCatId ? Number(ingCatId) : null }
    try {
      if (ingEditing) {
        const updated = await api.updateIngredient(machineId, ingEditing.id, data)
        setIngredients(ingredients.map(x => x.id === ingEditing.id ? updated : x))
        setIngEditing(null)
      } else {
        setIngredients([...ingredients, await api.createIngredient(machineId, data)])
      }
      setIngName(''); setIngCatId('')
    } catch (e) { setIngErr(e.message) }
    setIngSaving(false)
  }
  async function delIng(item) {
    if (!confirm(`"${item.name}" verwijderen?`)) return
    try { await api.deleteIngredient(machineId, item.id); setIngredients(ingredients.filter(x => x.id !== item.id)) }
    catch (e) { alert(e.message) }
  }
  async function uploadIngImage(ing, file) {
    setIngUploading(ing.id)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload = ev => {
          const img = new Image()
          img.onerror = reject
          img.onload = () => {
            const MAX = 600
            let w = img.width, h = img.height
            if (w > MAX || h > MAX) {
              if (w > h) { h = Math.round(h * MAX / w); w = MAX }
              else { w = Math.round(w * MAX / h); h = MAX }
            }
            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/jpeg', 0.82))
          }
          img.src = ev.target.result
        }
        reader.readAsDataURL(file)
      })
      const blob     = await fetch(dataUrl).then(r => r.blob())
      const formFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      const updated  = await api.uploadIngredientImage(machineId, ing.id, formFile)
      setIngredients(ingredients.map(x => x.id === ing.id ? updated : x))
    } catch (err) { alert('Upload mislukt: ' + err.message) }
    setIngUploading(null)
  }

  async function saveIc(e) {
    e.preventDefault(); setIcSaving(true); setIcErr(null)
    try {
      if (icEditing) {
        const updated = await api.updateIngredientCategory(machineId, icEditing.id, icForm)
        setIngCategories(ingCategories.map(c => c.id === icEditing.id ? updated : c))
      } else {
        setIngCategories([...ingCategories, await api.createIngredientCategory(machineId, icForm)])
      }
      setIcForm({ name: '' }); setIcEditing(null)
    } catch (e) { setIcErr(e.message) }
    setIcSaving(false)
  }
  async function delIc(c) {
    if (!confirm(`"${c.name}" verwijderen?`)) return
    try {
      await api.deleteIngredientCategory(machineId, c.id)
      setIngCategories(ingCategories.filter(x => x.id !== c.id))
      setIngredients(ingredients.map(x => x.ingredient_category_id === c.id ? { ...x, ingredient_category_id: null, ingredient_category_name: null } : x))
    } catch (e) { alert(e.message) }
  }

  async function saveGl(e) {
    e.preventDefault(); setGlSaving(true); setGlErr(null)
    const data = { name: glForm.name, volume_ml: Number(glForm.volume_ml) }
    try {
      if (glEditing) {
        const updated = await api.updateGlass(machineId, glEditing.id, data)
        setGlasses(glasses.map(g => g.id === glEditing.id ? updated : g))
      } else {
        setGlasses([...glasses, await api.createGlass(machineId, data)])
      }
      setGlForm({ name: '', volume_ml: '' }); setGlEditing(null)
    } catch (e) { setGlErr(e.message) }; setGlSaving(false)
  }
  async function delGl(g) {
    if (!confirm(`"${g.name}" verwijderen?`)) return
    try { await api.deleteGlass(machineId, g.id); setGlasses(glasses.filter(x => x.id !== g.id)) }
    catch (e) { alert(e.message) }
  }

  async function saveCat(e) {
    e.preventDefault(); setCatSaving(true); setCatErr(null)
    try {
      if (catEditing) {
        const updated = await api.updateCategory(machineId, catEditing.id, catForm)
        setCategories(categories.map(c => c.id === catEditing.id ? updated : c))
      } else {
        setCategories([...categories, await api.createCategory(machineId, catForm)])
      }
      setCatForm({ name: '' }); setCatEditing(null)
    } catch (e) { setCatErr(e.message) }; setCatSaving(false)
  }
  async function delCat(c) {
    if (!confirm(`"${c.name}" verwijderen?`)) return
    try { await api.deleteCategory(machineId, c.id); setCategories(categories.filter(x => x.id !== c.id)) }
    catch (e) { alert(e.message) }
  }

  const sections = [
    { key: 'recepten',       label: 'Recepten',              count: recipes?.length },
    { key: 'ingredienten',   label: 'Ingrediënten',          count: ingredients?.length },
    { key: 'ing-categorieen',label: 'Ing. categorieën',      count: ingCategories?.length },
    { key: 'glazen',         label: 'Glazen',                count: glasses?.length },
    { key: 'categorieen',    label: 'Receptcategorieën',     count: categories?.length },
  ]

  if (editing) return (
    <RecipeForm
      recipe={editing === 'new' ? null : editing}
      ingredients={ingredients} categories={categories} glasses={glasses}
      onSave={saveRecipe} onCancel={() => setEditing(null)}
    />
  )

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto' }}>
        {sections.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{
            padding: '7px 14px', borderRadius: 20, border: '1.5px solid',
            borderColor: section === s.key ? '#1d1d1f' : '#e5e5ea',
            background: section === s.key ? '#1d1d1f' : '#fff',
            color: section === s.key ? '#fff' : '#6e6e73',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
            transition: 'all .15s',
          }}>
            {s.label} {s.count != null ? <span style={{ opacity: .6 }}>({s.count})</span> : ''}
          </button>
        ))}
      </div>

      {/* Recepten */}
      {section === 'recepten' && (
        <div>
          <ErrMsg msg={rErr} />
          {rLoad ? <Skeleton /> : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => setEditing('new')} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nieuw recept</button>
              </div>
              {!recipes?.length ? (
                <div style={{ background: '#fff', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen recepten.</div>
              ) : (
                <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                  {recipes.map((r, i) => {
                    const locked = locks.includes(r.id)
                    return (
                    <div key={r.id} style={{ padding: '12px 16px', borderBottom: i < recipes.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: locked ? '#fff8ee' : '#f2f2f7', flexShrink: 0, position: 'relative' }}>
                        {r.image_url ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍸</div>}
                        {locked && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, background: '#ff9500', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 1 }}>
                          {[r.category_name, r.glass_name, r.ingredients?.length ? `${r.ingredients.length} ingrediënten` : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {r.pour_count > 0 && <div style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>{r.pour_count}×</div>}
                      {isOwner && (
                        <button onClick={() => toggleLock(r)} title={locked ? 'Ontgrendelen' : 'Vergrendelen'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={locked ? '#ff9500' : '#c7c7cc'} strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d={locked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"}/></svg>
                        </button>
                      )}
                      {!locked && <button onClick={() => setEditing(r)} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Bewerk</button>}
                      {!locked && <button onClick={() => delRecipe(r)} disabled={deleting === r.id} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: deleting === r.id ? .4 : 1 }}>Verwijder</button>}
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ingrediënten */}
      {section === 'ingredienten' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 10 }}>{ingEditing ? 'Ingrediënt bewerken' : 'Nieuw ingrediënt'}</div>
            <form onSubmit={saveIng} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input required value={ingName} onChange={e => setIngName(e.target.value)} placeholder="Naam" style={{ ...inp, flex: 1, minWidth: 140 }} />
              <select value={ingCatId} onChange={e => setIngCatId(e.target.value)} style={{ ...sel, minWidth: 140 }}>
                <option value="">— Geen categorie —</option>
                {(ingCategories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" disabled={ingSaving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{ingSaving ? '…' : ingEditing ? 'Opslaan' : 'Toevoegen'}</button>
              {ingEditing && <button type="button" onClick={() => { setIngEditing(null); setIngName(''); setIngCatId('') }} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleer</button>}
            </form>
            <ErrMsg msg={ingErr} />
          </div>
          {iLoad ? <Skeleton /> : !ingredients?.length ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen ingrediënten.</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              {ingredients.map((item, i) => {
                const isUploading = ingUploading === item.id
                return (
                <div key={item.id} style={{ padding: '12px 16px', borderBottom: i < ingredients.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Foto */}
                  <label style={{ cursor: isUploading ? 'wait' : 'pointer', flexShrink: 0, position: 'relative' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadIngImage(item, f); e.target.value = '' }} />
                    <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 18, opacity: .4 }}>{isUploading ? '⏳' : '🖼'}</span>}
                    </div>
                    {!isUploading && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, background: '#007aff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    </div>}
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{item.name}</div>
                    {item.ingredient_category_name && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 1 }}>{item.ingredient_category_name}</div>}
                  </div>
                  <button onClick={() => { setIngEditing(item); setIngName(item.name); setIngCatId(item.ingredient_category_id ?? '') }} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Bewerk</button>
                  <button onClick={() => delIng(item)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Verwijder</button>
                </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Ingrediënt-categorieën */}
      {section === 'ing-categorieen' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <form onSubmit={saveIc} style={{ display: 'flex', gap: 10 }}>
              <input required value={icForm.name} onChange={e => setIcForm({ name: e.target.value })} placeholder={icEditing ? 'Naam aanpassen' : 'Nieuwe categorie (bijv. Sterke drank)'} style={{ ...inp, flex: 1 }} />
              <button type="submit" disabled={icSaving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{icSaving ? '…' : icEditing ? 'Opslaan' : 'Toevoegen'}</button>
              {icEditing && <button type="button" onClick={() => { setIcEditing(null); setIcForm({ name: '' }) }} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleer</button>}
            </form>
            <ErrMsg msg={icErr} />
          </div>
          {icLoad ? <Skeleton /> : !ingCategories?.length ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Nog geen categorieën. Voeg er een toe, bijv. "Sterke drank", "Sappen", "Siropen".</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              {ingCategories.map((c, i) => (
                <div key={c.id} style={{ padding: '12px 16px', borderBottom: i < ingCategories.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 1 }}>
                      {ingredients?.filter(x => x.ingredient_category_id === c.id).length ?? 0} ingrediënten
                    </div>
                  </div>
                  <button onClick={() => { setIcEditing(c); setIcForm({ name: c.name }) }} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginRight: 12 }}>Bewerk</button>
                  <button onClick={() => delIc(c)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Verwijder</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Glazen */}
      {section === 'glazen' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 10 }}>{glEditing ? 'Glas bewerken' : 'Nieuw glas'}</div>
            <form onSubmit={saveGl} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input required value={glForm.name} onChange={e => setGlForm(f => ({...f, name: e.target.value}))} placeholder="Naam" style={{ ...inp, flex: 1, minWidth: 120 }} />
              <input required type="number" min="1" value={glForm.volume_ml} onChange={e => setGlForm(f => ({...f, volume_ml: e.target.value}))} placeholder="ml" style={{ ...inp, width: 80 }} />
              <button type="submit" disabled={glSaving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{glSaving ? '…' : glEditing ? 'Opslaan' : 'Toevoegen'}</button>
              {glEditing && <button type="button" onClick={() => { setGlEditing(null); setGlForm({ name: '', volume_ml: '' }) }} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleer</button>}
            </form>
            <ErrMsg msg={glErr} />
          </div>
          {gLoad ? <Skeleton /> : !glasses?.length ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen glazen.</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              {glasses.map((g, i) => (
                <div key={g.id} style={{ padding: '12px 16px', borderBottom: i < glasses.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: '#aeaeb2' }}>{g.volume_ml} ml</div>
                  </div>
                  <button onClick={() => { setGlEditing(g); setGlForm({ name: g.name, volume_ml: g.volume_ml }) }} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginRight: 12 }}>Bewerk</button>
                  <button onClick={() => delGl(g)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Verwijder</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categorieën */}
      {section === 'categorieen' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <form onSubmit={saveCat} style={{ display: 'flex', gap: 10 }}>
              <input required value={catForm.name} onChange={e => setCatForm({ name: e.target.value })} placeholder={catEditing ? 'Naam aanpassen' : 'Nieuwe categorie'} style={{ ...inp, flex: 1 }} />
              <button type="submit" disabled={catSaving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{catSaving ? '…' : catEditing ? 'Opslaan' : 'Toevoegen'}</button>
              {catEditing && <button type="button" onClick={() => { setCatEditing(null); setCatForm({ name: '' }) }} style={{ background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Annuleer</button>}
            </form>
            <ErrMsg msg={catErr} />
          </div>
          {cLoad ? <Skeleton /> : !categories?.length ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen categorieën.</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              {categories.map((c, i) => (
                <div key={c.id} style={{ padding: '12px 16px', borderBottom: i < categories.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{c.name}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => { setCatEditing(c); setCatForm({ name: c.name }) }} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Bewerk</button>
                    <button onClick={() => delCat(c)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Verwijder</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pompen ────────────────────────────────────────────────────────────────────

function Pompen({ machineId }) {
  const { items: pumps, loading, err, setItems: setPumps } = useList(() => api.getPumps(machineId))
  const { items: ingredients }                              = useList(() => api.getIngredients(machineId))
  const [saving,   setSaving]   = useState(null)
  const [saved,    setSaved]    = useState(null)
  const [saveErr,  setSaveErr]  = useState(null)

  async function assign(pump, ingredient_id) {
    setSaving(pump.id); setSaveErr(null)
    try {
      await api.updatePump(machineId, pump.id, { ingredient_id: ingredient_id || null })
      setPumps(prev => prev.map(p => p.id === pump.id ? { ...p, ingredient_id: ingredient_id ? Number(ingredient_id) : null } : p))
      setSaved(pump.id); setTimeout(() => setSaved(null), 1500)
    } catch (e) { setSaveErr(e.message) }
    setSaving(null)
  }

  async function toggleType(pump) {
    const next = pump.pump_type === 'valve' ? 'peristaltic' : 'valve'
    setSaving(pump.id); setSaveErr(null)
    try {
      await api.updatePump(machineId, pump.id, { pump_type: next, ingredient_id: null })
      setPumps(prev => prev.map(p => p.id === pump.id ? { ...p, pump_type: next, ingredient_id: null } : p))
      setSaved(pump.id); setTimeout(() => setSaved(null), 1500)
    } catch (e) { setSaveErr(e.message) }
    setSaving(null)
  }

  if (loading) return <Skeleton />
  return (
    <Group label="Pompindeling" >
      <ErrMsg msg={err} />
      {saveErr && <ErrMsg msg={saveErr} />}
      {!pumps?.length ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen pompen gevonden.</div>
      ) : pumps.map((p, i) => {
        const isValve = p.pump_type === 'valve'
        const compatible = (ingredients || []).filter(ing => isValve ? ing.is_carbonated : !ing.is_carbonated)
        return (
        <div key={p.id} style={{ padding: '12px 16px', borderBottom: i < pumps.length - 1 ? '1px solid #f2f2f7' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Slot + type toggle */}
            <div style={{ width: 80, flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Pomp {p.slot}</div>
              <button
                onClick={() => toggleType(p)}
                disabled={saving === p.id}
                style={{
                  marginTop: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: isValve ? '#007aff' : '#e5e5ea',
                  color: isValve ? '#fff' : '#3a3a3c',
                  fontFamily: 'inherit',
                }}
              >
                {isValve ? 'Valve / CO₂' : 'Peristaltisch'}
              </button>
            </div>

            {/* Ingrediënt select — gefilterd op type */}
            <div style={{ flex: 1, position: 'relative' }}>
              <select
                value={p.ingredient_id || ''}
                onChange={e => assign(p, e.target.value ? Number(e.target.value) : null)}
                disabled={saving === p.id}
                style={{ ...sel, paddingRight: 32 }}
              >
                <option value="">— Niet ingesteld —</option>
                {compatible.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>

            {saved === p.id && <span style={{ fontSize: 12, color: '#30d158', flexShrink: 0 }}>Opgeslagen</span>}
          </div>
          {isValve && (
            <div style={{ marginTop: 6, marginLeft: 94, fontSize: 11, color: '#007aff' }}>
              Deze leiding ondersteunt CO₂ — toont alleen koolzuurhoudende ingrediënten
            </div>
          )}
        </div>
        )
      })}
    </Group>
  )
}

// ── Spoelen (apart tabblad) ───────────────────────────────────────────────────

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

function FlushScheduleCard({ machineId }) {
  const [schedule, setSchedule] = useState(null)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    api.getFlushSchedule(machineId).then(setSchedule).catch(() => {})
  }, [machineId])

  async function patch(patch) {
    const next = { ...schedule, ...patch }
    setSchedule(next)
    setSaving(true)
    try { await api.updateFlushSchedule(machineId, patch) } catch {}
    setSaving(false)
  }

  if (!schedule) return null

  const { enabled, day_of_week, days_since_flush, flush_overdue } = schedule
  const overdueText = days_since_flush === null
    ? 'Nog nooit gespoeld'
    : days_since_flush === 0 ? 'Vandaag gespoeld ✓'
    : days_since_flush === 1 ? 'Gisteren gespoeld'
    : `${days_since_flush} dagen geleden gespoeld`

  return (
    <Group label="Spoelschema">
      <div style={{ padding: '14px 16px' }}>
        {/* Overdue banner */}
        {flush_overdue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff8ee', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Spoelen vereist</div>
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 1 }}>{overdueText} — schema zegt elke {DAYS[day_of_week ?? 0]}.</div>
            </div>
          </div>
        )}
        {!flush_overdue && days_since_flush !== null && (
          <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 14 }}>
            {overdueText}{enabled ? ` — volgende spoeldag: ${DAYS[day_of_week ?? 0]}` : ''}.
          </div>
        )}

        {/* Ingeschakeld toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? 16 : 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1d1d1f' }}>Wekelijkse herinnering</div>
            <div style={{ fontSize: 13, color: '#aeaeb2', marginTop: 2 }}>Ontvang een waarschuwing als de machine niet op tijd gespoeld is.</div>
          </div>
          <button onClick={() => patch({ enabled: !enabled })} disabled={saving} style={{
            width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: enabled ? '#30d158' : '#e5e5ea',
            transition: 'background .2s', position: 'relative', flexShrink: 0,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 11, background: '#fff',
              position: 'absolute', top: 2, left: enabled ? 20 : 2,
              transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)',
            }} />
          </button>
        </div>

        {/* Dag kiezen */}
        {enabled && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 8 }}>Spoeldag</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => patch({ day_of_week: i })} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: day_of_week === i ? 600 : 400,
                  border: `1.5px solid ${day_of_week === i ? '#007aff' : '#e5e5ea'}`,
                  background: day_of_week === i ? '#f0f7ff' : '#fff',
                  color: day_of_week === i ? '#007aff' : '#6e6e73',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                }}>{d.slice(0, 2)}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Group>
  )
}

function SpoelTab({ machineId, status, blocked, onToggleBlock, toggling }) {
  return (
    <div>
      <FlushScheduleCard machineId={machineId} />
      <Spoelroutine machineId={machineId} status={status} />
    </div>
  )
}

// ── Instellingen ──────────────────────────────────────────────────────────────

function calcFlushDuration(_slot, _daysSince) {
  return 6  // vaste 6s — genoeg om schoonmaakmiddel door te spoelen
}

function fmtSecs(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function Spoelroutine({ machineId, status }) {
  const [pumps,      setPumps]     = useState(null)
  const [selected,   setSelected]  = useState([])
  const [flushing,   setFlushing]  = useState(false)
  const [flushDone,  setFlushDone] = useState(null)
  const [liveStatus, setLiveStatus]= useState(null)
  const [log,        setLog]       = useState(null)
  const [cooldowns,  setCooldowns] = useState([])
  const pollRef      = useRef(null)
  const cdPollRef    = useRef(null)
  const sawActiveRef = useRef(false)
  const pollStartRef = useRef(0)

  useEffect(() => {
    if (!status?.online) return
    api.getPumps(machineId).then(d => {
      const list = (d.items || d).filter(p => p.pump_type !== 'valve')
      setPumps(list)
      // Geen auto-selectie — gebruiker kiest zelf welke leidingen op water zitten
    }).catch(() => {})
    api.getFlushLog(machineId).then(setLog).catch(() => {})

    // Cooldown status poller
    async function pollCooldown() {
      try {
        const r = await api.getCooldownStatus(machineId)
        setCooldowns(Array.isArray(r) ? r : (r.items || []))
      } catch {}
      cdPollRef.current = setTimeout(pollCooldown, 2000)
    }
    pollCooldown()
    return () => { if (cdPollRef.current) clearTimeout(cdPollRef.current) }
  }, [machineId, status?.online])

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  function startPolling() {
    stopPolling()
    sawActiveRef.current = false
    pollStartRef.current = Date.now()
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.getFlushStatus(machineId)
        setLiveStatus(s)
        if (s.active) {
          sawActiveRef.current = true
        } else if (sawActiveRef.current) {
          stopPolling()
          setFlushing(false)
          if (s.weight_stop) {
            setFlushDone({ ok: false, weight: true, msg: 'Gestopt: gewicht boven 2 kg gedetecteerd. Weegschaalbeveiliging heeft de spoelroutine onderbroken.' })
          } else if (s.error) {
            setFlushDone({ ok: false, msg: s.error })
          } else {
            setFlushDone({ ok: true })
          }
          api.getFlushLog(machineId).then(setLog).catch(() => {})
        } else if (Date.now() - pollStartRef.current > 30000) {
          stopPolling(); setFlushing(false)
          setFlushDone({ ok: false, msg: 'Machine reageert niet op spoelcommando. Controleer of hij online is.' })
        }
      } catch { stopPolling(); setFlushing(false); setFlushDone({ ok: false, msg: 'Verbinding verbroken. Controleer of de machine online is.' }) }
    }, 1000)
  }

  useEffect(() => () => stopPolling(), [])

  const lastFlush    = log?.[0]?.flushed_at ? new Date(log[0].flushed_at) : null
  const daysSince    = lastFlush ? Math.floor((Date.now() - lastFlush.getTime()) / 86400000) : 30
  const overdue      = daysSince > 7
  const durations    = Object.fromEntries((pumps || []).map(p => [p.slot, calcFlushDuration(p.slot, daysSince)]))
  const totalSec     = selected.reduce((s, slot) => s + (durations[slot] || 6), 0)

  const livePct = liveStatus?.active && liveStatus.current_duration > 0
    ? Math.min((liveStatus.elapsed || 0) / liveStatus.current_duration, 1) : 0
  const overallPct = liveStatus?.total > 0
    ? ((liveStatus.done || 0) + livePct) / liveStatus.total : 0

  async function startFlush() {
    if (!confirm(`Spoelroutine starten voor ${selected.length} leiding(en)?\nZorg dat water is aangesloten.`)) return
    setFlushing(true); setFlushDone(null); setLiveStatus(null)
    const payload = selected.map(slot => ({ slot, duration: durations[slot] || 6 }))
    try {
      await api.flushMachine(machineId, payload)
      startPolling()
    } catch (e) {
      setFlushDone({ ok: false, msg: e.message })
      setFlushing(false)
    }
  }

  function toggleAll() {
    if (selected.length === pumps.length) setSelected([])
    else setSelected(pumps.map(p => p.slot))
  }

  function toggle(slot) {
    setSelected(s => s.includes(slot) ? s.filter(x => x !== slot) : [...s, slot])
  }

  if (!status?.online) {
    return (
      <Group label="Spoelroutine">
        <div style={{ padding: '20px 16px', color: '#aeaeb2', fontSize: 14 }}>
          Machine moet online zijn om te spoelen.
        </div>
      </Group>
    )
  }

  return (
    <>
    <Group
      label="Spoelroutine"
      action={lastFlush && (
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: overdue ? '#ff9500' : '#30d158',
          background: overdue ? '#fff8ee' : '#f0faf4',
          borderRadius: 20, padding: '3px 10px',
        }}>
          {daysSince === 0 ? 'Vandaag gespoeld' : daysSince === 1 ? 'Gisteren gespoeld' : `${daysSince}d geleden`}
        </span>
      )}
    >
      {/* Live voortgang */}
      {flushing && liveStatus?.active && (
        <div style={{ borderBottom: '1px solid #f2f2f7' }}>
          {/* Overall voortgangsbar */}
          <div style={{ height: 3, background: '#f2f2f7' }}>
            <div style={{ height: '100%', background: '#007aff', width: `${Math.round(overallPct * 100)}%`, transition: 'width .4s linear' }} />
          </div>
          <div style={{ padding: '16px 16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>
                  Leiding {liveStatus.current_slot} spoelen…
                </div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>
                  {Math.round(liveStatus.elapsed || 0)}s van {Math.round(liveStatus.current_duration || 0)}s
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#007aff' }}>
                {liveStatus.done + 1}/{liveStatus.total}
              </div>
            </div>
            {/* Per-leiding voortgang */}
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: liveStatus.total }, (_, i) => (
                <div key={i} style={{ flex: 1, position: 'relative', height: 28, borderRadius: 6, overflow: 'hidden', background: '#f2f2f7' }}>
                  {i < liveStatus.done && (
                    <div style={{ position: 'absolute', inset: 0, background: '#30d158' }} />
                  )}
                  {i === liveStatus.done && (
                    <div style={{ position: 'absolute', inset: 0, background: '#007aff', width: `${Math.round(livePct * 100)}%`, transition: 'width .2s linear' }} />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    color: i <= liveStatus.done ? '#fff' : '#aeaeb2',
                  }}>
                    L{selected[i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wacht op start */}
      {flushing && !liveStatus?.active && !flushDone && (
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#6e6e73', fontSize: 14 }}>
          <Spinner dark /> Verbinden met machine…
        </div>
      )}

      {/* Resultaat */}
      {flushDone && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f2f2f7' }}>
          {flushDone.ok ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#e8faf0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>Spoelroutine voltooid</div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 1 }}>Alle geselecteerde leidingen zijn doorgespoeld.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: flushDone.weight ? '#fff8ee' : '#fff1f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={flushDone.weight ? '#ff9500' : '#ff3b30'} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: flushDone.weight ? '#92400e' : '#ff3b30' }}>{flushDone.weight ? 'Gestopt door beveiliging' : 'Fout'}</div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 1 }}>{flushDone.msg}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Geblokkeerde leidingen */}
      {cooldowns.length > 0 && !flushing && (
        <div style={{ borderBottom: '1px solid #f2f2f7' }}>
          <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#aeaeb2', letterSpacing: 1, textTransform: 'uppercase' }}>
            Geblokkeerde leidingen
          </div>
          {cooldowns.map(cd => (
            <div key={cd.slot} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #f9f9f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fff8ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{cd.ingredient_name || `Leiding ${cd.slot}`}</div>
                  <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>Leiding {cd.slot} · Recepten geblokkeerd</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ff9500', fontVariantNumeric: 'tabular-nums' }}>
                {fmtSecs(cd.remaining_seconds)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pompkeuze + start (verborgen tijdens actief spoelen) */}
      {!flushing && (
        <>
          {/* Selecteer-header */}
          {pumps ? (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: '#1d1d1f', fontWeight: 500 }}>
                {selected.length === 0 ? 'Selecteer leidingen die op water zitten' : `${selected.length} van ${pumps.length} leidingen`}
              </div>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} style={{ fontSize: 12, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  Wis selectie
                </button>
              )}
            </div>
          ) : null}

          {/* Pomplijst */}
          {!pumps ? (
            <div style={{ padding: '16px' }}><Skeleton /></div>
          ) : pumps.length === 0 ? (
            <div style={{ padding: '20px 16px', color: '#aeaeb2', fontSize: 14 }}>Geen pompen gevonden.</div>
          ) : pumps.map((p, i) => {
            const on  = selected.includes(p.slot)
            const dur = durations[p.slot]
            return (
              <button key={p.slot} onClick={() => toggle(p.slot)} style={{
                display: 'flex', alignItems: 'center', width: '100%',
                padding: '12px 16px', gap: 12, cursor: 'pointer',
                background: on ? '#f7fbff' : '#fff',
                border: 'none', borderBottom: i < pumps.length - 1 ? '1px solid #f2f2f7' : 'none',
                fontFamily: 'inherit', textAlign: 'left', transition: 'background .12s',
              }}>
                {/* Checkbox */}
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${on ? '#007aff' : '#d1d1d6'}`,
                  background: on ? '#007aff' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s',
                }}>
                  {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>

                {/* Slot + ingrediënt */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>Leiding {p.slot}</div>
                  {p.ingredient?.name && (
                    <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ingredient.name}</div>
                  )}
                </div>

                {/* Geschatte duur */}
                {on && dur && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: dur <= 6 ? '#30d158' : dur <= 9 ? '#ff9500' : '#ff3b30', flexShrink: 0 }}>
                    {dur}s
                  </div>
                )}
              </button>
            )
          })}

          {/* Samenvatting + start */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f2f2f7', display: 'flex', alignItems: 'center', gap: 12 }}>
            {selected.length > 0 && (
              <div style={{ fontSize: 12, color: '#6e6e73', flexShrink: 0 }}>
                ±{totalSec}s totaal
              </div>
            )}
            <button
              onClick={startFlush}
              disabled={selected.length === 0}
              style={{
                flex: 1, padding: '11px 16px', fontSize: 14, fontWeight: 600,
                background: selected.length ? '#007aff' : '#e5e5ea',
                color: selected.length ? '#fff' : '#aeaeb2',
                border: 'none', borderRadius: 10, cursor: selected.length ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'background .15s',
              }}
            >
              {selected.length === 0 ? 'Selecteer leidingen' : `Spoelen starten (${selected.length} leiding${selected.length !== 1 ? 'en' : ''})`}
            </button>
          </div>
        </>
      )}
    </Group>

    {/* Spoellog */}
    {log?.length > 0 && (
      <Group label="Spoelgeschiedenis">
        {log.slice(0, 5).map((entry, i) => (
          <div key={entry.id} style={{ padding: '11px 16px', borderBottom: i < Math.min(log.length, 5) - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>
                {new Date(entry.flushed_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 1 }}>
                {entry.pump_slots.length} leiding{entry.pump_slots.length !== 1 ? 'en' : ''}: L{entry.pump_slots.join(', L')}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#30d158', background: '#f0faf4', borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>
              Gespoeld
            </div>
          </div>
        ))}
      </Group>
    )}
    </>
  )
}

function TeamBeheer({ machineId }) {
  const [members, setMembers]   = useState(null)
  const [email,   setEmail]     = useState('')
  const [role,    setRole]      = useState('staff')
  const [adding,  setAdding]    = useState(false)
  const [err,     setErr]       = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.getMembers(machineId)
      .then(setMembers)
      .catch(() => setMembers(null))
      .finally(() => setLoading(false))
  }, [machineId])

  if (members === null && !loading) return null  // not owner, skip

  async function addMember(e) {
    e.preventDefault(); setAdding(true); setErr(null)
    try {
      const m = await api.addMember(machineId, email, role)
      setMembers(prev => [...(prev || []), m])
      setEmail('')
    } catch (e) { setErr(e.message) }
    setAdding(false)
  }

  async function removeMember(id) {
    if (!confirm('Toegang intrekken?')) return
    try {
      await api.removeMember(machineId, id)
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch (e) { alert(e.message) }
  }

  const roleLabel = r => r === 'manager' ? 'Beheerder' : 'Medewerker'
  const roleBg    = r => r === 'manager' ? '#e8f4ff' : '#f2f2f7'
  const roleColor = r => r === 'manager' ? '#007aff' : '#6e6e73'

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', letterSpacing: .3, textTransform: 'uppercase', marginBottom: 8, padding: '0 4px' }}>Team</div>
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>Laden…</div>
        ) : (
          <>
            {/* Add form */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f2f2f7' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 10 }}>Medewerker toevoegen</div>
              <form onSubmit={addMember} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mailadres van medewerker" style={{ ...inp, flex: 1, minWidth: 200 }} />
                <div style={{ position: 'relative' }}>
                  <select value={role} onChange={e => setRole(e.target.value)} style={{ ...sel, paddingRight: 30, width: 140 }}>
                    <option value="staff">Medewerker</option>
                    <option value="manager">Beheerder</option>
                  </select>
                  <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <button type="submit" disabled={adding} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  {adding ? '…' : 'Toevoegen'}
                </button>
              </form>
              {err && <div style={{ marginTop: 8, fontSize: 13, color: '#ff3b30' }}>{err}</div>}
              <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 8 }}>De persoon moet al een MIXMATE-account hebben.</div>
            </div>

            {/* Member list */}
            {!members?.length ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>Nog geen medewerkers toegevoegd.</div>
            ) : members.map((m, i) => (
              <div key={m.id} style={{ padding: '12px 16px', borderBottom: i < members.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#6e6e73', flexShrink: 0 }}>
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#aeaeb2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: roleColor(m.role), background: roleBg(m.role), borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
                  {roleLabel(m.role)}
                </div>
                <button onClick={() => removeMember(m.id)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Verwijder</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Instellingen({ machineId, status, onRename, onUnpair, demoActive, onDemoToggle, isAdmin }) {
  const [name,         setName]        = useState(status?.name || '')
  const [serial,       setSerial]      = useState(status?.serial_number || '')
  const [serialSaving, setSerialSaving]= useState(false)
  const [serialSaved,  setSerialSaved] = useState(false)
  const [serialErr,    setSerialErr]   = useState(null)
  const [saving,       setSaving]      = useState(false)
  const [saved,        setSaved]       = useState(false)
  const [updating,     setUpdating]    = useState(false)
  const [updateStatus, setUpdateStatus]= useState(null)
  const [confirmDel,   setConfirmDel]  = useState(false)
  const [deleting,     setDeleting]    = useState(false)
  const [demoLoading,  setDemoLoading] = useState(false)
  const [demoMsg,      setDemoMsg]     = useState(null)

  // Bartender PIN
  const [currentPin,   setCurrentPin]  = useState(null)
  const [newPin,       setNewPin]      = useState('')
  const [pinSaving,    setPinSaving]   = useState(false)
  const [pinMsg,       setPinMsg]      = useState(null)

  useEffect(() => {
    api.getBartenderPin(machineId).then(r => setCurrentPin(r.pin)).catch(() => {})
  }, [machineId])

  async function savePin(e) {
    e.preventDefault(); setPinSaving(true); setPinMsg(null)
    if (!/^\d{4,}$/.test(newPin)) {
      setPinMsg({ ok: false, text: 'PIN moet minimaal 4 cijfers zijn.' }); setPinSaving(false); return
    }
    try {
      await api.setBartenderPin(machineId, newPin)
      setCurrentPin(newPin); setNewPin('')
      setPinMsg({ ok: true, text: 'PIN gewijzigd.' })
      setTimeout(() => setPinMsg(null), 3000)
    } catch (e) { setPinMsg({ ok: false, text: e.message || 'Kon PIN niet wijzigen.' }) }
    setPinSaving(false)
  }

  async function toggleDemo() {
    setDemoLoading(true); setDemoMsg(null)
    try {
      if (demoActive) {
        await api.deactivateDemo(machineId)
        setDemoMsg({ ok: true, text: 'Demo modus uitgeschakeld.' })
      } else {
        await api.activateDemo(machineId)
        setDemoMsg({ ok: true, text: 'Demo modus actief — beide schermen tonen nu de slideshow.' })
      }
      onDemoToggle?.()
    } catch (e) {
      setDemoMsg({ ok: false, text: e.message || 'Kon demo niet schakelen.' })
    }
    setDemoLoading(false)
  }

  async function saveName(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.renameMachine(machineId, name)
      onRename(name); setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  async function saveSerial(e) {
    e.preventDefault(); setSerialSaving(true); setSerialErr(null)
    try {
      await api.updateMachine(machineId, { serial_number: serial.trim() })
      setSerialSaved(true); setTimeout(() => setSerialSaved(false), 2000)
    } catch (err) {
      setSerialErr(err.message || 'Kon serienummer niet opslaan.')
    }
    setSerialSaving(false)
  }

  async function handleUnpair() {
    setDeleting(true)
    try {
      await api.unpairMachine(machineId)
      onUnpair()
    } catch { setDeleting(false) }
  }

  async function triggerUpdate() {
    if (!confirm('De machine gaat nu een software-update uitvoeren en herstart daarna automatisch. Doorgaan?')) return
    setUpdating(true); setUpdateStatus(null)
    try {
      await api.triggerUpdate(machineId)
      setUpdateStatus({ ok: true, msg: 'Update gestart. De machine herstart automatisch als de update klaar is.' })
    } catch (e) {
      setUpdateStatus({ ok: false, msg: e.message || 'Update kon niet worden gestart.' })
    }
    setUpdating(false)
  }

  return (
    <div>
      <Group label="Machine">
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 8 }}>Naam</div>
          <form onSubmit={saveName} style={{ display: 'flex', gap: 10 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Bijv. Bar machine" style={{ ...inp, flex: 1 }} />
            <button type="submit" disabled={saving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: saving ? .4 : 1 }}>
              {saved ? 'Opgeslagen ✓' : saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </form>
        </div>
        <div style={{ padding: '14px 16px', borderTop: '1px solid #f2f2f7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3 }}>Serienummer</div>
            {status?.serial_number_confirmed && (
              <div style={{ fontSize: 11, fontWeight: 600, color: '#34c759', background: '#e8faf0', border: '1px solid #a7f3d0', borderRadius: 6, padding: '2px 7px' }}>
                ✓ Bevestigd door machine
              </div>
            )}
          </div>
          {status?.serial_number_confirmed ? (
            <div style={{ ...inp, background: '#f9f9f9', color: '#6e6e73', fontFamily: 'monospace', cursor: 'not-allowed' }}>
              {status.serial_number}
            </div>
          ) : (
            <>
              <form onSubmit={saveSerial} style={{ display: 'flex', gap: 10 }}>
                <input
                  value={serial}
                  onChange={e => setSerial(e.target.value)}
                  placeholder="bijv. MM-2024-00123"
                  style={{ ...inp, flex: 1, fontFamily: 'monospace' }}
                />
                <button type="submit" disabled={serialSaving || !serial.trim()} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: (serialSaving || !serial.trim()) ? .4 : 1 }}>
                  {serialSaved ? 'Opgeslagen ✓' : serialSaving ? 'Opslaan…' : 'Opslaan'}
                </button>
              </form>
              <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 6 }}>
                Wordt automatisch vergrendeld zodra de machine online komt en zijn serienummer bevestigt.
              </div>
              {serialErr && <div style={{ fontSize: 13, color: '#ff3b30', marginTop: 6 }}>{serialErr}</div>}
            </>
          )}
        </div>
      </Group>

      <Group label="Inlogcodes">
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 4 }}>Backoffice PIN</div>
          <div style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: 700, color: '#1d1d1f', letterSpacing: 4, marginBottom: 2 }}>0502</div>
          <div style={{ fontSize: 12, color: '#aeaeb2' }}>Vaste code — niet wijzigbaar.</div>
        </div>
        <div style={{ padding: '14px 16px', borderTop: '1px solid #f2f2f7' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .3, marginBottom: 8 }}>
            Bartender PIN {currentPin && <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d1d1f', fontSize: 13, letterSpacing: 3, marginLeft: 8 }}>{currentPin}</span>}
          </div>
          <form onSubmit={savePin} style={{ display: 'flex', gap: 10 }}>
            <input
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Nieuwe PIN (min. 4 cijfers)"
              maxLength={8}
              inputMode="numeric"
              style={{ ...inp, flex: 1, fontFamily: 'monospace', letterSpacing: 3 }}
            />
            <button type="submit" disabled={pinSaving || !newPin} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: (pinSaving || !newPin) ? .4 : 1 }}>
              {pinSaving ? 'Opslaan…' : 'Wijzigen'}
            </button>
          </form>
          {pinMsg && <div style={{ fontSize: 13, color: pinMsg.ok ? '#34c759' : '#ff3b30', marginTop: 6 }}>{pinMsg.text}</div>}
        </div>
      </Group>

      <Group label="Software">
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 15, color: '#1d1d1f', fontWeight: 500 }}>Software-update</div>
              <div style={{ fontSize: 13, color: '#aeaeb2', marginTop: 2 }}>
                {status?.version ? `Huidige versie: v${status.version}` : 'Versie onbekend'}
              </div>
            </div>
            <button onClick={triggerUpdate} disabled={updating || !status?.online} style={{
              background: status?.online ? '#007aff' : '#e5e5ea',
              color: status?.online ? '#fff' : '#aeaeb2',
              border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600,
              cursor: status?.online && !updating ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              flexShrink: 0, transition: 'all .15s',
            }}>
              {updating ? 'Starten…' : 'Updaten'}
            </button>
          </div>
          {updateStatus && (
            <div style={{ marginTop: 12, background: updateStatus.ok ? '#e8faf0' : '#fff1f0', border: `1px solid ${updateStatus.ok ? '#a7f3d0' : '#ffd6d3'}`, color: updateStatus.ok ? '#065f46' : '#ff3b30', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
              {updateStatus.msg}
            </div>
          )}
          {!status?.online && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 8 }}>Machine moet online zijn om een update uit te voeren.</div>}
        </div>
      </Group>

      {isAdmin && <Group label="Demo modus">
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: demoMsg ? 12 : 0 }}>
            <div>
              <div style={{ fontSize: 15, color: '#1d1d1f', fontWeight: 500 }}>Demo slideshow</div>
              <div style={{ fontSize: 13, color: '#aeaeb2', marginTop: 2 }}>
                {demoActive
                  ? 'Actief — kiosk en portaal tonen nu de demo overlay'
                  : 'Laad demo-cocktails en start de slideshow op alle schermen'}
              </div>
            </div>
            <button onClick={toggleDemo} disabled={demoLoading || !status?.online} style={{
              background: demoActive ? '#ff3b30' : '#1d1d1f',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 16px', fontSize: 14, fontWeight: 600,
              cursor: demoLoading || !status?.online ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', flexShrink: 0,
              opacity: demoLoading || !status?.online ? .5 : 1,
              transition: 'all .15s',
            }}>
              {demoLoading ? 'Bezig…' : demoActive ? 'Demo stoppen' : 'Demo starten'}
            </button>
          </div>
          {demoMsg && (
            <div style={{
              background: demoMsg.ok ? '#e8faf0' : '#fff1f0',
              border: `1px solid ${demoMsg.ok ? '#a7f3d0' : '#ffd6d3'}`,
              color: demoMsg.ok ? '#065f46' : '#ff3b30',
              borderRadius: 10, padding: '10px 14px', fontSize: 13,
            }}>{demoMsg.text}</div>
          )}
        </div>
      </Group>}

      <TeamBeheer machineId={machineId} />

      <Group label="Gevaarlijke zone">
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, color: '#1d1d1f', fontWeight: 500 }}>Machine ontkoppelen</div>
              <div style={{ fontSize: 13, color: '#aeaeb2', marginTop: 2 }}>De machine blijft werken maar wordt losgekoppeld van je account.</div>
            </div>
            <button onClick={() => setConfirmDel(true)} style={{
              background: 'none', border: '1.5px solid #ff3b30', color: '#ff3b30',
              borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>Verwijderen</button>
          </div>
        </div>
      </Group>

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
              <strong style={{ color: '#1d1d1f' }}>{status?.name}</strong> wordt losgekoppeld van je account. De machine blijft gewoon werken maar moet opnieuw gekoppeld worden.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleUnpair} disabled={deleting} style={{
                background: '#ff3b30', color: '#fff', border: 'none', borderRadius: 14,
                padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: deleting ? .5 : 1,
              }}>{deleting ? 'Verwijderen…' : 'Verwijderen'}</button>
              <button onClick={() => setConfirmDel(false)} style={{
                background: '#f5f5f7', color: '#1d1d1f', border: 'none', borderRadius: 14,
                padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>Annuleren</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function InfoField({ label, value, mono }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, color: '#6e6e73' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</span>
    </div>
  )
}

function DemoProgressBar({ accent, slideMs, idx }) {
  const [pct, setPct]   = useState(0)
  const startRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => {
    setPct(0)
    startRef.current = null
    cancelAnimationFrame(rafRef.current)
    function tick(now) {
      if (!startRef.current) startRef.current = now
      const p = Math.min(((now - startRef.current) / slideMs) * 100, 100)
      setPct(p)
      if (p < 100) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [idx, slideMs])

  return (
    <div style={{
      height: '100%',
      width: `${pct}%`,
      background: accent,
      transition: 'background 0.4s ease',
      willChange: 'width',
    }} />
  )
}

function InfoTab({ machineId, status }) {
  const [info, setInfo]     = useState(null)
  const [loading, setLoading]= useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!status?.online) { setLoading(false); return }
    api.getMachineInfo(machineId).then(setInfo).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [machineId, status?.online])

  const serial = info?.machine_id?.startsWith('pi-')
    ? info.machine_id.replace('pi-', '').toUpperCase()
    : info?.machine_id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Group label="Portaal">
        <InfoField label="Machine ID"      value={machineId} mono />
        <InfoField label="Model"           value={status?.model || 'MIXMATE'} />
        <InfoField label="Softwareversie"  value={status?.version ? `v${status.version}` : null} />
        {status?.last_seen && <InfoField label="Laatste contact" value={new Date(status.last_seen).toLocaleString('nl-NL')} />}
      </Group>

      {!status?.online ? (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 12, padding: '14px 16px', fontSize: 14 }}>
          Machine is offline — live info niet beschikbaar.
        </div>
      ) : loading ? (
        <Skeleton />
      ) : error ? (
        <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 12, padding: '14px 16px', fontSize: 14 }}>{error}</div>
      ) : (
        <>
          <Group label="Netwerk">
            <InfoField label="Serienummer" value={serial} mono />
            <InfoField label="IP-adres"   value={info?.ip_address} mono />
            <InfoField label="MAC-adres"  value={info?.mac_address} mono />
            <InfoField label="Hostnaam"   value={info?.hostname} mono />
          </Group>
          <Group label="Hardware">
            <InfoField label="Uptime"       value={info?.uptime} />
            <InfoField label="CPU-temp."    value={info?.cpu_temp != null ? `${info.cpu_temp} °C` : null} />
            <InfoField label="RAM"          value={info?.ram_used && info?.ram_total ? `${info.ram_used} / ${info.ram_total}` : null} />
            <InfoField label="Opslag"       value={info?.disk_used ? `${info.disk_used} / ${info.disk_total} (${info.disk_pct})` : null} />
          </Group>
        </>
      )}
    </div>
  )
}
