import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Verbinding opslaan / lezen
// conn = {mode:'cloud', machineId:'...'} | {mode:'local', url:'https://mixmate.local:8000'}
// ─────────────────────────────────────────────────────────────────────────────

const CONN_KEY = 'mm_tap_conn'
function getConn()   { try { return JSON.parse(localStorage.getItem(CONN_KEY)) } catch { return null } }
function saveConn(c) { localStorage.setItem(CONN_KEY, JSON.stringify(c)) }
function clearConn() { localStorage.removeItem(CONN_KEY); sessionStorage.removeItem('mm_tap_auth') }

// ─────────────────────────────────────────────────────────────────────────────
// API – werkt in cloud- en lokale modus
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch(method, path, body) {
  const conn = getConn()
  if (!conn) throw new Error('Geen verbinding')
  const url = conn.mode === 'local'
    ? `${conn.url}/api${path}`
    : `/api/machineapp/${conn.machineId}/proxy${path}`
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const machineApi = {
  verifyPin:      (pin)  => apiFetch('POST', '/auth/verify-pin', { pin }),
  getRecipes:     ()     => apiFetch('GET',  '/recipes'),
  getGlasses:     ()     => apiFetch('GET',  '/glasses'),
  getCategories:  ()     => apiFetch('GET',  '/categories'),
  cancelPour:     ()     => apiFetch('POST', '/pour/cancel'),
  createPour:     (data) => apiFetch('POST', '/pours', data),
  getFavorites:   ()     => apiFetch('GET',  '/favorites'),
  addFavorite:    (id)   => apiFetch('POST', `/favorites/${id}`),
  removeFavorite: (id)   => apiFetch('DELETE', `/favorites/${id}`),
}

function createPourSocket(recipeId, scale, onMessage) {
  const conn  = getConn()
  let ws
  if (conn.mode === 'local') {
    const wsUrl = conn.url.replace(/^https/, 'wss').replace(/^http/, 'ws')
    const param = scale && scale !== 1.0 ? `?scale=${scale.toFixed(4)}` : ''
    ws = new WebSocket(`${wsUrl}/ws/pour/${recipeId}${param}`)
  } else {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${proto}://${window.location.host}/ws/machineapp/${conn.machineId}/pour`)
    ws.onopen = () => ws.send(JSON.stringify({ recipe_id: recipeId, scale }))
  }
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  return ws
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(145deg,#1a0533,#4a0e6e)',
  'linear-gradient(145deg,#0d2137,#0f5c8a)',
  'linear-gradient(145deg,#1a1a0a,#4a4200)',
  'linear-gradient(145deg,#0d1f0d,#1a5c1a)',
  'linear-gradient(145deg,#2d0a0a,#7a1515)',
  'linear-gradient(145deg,#001a2d,#004466)',
  'linear-gradient(145deg,#1a0d2e,#3d1f6e)',
  'linear-gradient(145deg,#0a1a0a,#1a4d2e)',
]
function gradientFor(name) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

const CACHE_KEY = 'mm_machineapp_recipes_cache'

const GLOBAL_STYLES = `
  @keyframes modalIn { from{opacity:0} to{opacity:1} }
  @keyframes doneRing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.7);opacity:0} }
  @keyframes heartPop { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 70%{transform:scale(0.9)} 100%{transform:scale(1)} }
  @keyframes pourPulse { 0%,100%{opacity:1} 50%{opacity:.65} }
  @keyframes skeletonShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', aspectRatio: '3/4', background: '#f0f0f0' }}>
      <div style={{ flex: 1, background: 'linear-gradient(90deg,#e5e5ea 25%,#f0f0f5 50%,#e5e5ea 75%)', backgroundSize: '200% 100%', animation: 'skeletonShimmer 1.4s infinite' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pour modal
// ─────────────────────────────────────────────────────────────────────────────

const PS = { MANUAL: 'manual', CONFIRM: 'confirm', POURING: 'pouring', DONE: 'done', ERROR: 'error' }

function PourModal({ recipe, glasses, onClose }) {
  const manualIngredients = recipe.ingredients.filter(i => !i.has_pump)
  const autoIngredients   = recipe.ingredients.filter(i =>  i.has_pump)
  const hasManual = manualIngredients.length > 0
  const hasAuto   = autoIngredients.length   > 0

  const defaultGlass = glasses.find(g => g.id === recipe.glass_id) || (glasses.length > 0 ? glasses[0] : null)
  const [selectedGlass, setSelectedGlass] = useState(defaultGlass)
  const scaleFactor = selectedGlass && recipe.total_volume_ml > 0
    ? selectedGlass.volume_ml / recipe.total_volume_ml : 1.0
  const scale = Math.round(scaleFactor * 1000) / 1000
  function scaledMl(ml) { const v = ml * scale; return v % 1 === 0 ? v : v.toFixed(1) }

  const [glassPickerOpen, setGlassPickerOpen] = useState(false)
  const firstStep = hasManual ? PS.MANUAL : PS.CONFIRM
  const [status, setStatus] = useState(firstStep)
  const [progress, setProgress] = useState(null)
  const [showDoneRing, setShowDoneRing] = useState(false)
  const wsRef = useRef(null)
  const pourLogged = useRef(false)

  function logPour() {
    if (pourLogged.current) return
    pourLogged.current = true
    machineApi.createPour({ recipe_id: recipe.id, recipe_name: recipe.name, scale }).catch(() => {})
  }

  function finishDone() { setStatus(PS.DONE); setShowDoneRing(true); logPour() }

  function startPour() {
    if (!hasAuto) { finishDone(); return }
    setStatus(PS.POURING)
    const ws = createPourSocket(recipe.id, scale !== 1.0 ? scale : 1.0, msg => {
      if (msg.type === 'progress') setProgress(msg)
      else if (msg.type === 'done') { finishDone() }
      else if (msg.type === 'error') { setStatus(PS.ERROR); setProgress(p => ({ ...p, error: msg.message })) }
    })
    wsRef.current = ws
  }

  function cancel() { machineApi.cancelPour(); wsRef.current?.close(); onClose() }

  const pct = progress ? Math.round(progress.total_progress * 100) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', animation: 'modalIn 0.18s ease-out' }}>
      <div style={{ borderRadius: 24, width: '100%', maxWidth: 440, margin: '0 16px', overflow: 'hidden', background: '#fff', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>

        {/* Header met afbeelding */}
        <div style={{ height: 192, position: 'relative', overflow: 'hidden' }}>
          {recipe.image_url
            ? <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: gradientFor(recipe.name) }} />
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>✕</button>
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 56 }}>
            {recipe.category_name && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 2px' }}>{recipe.category_name}</p>
            )}
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 24, margin: '0 0 6px', letterSpacing: -0.3, lineHeight: 1.15 }}>{recipe.name}</h2>
            {glasses.length > 0 && status !== PS.POURING && status !== PS.DONE && (
              <button onClick={() => setGlassPickerOpen(v => !v)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }}>
                <svg viewBox="0 0 24 32" style={{ width: 10, height: 12 }} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2L2 20l20 0L20 2Z" strokeLinejoin="round"/><line x1="12" y1="20" x2="12" y2="27"/><line x1="8" y1="27" x2="16" y2="27"/></svg>
                {selectedGlass ? `${selectedGlass.name} · ${selectedGlass.volume_ml} ml` : 'Standaard'}
                {scale !== 1.0 && <span style={{ color: 'rgba(255,255,255,0.4)' }}>({scale > 1 ? '+' : ''}{Math.round((scale - 1) * 100)}%)</span>}
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>· Wijzig</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Inline glaspicker */}
          {glassPickerOpen && (
            <div style={{ borderRadius: 16, border: '1px solid #f0f0f0', background: '#f8f8f8', padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {glasses.map(g => (
                  <button key={g.id} onClick={() => { setSelectedGlass(g); setGlassPickerOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `2px solid ${selectedGlass?.id === g.id ? '#111' : '#e0e0e0'}`, background: selectedGlass?.id === g.id ? '#111' : '#fff', color: selectedGlass?.id === g.id ? '#fff' : '#333', cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s', fontFamily: 'inherit' }}>
                    <svg viewBox="0 0 24 32" style={{ width: 14, height: 18, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2L2 20l20 0L20 2Z" strokeLinejoin="round"/><line x1="12" y1="20" x2="12" y2="27"/><line x1="8" y1="27" x2="16" y2="27"/></svg>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{g.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>{g.volume_ml} ml</div>
                    </div>
                  </button>
                ))}
                <button onClick={() => { setSelectedGlass(null); setGlassPickerOpen(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 14px', borderRadius: 12, border: '2px dashed #e0e0e0', background: '#fff', color: '#aaa', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Standaard</button>
              </div>
            </div>
          )}

          {/* Handmatige ingrediënten */}
          {status === PS.MANUAL && (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8e8e93', margin: 0 }}>Handmatig toevoegen</p>
              <div style={{ borderRadius: 16, padding: 16, background: '#fff8ed', border: '1px solid #fde8b6', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {manualIngredients.map(ing => (
                  <div key={ing.ingredient_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ minWidth: 52, textAlign: 'right', fontWeight: 700, color: '#b07800', fontSize: 15, flexShrink: 0 }}>{scaledMl(ing.amount_ml)}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 1 }}>ml</span></span>
                    <span style={{ fontSize: 14, color: '#7a4f00', fontWeight: 500 }}>{ing.ingredient_name}</span>
                  </div>
                ))}
              </div>
              {hasAuto && <p style={{ textAlign: 'center', fontSize: 12, color: '#aeaeb2', margin: 0 }}>De machine vult de rest automatisch aan.</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={onClose} style={btnOutline}>Annuleer</button>
                <button onClick={() => setStatus(PS.CONFIRM)} style={btnDark}>{hasAuto ? 'Gedaan →' : 'Gereed'}</button>
              </div>
            </>
          )}

          {/* Bevestiging */}
          {status === PS.CONFIRM && (
            <>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#6e6e73', margin: 0 }}>Zet het glas onder de uitloop</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {recipe.ingredients.map(ing => (
                  <span key={ing.ingredient_id} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, fontWeight: 500, background: ing.has_pump ? '#f5f5f7' : '#fff8ed', color: ing.has_pump ? '#555' : '#b07800', border: `1px solid ${ing.has_pump ? '#e5e5ea' : '#fde8b6'}` }}>
                    {ing.ingredient_name} <span style={{ opacity: 0.5 }}>{scaledMl(ing.amount_ml)}ml</span>
                    {!ing.has_pump && <span style={{ marginLeft: 4, color: '#ff9f0a' }}>✓</span>}
                  </span>
                ))}
              </div>
              {!hasAuto
                ? <p style={{ textAlign: 'center', fontSize: 13, color: '#aeaeb2', margin: 0 }}>Alle ingrediënten zijn handmatig toegevoegd.</p>
                : <p style={{ textAlign: 'center', fontSize: 12, color: '#aeaeb2', margin: 0 }}>Zet het glas onder de machine en druk op maken.</p>
              }
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={onClose} style={btnOutline}>Annuleer</button>
                <button onClick={hasAuto ? startPour : finishDone} style={btnDark}>{hasAuto ? 'Maken' : 'Klaar!'}</button>
              </div>
            </>
          )}

          {/* Gieten */}
          {status === PS.POURING && (
            <>
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aeaeb2', margin: '0 0 4px', fontWeight: 600 }}>Bezig met</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#1c1c1e', margin: 0, letterSpacing: -0.3, transition: 'color 0.5s, opacity 0.5s' }}>{progress?.step_name || '…'}</p>
                {progress?.mode === 'weight' && (
                  <p style={{ color: '#30d158', fontSize: 12, marginTop: 4, letterSpacing: 0.3 }}>Weegmodus actief</p>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {autoIngredients.map(ing => {
                  const active = progress?.step_name === ing.ingredient_name
                  return (
                    <span key={ing.ingredient_id} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, fontWeight: 500, transition: 'all 0.4s', background: active ? '#111' : '#f5f5f7', color: active ? '#fff' : '#c7c7cc', border: `1px solid ${active ? '#111' : '#e5e5ea'}`, animation: active ? 'pourPulse 1.2s ease-in-out infinite' : 'none' }}>
                      {ing.ingredient_name}
                      <span style={{ opacity: 0.4, marginLeft: 4 }}>{scaledMl(ing.amount_ml)}ml</span>
                    </span>
                  )
                })}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#aeaeb2', fontWeight: 500 }}>Voortgang</span>
                  <span style={{ color: '#1c1c1e', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#111', borderRadius: 3, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              <button onClick={cancel} style={btnOutline}>Stoppen</button>
            </>
          )}

          {/* Klaar */}
          {status === PS.DONE && (
            <div style={{ textAlign: 'center', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showDoneRing && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#dcfce7', animation: 'doneRing 0.6s ease-out forwards' }} />}
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                </div>
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 22, color: '#1c1c1e', margin: '0 0 4px', letterSpacing: -0.3 }}>{recipe.name}</p>
                {selectedGlass && <p style={{ fontSize: 13, color: '#aeaeb2', margin: '0 0 4px' }}>{selectedGlass.name}</p>}
                <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>Smakelijk!</p>
              </div>
              <button onClick={onClose} style={{ ...btnDark, width: '100%' }}>Sluiten</button>
            </div>
          )}

          {status === PS.ERROR && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: '#ef4444', textAlign: 'center', fontSize: 14 }}>{progress?.error}</p>
              <button onClick={onClose} style={btnOutline}>Sluiten</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const btnDark    = { flex: 1, padding: '14px 0', borderRadius: 14, background: '#111', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.2 }
const btnOutline = { flex: 1, padding: '14px 0', borderRadius: 14, background: '#fff', color: '#8e8e93', border: '1px solid #e5e5ea', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }

// ─────────────────────────────────────────────────────────────────────────────
// Heart button
// ─────────────────────────────────────────────────────────────────────────────

function HeartButton({ active, onToggle }) {
  const [popping, setPopping] = useState(false)
  function handle(e) {
    e.stopPropagation()
    if (window.__dragScrollDidScroll?.()) return
    setPopping(true)
    setTimeout(() => setPopping(false), 360)
    onToggle()
  }
  return (
    <button
      onTouchEnd={e => { e.preventDefault(); handle(e) }}
      onClick={handle}
      style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', animation: popping ? 'heartPop 0.36s ease' : 'none' }}
      aria-label="Favoriet"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? '#ff5a7a' : 'none'} stroke={active ? '#ff5a7a' : 'rgba(255,255,255,0.85)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Afbeelding met gradient fallback
// ─────────────────────────────────────────────────────────────────────────────

function ImageWithFallback({ recipe }) {
  const [failed, setFailed] = useState(false)
  if (!recipe.image_url || failed) {
    return <div style={{ width: '100%', height: 160, background: gradientFor(recipe.name) }} />
  }
  return (
    <div style={{ width: '100%', height: 160, overflow: 'hidden' }}>
      <img src={recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cocktail kaart
// ─────────────────────────────────────────────────────────────────────────────

function CocktailCard({ recipe, onMake, isFavorite, onToggleFavorite, isPopular }) {
  const canMake = recipe.partially_available
  const [pressed, setPressed] = useState(false)

  return (
    <div
      onTouchEnd={e => { if (!window.__dragScrollDidScroll?.() && canMake) { e.preventDefault(); onMake(recipe) } }}
      onTouchStart={() => canMake && setPressed(true)}
      onTouchCancel={() => setPressed(false)}
      onTouchEndCapture={() => setPressed(false)}
      onClick={() => { if (!window.__dragScrollDidScroll?.() && canMake) onMake(recipe) }}
      style={{
        position: 'relative',
        width: '100%',
        textAlign: 'left',
        borderRadius: 24,
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
        opacity: canMake ? 1 : 0.3,
        cursor: canMake ? 'pointer' : 'default',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.1s ease',
        userSelect: 'none',
      }}
    >
      <div style={{ position: 'relative' }}>
        <ImageWithFallback recipe={recipe} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 12, left: 14, display: 'flex', gap: 6 }}>
          {recipe.category_name && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.32)', padding: '3px 8px', borderRadius: 20 }}>{recipe.category_name}</div>
          )}
          {isPopular && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#fff', background: 'rgba(255,149,0,0.85)', padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>★ Populair</div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: '#1c1c1e', marginBottom: 10, lineHeight: 1.2 }}>{recipe.name}</h3>

        {canMake && (
          <div style={{ marginBottom: 10 }}>
            {recipe.fully_automatic ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: 'rgba(48,209,88,0.12)', color: '#30d158', border: '1px solid rgba(48,209,88,0.2)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#30d158', display: 'inline-block' }} />
                Automatisch
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', border: '1px solid rgba(255,159,10,0.2)' }}>
                Deels handmatig
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(recipe.ingredients || []).slice(0, 4).map(ing => (
            <span key={ing.ingredient_id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, color: '#8e8e93', background: '#f5f5f7', border: '1px solid #e5e5ea' }}>
              {ing.ingredient_name}
            </span>
          ))}
        </div>
      </div>

      <HeartButton active={isFavorite} onToggle={() => onToggleFavorite(recipe.id)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Swipeable pages (iPhone-stijl)
// ─────────────────────────────────────────────────────────────────────────────

function SwipeablePages({ items, renderItem, pageKey }) {
  const COLS = 3, ROWS = 2, PER_PAGE = COLS * ROWS

  const pages = []
  for (let i = 0; i < items.length; i += PER_PAGE) pages.push(items.slice(i, i + PER_PAGE))

  const [page, setPage]             = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef  = useRef(null)
  const widthRef      = useRef(0)
  const pageRef       = useRef(0)
  const pagesLenRef   = useRef(pages.length)
  const touchStartRef = useRef(null)
  const isDraggingRef = useRef(false)

  useEffect(() => { pageRef.current = page }, [page])
  useEffect(() => { pagesLenRef.current = pages.length })
  useEffect(() => { setPage(0) }, [pageKey])

  useLayoutEffect(() => {
    if (containerRef.current) widthRef.current = containerRef.current.offsetWidth
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onMove(e) {
      if (!touchStartRef.current) return
      const dx = e.touches[0].clientX - touchStartRef.current.x
      const dy = e.touches[0].clientY - touchStartRef.current.y
      if (!isDraggingRef.current) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) isDraggingRef.current = true
        else if (Math.abs(dy) > 8) { touchStartRef.current = null; return }
        else return
      }
      if (isDraggingRef.current) {
        e.preventDefault()
        window.__dragScrollDidScroll = () => true
        const p = pageRef.current, n = pagesLenRef.current
        const rubber = (p === 0 && dx > 0) || (p === n - 1 && dx < 0)
        setDragOffset(rubber ? dx * 0.2 : dx)
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])

  function onTouchStart(e) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    isDraggingRef.current = false
    window.__dragScrollDidScroll = () => false
  }

  function onTouchEnd() {
    if (isDraggingRef.current) {
      if (dragOffset < -60 && pageRef.current < pagesLenRef.current - 1) setPage(p => p + 1)
      else if (dragOffset > 60 && pageRef.current > 0) setPage(p => p - 1)
      setDragOffset(0)
      setTimeout(() => { window.__dragScrollDidScroll = () => false }, 350)
    }
    isDraggingRef.current = false
    touchStartRef.current = null
  }

  const slideX = widthRef.current ? -(page * widthRef.current) + dragOffset : 0

  function NavArrow({ dir }) {
    const canGo = dir === 'left' ? page > 0 : page < pages.length - 1
    return (
      <button
        onClick={() => canGo && setPage(p => p + (dir === 'left' ? -1 : 1))}
        onTouchEnd={e => { e.preventDefault(); canGo && setPage(p => p + (dir === 'left' ? -1 : 1)) }}
        style={{ flexShrink: 0, width: 36, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: canGo ? 'pointer' : 'default', opacity: canGo ? 1 : 0.15, transition: 'opacity 0.2s', color: '#1c1c1e' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
        </svg>
      </button>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavArrow dir="left" />
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', minHeight: 0 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div style={{ display: 'flex', height: '100%', transform: `translateX(${slideX}px)`, transition: isDraggingRef.current ? 'none' : 'transform 0.38s cubic-bezier(0.25,1,0.5,1)', willChange: 'transform' }}>
            {pages.map((pageItems, pi) => (
              <div key={pi} style={{ flexShrink: 0, width: widthRef.current || '100%', height: '100%', display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: 20 }}>
                {pageItems.map((item, ii) => renderItem(item, pi * PER_PAGE + ii))}
              </div>
            ))}
          </div>
        </div>
        <NavArrow dir="right" />
      </div>
      {pages.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 0 0', flexShrink: 0 }}>
          {pages.map((_, i) => (
            <div key={i} onTouchEnd={e => { e.preventDefault(); setPage(i) }} onClick={() => setPage(i)} style={{ width: i === page ? 22 : 6, height: 6, borderRadius: 3, background: '#1c1c1e', opacity: i === page ? 0.65 : 0.18, transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', cursor: 'pointer' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar({ categories, active, onSelect, onLogout, onDisconnect }) {
  const itemRefs = useRef({})
  const [ind, setInd] = useState({ top: 0, height: 0, opacity: 0 })

  useEffect(() => {
    const el = itemRefs.current[active]
    if (!el) return
    const parent = el.closest('ul')
    if (!parent) return
    const pr = parent.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    setInd({ top: er.top - pr.top, height: er.height, opacity: 1 })
  }, [active, categories])

  return (
    <aside style={{ width: 196, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.06)', userSelect: 'none' }}>
      <div style={{ padding: '18px 16px 8px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', color: '#aeaeb2', margin: 0 }}>Categorie</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', touchAction: 'pan-y', minHeight: 0 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: ind.top, height: ind.height, opacity: ind.opacity, background: 'rgba(0,0,0,0.05)', borderRadius: 9, transition: 'top 0.25s cubic-bezier(0.22,1,0.36,1), height 0.25s, opacity 0.18s', pointerEvents: 'none' }} />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
            {categories.map(cat => (
              <li key={cat.value} ref={el => { if (el) itemRefs.current[cat.value] = el }}>
                <button onClick={() => onSelect(cat.value)} style={{ width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: active === cat.value ? 600 : 400, color: active === cat.value ? '#1c1c1e' : '#8e8e93', display: 'flex', alignItems: 'center', gap: 8, transition: 'color 0.12s', fontFamily: 'inherit', letterSpacing: -0.1 }}>
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '10px 8px 16px' }}>
        <button onClick={onLogout} style={{ width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e93', fontSize: 13, fontFamily: 'inherit', transition: 'color 0.12s', display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Uitloggen
        </button>
        <button onClick={onDisconnect} style={{ width: '100%', textAlign: 'left', padding: '7px 11px', borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: '#c7c7cc', fontSize: 12, fontFamily: 'inherit', transition: 'color 0.12s' }}>
          Andere machine
        </button>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Search bar
// ─────────────────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }) {
  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#aeaeb2', pointerEvents: 'none' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      </span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="Zoek op naam of ingrediënt…" style={{ width: '100%', borderRadius: 16, padding: '12px 44px', fontSize: 14, border: '1px solid rgba(0,0,0,0.09)', background: '#f0f0f2', color: '#1c1c1e', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      {value && (
        <button onClick={() => onChange('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 24, height: 24, borderRadius: '50%', border: 'none', background: '#e5e5ea', color: '#8e8e93', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✕</button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Machine dashboard (exacte kopie van Dashboard.jsx stijl)
// ─────────────────────────────────────────────────────────────────────────────

function MachineDashboard({ onLogout, onDisconnect }) {
  const [recipes,        setRecipes]        = useState(() => { try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null') || [] } catch { return [] } })
  const [categories,     setCategories]     = useState([])
  const [glasses,        setGlasses]        = useState([])
  const [favorites,      setFavorites]      = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [search,         setSearch]         = useState('')
  const [making,         setMaking]         = useState(null)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    Promise.all([machineApi.getRecipes(), machineApi.getCategories(), machineApi.getGlasses()])
      .then(([r, c, g]) => {
        setRecipes(r)
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(r))
        setCategories(c)
        setGlasses(g)
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    machineApi.getFavorites()
      .then(f => setFavorites(Array.isArray(f) ? f : []))
      .catch(() => {})
  }, [])

  const favSet = new Set(favorites)

  function toggleFavorite(recipeId) {
    if (window.__dragScrollDidScroll?.()) return
    const isFav = favSet.has(recipeId)
    setFavorites(prev => isFav ? prev.filter(id => id !== recipeId) : [...prev, recipeId])
    const call = isFav ? machineApi.removeFavorite(recipeId) : machineApi.addFavorite(recipeId)
    call.catch(() => setFavorites(prev => isFav ? [...prev, recipeId] : prev.filter(id => id !== recipeId)))
  }

  const sidebarCats = [
    ...(favorites.length > 0 ? [{ value: 'favorites', label: '♥ Favorieten' }] : []),
    { value: 'all', label: 'Alles' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  const term = search.trim().toLowerCase()
  const searching = term.length > 0

  const filtered = recipes.filter(r => {
    if (r.enabled === false) return false
    if (searching) {
      return r.name.toLowerCase().includes(term) || (r.ingredients || []).some(i => i.ingredient_name.toLowerCase().includes(term))
    }
    if (activeCategory === 'favorites') return favSet.has(r.id)
    if (activeCategory === 'all') return true
    // eslint-disable-next-line eqeqeq
    return r.category_id == activeCategory
  })

  return (
    <>
      {making && <PourModal recipe={making} glasses={glasses} onClose={() => setMaking(null)} />}

      <Sidebar
        categories={sidebarCats}
        active={searching ? null : activeCategory}
        onSelect={v => { setSearch(''); setActiveCategory(v) }}
        onLogout={onLogout}
        onDisconnect={onDisconnect}
      />

      <main style={{ flex: 1, background: '#f5f5f7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '32px 32px 16px', flexShrink: 0 }}>
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div style={{ flex: 1, padding: '0 32px 24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {loading && recipes.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#aeaeb2' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/>
              </svg>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#1c1c1e', margin: 0 }}>{searching ? 'Geen resultaten' : 'Geen cocktails gevonden'}</p>
            </div>
          ) : (
            <SwipeablePages
              items={filtered}
              pageKey={activeCategory + term}
              renderItem={(r, i) => (
                <CocktailCard
                  key={r.id}
                  recipe={r}
                  onMake={setMaking}
                  isFavorite={favSet.has(r.id)}
                  onToggleFavorite={toggleFavorite}
                  isPopular={r.pour_count > 0 && i < 3 && activeCategory === 'all' && !searching}
                />
              )}
            />
          )}
        </div>
      </main>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN login
// ─────────────────────────────────────────────────────────────────────────────

function PinLogin({ onSuccess, onBack }) {
  const [pin,   setPin]   = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  async function check(p) {
    setBusy(true); setError('')
    try {
      const r = await machineApi.verifyPin(p)
      if (r.ok) { onSuccess() }
      else { setError('Onjuiste PIN'); setPin('') }
    } catch { setError('Verbindingsfout'); setPin('') }
    setBusy(false)
  }

  function press(d) {
    const next = pin + d; setPin(next)
    if (next.length === 4) check(next)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ width: 280, textAlign: 'center' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#1c1c1e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: -0.3, margin: 0 }}>PIN invoeren</p>
          <p style={{ color: '#555', fontSize: 13, margin: '6px 0 0' }}>Voer de 4-cijferige PIN in</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 28 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: pin.length > i ? '#fff' : 'rgba(255,255,255,0.2)', transition: 'background 0.15s' }} />
          ))}
        </div>
        {error && <p style={{ color: '#ff453a', fontSize: 13, marginBottom: 14 }}>{error}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((d, i) => (
            <button key={i} onClick={() => { if (d === '⌫') { setPin(p => p.slice(0, -1)); setError('') } else if (d !== '') press(String(d)) }}
              disabled={busy || (typeof d === 'number' && pin.length >= 4)}
              style={{ height: 64, borderRadius: 16, fontSize: 22, fontWeight: 700, background: d === '' ? 'transparent' : 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: d === '' ? 'default' : 'pointer', opacity: busy ? 0.5 : 1, fontFamily: 'inherit', transition: 'background 0.1s' }}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onBack} style={{ marginTop: 48, color: '#444', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Andere machine kiezen</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_URL = 'https://mixmate.local:8000'

async function tryLocalMachine() {
  try {
    const r = await fetch(`${LOCAL_URL}/api/system/version`, { signal: AbortSignal.timeout(3000) })
    if (r.ok) {
      const data = await r.json()
      return { source: 'local', url: LOCAL_URL, name: data.model || 'MIXMATE Machine' }
    }
  } catch { /* niet bereikbaar */ }
  return null
}

function Discovery({ onConnected }) {
  const [cloudMachines, setCloudMachines] = useState([])
  const [localMachine,  setLocalMachine]  = useState(null)
  const [certNeeded,    setCertNeeded]    = useState(false)
  const [pairing,       setPairing]       = useState(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const r = await fetch('/api/machineapp/discover')
        if (r.ok && !cancelled) setCloudMachines(await r.json())
      } catch {}
      const loc = await tryLocalMachine()
      if (!cancelled) { setLocalMachine(loc); setLoading(false) }
    }
    poll()
    const t = setInterval(poll, 4000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  useEffect(() => {
    if (localMachine) return
    async function checkCert() {
      try { await fetch(LOCAL_URL, { signal: AbortSignal.timeout(2000), mode: 'no-cors' }); setCertNeeded(false) }
      catch (e) { if (e?.name !== 'AbortError') setCertNeeded(true) }
    }
    checkCert()
  }, [localMachine])

  function connect(conn) {
    setPairing(conn.mode === 'cloud' ? conn.machineId : 'local')
    setTimeout(() => { saveConn(conn); onConnected() }, 900)
  }

  const hasMachines = cloudMachines.length > 0 || localMachine

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: '#1c1c1e', border: '1px solid #2c2c2e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/></svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5 }}>MIXMATE</h1>
          <p style={{ color: '#555', fontSize: 14, margin: 0 }}>
            {loading ? 'Zoeken naar machines…' : hasMachines ? 'Kies een machine om te verbinden' : 'Geen machines gevonden'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {localMachine && (() => {
            const isConnected = pairing === 'local'
            return (
              <button onClick={() => !pairing && connect({ mode: 'local', url: LOCAL_URL })} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#111', border: `1.5px solid ${isConnected ? '#30d158' : '#222'}`, borderRadius: 20, padding: '18px 20px', cursor: pairing ? 'default' : 'pointer', textAlign: 'left', transition: 'border-color 0.3s', width: '100%', fontFamily: 'inherit' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#1c1c1e', border: '1px solid #2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{localMachine.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30d158' }} />
                    <span style={{ color: '#30d158', fontSize: 12, fontWeight: 600 }}>Lokaal netwerk</span>
                  </div>
                </div>
                <span style={{ color: isConnected ? '#30d158' : '#444', fontWeight: 600, fontSize: 13 }}>{isConnected ? '✓ Verbonden' : 'Verbinden →'}</span>
              </button>
            )
          })()}

          {cloudMachines.map(m => {
            const isConnected = pairing === m.machine_id
            return (
              <button key={m.machine_id} onClick={() => !pairing && connect({ mode: 'cloud', machineId: m.machine_id })} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#111', border: `1.5px solid ${isConnected ? '#0a84ff' : '#222'}`, borderRadius: 20, padding: '18px 20px', cursor: pairing ? 'default' : 'pointer', textAlign: 'left', transition: 'border-color 0.3s', width: '100%', fontFamily: 'inherit' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#1c1c1e', border: '1px solid #2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{m.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a84ff' }} />
                    <span style={{ color: '#0a84ff', fontSize: 12, fontWeight: 600 }}>Via cloud</span>
                  </div>
                </div>
                <span style={{ color: isConnected ? '#0a84ff' : '#444', fontWeight: 600, fontSize: 13 }}>{isConnected ? '✓ Verbonden' : 'Verbinden →'}</span>
              </button>
            )
          })}
        </div>

        {!hasMachines && !loading && (
          <div style={{ background: '#111', border: '1px solid #1c1c1e', borderRadius: 20, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>Machine niet gevonden?</p>
              <p style={{ color: '#555', fontSize: 13, margin: 0, lineHeight: 1.6 }}>De machine zoekt automatisch naar WiFi. Als dit de eerste keer is:</p>
            </div>
            {['Verbind tablet met WiFi "MIXMATE-Setup" (wachtwoord: mixmate123)', 'Ga in een browser naar http://10.42.0.1:8000 om WiFi in te stellen', 'Zodra de machine verbonden is met WiFi verschijnt hij hier automatisch'].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1c1c1e', border: '1px solid #2c2c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>{i + 1}</div>
                <p style={{ color: '#666', fontSize: 13, margin: 0, lineHeight: 1.55, paddingTop: 2 }}>{text}</p>
              </div>
            ))}
            {certNeeded && (
              <div style={{ background: '#1c1c1e', borderRadius: 14, padding: 16 }}>
                <p style={{ color: '#ff9f0a', fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>Lokale machine gevonden maar certificaat niet vertrouwd</p>
                <p style={{ color: '#555', fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>Ga eenmalig naar de machine-URL en accepteer het certificaat.</p>
                <a href={LOCAL_URL} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '9px 16px', background: '#ff9f0a', color: '#000', borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Certificaat accepteren →</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header (klok + verbindingsstatus)
// ─────────────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const h = time.getHours().toString().padStart(2, '0')
  const m = time.getMinutes().toString().padStart(2, '0')
  return <span style={{ color: '#1c1c1e', fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5 }}>{h}:{m}</span>
}

function AppHeader() {
  const conn = getConn()
  return (
    <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0, zIndex: 30, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: '#1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/></svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2.5, color: '#1c1c1e', userSelect: 'none' }}>MIXMATE</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {conn && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: conn.mode === 'local' ? 'rgba(48,209,88,0.12)' : 'rgba(10,132,255,0.12)', color: conn.mode === 'local' ? '#30d158' : '#0a84ff', border: `1px solid ${conn.mode === 'local' ? 'rgba(48,209,88,0.2)' : 'rgba(10,132,255,0.2)'}` }}>
            {conn.mode === 'local' ? 'Lokaal' : 'Cloud'}
          </span>
        )}
        <Clock />
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function MachineApp() {
  const [phase, setPhase] = useState(() => {
    const conn = getConn()
    const auth = sessionStorage.getItem('mm_tap_auth')
    if (!conn) return 'discover'
    if (!auth) return 'login'
    return 'dashboard'
  })

  function onConnected()  { setPhase('login') }
  function onLogin()      { sessionStorage.setItem('mm_tap_auth', '1'); setPhase('dashboard') }
  function onBack()       { clearConn(); setPhase('discover') }
  function onLogout()     { sessionStorage.removeItem('mm_tap_auth'); setPhase('login') }
  function onDisconnect() { clearConn(); setPhase('discover') }

  if (phase === 'discover') return <Discovery onConnected={onConnected} />
  if (phase === 'login')    return <PinLogin onSuccess={onLogin} onBack={onBack} />

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f5f7' }}>
      <style>{GLOBAL_STYLES}</style>
      <AppHeader />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <MachineDashboard onLogout={onLogout} onDisconnect={onDisconnect} />
      </div>
    </div>
  )
}
