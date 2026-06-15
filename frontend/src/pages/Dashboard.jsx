import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function Dashboard({ user, onLogout }) {
  const [machines,   setMachines]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [pairCode,   setPairCode]   = useState('')
  const [pairing,    setPairing]    = useState(false)
  const [pairErr,    setPairErr]    = useState(null)
  const [showPair,   setShowPair]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(null) // machine object
  const [deleting,   setDeleting]   = useState(false)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await api.getMachines()
      setMachines(data)
    } catch {
      onLogout()
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await api.unpairMachine(confirmDel.machine_id)
      setMachines(prev => prev.filter(m => m.machine_id !== confirmDel.machine_id))
      setConfirmDel(null)
    } catch (err) {
      alert('Fout: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handlePair(e) {
    e.preventDefault()
    setPairing(true)
    setPairErr(null)
    try {
      const machine = await api.pairMachine(pairCode)
      setMachines(prev => [...prev, machine])
      setPairCode('')
      setShowPair(false)
    } catch (err) {
      setPairErr(err.message)
    } finally {
      setPairing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      {/* Topbar */}
      <div className="bg-[#111] text-white px-6 py-4 flex items-center justify-between">
        <span className="font-bold tracking-tight text-lg">MIXMATE</span>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">{user?.name || user?.email}</span>
          <button onClick={onLogout} className="text-white/50 hover:text-white text-sm transition-colors">
            Uitloggen
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Mijn machines</h1>
          <button
            onClick={() => setShowPair(true)}
            className="bg-[#111] text-white text-sm px-4 py-2 rounded-lg hover:bg-black/80 transition-colors"
          >
            + Machine koppelen
          </button>
        </div>

        {/* Koppelformulier */}
        {showPair && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <h2 className="font-medium mb-1">Machine koppelen</h2>
            <p className="text-sm text-gray-500 mb-4">
              Voer de 6-cijferige koppelcode in die op het scherm van je machine staat.
            </p>
            <form onSubmit={handlePair} className="flex gap-2">
              <input
                value={pairCode}
                onChange={e => setPairCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <button
                type="submit"
                disabled={pairing || pairCode.length !== 6}
                className="bg-[#111] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {pairing ? 'Koppelen...' : 'Koppelen'}
              </button>
              <button
                type="button"
                onClick={() => { setShowPair(false); setPairErr(null) }}
                className="text-gray-400 hover:text-gray-600 px-2 text-sm"
              >
                Annuleren
              </button>
            </form>
            {pairErr && (
              <p className="text-red-600 text-sm mt-2">{pairErr}</p>
            )}
          </div>
        )}

        {/* Machine lijst */}
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 h-20 animate-pulse" />
            ))}
          </div>
        ) : machines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">🍹</div>
            <div className="font-medium mb-1">Nog geen machine gekoppeld</div>
            <div className="text-sm text-gray-500">
              Klik op "Machine koppelen" en voer de code in die op je machine staat.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {machines.map(m => (
              <div key={m.machine_id} className="bg-white rounded-2xl border border-gray-200 flex items-center hover:border-gray-300 transition-colors">
                <button
                  onClick={() => navigate(`/machine/${m.machine_id}`)}
                  className="flex-1 p-5 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{m.model || 'MIXMATE'} · v{m.version || '—'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      m.last_seen ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.last_seen ? 'Online' : 'Offline'}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDel(m) }}
                  className="px-4 py-5 text-gray-300 hover:text-red-400 transition-colors border-l border-gray-100"
                  title="Machine verwijderen"
                >
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

      {/* Bevestigingsdialog verwijderen */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="font-semibold text-lg mb-1">Machine verwijderen?</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              <span className="font-medium text-gray-800">{confirmDel.name}</span> wordt permanent verwijderd uit je account. De machine zelf blijft werken maar moet opnieuw gekoppeld worden.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleting ? 'Verwijderen...' : 'Verwijderen'}
              </button>
              <button
                onClick={() => setConfirmDel(null)}
                className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
