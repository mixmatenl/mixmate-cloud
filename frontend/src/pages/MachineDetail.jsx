import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const TABS = ['Overzicht', 'Recepten', 'Pompen', 'Instellingen']

export default function MachineDetail({ user, onLogout }) {
  const { machineId } = useParams()
  const navigate = useNavigate()
  const [tab,      setTab]      = useState('Overzicht')
  const [status,   setStatus]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [data,     setData]     = useState(null)
  const [dataLoad, setDataLoad] = useState(false)

  useEffect(() => {
    api.machineStatus(machineId)
      .then(setStatus)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [machineId])

  useEffect(() => {
    if (!status?.online) return
    setData(null)
    setDataLoad(true)
    const loaders = {
      'Recepten':    () => api.getRecipes(machineId),
      'Pompen':      () => api.getPumps(machineId),
      'Instellingen':() => api.getSettings(machineId),
    }
    if (loaders[tab]) {
      loaders[tab]().then(setData).catch(() => {}).finally(() => setDataLoad(false))
    } else {
      setDataLoad(false)
    }
  }, [tab, status])

  if (loading) return (
    <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
      <div className="text-gray-400 text-sm">Laden...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Topbar */}
      <div className="bg-[#111] text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-white/50 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="font-bold tracking-tight text-lg flex-1">{status?.name || 'Machine'}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          status?.online ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/40'
        }`}>
          {status?.online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Info balk */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-6 text-sm text-gray-500">
        <span>{status?.model || 'MIXMATE'}</span>
        <span>v{status?.version || '—'}</span>
        {status?.last_seen && (
          <span>Laatste contact: {new Date(status.last_seen).toLocaleString('nl-NL')}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-[#111] text-[#111]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!status?.online && tab !== 'Overzicht' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm mb-4">
            De machine is offline. Zet hem aan om gegevens te bekijken.
          </div>
        )}

        {tab === 'Overzicht' && <Overview status={status} />}
        {tab === 'Recepten'  && <DataList loading={dataLoad} data={data} renderItem={r => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div className="font-medium text-sm">{r.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{r.category_name || ''}</div>
          </div>
        )} empty="Geen recepten gevonden." />}
        {tab === 'Pompen' && <DataList loading={dataLoad} data={data} renderItem={p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-medium text-sm">Pomp {p.slot}</div>
              <div className="text-xs text-gray-500 mt-0.5">{p.ingredient_name || 'Niet ingesteld'}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${p.loaded ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {p.loaded ? 'Geladen' : 'Leeg'}
            </span>
          </div>
        )} empty="Geen pompen gevonden." />}
        {tab === 'Instellingen' && <Settings machineId={machineId} data={data} loading={dataLoad} online={status?.online} />}
      </div>
    </div>
  )
}

function Overview({ status }) {
  if (!status) return null
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card label="Model"   value={status.model   || '—'} />
        <Card label="Versie"  value={status.version ? `v${status.version}` : '—'} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
        <div className="text-xs text-gray-500 mb-1">Machine ID</div>
        <div className="font-mono text-sm text-gray-700">{status.machine_id}</div>
      </div>
    </div>
  )
}

function Card({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  )
}

function DataList({ loading, data, renderItem, empty }) {
  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 h-14 animate-pulse" />)}
    </div>
  )
  if (!data) return null
  const items = Array.isArray(data) ? data : (data.items || [])
  if (!items.length) return <div className="text-sm text-gray-400 text-center py-8">{empty}</div>
  return <div className="space-y-2">{items.map(renderItem)}</div>
}

function Settings({ machineId, data, loading, online }) {
  const [name, setName]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    if (data?.machine_name) setName(data.machine_name)
  }, [data])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateSettings(machineId, { machine_name: name })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    finally { setSaving(false) }
  }

  if (loading) return <div className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />
  if (!online) return null

  return (
    <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-medium text-sm">Naam van de machine</h2>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
        placeholder="Bijv. Bar machine"
      />
      <button
        type="submit"
        disabled={saving}
        className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {saved ? 'Opgeslagen ✓' : saving ? 'Opslaan...' : 'Opslaan'}
      </button>
    </form>
  )
}
