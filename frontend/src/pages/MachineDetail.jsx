import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const TABS = ['Overzicht', 'Recepten', 'Ingrediënten', 'Glazen', 'Categorieën', 'Pompen', 'Instellingen']

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
    <div className="min-h-screen bg-[#f2f2f2]">
      <div className="bg-[#111] text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-white/50 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="font-bold tracking-tight text-lg flex-1">{status?.name || 'Machine'}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          status?.online ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/40'
        }`}>{status?.online ? 'Online' : 'Offline'}</span>
      </div>

      <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 text-sm text-gray-500">
        <span>{status?.model || 'MIXMATE'}</span>
        <span>v{status?.version || '—'}</span>
        {status?.last_seen && <span>Laatste contact: {new Date(status.last_seen).toLocaleString('nl-NL')}</span>}
      </div>

      <div className="bg-white border-b border-gray-200 px-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t ? 'border-[#111] text-[#111]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
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

function Recepten({ machineId }) {
  const { items, loading, err, reload, setItems } = useList(() => api.getRecipes(machineId))
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [formErr,  setFormErr]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({ name: '', category_name: '', description: '' })

  function openNew() { setForm({ name: '', category_name: '', description: '' }); setEditing(null); setFormErr(null); setShowForm(true) }
  function openEdit(r) { setForm({ name: r.name, category_name: r.category_name || '', description: r.description || '' }); setEditing(r); setFormErr(null); setShowForm(true) }

  async function save(e) {
    e.preventDefault(); setSaving(true); setFormErr(null)
    try {
      if (editing) {
        const updated = await api.updateRecipe(machineId, editing.id, form)
        setItems(items.map(r => r.id === editing.id ? updated : r))
      } else {
        const created = await api.createRecipe(machineId, form)
        setItems([...items, created])
      }
      setShowForm(false)
    } catch (e) { setFormErr(e.message) }
    setSaving(false)
  }

  async function del(r) {
    if (!confirm(`"${r.name}" verwijderen?`)) return
    try {
      await api.deleteRecipe(machineId, r.id)
      setItems(items.filter(x => x.id !== r.id))
    } catch (e) { alert(e.message) }
  }

  if (loading) return <Skeleton />
  return (
    <div className="space-y-3">
      <Err msg={err} />
      <div className="flex justify-end">
        <button onClick={openNew} className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg">+ Nieuw recept</button>
      </div>
      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="font-medium text-sm">{editing ? 'Recept bewerken' : 'Nieuw recept'}</div>
          <Err msg={formErr} />
          <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
            placeholder="Naam" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
          <input value={form.category_name} onChange={e => setForm(f => ({...f, category_name: e.target.value}))}
            placeholder="Categorie (optioneel)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10" />
          <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
            placeholder="Omschrijving (optioneel)" rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm px-4 py-2 rounded-lg border border-gray-200">Annuleren</button>
          </div>
        </form>
      )}
      {!items?.length ? <Empty text="Geen recepten." /> : (
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium text-sm">{r.name}</div>
                {r.category_name && <div className="text-xs text-gray-500 mt-0.5">{r.category_name}</div>}
              </div>
              <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded border border-gray-200">Bewerk</button>
              <button onClick={() => del(r)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-100">Verwijder</button>
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
