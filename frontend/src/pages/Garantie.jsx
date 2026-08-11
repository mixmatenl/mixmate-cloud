import React, { useState, useEffect } from 'react'
import { fetchApi } from '../api.js'

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16, padding: '22px 24px', marginBottom: 20, ...style }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f2f2f7' }}>
      <span style={{ fontSize: 14, color: '#6e6e73' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, color: '#1d1d1f' }}>{value}</span>
    </div>
  )
}

export default function Garantie() {
  const [machines, setMachines] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState({})
  const [mixcareYears, setMixcareYears] = useState({})
  const [msgs, setMsgs] = useState({})

  useEffect(() => {
    fetchApi('/api/account/warranty')
      .then(d => { setMachines(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function requestMixcare(machineId) {
    const years = mixcareYears[machineId] || 3
    setRequesting(r => ({ ...r, [machineId]: true }))
    setMsgs(m => ({ ...m, [machineId]: null }))
    try {
      await fetchApi('/api/account/warranty/request-mixcare', {
        method: 'POST',
        body: JSON.stringify({ machine_id: machineId, years }),
      })
      setMsgs(m => ({ ...m, [machineId]: { ok: true, text: `Uw aanvraag voor MIXCARE ${years} jaar is ontvangen. Wij nemen zo spoedig mogelijk contact met u op om dit te bevestigen.` } }))
    } catch (e) {
      setMsgs(m => ({ ...m, [machineId]: { ok: false, text: e.message } }))
    }
    setRequesting(r => ({ ...r, [machineId]: false }))
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e5ea', borderTopColor: '#1d1d1f', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1d1d1f', margin: '0 0 6px' }}>Garantie & MIXCARE</h1>
      <p style={{ fontSize: 15, color: '#6e6e73', margin: '0 0 28px' }}>
        Overzicht van uw garantiestatus per machine.
      </p>

      {(!machines || machines.length === 0) && (
        <Card>
          <p style={{ fontSize: 15, color: '#6e6e73', margin: 0, textAlign: 'center' }}>
            Geen machines gevonden. Koppel een machine aan uw account om garantie-informatie te zien.
          </p>
        </Card>
      )}

      {machines && machines.map(m => {
        const typeLabel = m.warranty_type === 'mixcare'
          ? `MIXCARE (${m.warranty_years} jaar)`
          : `Fabrieksgarantie (${m.warranty_years} jaar)`
        const statusColor = !m.warranty_start ? '#6e6e73' : m.active ? '#34c759' : '#ff3b30'
        const statusText  = !m.warranty_start ? 'Niet ingesteld'
          : m.active ? `Actief — nog ${m.days_left} dagen` : 'Verlopen'

        return (
          <div key={m.machine_id}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>🛡️</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f' }}>{m.name}</div>
                  <div style={{ fontSize: 13, color: '#6e6e73' }}>{m.machine_id}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.warranty_type === 'mixcare' ? '#5856d6' : '#1d1d1f' }}>{typeLabel}</div>
                  <div style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{statusText}</div>
                </div>
              </div>

              {m.warranty_start ? (
                <>
                  <InfoRow label="Installatiedatum" value={m.installation_date || '—'} />
                  <InfoRow label="Ingangsdatum garantie" value={m.warranty_start} />
                  <InfoRow label="Einddatum garantie" value={m.warranty_end || '—'} bold />
                  <div style={{ marginTop: 14 }}>
                    <div style={{
                      height: 8, borderRadius: 4, background: '#f2f2f7', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        background: m.active ? '#34c759' : '#ff3b30',
                        width: m.active && m.days_left != null
                          ? `${Math.min(100, Math.max(0, (m.days_left / (m.warranty_years * 365)) * 100))}%`
                          : m.active ? '50%' : '100%',
                        transition: 'width 0.5s',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#aeaeb2' }}>
                      <span>{m.warranty_start}</span>
                      <span>{m.warranty_end}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
                  Garantie-informatie wordt ingesteld door de monteur tijdens installatie.
                  Neem contact op met MIXMATE als dit niet correct is.
                </p>
              )}
            </Card>

            {/* MIXCARE aanvragen */}
            {m.mixcare_eligible && (
              <Card style={{ background: '#f5f3ff', border: '1px solid #d4caff' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>
                  MIXCARE uitbreiden
                </div>
                <p style={{ fontSize: 14, color: '#3a3a3c', margin: '0 0 16px', lineHeight: 1.6 }}>
                  Verleng uw garantie naar 3, 4 of 5 jaar met MIXCARE.
                  U heeft nog <strong style={{ color: '#5856d6' }}>{m.mixcare_days_remaining} dagen</strong> de tijd om dit aan te vragen.
                </p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[3, 4, 5].map(y => (
                    <button key={y} onClick={() => setMixcareYears(prev => ({ ...prev, [m.machine_id]: y }))}
                      style={{
                        padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        border: `2px solid ${(mixcareYears[m.machine_id] || 3) === y ? '#5856d6' : '#d4caff'}`,
                        background: (mixcareYears[m.machine_id] || 3) === y ? '#5856d6' : '#fff',
                        color: (mixcareYears[m.machine_id] || 3) === y ? '#fff' : '#1d1d1f',
                      }}>
                      {y} jaar
                    </button>
                  ))}
                </div>
                <button onClick={() => requestMixcare(m.machine_id)} disabled={requesting[m.machine_id]}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                    background: requesting[m.machine_id] ? '#e5e5ea' : '#5856d6',
                    color: requesting[m.machine_id] ? '#6e6e73' : '#fff',
                    fontSize: 15, fontWeight: 700, cursor: requesting[m.machine_id] ? 'default' : 'pointer',
                  }}>
                  {requesting[m.machine_id] ? 'Aanvragen…' : `MIXCARE ${mixcareYears[m.machine_id] || 3} jaar aanvragen`}
                </button>
                {msgs[m.machine_id] && (
                  <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 14,
                    background: msgs[m.machine_id].ok ? '#f0faf3' : '#fff5f5',
                    color: msgs[m.machine_id].ok ? '#1a7a3a' : '#cc2200',
                    border: `1px solid ${msgs[m.machine_id].ok ? '#a3e6b4' : '#ffb8b8'}` }}>
                    {msgs[m.machine_id].text}
                  </div>
                )}
              </Card>
            )}

            {!m.mixcare_eligible && m.warranty_type === 'factory' && m.installation_date && (
              <Card style={{ background: '#f9f9fb' }}>
                <p style={{ fontSize: 14, color: '#6e6e73', margin: 0 }}>
                  De termijn voor MIXCARE aanvragen (30 dagen na installatie) is verstreken.
                  Neem contact op met MIXMATE voor meer informatie over garantie-uitbreiding.
                </p>
              </Card>
            )}
          </div>
        )
      })}

      <Card style={{ background: '#f9f9fb', border: '1px solid #e5e5ea' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Over MIXCARE</div>
        <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, lineHeight: 1.7 }}>
          Met MIXCARE breidt u de standaard fabrieksgarantie van 2 jaar uit naar 3, 4 of 5 jaar.
          MIXCARE kan alleen worden aangevraagd binnen 30 dagen na installatie van de machine.
          Neem voor vragen contact op via <a href="mailto:info@mixmate.nl" style={{ color: '#007aff' }}>info@mixmate.nl</a>.
        </p>
      </Card>
    </div>
  )
}
