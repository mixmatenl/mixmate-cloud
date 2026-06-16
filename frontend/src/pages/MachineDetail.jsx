import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const TABS = ['Overzicht', 'Recepten', 'Ingrediënten', 'Glazen', 'Categorieën', 'Pompen', 'Instellingen', 'Info']

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
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
      <div className="text-gray-400 text-sm">Laden...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Sticky sub-header */}
      <div style={{ background: 'rgba(242,242,247,.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,.08)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              Machines
            </button>
            <span style={{ color: '#c7c7cc' }}>›</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status?.name || 'Machine'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: status?.online ? '#30d158' : '#c7c7cc', boxShadow: status?.online ? '0 0 0 3px rgba(48,209,88,.2)' : 'none' }} />
              <span style={{ fontSize: 12, color: status?.online ? '#30d158' : '#aeaeb2', fontWeight: 500 }}>{status?.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 1 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#1d1d1f' : '#6e6e73',
                borderBottom: `2px solid ${tab === t ? '#1d1d1f' : 'transparent'}`,
                whiteSpace: 'nowrap', transition: 'color .15s',
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!status?.online && tab !== 'Overzicht' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm mb-4">
            De machine is offline. Zet hem aan om gegevens te bekijken.
          </div>
        )}
        {tab === 'Overzicht'    && <Overview status={status} onRename={name => setStatus(s => ({...s, name}))} machineId={machineId} />}
        {tab === 'Recepten'     && status?.online && <Recepten     machineId={machineId} />}
        {tab === 'Ingrediënten' && status?.online && <Ingredienten machineId={machineId} />}
        {tab === 'Glazen'       && status?.online && <Glazen       machineId={machineId} />}
        {tab === 'Categorieën'  && status?.online && <Categorieen  machineId={machineId} />}
        {tab === 'Pompen'       && status?.online && <Pompen       machineId={machineId} />}
        {tab === 'Instellingen' && status?.online && <Instellingen machineId={machineId} />}
        {tab === 'Info'         && <MachineInfoTab machineId={machineId} status={status} online={status?.online} />}
      </div>
    </div>
  )
}

// ── Hulpcomponenten ───────────────────────────────────────────────────────────

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-14 animate-pulse" />)}
    </div>
  )
}

function Empty({ text }) {
  return <div className="text-sm text-gray-400 text-center py-10">{text}</div>
}

function Err({ msg }) {
  if (!msg) return null
  return <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{msg}</div>
}

function useList(loader) {
  const [items,   setItems]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const d = await loader()
      setItems(d.items || d)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])
  return { items, loading, err, reload: load, setItems }
}

// ── Overzicht ─────────────────────────────────────────────────────────────────

function Overview({ status, machineId, onRename }) {
  const [name,   setName]   = useState(status?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => { setName(status?.name || '') }, [status])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (status?.online) await api.updateSettings(machineId, { machine_name: name })
      onRename(name)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card label="Model"  value={status?.model   || '—'} />
        <Card label="Versie" value={status?.version ? `v${status.version}` : '—'} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
        <div className="text-xs text-gray-500 mb-1">Machine ID</div>
        <div className="font-mono text-xs text-gray-700 break-all">{status?.machine_id}</div>
      </div>
      {status?.online && (
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="text-sm font-medium">Naam van de machine</div>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Bijv. Bar machine" />
          <button type="submit" disabled={saving}
            className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            {saved ? 'Opgeslagen' : saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Recepten ──────────────────────────────────────────────────────────────────

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"

function resizeImageToDataUrl(file, maxPx = 480) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = url
  })
}

function RecipeForm({ recipe, ingredients, categories, glasses, onSave, onCancel }) {
  const [name,        setName]        = useState(recipe?.name || '')
  const [description, setDescription] = useState(recipe?.description || '')
  const [categoryId,  setCategoryId]  = useState(recipe?.category_id ?? '')
  const [glassId,     setGlassId]     = useState(recipe?.glass_id ?? '')
  const [imageUrl,    setImageUrl]    = useState(recipe?.image_url || '')
  const [steps,       setSteps]       = useState(
    recipe?.ingredients?.length
      ? recipe.ingredients.map(i => ({ ingredient_id: String(i.ingredient_id), amount_ml: i.amount_ml }))
      : [{ ingredient_id: '', amount_ml: 50 }]
  )
  const [saving,       setSaving]      = useState(false)
  const [err,          setErr]         = useState(null)
  const [imgLoading,   setImgLoading]  = useState(false)
  const fileRef = React.useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgLoading(true)
    const dataUrl = await resizeImageToDataUrl(file)
    setImageUrl(dataUrl)
    setImgLoading(false)
  }

  const addStep    = () => setSteps(s => [...s, { ingredient_id: '', amount_ml: 50 }])
  const removeStep = i  => setSteps(s => s.filter((_, idx) => idx !== i))
  const updateStep = (i, k, v) => setSteps(s => s.map((st, idx) => idx === i ? { ...st, [k]: v } : st))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const ing = steps.filter(s => s.ingredient_id)
    setSaving(true); setErr(null)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId === '' ? null : parseInt(categoryId),
        glass_id:    glassId    === '' ? null : parseInt(glassId),
        image_url:   imageUrl,
        ingredients: ing.map((s, i) => ({
          ingredient_id: parseInt(s.ingredient_id),
          amount_ml:     parseFloat(s.amount_ml),
          order: i,
        })),
      })
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="font-semibold text-sm text-gray-800">{recipe ? `${recipe.name} bewerken` : 'Nieuw recept'}</div>
      <Err msg={err} />

      {/* Naam + omschrijving */}
      <div className="space-y-2">
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Naam van het recept *" className={inp} />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Korte omschrijving (optioneel)" className={inp} />
      </div>

      {/* Afbeelding upload */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Afbeelding</label>
        <div className="flex items-center gap-3">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden shrink-0 bg-gray-50"
          >
            {imgLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
            )}
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              {imageUrl ? 'Foto wijzigen' : 'Foto kiezen'}
            </button>
            {imageUrl && (
              <button type="button" onClick={() => setImageUrl('')}
                className="ml-2 text-xs text-gray-400 hover:text-red-400 transition-colors">
                Verwijderen
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1">JPG of PNG, wordt automatisch verkleind</p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Categorie + glas */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Categorie</label>
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inp}>
            <option value="">— Geen —</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Glas</label>
          <select value={glassId} onChange={e => setGlassId(e.target.value)} className={inp}>
            <option value="">— Geen —</option>
            {(glasses || []).map(g => <option key={g.id} value={g.id}>{g.name} ({g.volume_ml}ml)</option>)}
          </select>
        </div>
      </div>

      {/* Ingrediënten */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide">Ingrediënten</label>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select value={step.ingredient_id} onChange={e => updateStep(i, 'ingredient_id', e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10">
              <option value="">— Kies ingrediënt —</option>
              {(ingredients || []).map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
            </select>
            <input type="number" value={step.amount_ml} min="1" max="999"
              onChange={e => updateStep(i, 'amount_ml', e.target.value)}
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/10" />
            <span className="text-gray-400 text-xs shrink-0">ml</span>
            {steps.length > 1 && (
              <button type="button" onClick={() => removeStep(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none w-6 text-center">×</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addStep} className="text-sm text-gray-400 hover:text-gray-700">+ Ingrediënt toevoegen</button>
      </div>

      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button type="submit" disabled={saving} className="bg-[#111] text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50 font-medium">
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
        <button type="button" onClick={onCancel} className="text-gray-500 text-sm px-4 py-2 rounded-lg border border-gray-200">Annuleren</button>
      </div>
    </form>
  )
}

function Recepten({ machineId }) {
  const { items, loading, err, reload } = useList(() => api.getRecipes(machineId))
  const [ingredients, setIngredients]   = useState([])
  const [categories,  setCategories]    = useState([])
  const [glasses,     setGlasses]       = useState([])
  const [editing,     setEditing]       = useState(null)  // null=list, 'new'=new form, recipe obj=edit
  const [deleting,    setDeleting]      = useState(null)

  useEffect(() => {
    Promise.all([
      api.getIngredients(machineId),
      api.getCategories(machineId),
      api.getGlasses(machineId),
    ]).then(([i, c, g]) => {
      setIngredients(Array.isArray(i) ? i : (i?.items || []))
      setCategories(Array.isArray(c) ? c : (c?.items || []))
      setGlasses(Array.isArray(g) ? g : (g?.items || []))
    }).catch(() => {})
  }, [machineId])

  async function save(data) {
    if (editing === 'new') {
      await api.createRecipe(machineId, data)
    } else {
      await api.updateRecipe(machineId, editing.id, data)
    }
    setEditing(null)
    reload()
  }

  async function del(r) {
    setDeleting(r.id)
    try { await api.deleteRecipe(machineId, r.id); reload() }
    catch (e) { alert(e.message) }
    setDeleting(null)
  }

  if (loading) return <Skeleton />
  if (editing) return (
    <RecipeForm
      recipe={editing === 'new' ? null : editing}
      ingredients={ingredients}
      categories={categories}
      glasses={glasses}
      onSave={save}
      onCancel={() => setEditing(null)}
    />
  )
  return (
    <div className="space-y-3">
      <Err msg={err} />
      <div className="flex justify-end">
        <button onClick={() => setEditing('new')} className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg font-medium">+ Nieuw recept</button>
      </div>
      {!items?.length ? <Empty text="Geen recepten." /> : (
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              {r.image_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                  <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{r.name}</div>
                <div className="flex gap-2 mt-0.5">
                  {r.category_name && <span className="text-xs text-gray-400">{r.category_name}</span>}
                  {r.glass_name    && <span className="text-xs text-gray-400">· {r.glass_name}</span>}
                  {r.ingredients?.length > 0 && <span className="text-xs text-gray-400">· {r.ingredients.length} ingrediënten</span>}
                </div>
              </div>
              <button onClick={() => setEditing(r)} className="text-gray-400 hover:text-gray-700 text-xs px-3 py-1.5 rounded-lg border border-gray-200 shrink-0">Bewerk</button>
              <button onClick={() => del(r)} disabled={deleting === r.id}
                className="text-red-400 hover:text-red-600 text-xs px-3 py-1.5 rounded-lg border border-red-100 disabled:opacity-40 shrink-0">
                {deleting === r.id ? '...' : 'Verwijder'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ingrediënten ──────────────────────────────────────────────────────────────

function Ingredienten({ machineId }) {
  const { items, loading, err, setItems } = useList(() => api.getIngredients(machineId))
  const [name,    setName]    = useState('')
  const [formErr, setFormErr] = useState(null)
  const [saving,  setSaving]  = useState(false)

  async function create(e) {
    e.preventDefault(); setSaving(true); setFormErr(null)
    try {
      const created = await api.createIngredient(machineId, { name })
      setItems([...items, created]); setName('')
    } catch (e) { setFormErr(e.message) }
    setSaving(false)
  }

  async function del(item) {
    if (!confirm(`"${item.name}" verwijderen?`)) return
    try {
      await api.deleteIngredient(machineId, item.id)
      setItems(items.filter(x => x.id !== item.id))
    } catch (e) { alert(e.message) }
  }

  if (loading) return <Skeleton />
  return (
    <div className="space-y-3">
      <Err msg={err} />
      <form onSubmit={create} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-2">
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nieuw ingrediënt"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
        <button type="submit" disabled={saving} className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
          {saving ? '...' : '+ Toevoegen'}
        </button>
      </form>
      <Err msg={formErr} />
      {!items?.length ? <Empty text="Geen ingrediënten." /> : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium">{item.name}</span>
              <button onClick={() => del(item)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-100">Verwijder</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Glazen ────────────────────────────────────────────────────────────────────

function Glazen({ machineId }) {
  const { items, loading, err, setItems } = useList(() => api.getGlasses(machineId))
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState({ name: '', volume_ml: '' })
  const [formErr,  setFormErr]  = useState(null)
  const [saving,   setSaving]   = useState(false)

  function openNew()  { setForm({ name: '', volume_ml: '' }); setEditing(null); setFormErr(null) }
  function openEdit(g){ setForm({ name: g.name, volume_ml: g.volume_ml }); setEditing(g); setFormErr(null) }

  async function save(e) {
    e.preventDefault(); setSaving(true); setFormErr(null)
    const data = { name: form.name, volume_ml: Number(form.volume_ml) }
    try {
      if (editing) {
        const updated = await api.updateGlass(machineId, editing.id, data)
        setItems(items.map(g => g.id === editing.id ? updated : g))
      } else {
        const created = await api.createGlass(machineId, data)
        setItems([...items, created])
      }
      openNew()
    } catch (e) { setFormErr(e.message) }
    setSaving(false)
  }

  async function del(g) {
    if (!confirm(`"${g.name}" verwijderen?`)) return
    try {
      await api.deleteGlass(machineId, g.id)
      setItems(items.filter(x => x.id !== g.id))
    } catch (e) { alert(e.message) }
  }

  if (loading) return <Skeleton />
  return (
    <div className="space-y-3">
      <Err msg={err} />
      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="text-sm font-medium">{editing ? 'Glas bewerken' : 'Nieuw glas'}</div>
        <Err msg={formErr} />
        <div className="flex gap-2">
          <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Naam"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
          <input required type="number" min="1" value={form.volume_ml} onChange={e => setForm(f => ({...f, volume_ml: e.target.value}))} placeholder="ml"
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
          <button type="submit" disabled={saving} className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            {saving ? '...' : editing ? 'Opslaan' : '+ Toevoegen'}
          </button>
          {editing && <button type="button" onClick={openNew} className="text-gray-500 text-sm px-3 py-2 rounded-lg border border-gray-200">Annuleer</button>}
        </div>
      </form>
      {!items?.length ? <Empty text="Geen glazen." /> : (
        <div className="space-y-2">
          {items.map(g => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium text-sm">{g.name}</div>
                <div className="text-xs text-gray-500">{g.volume_ml} ml</div>
              </div>
              <button onClick={() => openEdit(g)} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded border border-gray-200">Bewerk</button>
              <button onClick={() => del(g)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-100">Verwijder</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Categorieën ───────────────────────────────────────────────────────────────

function Categorieen({ machineId }) {
  const { items, loading, err, setItems } = useList(() => api.getCategories(machineId))
  const [editing, setEditing] = useState(null)
  const [form,    setForm]    = useState({ name: '' })
  const [formErr, setFormErr] = useState(null)
  const [saving,  setSaving]  = useState(false)

  function openNew()  { setForm({ name: '' }); setEditing(null); setFormErr(null) }
  function openEdit(c){ setForm({ name: c.name }); setEditing(c); setFormErr(null) }

  async function save(e) {
    e.preventDefault(); setSaving(true); setFormErr(null)
    try {
      if (editing) {
        const updated = await api.updateCategory(machineId, editing.id, form)
        setItems(items.map(c => c.id === editing.id ? updated : c))
      } else {
        const created = await api.createCategory(machineId, form)
        setItems([...items, created])
      }
      openNew()
    } catch (e) { setFormErr(e.message) }
    setSaving(false)
  }

  async function del(c) {
    if (!confirm(`"${c.name}" verwijderen?`)) return
    try {
      await api.deleteCategory(machineId, c.id)
      setItems(items.filter(x => x.id !== c.id))
    } catch (e) { alert(e.message) }
  }

  if (loading) return <Skeleton />
  return (
    <div className="space-y-3">
      <Err msg={err} />
      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-2">
        <input required value={form.name} onChange={e => setForm({ name: e.target.value })} placeholder={editing ? 'Naam aanpassen' : 'Nieuwe categorie'}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
        <button type="submit" disabled={saving} className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
          {saving ? '...' : editing ? 'Opslaan' : '+ Toevoegen'}
        </button>
        {editing && <button type="button" onClick={openNew} className="text-gray-500 text-sm px-3 py-2 rounded-lg border border-gray-200">Annuleer</button>}
      </form>
      <Err msg={formErr} />
      {!items?.length ? <Empty text="Geen categorieën." /> : (
        <div className="space-y-2">
          {items.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium">{c.name}</span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded border border-gray-200">Bewerk</button>
                <button onClick={() => del(c)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-100">Verwijder</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pompen ────────────────────────────────────────────────────────────────────

function Pompen({ machineId }) {
  const { items: pumps, loading: pumpsLoading, err: pumpsErr } = useList(() => api.getPumps(machineId))
  const { items: ingredients } = useList(() => api.getIngredients(machineId))
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

  if (pumpsLoading) return <Skeleton />
  return (
    <div className="space-y-3">
      <Err msg={pumpsErr} />
      {!pumps?.length ? <Empty text="Geen pompen gevonden." /> : pumps.map(p => (
        <div key={p.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4">
          <div className="w-16">
            <div className="font-medium text-sm">Pomp {p.slot}</div>
            <div className={`text-xs mt-0.5 ${p.loaded ? 'text-green-600' : 'text-gray-400'}`}>
              {p.loaded ? 'Geladen' : 'Leeg'}
            </div>
          </div>
          <select
            value={p.ingredient_id || ''}
            onChange={e => assign(p, e.target.value ? Number(e.target.value) : null)}
            disabled={saving === p.id}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          >
            <option value="">— Niet ingesteld —</option>
            {(ingredients || []).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          {saved === p.id && <span className="text-green-600 text-xs">Opgeslagen</span>}
          {saving === p.id && <span className="text-gray-400 text-xs">...</span>}
        </div>
      ))}
    </div>
  )
}

// ── Instellingen ──────────────────────────────────────────────────────────────

function Instellingen({ machineId }) {
  const { items: data, loading } = useList(() => api.getSettings(machineId))
  const [name,   setName]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => { if (data?.machine_name) setName(data.machine_name) }, [data])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.updateSettings(machineId, { machine_name: name })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  if (loading) return <div className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />
  return (
    <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="text-sm font-medium">Naam van de machine</div>
      <input value={name} onChange={e => setName(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        placeholder="Bijv. Bar machine" />
      <button type="submit" disabled={saving}
        className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
        {saved ? 'Opgeslagen' : saving ? 'Opslaan...' : 'Opslaan'}
      </button>
    </form>
  )
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function InfoField({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  )
}

function MachineInfoTab({ machineId, status, online }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!online) { setLoading(false); return }
    api.getMachineInfo(machineId)
      .then(setInfo)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [machineId, online])

  const serial = info?.machine_id?.startsWith('pi-')
    ? info.machine_id.replace('pi-', '').toUpperCase()
    : info?.machine_id

  return (
    <div className="space-y-4">
      {/* Altijd tonen: portaal-zijde info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Portaal</h3>
        <InfoField label="Machine ID" value={machineId} mono />
        <InfoField label="Naam"       value={status?.name} />
        <InfoField label="Model"      value={status?.model || 'MIXMATE'} />
        <InfoField label="Softwareversie" value={status?.version ? `v${status.version}` : null} />
        {status?.last_seen && (
          <InfoField label="Laatste contact" value={new Date(status.last_seen).toLocaleString('nl-NL')} />
        )}
      </div>

      {/* Live info van de machine zelf */}
      {!online ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          Machine is offline — live info niet beschikbaar.
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Identificatie</h3>
            <InfoField label="Serienummer" value={serial} mono />
            <InfoField label="Hostnaam"    value={info?.hostname} mono />
            <InfoField label="IP-adres"    value={info?.ip_address} mono />
            <InfoField label="MAC-adres"   value={info?.mac_address} mono />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Hardware</h3>
            <InfoField label="Uptime"       value={info?.uptime} />
            <InfoField label="CPU-temp."    value={info?.cpu_temp != null ? `${info.cpu_temp} °C` : null} />
            <InfoField label="RAM gebruikt" value={info?.ram_used && info?.ram_total ? `${info.ram_used} / ${info.ram_total}` : null} />
            <InfoField label="Opslag"       value={info?.disk_used ? `${info.disk_used} / ${info.disk_total} (${info.disk_pct})` : null} />
          </div>
        </>
      )}
    </div>
  )
}
