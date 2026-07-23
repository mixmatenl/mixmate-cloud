import React, { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Verbinding opslaan / lezen
// conn = {mode: 'cloud', machineId: '...'} | {mode: 'local', url: 'https://mixmate.local:8000'}
// ─────────────────────────────────────────────────────────────────────────────

const CONN_KEY = 'mm_tap_conn'
function getConn()   { try { return JSON.parse(localStorage.getItem(CONN_KEY)) } catch { return null } }
function saveConn(c) { localStorage.setItem(CONN_KEY, JSON.stringify(c)) }
function clearConn() { localStorage.removeItem(CONN_KEY); sessionStorage.removeItem('mm_tap_auth') }

// ─────────────────────────────────────────────────────────────────────────────
// API – werkt in beide modi
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
    const wsUrl   = conn.url.replace(/^https/, 'wss').replace(/^http/, 'ws')
    const param   = scale && scale !== 1.0 ? `?scale=${scale.toFixed(4)}` : ''
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
]
function gradientFor(name) {
  let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// Pour modal
// ─────────────────────────────────────────────────────────────────────────────

const PS = { IDLE: 'idle', POURING: 'pouring', DONE: 'done', ERROR: 'error' }

function PourModal({ recipe, glasses, onClose }) {
  const manual = recipe.ingredients.filter(i => !i.has_pump)
  const auto   = recipe.ingredients.filter(i =>  i.has_pump)
  const hasManual = manual.length > 0
  const hasAuto   = auto.length   > 0

  const defaultGlass = glasses.find(g => g.id === recipe.glass_id) ?? glasses[0] ?? null
  const [selectedGlass, setSelectedGlass] = useState(defaultGlass)
  const [pickerOpen, setPickerOpen]       = useState(false)
  const [showManual, setShowManual]       = useState(hasManual)
  const [status,     setStatus]           = useState(PS.IDLE)
  const [progress,   setProgress]         = useState(null)
  const wsRef    = useRef(null)
  const loggedRef = useRef(false)

  const scale = selectedGlass && recipe.total_volume_ml > 0
    ? Math.round((selectedGlass.volume_ml / recipe.total_volume_ml) * 1000) / 1000
    : 1.0
  const scaledMl = (ml) => { const v = ml * scale; return v % 1 === 0 ? v : v.toFixed(1) }

  function logPour() {
    if (loggedRef.current) return
    loggedRef.current = true
    machineApi.createPour({ recipe_id: recipe.id, recipe_name: recipe.name, scale }).catch(() => {})
  }
  function finishDone() { setStatus(PS.DONE); logPour() }

  function startPour() {
    if (!hasAuto) { finishDone(); return }
    setStatus(PS.POURING)
    const ws = createPourSocket(recipe.id, scale, msg => {
      if (msg.type === 'progress') setProgress(msg)
      else if (msg.type === 'done')  finishDone()
      else if (msg.type === 'error') { setStatus(PS.ERROR); setProgress(p => ({ ...p, error: msg.message })) }
    })
    wsRef.current = ws
  }
  function cancel() { machineApi.cancelPour(); wsRef.current?.close(); onClose() }

  const pct       = progress ? Math.round(progress.total_progress * 100) : 0
  const isDone    = status === PS.DONE
  const isPouring = status === PS.POURING

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.75)' }}>
      <div style={{ borderRadius:24, width:'100%', maxWidth:420, margin:'0 16px', overflow:'hidden', background:'#fff', boxShadow:'0 24px 80px rgba(0,0,0,.5)' }}>

        {/* Header */}
        <div style={{ height:176, position:'relative', overflow:'hidden' }}>
          {recipe.image_url
            ? <img src={recipe.image_url} alt={recipe.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <div style={{ width:'100%', height:'100%', background: gradientFor(recipe.name) }} />
          }
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.7) 0%,transparent 60%)' }} />
          <button onClick={onClose} style={{ position:'absolute', top:12, right:12, width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,.4)', border:'none', color:'#fff', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <div style={{ position:'absolute', bottom:12, left:16, right:50 }}>
            {recipe.category_name && <p style={{ color:'rgba(255,255,255,.55)', fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', margin:'0 0 2px' }}>{recipe.category_name}</p>}
            <h2 style={{ color:'#fff', fontWeight:800, fontSize:22, margin:'0 0 4px', letterSpacing:-.3 }}>{recipe.name}</h2>
            {glasses.length > 0 && !isPouring && !isDone && (
              <button onClick={() => setPickerOpen(v => !v)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'rgba(255,255,255,.65)', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                <svg viewBox="0 0 24 32" style={{width:9,height:11}} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2L2 20l20 0L20 2Z" strokeLinejoin="round"/><line x1="12" y1="20" x2="12" y2="27"/><line x1="8" y1="27" x2="16" y2="27"/></svg>
                {selectedGlass ? `${selectedGlass.name} · ${selectedGlass.volume_ml}ml` : 'Standaard'}
                {scale !== 1.0 && <span style={{opacity:.5}}>({scale > 1?'+':''}{Math.round((scale-1)*100)}%)</span>}
                <span style={{opacity:.4}}>· Wijzig</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Inline glaspicker */}
          {pickerOpen && (
            <div style={{ background:'#f7f7f7', borderRadius:14, padding:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {glasses.map(g => (
                <button key={g.id} onClick={() => { setSelectedGlass(g); setPickerOpen(false) }} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, border:`2px solid ${selectedGlass?.id===g.id?'#111':'#e0e0e0'}`, background:selectedGlass?.id===g.id?'#111':'#fff', color:selectedGlass?.id===g.id?'#fff':'#333', cursor:'pointer', textAlign:'left' }}>
                  <div><div style={{fontWeight:700,fontSize:13}}>{g.name}</div><div style={{fontSize:11,opacity:.5}}>{g.volume_ml}ml</div></div>
                </button>
              ))}
              <button onClick={() => { setSelectedGlass(null); setPickerOpen(false) }} style={{ padding:'10px 12px', borderRadius:10, border:'2px dashed #e0e0e0', background:'#fff', color:'#888', cursor:'pointer', fontSize:12 }}>Standaard</button>
            </div>
          )}

          {/* Handmatig */}
          {showManual && status === PS.IDLE && (
            <>
              <div style={{ background:'#fff8ed', border:'1px solid #fde8b6', borderRadius:14, padding:14 }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'#b07800', margin:'0 0 10px' }}>Handmatig toevoegen</p>
                {manual.map(ing => (
                  <div key={ing.ingredient_id} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}>
                    <span style={{ minWidth:48, textAlign:'right', fontWeight:700, color:'#b07800', fontSize:14 }}>{scaledMl(ing.amount_ml)}<span style={{fontSize:10,fontWeight:400}}>ml</span></span>
                    <span style={{ fontSize:13, color:'#7a4f00' }}>{ing.ingredient_name}</span>
                  </div>
                ))}
                {hasAuto && <p style={{ margin:'8px 0 0', fontSize:11, color:'#b07800', opacity:.7 }}>De machine vult de rest automatisch aan.</p>}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={onClose} style={btnOutline}>Annuleer</button>
                <button onClick={() => setShowManual(false)} style={btnDark}>{hasAuto ? 'Gedaan →' : 'Gereed'}</button>
              </div>
            </>
          )}

          {/* Bevestiging */}
          {!showManual && status === PS.IDLE && (
            <>
              <p style={{ textAlign:'center', fontSize:13, color:'#6e6e73', margin:0 }}>Zet het glas onder de uitloop</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {recipe.ingredients.map(ing => (
                  <span key={ing.ingredient_id} style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:ing.has_pump?'#f5f5f7':'#fff8ed', color:ing.has_pump?'#555':'#b07800', border:`1px solid ${ing.has_pump?'#e5e5ea':'#fde8b6'}`, fontWeight:500 }}>
                    {ing.ingredient_name} <span style={{opacity:.5}}>{scaledMl(ing.amount_ml)}ml</span>
                    {!ing.has_pump && <span style={{marginLeft:3}}>✓</span>}
                  </span>
                ))}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={onClose} style={btnOutline}>Annuleer</button>
                <button onClick={hasAuto ? startPour : finishDone} style={btnDark}>{hasAuto ? 'Maken' : 'Klaar!'}</button>
              </div>
            </>
          )}

          {/* Gieten */}
          {isPouring && (
            <>
              <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:10, letterSpacing:2, textTransform:'uppercase', color:'#aaa', margin:'0 0 4px' }}>Bezig met</p>
                <p style={{ fontSize:22, fontWeight:800, color:'#111', margin:0 }}>{progress?.step_name || '…'}</p>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center' }}>
                {auto.map(ing => (
                  <span key={ing.ingredient_id} style={{ fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:500, transition:'all .3s', background:progress?.step_name===ing.ingredient_name?'#111':'#f5f5f7', color:progress?.step_name===ing.ingredient_name?'#fff':'#aaa', border:`1px solid ${progress?.step_name===ing.ingredient_name?'#111':'#e5e5ea'}` }}>
                    {ing.ingredient_name} <span style={{opacity:.5}}>{scaledMl(ing.amount_ml)}ml</span>
                  </span>
                ))}
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{color:'#888'}}>Voortgang</span><span style={{fontWeight:700}}>{pct}%</span>
                </div>
                <div style={{ height:5, background:'#f0f0f0', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:'#111', borderRadius:3, transition:'width .3s' }} />
                </div>
              </div>
              <button onClick={cancel} style={btnOutline}>Stoppen</button>
            </>
          )}

          {/* Klaar */}
          {isDone && (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#f0fdf4', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
              </div>
              <p style={{ fontWeight:800, fontSize:20, color:'#111', margin:'0 0 4px' }}>{recipe.name}</p>
              <p style={{ color:'#aaa', fontSize:13, margin:'0 0 18px' }}>Smakelijk!</p>
              <button onClick={onClose} style={btnDark}>Sluiten</button>
            </div>
          )}

          {status === PS.ERROR && (
            <>
              <p style={{ color:'#ef4444', textAlign:'center', fontSize:13 }}>{progress?.error}</p>
              <button onClick={onClose} style={btnOutline}>Sluiten</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const btnDark    = { flex:1, padding:'13px 0', borderRadius:12, background:'#111', color:'#fff', border:'none', fontWeight:700, fontSize:14, cursor:'pointer' }
const btnOutline = { flex:1, padding:'13px 0', borderRadius:12, background:'#fff', color:'#888', border:'1px solid #e5e5ea', fontWeight:600, fontSize:14, cursor:'pointer' }

// ─────────────────────────────────────────────────────────────────────────────
// Cocktail kaart
// ─────────────────────────────────────────────────────────────────────────────

function CocktailCard({ recipe, onMake, isFavorite, onToggleFavorite }) {
  const [imgFailed, setImgFailed] = useState(false)
  if (!recipe.partially_available) return (
    <div style={{ borderRadius:20, overflow:'hidden', opacity:.3, background:'#fff', border:'1px solid #e5e5ea' }}>
      <div style={{ height:130, background: gradientFor(recipe.name) }} />
      <div style={{ padding:'10px 12px' }}><h3 style={{ fontSize:14, fontWeight:700, color:'#111', margin:0 }}>{recipe.name}</h3></div>
    </div>
  )
  return (
    <div onClick={() => onMake(recipe)} style={{ borderRadius:20, overflow:'hidden', cursor:'pointer', background:'#fff', border:'1px solid rgba(0,0,0,.07)', boxShadow:'0 1px 3px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.06)', userSelect:'none' }}>
      <div style={{ position:'relative', height:130 }}>
        {recipe.image_url && !imgFailed
          ? <img src={recipe.image_url} alt={recipe.name} onError={() => setImgFailed(true)} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
          : <div style={{ width:'100%', height:'100%', background: gradientFor(recipe.name) }} />
        }
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.4) 0%, transparent 55%)', pointerEvents:'none' }} />
        {recipe.category_name && (
          <div style={{ position:'absolute', top:8, left:10, fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'rgba(255,255,255,.8)', background:'rgba(0,0,0,.3)', padding:'2px 6px', borderRadius:20 }}>{recipe.category_name}</div>
        )}
        <button onClick={e => { e.stopPropagation(); onToggleFavorite(recipe.id) }} style={{ position:'absolute', top:6, right:6, width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,.4)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={isFavorite?'#ff5a7a':'none'} stroke={isFavorite?'#ff5a7a':'rgba(255,255,255,.85)'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div style={{ padding:'10px 12px 12px' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'#111', margin:'0 0 6px', letterSpacing:-.2, lineHeight:1.2 }}>{recipe.name}</h3>
        <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
          {(recipe.ingredients||[]).slice(0,3).map(ing => (
            <span key={ing.ingredient_id} style={{ fontSize:9, padding:'2px 7px', borderRadius:20, background:'#f5f5f7', color:'#888', border:'1px solid #e5e5ea' }}>{ing.ingredient_name}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cocktail dashboard
// ─────────────────────────────────────────────────────────────────────────────

function MachineDashboard({ onLogout }) {
  const [recipes,    setRecipes]    = useState([])
  const [categories, setCategories] = useState([])
  const [glasses,    setGlasses]    = useState([])
  const [favorites,  setFavorites]  = useState([])
  const [activeCat,  setActiveCat]  = useState('all')
  const [search,     setSearch]     = useState('')
  const [making,     setMaking]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(0)

  useEffect(() => {
    Promise.all([machineApi.getRecipes(), machineApi.getCategories(), machineApi.getGlasses()])
      .then(([r, c, g]) => { setRecipes(r); setCategories(c); setGlasses(g) })
      .finally(() => setLoading(false))
    machineApi.getFavorites().then(f => setFavorites(Array.isArray(f) ? f : [])).catch(() => {})
  }, [])

  const favSet = new Set(favorites)

  function toggleFav(id) {
    const wasFav = favSet.has(id)
    setFavorites(p => wasFav ? p.filter(x => x !== id) : [...p, id])
    const call = wasFav ? machineApi.removeFavorite(id) : machineApi.addFavorite(id)
    call.catch(() => setFavorites(p => wasFav ? [...p, id] : p.filter(x => x !== id)))
  }

  const term = search.trim().toLowerCase()
  const filtered = recipes.filter(r => {
    if (r.enabled === false) return false
    if (term) return r.name.toLowerCase().includes(term) || (r.ingredients||[]).some(i => i.ingredient_name.toLowerCase().includes(term))
    if (activeCat === 'favorites') return favSet.has(r.id)
    if (activeCat === 'all') return true
    return r.category_id == activeCat
  })

  const COLS = 3, ROWS = 2, PER = COLS * ROWS
  const pages = []
  for (let i = 0; i < filtered.length; i += PER) pages.push(filtered.slice(i, i + PER))
  useEffect(() => setPage(0), [activeCat, term])

  const sidebarCats = [
    ...(favorites.length > 0 ? [{value:'favorites',label:'♥ Favorieten'}] : []),
    {value:'all',label:'Alles'},
    ...categories.map(c => ({value:c.id,label:c.name})),
  ]

  return (
    <div style={{ display:'flex', height:'100vh', background:'#f5f5f7', overflow:'hidden' }}>
      {making && <PourModal recipe={making} glasses={glasses} onClose={() => setMaking(null)} />}

      {/* Sidebar */}
      <div style={{ width:172, background:'#fff', borderRight:'1px solid #e5e5ea', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 14px 16px', borderBottom:'1px solid #f0f0f0' }}>
          <div style={{ fontWeight:800, fontSize:16, color:'#111', letterSpacing:-.3 }}>MIXMATE</div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
          {sidebarCats.map(cat => (
            <button key={cat.value} onClick={() => { setSearch(''); setActiveCat(cat.value) }} style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:10, marginBottom:1, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:activeCat===cat.value&&!term?'#111':'transparent', color:activeCat===cat.value&&!term?'#fff':'#555', transition:'all .15s' }}>
              {cat.label}
            </button>
          ))}
        </div>
        <div style={{ padding:'10px 8px', borderTop:'1px solid #f0f0f0' }}>
          <button onClick={onLogout} style={{ display:'block', width:'100%', padding:'8px 10px', borderRadius:10, border:'none', background:'transparent', color:'#aaa', fontSize:12, fontWeight:600, cursor:'pointer', textAlign:'left' }}>Uitloggen</button>
          <button onClick={() => { clearConn(); window.location.reload() }} style={{ display:'block', width:'100%', padding:'6px 10px', borderRadius:10, border:'none', background:'transparent', color:'#ccc', fontSize:11, cursor:'pointer', textAlign:'left' }}>Andere machine</button>
        </div>
      </div>

      {/* Hoofd */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px 10px', flexShrink:0 }}>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#aaa' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek cocktail of ingrediënt…" style={{ width:'100%', padding:'10px 32px', borderRadius:12, fontSize:13, border:'1px solid #e5e5ea', background:'#fff', color:'#111', outline:'none', boxSizing:'border-box' }} />
            {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'#e5e5ea', border:'none', borderRadius:'50%', width:18, height:18, cursor:'pointer', fontSize:10, color:'#555', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>}
          </div>
        </div>

        <div style={{ flex:1, padding:'0 20px 16px', display:'flex', flexDirection:'column', minHeight:0 }}>
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {Array.from({length:6}).map((_,i) => <div key={i} style={{ borderRadius:20, height:200, background:'#e5e5ea' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#aaa', flexDirection:'column', gap:6 }}>
              <p style={{ fontWeight:700, fontSize:15, color:'#555', margin:0 }}>Geen cocktails gevonden</p>
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
              <div style={{ flex:1, display:'flex', gap:6, minHeight:0, alignItems:'stretch' }}>
                <button onClick={() => setPage(p => Math.max(0,p-1))} style={{ ...navBtn, opacity:page>0?1:.15 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gridTemplateRows:'repeat(2,1fr)', gap:14, height:'100%' }}>
                    {(pages[page]||[]).map(r => <CocktailCard key={r.id} recipe={r} onMake={setMaking} isFavorite={favSet.has(r.id)} onToggleFavorite={toggleFav} />)}
                  </div>
                </div>
                <button onClick={() => setPage(p => Math.min(pages.length-1,p+1))} style={{ ...navBtn, opacity:page<pages.length-1?1:.15 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {pages.length > 1 && (
                <div style={{ display:'flex', justifyContent:'center', gap:5, paddingTop:10 }}>
                  {pages.map((_,i) => <div key={i} onClick={() => setPage(i)} style={{ width:i===page?18:6, height:6, borderRadius:3, cursor:'pointer', background:'#111', opacity:i===page?.6:.15, transition:'all .3s' }} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const navBtn = { flexShrink:0, width:30, background:'none', border:'none', cursor:'pointer', color:'#111', display:'flex', alignItems:'center', justifyContent:'center', transition:'opacity .2s' }

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
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
      <div style={{ width:280, textAlign:'center' }}>
        <p style={{ color:'#fff', fontWeight:800, fontSize:22, letterSpacing:-.3, marginBottom:28 }}>PIN invoeren</p>
        <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:28 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width:13, height:13, borderRadius:'50%', background:pin.length>i?'#fff':'rgba(255,255,255,.2)', transition:'background .15s' }} />)}
        </div>
        {error && <p style={{ color:'#ff453a', fontSize:13, marginBottom:14 }}>{error}</p>}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i) => (
            <button key={i} onClick={() => { if (d==='⌫') { setPin(p=>p.slice(0,-1)); setError('') } else if (d!=='') press(String(d)) }}
              disabled={busy || (typeof d==='number' && pin.length>=4)}
              style={{ height:60, borderRadius:14, fontSize:20, fontWeight:700, background:d===''?'transparent':'rgba(255,255,255,.08)', border:'none', color:'#fff', cursor:d===''?'default':'pointer', opacity:busy?.5:1 }}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onBack} style={{ marginTop:40, color:'#333', background:'none', border:'none', fontSize:12, cursor:'pointer' }}>Andere machine kiezen</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery – vindt Pi via cloud EN lokaal tegelijk
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_URL = 'https://mixmate.local:8000'

async function tryLocalMachine() {
  try {
    const r = await fetch(`${LOCAL_URL}/api/system/version`, { signal: AbortSignal.timeout(3000) })
    if (r.ok) {
      const data = await r.json()
      return { source:'local', url: LOCAL_URL, name: data.model || 'MIXMATE Machine' }
    }
  } catch { /* niet bereikbaar of cert niet vertrouwd */ }
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
      // Cloud
      try {
        const r = await fetch('/api/machineapp/discover')
        if (r.ok && !cancelled) setCloudMachines(await r.json())
      } catch { /* offline */ }

      // Lokaal
      const loc = await tryLocalMachine()
      if (!cancelled) {
        setLocalMachine(loc)
        setLoading(false)
      }
    }

    poll()
    const t = setInterval(poll, 4000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // Cert-check: als fetch mislukt maar fetch naar http: (niet ssl) wel, toon cert-instructie
  useEffect(() => {
    async function checkCert() {
      try {
        await fetch(LOCAL_URL, { signal: AbortSignal.timeout(2000), mode: 'no-cors' })
        setCertNeeded(false)
      } catch (e) {
        if (e?.name !== 'AbortError') setCertNeeded(true)
      }
    }
    if (!localMachine) checkCert()
  }, [localMachine])

  function connect(conn) {
    setPairing(conn.mode === 'cloud' ? conn.machineId : 'local')
    setTimeout(() => {
      saveConn(conn)
      onConnected()
    }, 900)
  }

  const hasMachines = cloudMachines.length > 0 || localMachine

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:28 }}>
      <div style={{ width:'100%', maxWidth:400 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:68, height:68, borderRadius:18, background:'#1c1c1e', border:'1px solid #2c2c2e', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/></svg>
          </div>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:'0 0 6px', letterSpacing:-.5 }}>MIXMATE</h1>
          <p style={{ color:'#555', fontSize:13, margin:0 }}>
            {loading ? 'Zoeken naar machines…' : hasMachines ? 'Kies een machine om te verbinden' : 'Geen machines gevonden'}
          </p>
        </div>

        {/* Machines */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>

          {/* Lokale machine */}
          {localMachine && (() => {
            const isConnecting = pairing === 'local'
            return (
              <button onClick={() => !pairing && connect({ mode:'local', url: LOCAL_URL })} style={{ display:'flex', alignItems:'center', gap:14, background:'#111', border:`1px solid ${isConnecting?'#30d158':'#222'}`, borderRadius:18, padding:'16px 18px', cursor:pairing?'default':'pointer', textAlign:'left', transition:'border-color .3s' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'#1c1c1e', border:'1px solid #2c2c2e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:15, marginBottom:2 }}>{localMachine.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#30d158' }} />
                    <span style={{ color:'#30d158', fontSize:11, fontWeight:600 }}>Lokaal netwerk</span>
                  </div>
                </div>
                <span style={{ color:isConnecting?'#30d158':'#444', fontWeight:600, fontSize:13 }}>{isConnecting?'✓ Verbonden':'Verbinden →'}</span>
              </button>
            )
          })()}

          {/* Cloud machines */}
          {cloudMachines.map(m => {
            const isConnecting = pairing === m.machine_id
            return (
              <button key={m.machine_id} onClick={() => !pairing && connect({ mode:'cloud', machineId: m.machine_id })} style={{ display:'flex', alignItems:'center', gap:14, background:'#111', border:`1px solid ${isConnecting?'#0a84ff':'#222'}`, borderRadius:18, padding:'16px 18px', cursor:pairing?'default':'pointer', textAlign:'left', transition:'border-color .3s' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:'#1c1c1e', border:'1px solid #2c2c2e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M20 4H4l6 7.5V17"/><path d="M20 4l-6 7.5"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:15, marginBottom:2 }}>{m.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#0a84ff' }} />
                    <span style={{ color:'#0a84ff', fontSize:11, fontWeight:600 }}>Via cloud</span>
                  </div>
                </div>
                <span style={{ color:isConnecting?'#0a84ff':'#444', fontWeight:600, fontSize:13 }}>{isConnecting?'✓ Verbonden':'Verbinden →'}</span>
              </button>
            )
          })}
        </div>

        {/* Geen machines */}
        {!hasMachines && !loading && (
          <div style={{ background:'#111', border:'1px solid #1c1c1e', borderRadius:18, padding:'24px 20px', display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontSize:14, margin:'0 0 6px' }}>Machine niet gevonden?</p>
              <p style={{ color:'#555', fontSize:12, margin:0, lineHeight:1.6 }}>De machine zoekt automatisch naar WiFi. Als dit de eerste keer is:</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Step n="1" text='Verbind tablet met WiFi "MIXMATE-Setup" (wachtwoord: mixmate123)' />
              <Step n="2" text="Ga in een browser naar http://10.42.0.1:8000 om WiFi in te stellen" />
              <Step n="3" text="Zodra de machine verbonden is met WiFi verschijnt hij hier automatisch" />
            </div>
            {certNeeded && (
              <div style={{ background:'#1c1c1e', borderRadius:12, padding:14 }}>
                <p style={{ color:'#ff9f0a', fontSize:12, fontWeight:700, margin:'0 0 6px' }}>Lokale verbinding gevonden maar certificaat niet vertrouwd</p>
                <p style={{ color:'#555', fontSize:12, margin:'0 0 10px' }}>Ga eenmalig naar de machine-URL en klik op "Geavanceerd → Toch doorgaan".</p>
                <a href={LOCAL_URL} target="_blank" rel="noreferrer" style={{ display:'inline-block', padding:'8px 14px', background:'#ff9f0a', color:'#000', borderRadius:8, fontWeight:700, fontSize:12, textDecoration:'none' }}>Certificaat accepteren →</a>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function Step({ n, text }) {
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
      <div style={{ width:22, height:22, borderRadius:'50%', background:'#1c1c1e', border:'1px solid #2c2c2e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#fff' }}>{n}</div>
      <p style={{ color:'#666', fontSize:12, margin:0, lineHeight:1.5, paddingTop:2 }}>{text}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function MachineApp() {
  const [phase, setPhase] = useState(() => {
    const conn = getConn()
    const auth = sessionStorage.getItem('mm_tap_auth')
    if (!conn)  return 'discover'
    if (!auth)  return 'login'
    return 'dashboard'
  })

  function onConnected() { setPhase('login') }
  function onLogin()     { sessionStorage.setItem('mm_tap_auth','1'); setPhase('dashboard') }
  function onBack()      { clearConn(); setPhase('discover') }
  function onLogout()    { sessionStorage.removeItem('mm_tap_auth'); setPhase('login') }

  if (phase === 'discover')  return <Discovery onConnected={onConnected} />
  if (phase === 'login')     return <PinLogin  onSuccess={onLogin} onBack={onBack} />
  return <div style={{ height:'100vh', overflow:'hidden' }}><MachineDashboard onLogout={onLogout} /></div>
}
