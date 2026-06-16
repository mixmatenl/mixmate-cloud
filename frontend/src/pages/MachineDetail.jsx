import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const TABS = ['Overzicht', 'Catalogus', 'Pompen', 'Instellingen', 'Info']

export default function MachineDetail({ onLogout }) {
  const { machineId } = useParams()
  const navigate = useNavigate()
  const [tab,     setTab]     = useState('Overzicht')
  const [status,  setStatus]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.machineStatus(machineId)
      .then(setStatus)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [machineId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#aeaeb2', fontSize: 14 }}>Laden…</div>
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: status?.online ? '#30d158' : '#c7c7cc', boxShadow: status?.online ? '0 0 0 3px rgba(48,209,88,.18)' : 'none' }} />
              <span style={{ fontSize: 12, color: status?.online ? '#30d158' : '#aeaeb2', fontWeight: 500 }}>{status?.online ? 'Online' : 'Offline'}</span>
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
        {tab === 'Overzicht'   && <Overzicht  status={status} machineId={machineId} />}
        {tab === 'Catalogus'   && status?.online && <Catalogus    machineId={machineId} />}
        {tab === 'Pompen'      && status?.online && <Pompen       machineId={machineId} />}
        {tab === 'Instellingen'&& <Instellingen machineId={machineId} status={status} onRename={name => setStatus(s => ({...s, name}))} />}
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
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

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

  const totalPours = recipes.reduce((s, r) => s + (r.pour_count || 0), 0)
  const topRecipes = recipes.slice(0, 5)

  return (
    <div>
      {/* Status banner */}
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
          {/* Stat */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Totaal gemaakt', value: totalPours, icon: '🍹' },
              { label: 'Recepten', value: recipes.length, icon: '📋' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top cocktails */}
          <Group label="Meest gemaakt">
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>Laden…</div>
            ) : topRecipes.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#aeaeb2', fontSize: 13 }}>Nog geen cocktails gemaakt.</div>
            ) : topRecipes.map((r, i) => (
              <div key={r.id} style={{ padding: '12px 16px', borderBottom: i < topRecipes.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', background: '#f2f2f7', flexShrink: 0 }}>
                  {r.image_url
                    ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍸</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{r.pour_count || 0}×</div>
              </div>
            ))}
          </Group>
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
              <select value={glassId} onChange={e => setGlassId(e.target.value)} style={sel}>
                <option value="">— Geen —</option>
                {(glasses || []).map(g => <option key={g.id} value={g.id}>{g.name} ({g.volume_ml}ml)</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
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
  const { items: ingredients, loading: iLoad, setItems: setIngredients } = useList(() => api.getIngredients(machineId))
  const { items: glasses,     loading: gLoad, setItems: setGlasses }     = useList(() => api.getGlasses(machineId))
  const { items: categories,  loading: cLoad, setItems: setCategories }  = useList(() => api.getCategories(machineId))
  const [editing,  setEditing]  = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [section,  setSection]  = useState('recepten')

  // Ingredient form state
  const [ingName, setIngName] = useState(''); const [ingErr, setIngErr] = useState(null); const [ingSaving, setIngSaving] = useState(false)
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
    try { setIngredients([...ingredients, await api.createIngredient(machineId, { name: ingName })]); setIngName('') }
    catch (e) { setIngErr(e.message) }; setIngSaving(false)
  }
  async function delIng(item) {
    if (!confirm(`"${item.name}" verwijderen?`)) return
    try { await api.deleteIngredient(machineId, item.id); setIngredients(ingredients.filter(x => x.id !== item.id)) }
    catch (e) { alert(e.message) }
  }

  async function saveGl(e) {
    e.preventDefault(); setGlSaving(true); setGlErr(null)
    const data = { name: glForm.name, volume_ml: Number(glForm.volume_ml) }
    try {
      if (glEditing) setGlasses(glasses.map(g => g.id === glEditing.id ? await api.updateGlass(machineId, glEditing.id, data) : g))
      else setGlasses([...glasses, await api.createGlass(machineId, data)])
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
      if (catEditing) setCategories(categories.map(c => c.id === catEditing.id ? await api.updateCategory(machineId, catEditing.id, catForm) : c))
      else setCategories([...categories, await api.createCategory(machineId, catForm)])
      setCatForm({ name: '' }); setCatEditing(null)
    } catch (e) { setCatErr(e.message) }; setCatSaving(false)
  }
  async function delCat(c) {
    if (!confirm(`"${c.name}" verwijderen?`)) return
    try { await api.deleteCategory(machineId, c.id); setCategories(categories.filter(x => x.id !== c.id)) }
    catch (e) { alert(e.message) }
  }

  const sections = [
    { key: 'recepten',     label: 'Recepten',     count: recipes?.length },
    { key: 'ingredienten', label: 'Ingrediënten', count: ingredients?.length },
    { key: 'glazen',       label: 'Glazen',       count: glasses?.length },
    { key: 'categorieen',  label: 'Categorieën',  count: categories?.length },
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
                  {recipes.map((r, i) => (
                    <div key={r.id} style={{ padding: '12px 16px', borderBottom: i < recipes.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: '#f2f2f7', flexShrink: 0 }}>
                        {r.image_url ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍸</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 1 }}>
                          {[r.category_name, r.glass_name, r.ingredients?.length ? `${r.ingredients.length} ingrediënten` : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {r.pour_count > 0 && <div style={{ fontSize: 12, color: '#aeaeb2', flexShrink: 0 }}>{r.pour_count}×</div>}
                      <button onClick={() => setEditing(r)} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Bewerk</button>
                      <button onClick={() => delRecipe(r)} disabled={deleting === r.id} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: deleting === r.id ? .4 : 1 }}>Verwijder</button>
                    </div>
                  ))}
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
            <form onSubmit={saveIng} style={{ display: 'flex', gap: 10 }}>
              <input required value={ingName} onChange={e => setIngName(e.target.value)} placeholder="Nieuw ingrediënt" style={{ ...inp, flex: 1 }} />
              <button type="submit" disabled={ingSaving} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{ingSaving ? '…' : 'Toevoegen'}</button>
            </form>
            <ErrMsg msg={ingErr} />
          </div>
          {iLoad ? <Skeleton /> : !ingredients?.length ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen ingrediënten.</div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              {ingredients.map((item, i) => (
                <div key={item.id} style={{ padding: '12px 16px', borderBottom: i < ingredients.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{item.name}</span>
                  <button onClick={() => delIng(item)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Verwijder</button>
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
  const { items: pumps, loading, err } = useList(() => api.getPumps(machineId))
  const { items: ingredients }         = useList(() => api.getIngredients(machineId))
  const [saving, setSaving] = useState(null)
  const [saved,  setSaved]  = useState(null)

  async function assign(pump, ingredient_id) {
    setSaving(pump.id)
    try {
      await api.updatePump(machineId, pump.id, { ingredient_id: ingredient_id || null })
      setSaved(pump.id); setTimeout(() => setSaved(null), 1500)
    } catch (e) { alert(e.message) }
    setSaving(null)
  }

  if (loading) return <Skeleton />
  return (
    <Group label="Pompindeling" >
      <ErrMsg msg={err} />
      {!pumps?.length ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Geen pompen gevonden.</div>
      ) : pumps.map((p, i) => (
        <div key={p.id} style={{ padding: '12px 16px', borderBottom: i < pumps.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Pomp {p.slot}</div>
            <div style={{ fontSize: 12, color: p.loaded ? '#30d158' : '#aeaeb2', marginTop: 1 }}>{p.loaded ? 'Geladen' : 'Leeg'}</div>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <select value={p.ingredient_id || ''} onChange={e => assign(p, e.target.value ? Number(e.target.value) : null)} disabled={saving === p.id} style={{ ...sel, paddingRight: 32 }}>
              <option value="">— Niet ingesteld —</option>
              {(ingredients || []).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {saved === p.id && <span style={{ fontSize: 12, color: '#30d158', flexShrink: 0 }}>Opgeslagen</span>}
        </div>
      ))}
    </Group>
  )
}

// ── Instellingen ──────────────────────────────────────────────────────────────

function Instellingen({ machineId, status, onRename }) {
  const [name,         setName]        = useState(status?.name || '')
  const [saving,       setSaving]      = useState(false)
  const [saved,        setSaved]       = useState(false)
  const [updating,     setUpdating]    = useState(false)
  const [updateStatus, setUpdateStatus]= useState(null)

  async function saveName(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (status?.online) await api.updateSettings(machineId, { machine_name: name })
      onRename(name); setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
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
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Bijv. Bar machine" style={{ ...inp, flex: 1 }} disabled={!status?.online} />
            <button type="submit" disabled={saving || !status?.online} style={{ background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: (!status?.online || saving) ? .4 : 1 }}>
              {saved ? 'Opgeslagen ✓' : saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </form>
          {!status?.online && <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 8 }}>Machine moet online zijn om de naam aan te passen.</div>}
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
