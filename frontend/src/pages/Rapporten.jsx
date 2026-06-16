import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

function fmt(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function groupByRecipe(pours) {
  const map = {}
  for (const p of pours) {
    if (!map[p.recipe_name]) map[p.recipe_name] = { name: p.recipe_name, count: 0, times: [] }
    map[p.recipe_name].count++
    map[p.recipe_name].times.push(p.poured_at)
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
}

export default function Rapporten() {
  const [machines, setMachines] = useState([])
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [date,   setDate]   = useState(todayISO())
  const [pours,  setPours]  = useState(null)
  const [stats,  setStats]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.getMachines().then(list => {
      setMachines(list)
      if (list.length > 0) setSelectedMachine(list[0].machine_id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedMachine) return
    setLoading(true)
    setError(null)
    Promise.all([
      api.getMachinePours(selectedMachine, date),
      api.getMachinePourStats(selectedMachine),
    ])
      .then(([p, s]) => { setPours(p); setStats(s) })
      .catch(() => setError('Machine is offline of niet bereikbaar.'))
      .finally(() => setLoading(false))
  }, [selectedMachine, date])

  const grouped = pours ? groupByRecipe(pours) : []
  const total = pours?.length ?? 0

  // Piekuur berekenen
  const peakHour = (() => {
    if (!pours || pours.length === 0) return null
    const hours = {}
    for (const p of pours) {
      const h = new Date(p.poured_at).getHours()
      hours[h] = (hours[h] || 0) + 1
    }
    const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]
    return peak ? `${peak[0]}:00–${peak[0]}:59` : null
  })()

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1c1c1e', marginBottom: 4, letterSpacing: -0.4 }}>Rapporten</h1>
      <p style={{ fontSize: 14, color: '#8e8e93', marginBottom: 28 }}>Dagelijks overzicht van gemaakte cocktails per machine.</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {/* Machine selector */}
        <select
          value={selectedMachine || ''}
          onChange={e => setSelectedMachine(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 10, padding: '10px 14px', fontSize: 14,
            color: '#1c1c1e', fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {(machines || []).map(m => (
            <option key={m.machine_id} value={m.machine_id}>{m.name || m.machine_id}</option>
          ))}
        </select>

        {/* Datum */}
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={e => setDate(e.target.value)}
          style={{
            background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 10, padding: '10px 14px', fontSize: 14,
            color: '#1c1c1e', fontFamily: 'inherit', cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        />
      </div>

      {/* Inhoud */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#aeaeb2', fontSize: 14 }}>
          Laden…
        </div>
      ) : error ? (
        <div style={{
          background: '#fff5f5', border: '1px solid rgba(255,59,48,0.2)',
          borderRadius: 14, padding: '20px 24px', color: '#ff3b30', fontSize: 14,
        }}>
          {error}
        </div>
      ) : pours !== null && (
        <>
          {/* Samenvatting */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Totaal gemaakt', value: total },
              { label: 'Verschillende cocktails', value: grouped.length },
              { label: 'Piekuur', value: peakHour || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#fff', borderRadius: 14, padding: '16px 20px',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1c1c1e', letterSpacing: -0.5 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Per cocktail */}
          {grouped.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 16, padding: '48px 24px',
              border: '1px solid rgba(0,0,0,0.07)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🍹</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1c1c1e', marginBottom: 4 }}>Geen cocktails gemaakt</div>
              <div style={{ fontSize: 14, color: '#aeaeb2' }}>Op {new Date(date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} zijn er geen cocktails geregistreerd.</div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 120px', gap: 0, padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1 }}>Cocktail</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>Aantal</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' }}>Laatste</div>
              </div>

              {grouped.map((item, i) => (
                <div key={item.name} style={{
                  display: 'grid', gridTemplateColumns: '1fr 64px 120px',
                  padding: '13px 20px',
                  borderBottom: i < grouped.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {i === 0 && <span style={{ fontSize: 14 }}>🥇</span>}
                    {i === 1 && <span style={{ fontSize: 14 }}>🥈</span>}
                    {i === 2 && <span style={{ fontSize: 14 }}>🥉</span>}
                    {i > 2 && <span style={{ width: 22, textAlign: 'center', fontSize: 12, color: '#c7c7cc', fontWeight: 600 }}>{i + 1}</span>}
                    <span style={{ fontSize: 15, color: '#1c1c1e', fontWeight: i < 3 ? 600 : 400 }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      background: i === 0 ? '#1c1c1e' : 'rgba(0,0,0,0.05)',
                      color: i === 0 ? '#fff' : '#1c1c1e',
                      padding: '3px 10px', borderRadius: 20,
                    }}>{item.count}×</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: '#8e8e93' }}>
                    {fmt(item.times[0])}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 30-dagen grafiek als er stats zijn */}
          {stats?.pours_per_day?.length > 0 && (
            <div style={{ marginTop: 20, background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Afgelopen 30 dagen</div>
              <BarChart data={stats.pours_per_day} selectedDate={date} onSelect={setDate} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BarChart({ data, selectedDate, onSelect }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, overflowX: 'auto' }}>
      {data.map(d => {
        const pct = d.count / max
        const isSelected = d.date === selectedDate
        const isToday = d.date === todayISO()
        return (
          <div key={d.date} onClick={() => d.count > 0 && onSelect(d.date)}
            title={`${d.date}: ${d.count} cocktails`}
            style={{ flex: 1, minWidth: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: d.count > 0 ? 'pointer' : 'default' }}>
            <div style={{
              width: '100%', borderRadius: 4,
              height: `${Math.max(pct * 64, d.count > 0 ? 4 : 2)}px`,
              background: isSelected ? '#1c1c1e' : isToday ? '#636366' : d.count > 0 ? '#c7c7cc' : '#f2f2f7',
              transition: 'background 0.15s',
            }} />
          </div>
        )
      })}
    </div>
  )
}
