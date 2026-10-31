import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'

const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
const money = cents => eur.format((cents || 0) / 100)
const copyText = cents => ((cents || 0) / 100).toFixed(2).replace('.', ',')
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

// Zelfde regels als de server: 1.234,56 · 1234.56 · 1.210 (= duizendtallen); optioneel een min-teken
function parseMoney(input) {
  let raw = String(input ?? '').trim().replace(/\s/g, '').replace(/^(-?)€/, '$1')
  if (!raw) return 0
  const neg = raw.startsWith('-')
  if (neg) raw = raw.slice(1)
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(raw)) return null
  const c = Math.round(parseFloat(raw) * 100)
  return neg ? -c : c
}
const centsToInput = c => (c == null || c === 0) ? '' : (c / 100).toFixed(2).replace('.', ',')

const SIGNED = new Set(['other_vat', 'r5b_adjust'])
const validCents = (k, c) => c != null && (c >= 0 || SIGNED.has(k))
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

function lastCompletedQuarter() {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return q === 1 ? { year: now.getFullYear() - 1, n: 4 } : { year: now.getFullYear(), n: q - 1 }
}

const S = {
  card:  { background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16 },
  sel:   { border: '1px solid #e5e5ea', borderRadius: 10, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', background: '#fff' },
  inp:   { width: '100%', border: '1px solid #e5e5ea', borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'inherit', textAlign: 'right', boxSizing: 'border-box', background: '#fff' },
  head:  { fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5 },
}

function CopyBtn({ cents, disabled }) {
  const [ok, setOk] = useState(false)
  async function copy() {
    const text = copyText(cents)
    try { await navigator.clipboard.writeText(text) }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy') } catch { /* geen klembord */ } t.remove() }
    setOk(true); setTimeout(() => setOk(false), 1200)
  }
  return (
    <button type="button" onClick={copy} disabled={disabled} title={`Kopieer ${copyText(cents)}`}
      style={{ border: 'none', background: ok ? '#ecfdf3' : '#f2f2f7', color: ok ? '#15803d' : '#6e6e73', borderRadius: 8, width: 30, height: 30, cursor: disabled ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit', flexShrink: 0, opacity: disabled ? .4 : 1 }}>
      {ok ? '✓' : '⧉'}
    </button>
  )
}

// Eén cel: invoerveld (handmatig) of berekende waarde, plus kopieerknop
function Cell({ value, onChange, cents, readOnly, placeholder }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
      {readOnly
        ? <div style={{ flex: 1, textAlign: 'right', fontSize: 14.5, fontWeight: 700, padding: '8px 4px', whiteSpace: 'nowrap' }}>{money(cents)}</div>
        : <input inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '0,00'} style={S.inp} />}
      <CopyBtn cents={cents} disabled={cents == null} />
    </div>
  )
}

function RowLine({ code, label, base, vat, note }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'center', padding: '10px 18px', borderTop: '1px solid #f2f2f7' }} className="fin-vat-row">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}><span style={{ color: '#FF751F', marginRight: 8 }}>{code}</span>{label}</div>
        {note && <div style={{ fontSize: 12, color: '#8a8a90', marginTop: 2, lineHeight: 1.4 }}>{note}</div>}
      </div>
      {base ? <div className="fin-vat-cell" data-label="Omzet (excl. BTW)">{base}</div> : <div className="fin-vat-empty" />}
      {vat ? <div className="fin-vat-cell" data-label="Omzetbelasting">{vat}</div> : <div className="fin-vat-empty" />}
    </div>
  )
}

export default function FinancienAangifte({ people }) {
  const init = useMemo(lastCompletedQuarter, [])
  const [year, setYear] = useState(init.year)
  const [kind, setKind] = useState('kwartaal')
  const [n, setN]       = useState(init.n)
  const [data, setData] = useState(null)
  const [err, setErr]   = useState(null)
  const [inputs, setInputs] = useState({})
  const [saved, setSaved]   = useState(null)   // null | 'bezig' | 'opgeslagen' | 'fout'
  const [showList, setShowList] = useState(false)
  const pending = useRef(null)                  // { key, inputs } dat nog niet is opgeslagen
  const timer = useRef(null)

  const years = useMemo(() => { const y = new Date().getFullYear(); return [y + 1, y, y - 1, y - 2, y - 3] }, [])
  const nameOf = email => people.find(p => p.email === email)?.name || email

  const toPayload = useCallback(inp => {
    const out = {}
    for (const [k, v] of Object.entries(inp)) {
      if (String(v).trim() !== '' && validCents(k, parseMoney(v))) out[k] = String(v).trim()   // ongeldige velden niet opslaan
    }
    return out
  }, [])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const p = pending.current
    if (!p) return
    pending.current = null
    setSaved('bezig')
    try { await api.financeSaveVatDraft(p.key, toPayload(p.inputs)); setSaved('opgeslagen') }
    catch (e) { setSaved('fout'); setErr(e.message) }
  }, [toPayload])

  useEffect(() => {
    let alive = true
    flush()
    setData(null); setErr(null); setSaved(null)
    api.financeVatReturn(year, kind, n).then(d => {
      if (!alive) return
      setData(d)
      const next = {}
      for (const [k, v] of Object.entries(d.draft || {})) next[k] = centsToInput(v)
      setInputs(next)
    }).catch(e => alive && setErr(e.message))
    return () => { alive = false }
  }, [year, kind, n, flush])

  useEffect(() => () => { flush() }, [flush])

  function setField(key, value) {
    const next = { ...inputs, [key]: value }
    setInputs(next)
    pending.current = { key: data.period.key, inputs: next }
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 800)
    setSaved(null)
  }

  // --- berekening (alles in centen) ---
  const val = k => { const c = parseMoney(inputs[k]); return validCents(k, c) ? c : null }
  const invalid = Object.keys(inputs).filter(k => String(inputs[k] ?? '').trim() !== '' && val(k) == null)
  const v = k => val(k) ?? 0
  const vat1a = Math.round(v('r1a_base') * 21 / 100)
  const vat1b = Math.round(v('r1b_base') * 9 / 100)
  const vat1c = v('r1c_vat'), vat1d = v('r1d_vat'), other = v('other_vat')
  const sum5a = vat1a + vat1b + vat1c + vat1d + other
  const auto5b = data?.voorbelasting.total_cents || 0
  const sum5b = auto5b + v('r5b_adjust')
  const sum5c = sum5a - sum5b

  const field = (k, ph) => <Cell value={inputs[k] ?? ''} onChange={x => setField(k, x)} cents={val(k)} placeholder={ph} />
  const pill = (active) => ({ padding: '8px 16px', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, background: active ? '#fff' : 'transparent', color: active ? '#1d1d1f' : '#6e6e73', boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none' })

  return (
    <div>
      <style>{`@media (max-width: 720px) {
        .fin-vat-row { grid-template-columns: 1fr !important; gap: 6px !important; }
        .fin-vat-cell { max-width: 280px; }
        .fin-vat-cell::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; color: #8a8a90; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 3px; }
        .fin-vat-empty, .fin-vat-colhead { display: none !important; }
      }`}</style>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 3, background: '#f2f2f7', borderRadius: 11, padding: 3 }}>
          <button style={pill(kind === 'kwartaal')} onClick={() => { if (kind !== 'kwartaal') { setKind('kwartaal'); setN(Math.ceil(n / 3)) } }}>Kwartaal</button>
          <button style={pill(kind === 'maand')} onClick={() => { if (kind !== 'maand') { setKind('maand'); setN(n * 3) } }}>Maand</button>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={S.sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        <select value={n} onChange={e => setN(Number(e.target.value))} style={S.sel}>
          {kind === 'kwartaal'
            ? [1, 2, 3, 4].map(q => <option key={q} value={q}>Kwartaal {q}</option>)
            : MONTHS.map((m, i) => <option key={m} value={i + 1}>{m[0].toUpperCase() + m.slice(1)}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12.5, color: saved === 'fout' ? '#d70015' : '#8a8a90' }}>
          {saved === 'bezig' ? 'Opslaan…' : saved === 'opgeslagen' ? 'Ingevulde bedragen opgeslagen ✓' : saved === 'fout' ? 'Opslaan mislukt' : ''}
        </div>
      </div>

      {err && <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#d70015', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{err}</div>}
      {!data && !err && <div style={{ color: '#aeaeb2', padding: 40, textAlign: 'center' }}>Laden…</div>}

      {data && <>
        <div style={{ ...S.card, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Aangifte omzetbelasting — {data.period.label}</div>
            <div style={{ fontSize: 12.5, color: '#8a8a90', marginTop: 3 }}>{fmtDate(data.period.start)} t/m {fmtDate(data.period.end)}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 12, padding: '8px 18px', background: '#fafafa', borderTop: '1px solid #f2f2f7' }} className="fin-vat-row">
            <div style={S.head}>1. Prestaties binnenland</div>
            <div className="fin-vat-colhead" style={{ ...S.head, textAlign: 'right' }}>Omzet (excl. BTW)</div>
            <div className="fin-vat-colhead" style={{ ...S.head, textAlign: 'right' }}>Omzetbelasting</div>
          </div>

          <RowLine code="1a" label="Leveringen/diensten belast met hoog tarief (21%)"
            base={field('r1a_base')} vat={<Cell readOnly cents={vat1a} />} note="Omzet vul je zelf in; de BTW wordt berekend." />
          <RowLine code="1b" label="Leveringen/diensten belast met laag tarief (9%)"
            base={field('r1b_base')} vat={<Cell readOnly cents={vat1b} />} />
          <RowLine code="1c" label="Leveringen/diensten belast met overige tarieven, behalve 0%"
            base={field('r1c_base')} vat={field('r1c_vat')} />
          <RowLine code="1d" label="Privégebruik" base={field('r1d_base')} vat={field('r1d_vat')}
            note="Alleen invullen als je BTW over privégebruik moet aangeven. Hoeveel dat is, bepaal je zelf of met je boekhouder." />
          <RowLine code="1e" label="Leveringen/diensten belast met 0% of niet bij u belast" base={field('r1e_base')} vat={null} />

          <div style={{ padding: '8px 18px', background: '#fafafa', borderTop: '1px solid #f2f2f7' }}><div style={S.head}>2 t/m 4. Verlegd en buitenland</div></div>
          <RowLine code="2–4" label="Verschuldigde omzetbelasting uit deze rubrieken (totaal)" base={null} vat={field('other_vat')}
            note="Optioneel: verlegde BTW en BTW uit het buitenland, bij elkaar opgeteld." />

          <div style={{ padding: '8px 18px', background: '#fafafa', borderTop: '1px solid #f2f2f7' }}><div style={S.head}>5. Voorbelasting en totaal</div></div>
          <RowLine code="5a" label="Verschuldigde omzetbelasting" base={null} vat={<Cell readOnly cents={sum5a} />} note="Optelsom van 1a t/m 1d en 2 t/m 4." />
          <RowLine code="5b" label="Voorbelasting" base={null} vat={<Cell readOnly cents={sum5b} />}
            note={`${money(auto5b)} uit de rekeningen in het portaal${v('r5b_adjust') ? `, ${v('r5b_adjust') > 0 ? 'plus' : 'min'} correctie ${money(Math.abs(v('r5b_adjust')))}` : ''}.`} />
          <RowLine code="" label="Correctie op voorbelasting (+ of −), bijvoorbeeld voor inkoop die niet in het portaal staat"
            base={null} vat={field('r5b_adjust', '0,00 of −12,50')} />
          <RowLine code="5c" label="Subtotaal (5a min 5b)" base={null} vat={<Cell readOnly cents={sum5c} />} />

          <div style={{ padding: '18px', background: sum5c > 0 ? '#fff7ed' : sum5c < 0 ? '#ecfdf3' : '#f9f9fb', borderTop: '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: sum5c > 0 ? '#c2410c' : sum5c < 0 ? '#15803d' : '#6e6e73' }}>
                {sum5c > 0 ? 'Te betalen' : sum5c < 0 ? 'Terug te ontvangen' : 'Niets te betalen of terug te ontvangen'}
              </div>
              <div style={{ fontSize: 12, color: '#8a8a90', marginTop: 2 }}>Zonder kleineondernemersregeling (5d) en schattingen (5e/5f).</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -.5 }}>{money(Math.abs(sum5c))}</div>
          </div>
        </div>

        {invalid.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
            Een of meer ingevulde bedragen zijn geen geldig bedrag (of mogen niet negatief zijn). Die tellen niet mee en worden niet opgeslagen totdat je ze verbetert.
          </div>
        )}

        <div style={{ ...S.card, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Voorbelasting uit het portaal: {money(auto5b)}</div>
              <div style={{ fontSize: 12.5, color: '#6e6e73', marginTop: 3, lineHeight: 1.5 }}>
                Investeringen {money(data.voorbelasting.investering_cents)} · privé gebruik {money(data.voorbelasting.prive_cents)} · {data.voorbelasting.count} rekening{data.voorbelasting.count === 1 ? '' : 'en'} met factuurdatum in deze periode
                {data.excluded_count > 0 && <> · <b>{data.excluded_count}</b> niet meegenomen omdat ze niet in de aangifte staan</>}
              </div>
            </div>
            {data.entries.length > 0 && (
              <button onClick={() => setShowList(s => !s)} style={{ background: '#f2f2f7', border: 'none', borderRadius: 9, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {showList ? 'Verberg rekeningen' : 'Toon rekeningen'}
              </button>
            )}
          </div>
          {showList && (
            <div style={{ marginTop: 12, borderTop: '1px solid #f2f2f7' }}>
              {data.entries.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 12, justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f9f9fb', fontSize: 13.5, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{e.description}</div>
                    <div style={{ fontSize: 12, color: '#8a8a90' }}>{fmtDate(e.entry_date)} · {nameOf(e.person_email)} · {e.entry_type === 'investering' ? 'Investering' : 'Privé gebruik'} · rekening {money(e.amount_cents)}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>{money(e.vat_cents)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: '#8a8a90', lineHeight: 1.55, margin: '0 4px' }}>
          Dit is een hulpmiddel om je aangifte voor te bereiden; er wordt niets bij de Belastingdienst ingediend. Het portaal kent alleen de rekeningen die jullie hier invoeren: omzet en overige inkoop vul je zelf aan.
          Controleer de bedragen en rubrieken in Mijn Belastingdienst Zakelijk, en laat de verwerking van privégebruik (1d) controleren door je boekhouder. Gebruik de ⧉-knop om een bedrag te kopiëren (met komma, zonder duizendtalpunt).
        </p>
      </>}
    </div>
  )
}
