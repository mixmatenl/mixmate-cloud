import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

export default function Dashboard({ user, onLogout }) {
  const [machines, setMachines] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [pairCode, setPairCode] = useState('')
  const [pairing,  setPairing]  = useState(false)
  const [pairErr,  setPairErr]  = useState(null)
  const [showPair, setShowPair] = useState(false)
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
              <button
                key={m.machine_id}
                onClick={() => navigate(`/machine/${m.machine_id}`)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between hover:border-gray-300 transition-colors text-left"
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
