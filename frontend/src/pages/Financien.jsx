import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import FinancienAangifte from './FinancienAangifte.jsx'

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })
const money = cents => eur.format((cents || 0) / 100)
const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
const fmtShort = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''
const todayISO = () => new Date().toISOString().slice(0, 10)

// Zelfde regels als de server: 1.234,56 · 1234.56 · 1.210 (= duizendtallen)
function parseMoney(input) {
  let raw = String(input ?? '').trim().replace(/\s/g, '').replace(/^€/, '')
  if (!raw) return null
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(raw)) return null
  return Math.round(parseFloat(raw) * 100)
}
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE = 10 * 1024 * 1024
function fileProblem(f) {
  const okType = ALLOWED_TYPES.includes(f.type) || (!f.type && /\.(pdf|jpe?g|png|webp)$/i.test(f.name))
  if (!okType) return `"${f.name}" is geen PDF, JPG, PNG of WEBP`
  if (f.size > MAX_FILE) return `"${f.name}" is groter dan 10 MB`
  return null
}
const hasFiles = e => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
const vatFrom = (cents, rate) => Math.round(cents * rate / (100 + rate))

const S = {
  card:  { background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16 },
  label: { fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 },
  inp:   { width: '100%', border: '1px solid #e5e5ea', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff' },
  btn:   { background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}

function Metric({ label, value, sub, accent, children }) {
  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid #f2f2f7' }}>
      <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, color: accent || '#1d1d1f', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#8a8a90', marginTop: 2 }}>{sub}</div>}
      {children}
    </div>
  )
}

function PersonCard({ person, sum, onPayout, dragActive, onDropEntry }) {
  const [over, setOver] = useState(false)
  useEffect(() => { if (!dragActive) setOver(false) }, [dragActive])
  const initials = person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      onDragOver={dragActive ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (!over) setOver(true) } : undefined}
      onDragLeave={dragActive ? e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) } : undefined}
      onDrop={dragActive ? e => { e.preventDefault(); setOver(false); onDropEntry(person) } : undefined}
      style={{ ...S.card, padding: '18px 20px 6px', flex: '1 1 320px', minWidth: 0, position: 'relative', transition: 'box-shadow .15s, border-color .15s, background .15s',
        ...(dragActive ? { borderColor: over ? '#FF751F' : '#ffd2b3', boxShadow: over ? '0 0 0 3px rgba(255,117,31,.25)' : 'none', background: over ? '#fff8f3' : '#fff' } : {}) }}>
      {dragActive && over && (
        <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 12, fontWeight: 700, color: '#c2410c', background: '#ffedd5', borderRadius: 20, padding: '3px 10px', pointerEvents: 'none' }}>Zet bij {person.name}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FF751F', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{person.name}</div>
          <div style={{ fontSize: 12, color: '#8a8a90' }}>{sum.count} rekening{sum.count === 1 ? '' : 'en'}</div>
        </div>
      </div>
      <Metric label="Inbreng (investeringen, excl. BTW)" value={money(sum.inbreng_excl_cents)}
        sub={`${money(sum.inbreng_incl_cents)} incl. BTW · BTW ${money(sum.inbreng_vat_cents)}`} />
      <Metric label="BTW nog terug te krijgen (privé)" value={money(sum.vat_refund_open_cents)} accent={sum.vat_refund_open_cents > 0 ? '#c2410c' : undefined}
        sub={`Totaal ${money(sum.vat_refund_total_cents)} · al ontvangen ${money(sum.vat_refund_paid_cents)}`}>
        {sum.vat_refund_open_cents > 0 && (
          <button onClick={() => onPayout(person)} style={{ ...S.btn, marginTop: 10, padding: '8px 14px', fontSize: 13 }}>BTW teruggegeven registreren</button>
        )}
      </Metric>
      <Metric label="Privé gebruik (wel in aangifte, geen inbreng)" value={money(sum.prive_incl_cents)}
        sub={`BTW ${money(sum.prive_vat_cents)} · waarvan in aangifte ${money(sum.prive_in_aangifte_incl_cents)}`} />
    </div>
  )
}

function DockTarget({ label, current, onDrop }) {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = current ? 'none' : 'move'; setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (!current) onDrop() }}
      style={{ padding: '10px 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, minWidth: 112, textAlign: 'center', transition: 'background .12s',
        background: current ? 'rgba(255,255,255,.07)' : over ? '#FF751F' : 'rgba(255,255,255,.16)', color: current ? 'rgba(255,255,255,.4)' : '#fff' }}>
      {label}
      {current && <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 1 }}>staat hier</div>}
    </div>
  )
}

function Chip({ children, color, bg, onClick, title }) {
  return (
    <button onClick={onClick} title={title} disabled={!onClick}
      style={{ border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 700, color, background: bg, cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

function PayoutModal({ person, onClose, onDone }) {
  const [entries, setEntries] = useState(null)
  const [picked, setPicked]   = useState(new Set())
  const [date, setDate]       = useState(todayISO())
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState(null)

  useEffect(() => {
    // Altijd álle openstaande rekeningen van deze persoon, ook als de pagina gefilterd is.
    api.financeOverview(`person=${encodeURIComponent(person.email)}`).then(d => {
      const open = d.entries.filter(e => e.vat_to_person && !e.vat_paid_at && e.vat_cents > 0).sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      setEntries(open); setPicked(new Set(open.map(e => e.id)))
    }).catch(e => { setErr(e.message); setEntries([]) })
  }, [person.email])

  const total = (entries || []).filter(e => picked.has(e.id)).reduce((a, e) => a + e.vat_cents, 0)
  const toggle = id => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allOn = entries && picked.size === entries.length

  async function submit() {
    setBusy(true); setErr(null)
    try { await api.financeVatPayout([...picked], date); onDone() }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.25)', fontFamily: FONT, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>BTW teruggegeven aan {person.name}</div>
            <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 3 }}>Vink de rekeningen aan waarvan de BTW is overgemaakt.</div>
          </div>
          <button onClick={onClose} aria-label="Sluiten" style={{ background: '#f2f2f7', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 17, cursor: 'pointer', color: '#6e6e73', flexShrink: 0 }}>×</button>
        </div>

        <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1 }}>
          {entries === null ? <div style={{ padding: 30, textAlign: 'center', color: '#aeaeb2' }}>Laden…</div>
          : entries.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#aeaeb2' }}>Geen openstaande BTW.</div>
          : <>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, fontWeight: 600, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid #f2f2f7' }}>
              <input type="checkbox" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(entries.map(e => e.id)))} />
              Alles selecteren ({entries.length})
            </label>
            {entries.map(e => (
              <label key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f2f2f7', cursor: 'pointer' }}>
                <input type="checkbox" checked={picked.has(e.id)} onChange={() => toggle(e.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{e.description}</div>
                  <div style={{ fontSize: 12, color: '#8a8a90' }}>{fmtDate(e.entry_date)}{e.supplier ? ` · ${e.supplier}` : ''} · rekening {money(e.amount_cents)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{money(e.vat_cents)}</div>
              </label>
            ))}
          </>}
        </div>

        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #e5e5ea', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px' }}>
              <div style={S.label}>Datum teruggave</div>
              <input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} style={S.inp} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#6e6e73' }}>Over te maken</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5 }}>{money(total)}</div>
            </div>
          </div>
          {err && <div style={{ marginTop: 12, background: '#fff1f0', border: '1px solid #ffd6d3', color: '#d70015', borderRadius: 10, padding: '8px 12px', fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={onClose} disabled={busy} style={S.btnGhost}>Annuleren</button>
            <button onClick={submit} disabled={busy || picked.size === 0 || !date} style={{ ...S.btn, opacity: (busy || picked.size === 0 || !date) ? .4 : 1 }}>
              {busy ? 'Opslaan…' : `Registreren (${picked.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EntryModal({ entry, people, initialFile, queueLabel, onClose, onSaved }) {
  const editing = !!entry
  const [type, setType]       = useState(entry?.entry_type || 'investering')
  const [person, setPerson]   = useState(entry?.person_email || people[0]?.email || '')
  const [date, setDate]       = useState(entry?.entry_date || todayISO())
  const [desc, setDesc]       = useState(entry?.description || '')
  const [supplier, setSupplier] = useState(entry?.supplier || '')
  const [amount, setAmount]   = useState(entry ? String(entry.amount_cents / 100).replace('.', ',') : '')
  const [rate, setRate]       = useState(String(entry?.vat_rate ?? 21))
  const [vatText, setVatText] = useState(entry ? String(entry.vat_cents / 100).replace('.', ',') : '')
  const [vatTouched, setVatTouched] = useState(false)
  const [inReturn, setInReturn] = useState(entry?.in_tax_return ?? true)
  const [toPerson, setToPerson] = useState(entry?.vat_to_person ?? true)
  const [paidAt, setPaidAt]   = useState(entry?.vat_paid_at || '')
  const [paidTouched, setPaidTouched] = useState(false)
  const [notes, setNotes]     = useState(entry?.notes || '')
  const [file, setFile]       = useState(initialFile || null)
  const [zoneOver, setZoneOver] = useState(false)
  const [removeFile, setRemoveFile] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState(null)

  const cents = parseMoney(amount)
  const autoVat = cents != null ? vatFrom(cents, Number(rate)) : null
  const vatCents = vatTouched ? parseMoney(vatText) : autoVat
  const personName = people.find(p => p.email === person)?.name || ''

  function pickFile(f) {
    if (!f) return
    const problem = fileProblem(f)
    if (problem) return setErr(problem)
    setErr(null); setFile(f); setRemoveFile(false)
  }

  function changeType(t) { setType(t); if (!editing) setToPerson(t === 'investering') }

  async function submit(e) {
    e.preventDefault()
    setErr(null)
    if (cents == null || cents <= 0) return setErr('Vul een bedrag in (incl. BTW).')
    if (vatCents == null || vatCents < 0 || vatCents > cents) return setErr('Het BTW-bedrag klopt niet bij het totaalbedrag.')
    setBusy(true)
    try {
      const body = {
        entry_type: type, person_email: person, entry_date: date, description: desc, supplier, notes,
        amount: (cents / 100).toFixed(2), vat_rate: Number(rate), vat_amount: (vatCents / 100).toFixed(2),
        in_tax_return: inReturn, vat_to_person: toPerson,
      }
      if (paidTouched) body.vat_paid_at = paidAt || null   // alleen meesturen als je het veld aanraakt
      let saved = editing ? await api.financeUpdate(entry.id, body) : await api.financeCreate(body)
      if (removeFile && editing && entry.has_attachment && !file) saved = await api.financeRemoveAttachment(saved.id)
      if (file) saved = await api.financeUpload(saved.id, file)
      onSaved(saved)
    } catch (e2) { setErr(e2.message); setBusy(false) }
  }

  const seg = active => ({ flex: 1, padding: '10px 12px', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
    background: active ? '#fff' : 'transparent', color: active ? '#1d1d1f' : '#6e6e73', boxShadow: active ? '0 1px 3px rgba(0,0,0,.1)' : 'none' })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,.25)', fontFamily: FONT }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{editing ? 'Rekening bewerken' : 'Rekening toevoegen'}</div>
            {queueLabel && <div style={{ fontSize: 12, color: '#8a8a90', marginTop: 2 }}>{queueLabel}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Sluiten" style={{ background: '#f2f2f7', border: 'none', borderRadius: '50%', width: 30, height: 30, fontSize: 17, cursor: 'pointer', color: '#6e6e73' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 4, background: '#f2f2f7', borderRadius: 12, padding: 4, marginBottom: 6 }}>
          <button type="button" style={seg(type === 'investering')} onClick={() => changeType('investering')}>Investering</button>
          <button type="button" style={seg(type === 'prive')} onClick={() => changeType('prive')}>Privé gebruik</button>
        </div>
        <div style={{ fontSize: 12, color: '#8a8a90', marginBottom: 16, lineHeight: 1.45 }}>
          {type === 'investering'
            ? 'Telt mee als inbreng van de persoon.'
            : 'Staat (indien aangevinkt) wel in de belastingaangifte, maar telt niet mee als inbreng.'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div><div style={S.label}>Van wie</div>
            <select value={person} onChange={e => setPerson(e.target.value)} style={S.inp}>
              {people.map(p => <option key={p.email} value={p.email}>{p.name}</option>)}
            </select></div>
          <div><div style={S.label}>Datum rekening</div>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={S.inp} /></div>
        </div>

        <div style={{ marginTop: 14 }}><div style={S.label}>Omschrijving</div>
          <input required maxLength={200} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Bijv. iPhone, laptop, gereedschap" style={S.inp} /></div>
        <div style={{ marginTop: 14 }}><div style={S.label}>Leverancier (optioneel)</div>
          <input maxLength={120} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Bijv. Coolblue" style={S.inp} /></div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginTop: 14 }}>
          <div><div style={S.label}>Bedrag incl. BTW (€)</div>
            <input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" style={S.inp} /></div>
          <div><div style={S.label}>BTW-tarief</div>
            <select value={rate} onChange={e => setRate(e.target.value)} style={S.inp}>
              <option value="21">21%</option><option value="9">9%</option><option value="0">0%</option>
            </select></div>
          <div><div style={S.label}>BTW-bedrag (€)</div>
            <input inputMode="decimal" value={vatTouched ? vatText : (autoVat != null ? (autoVat / 100).toFixed(2).replace('.', ',') : '')}
              onChange={e => { setVatTouched(true); setVatText(e.target.value) }} placeholder="0,00" style={S.inp} /></div>
        </div>
        <div style={{ fontSize: 12.5, color: '#6e6e73', marginTop: 8, background: '#f9f9fb', borderRadius: 10, padding: '8px 12px' }}>
          {cents != null && vatCents != null
            ? <>Totaal <b>{money(cents)}</b> · BTW <b>{money(vatCents)}</b> · excl. BTW <b>{money(cents - vatCents)}</b></>
            : 'Vul het bedrag in om de BTW te zien.'}
          {vatTouched && <button type="button" onClick={() => setVatTouched(false)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#007aff', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>Automatisch berekenen</button>}
        </div>

        {editing && entry.vat_paid_at && vatCents != null && vatCents !== entry.vat_cents && (
          <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, lineHeight: 1.45 }}>
            Let op: de BTW van deze rekening stond al als ontvangen ({money(entry.vat_cents)}). Bij een ander BTW-bedrag wordt de status teruggezet naar &quot;te ontvangen&quot;.
          </div>
        )}

        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={inReturn} onChange={e => setInReturn(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Meenemen in de belastingaangifte</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={toPerson} onChange={e => setToPerson(e.target.checked)} style={{ marginTop: 3 }} />
            <span>De BTW hiervan gaat terug naar {personName || 'deze persoon'} (privé)</span>
          </label>
        </div>

        {toPerson && (
          <div style={{ marginTop: 14 }}>
            <div style={S.label}>BTW teruggegeven op</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="date" value={paidAt} max={todayISO()} onChange={e => { setPaidAt(e.target.value); setPaidTouched(true) }} style={{ ...S.inp, width: 190 }} />
              {paidAt
                ? <button type="button" onClick={() => { setPaidAt(''); setPaidTouched(true) }} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Wissen</button>
                : <span style={{ fontSize: 12.5, color: '#8a8a90' }}>Nog niet teruggegeven</span>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}><div style={S.label}>Bonnetje of factuur</div>
          {editing && entry.has_attachment && !removeFile && !file && (
            <div style={{ fontSize: 13, color: '#3a3a3c', marginBottom: 8 }}>
              Huidige bijlage: <b>{entry.attachment_name}</b>{' '}
              <button type="button" onClick={() => setRemoveFile(true)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Verwijderen</button>
            </div>
          )}
          <div
            onDragOver={e => { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); setZoneOver(true) } }}
            onDragLeave={() => setZoneOver(false)}
            onDrop={e => { if (!hasFiles(e)) return; e.preventDefault(); e.stopPropagation(); setZoneOver(false); pickFile(e.dataTransfer.files[0]) }}
            style={{ border: `2px dashed ${zoneOver ? '#FF751F' : '#d1d1d6'}`, background: zoneOver ? '#fff8f3' : '#fafafa', borderRadius: 12, padding: 12, transition: 'all .12s' }}>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => pickFile(e.target.files?.[0])} style={{ fontSize: 13 }} />
            <div style={{ fontSize: 12, color: '#8a8a90', marginTop: 6 }}>Sleep een PDF of foto hierheen, of kies een bestand. Maximaal 10 MB.</div>
            {file && <div style={{ fontSize: 13, marginTop: 6 }}>Gekozen: <b>{file.name}</b></div>}
          </div>
        </div>

        <div style={{ marginTop: 14 }}><div style={S.label}>Notities (optioneel)</div>
          <textarea rows={2} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...S.inp, resize: 'vertical' }} /></div>

        {err && <div style={{ marginTop: 14, background: '#fff1f0', border: '1px solid #ffd6d3', color: '#d70015', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" onClick={onClose} disabled={busy} style={S.btnGhost}>Annuleren</button>
          <button type="submit" disabled={busy} style={{ ...S.btn, opacity: busy ? .5 : 1 }}>{busy ? 'Opslaan…' : 'Opslaan'}</button>
        </div>
      </form>
    </div>
  )
}

export default function Financien() {
  const [data, setData]       = useState(null)
  const [denied, setDenied]   = useState(false)
  const [err, setErr]         = useState(null)
  const [year, setYear]       = useState('')
  const [person, setPerson]   = useState('')
  const [kind, setKind]       = useState('')
  const [modal, setModal]     = useState(null)   // null | 'new' | entry
  const [busyId, setBusyId]   = useState(null)
  const [payoutFor, setPayoutFor] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'aangifte' ? 'aangifte' : 'rekeningen'
  const [dragEntry, setDragEntry]   = useState(null)
  const [fileOver, setFileOver]     = useState(false)
  const [rowFileOver, setRowFileOver] = useState(null)
  const [dropQueue, setDropQueue]   = useState([])
  const [dropTotal, setDropTotal]   = useState(0)
  const [notice, setNotice]         = useState(null)
  const noticeTimer  = useRef(null)
  const filesHandler = useRef(null)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (year) p.set('year', year)
    if (person) p.set('person', person)
    if (kind) p.set('kind', kind)
    return p.toString()
  }, [year, person, kind])

  const load = useCallback(async () => {
    setErr(null)
    try { setData(await api.financeOverview(qs)); setDenied(false) }
    catch (e) { if (e.status === 403) setDenied(true); else setErr(e.message) }
  }, [qs])
  useEffect(() => { load() }, [load])

  function notify(text, ok = true) {
    setNotice({ text, ok })
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 6000)
  }

  function startNewFromFiles(fileList) {
    const good = [], bad = []
    Array.from(fileList || []).forEach(f => { const p = fileProblem(f); p ? bad.push(p) : good.push(f) })
    if (bad.length) notify(bad[0] + (bad.length > 1 ? ` (en ${bad.length - 1} andere)` : ''), false)
    if (good.length) {
      setDropQueue(good.map((file, i) => ({ file, id: `${Date.now()}-${i}` })))
      setDropTotal(good.length)
      setModal('new')
    }
  }

  async function attachToEntry(entry, fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const problem = fileProblem(files[0])
    if (problem) return notify(problem, false)
    if (entry.has_attachment && !confirm(`"${entry.description}" heeft al een bijlage (${entry.attachment_name}). Vervangen door "${files[0].name}"?`)) return
    setBusyId(entry.id)
    try {
      await api.financeUpload(entry.id, files[0])
      await load()
      notify(`Bijlage toegevoegd aan "${entry.description}"` + (files.length > 1 ? ' (alleen het eerste bestand is gebruikt)' : ''))
    } catch (e) { notify(e.message, false) }
    setBusyId(null)
  }

  async function moveEntry(entry, changes, label) {
    setDragEntry(null)
    setBusyId(entry.id)
    try {
      await api.financeUpdate(entry.id, changes)
      await load()
      const oddFlag = 'entry_type' in changes && entry.vat_to_person !== (changes.entry_type === 'investering')
      notify(`"${entry.description}" staat nu bij ${label}` + (oddFlag ? `. Let op: "BTW terug naar persoon" staat nog ${entry.vat_to_person ? 'aan' : 'uit'}; pas dat zo nodig aan via Bewerk.` : ''))
    } catch (e) { notify(e.message, false) }
    setBusyId(null)
  }

  filesHandler.current = { startNewFromFiles, modalOpen: !!modal || !!payoutFor }
  useEffect(() => {
    // Bestanden die ergens op de pagina worden losgelaten: de browser mag er nooit mee wegnavigeren.
    let depth = 0
    const isFiles = e => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
    const enter = e => { if (isFiles(e)) { depth++; setFileOver(true) } }
    const over  = e => { if (isFiles(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }
    const leave = e => { if (isFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) { setFileOver(false); setRowFileOver(null) } } }
    const reset = e => { if (isFiles(e)) { depth = 0; setFileOver(false); setRowFileOver(null) } }   // capture: draait altijd, ook als een rij de drop afhandelt
    const drop  = e => {
      if (!isFiles(e)) return
      e.preventDefault()
      const h = filesHandler.current
      if (!h.modalOpen) h.startNewFromFiles(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', enter); window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave); window.addEventListener('drop', reset, true)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter); window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave); window.removeEventListener('drop', reset, true)
      window.removeEventListener('drop', drop)
    }
  }, [])

  async function togglePaid(entry) {
    setBusyId(entry.id)
    try { await api.financeUpdate(entry.id, { vat_paid_at: entry.vat_paid_at ? null : todayISO() }); await load() }
    catch (e) { setErr(e.message) }
    setBusyId(null)
  }

  async function remove(entry) {
    if (!confirm(`"${entry.description}" (${money(entry.amount_cents)}) verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return
    setBusyId(entry.id)
    try { await api.financeDelete(entry.id); await load() } catch (e) { setErr(e.message) }
    setBusyId(null)
  }

  async function openAttachment(entry) {
    const w = window.open('', '_blank')
    try {
      const blob = await api.financeBlob(`/api/finance/entries/${entry.id}/attachment`)
      const url = URL.createObjectURL(blob)
      if (w) w.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) { if (w) w.close(); setErr(e.message) }
  }

  async function exportCsv() {
    try {
      const blob = await api.financeBlob(`/api/finance/export${qs ? `?${qs}` : ''}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `inbreng-btw-${year || 'alle-jaren'}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) { setErr(e.message) }
  }

  if (denied) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px', textAlign: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <h2 style={{ margin: '0 0 8px' }}>Geen toegang</h2>
      <p style={{ color: '#6e6e73' }}>Deze pagina is alleen zichtbaar voor de vennoten.</p>
    </div>
  )

  const people = data?.people || []
  const nameOf = email => people.find(p => p.email === email)?.name || email
  const totalAangifteVat = data ? Object.values(data.summary).reduce((a, s) => a + s.aangifte_vat_cents, 0) : 0
  const select = { ...S.inp, width: 'auto', padding: '8px 12px' }

  return (
    <div className="fin-page" style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}>
      <style>{`@media (max-width: 767px) { .fin-page { padding-top: 68px !important; } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1d1d1f', letterSpacing: -.5, margin: 0 }}>Inbreng &amp; BTW</h1>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', background: '#f2f2f7', borderRadius: 20, padding: '3px 10px' }}>🔒 Alleen vennoten</span>
      </div>
      <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 18px' }}>
        {tab === 'aangifte'
          ? 'Bereid je BTW-aangifte voor: de bedragen per rubriek, klaar om over te nemen in Mijn Belastingdienst Zakelijk.'
          : 'Rekeningen van investeringen en privé gebruik, met de BTW die per persoon terugkomt.'}
      </p>

      <div style={{ display: 'inline-flex', gap: 3, background: '#f2f2f7', borderRadius: 12, padding: 4, marginBottom: 22 }}>
        {[['rekeningen', 'Rekeningen'], ['aangifte', 'BTW-aangifte']].map(([id, label]) => (
          <button key={id} onClick={() => setSearchParams(id === 'aangifte' ? { tab: 'aangifte' } : {}, { replace: true })}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              background: tab === id ? '#fff' : 'transparent', color: tab === id ? '#1d1d1f' : '#6e6e73', boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,.1)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {err && <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#d70015', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{err}</div>}

      {!data ? <div style={{ color: '#aeaeb2', padding: 40, textAlign: 'center' }}>Laden…</div>
      : tab === 'aangifte' ? <FinancienAangifte people={people} />
      : <>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          {people.map(p => <PersonCard key={p.email} person={p} sum={data.summary[p.email]} onPayout={setPayoutFor} dragActive={!!dragEntry}
            onDropEntry={p => dragEntry && dragEntry.person_email !== p.email && moveEntry(dragEntry, { person_email: p.email }, p.name)} />)}
        </div>
        <div style={{ fontSize: 12.5, color: '#6e6e73', marginBottom: 24, padding: '0 4px' }}>
          Totaal BTW op rekeningen die in de aangifte staan: <b>{money(totalAangifteVat)}</b>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <select value={year} onChange={e => setYear(e.target.value)} style={select}>
            <option value="">Alle jaren</option>
            {data.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={person} onChange={e => setPerson(e.target.value)} style={select}>
            <option value="">Iedereen</option>
            {people.map(p => <option key={p.email} value={p.email}>{p.name}</option>)}
          </select>
          <select value={kind} onChange={e => setKind(e.target.value)} style={select}>
            <option value="">Alle soorten</option>
            <option value="investering">Investering</option>
            <option value="prive">Privé gebruik</option>
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={exportCsv} style={S.btnGhost}>Exporteer (CSV)</button>
          <button onClick={() => setModal('new')} style={S.btn}>+ Rekening toevoegen</button>
        </div>

        <div style={{ fontSize: 12, color: '#8a8a90', margin: '0 4px 8px', lineHeight: 1.5 }}>
          Tip: sleep een factuur (PDF of foto) op een rekening om hem als bijlage toe te voegen, of ergens op de pagina voor een nieuwe rekening.
          Sleep het ⠿-icoon van een rekening naar een persoon of soort om hem te verplaatsen. (Slepen werkt met de muis; op een telefoon gebruik je Bewerk.)
        </div>
        <div style={{ ...S.card, overflow: 'hidden' }}>
          {data.entries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>
              Nog geen rekeningen{(year || person || kind) ? ' met deze filters' : ''}. Voeg de eerste toe.
            </div>
          ) : data.entries.map((e, i) => (
            <div key={e.id} data-row={e.id}
              onDragOver={ev => { if (hasFiles(ev)) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; if (rowFileOver !== e.id) setRowFileOver(e.id) } }}
              onDragLeave={ev => { if (hasFiles(ev) && !ev.currentTarget.contains(ev.relatedTarget)) setRowFileOver(v => (v === e.id ? null : v)) }}
              onDrop={ev => { if (!hasFiles(ev)) return; ev.preventDefault(); ev.stopPropagation(); setRowFileOver(null); attachToEntry(e, ev.dataTransfer.files) }}
              style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '14px 18px 14px 10px', borderTop: i ? '1px solid #f2f2f7' : 'none',
                opacity: busyId === e.id || dragEntry?.id === e.id ? .45 : 1, background: rowFileOver === e.id ? '#fff8f3' : 'transparent',
                boxShadow: rowFileOver === e.id ? 'inset 0 0 0 2px #FF751F' : 'none', transition: 'background .12s' }}>
              {rowFileOver === e.id && (
                <div style={{ position: 'absolute', top: 6, right: 12, fontSize: 12, fontWeight: 700, color: '#c2410c', background: '#ffedd5', borderRadius: 20, padding: '3px 10px', pointerEvents: 'none' }}>Laat los om als bijlage toe te voegen</div>
              )}
              <div draggable title="Sleep naar een persoon of soort"
                onDragStart={ev => {
                  ev.dataTransfer.effectAllowed = 'move'
                  ev.dataTransfer.setData('text/plain', String(e.id))
                  try { const row = ev.currentTarget.closest('[data-row]'); if (row) ev.dataTransfer.setDragImage(row, 24, 24) } catch { /* niet kritisch */ }
                  setDragEntry(e)
                }}
                onDragEnd={() => setDragEntry(null)}
                style={{ cursor: 'grab', color: '#c7c7cc', fontSize: 18, lineHeight: 1, padding: '4px 2px', userSelect: 'none', flexShrink: 0 }}>⠿</div>
              <div style={{ width: 92, flexShrink: 0, fontSize: 13, color: '#6e6e73' }}>{fmtDate(e.entry_date)}</div>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, overflowWrap: 'anywhere' }}>{e.description}</div>
                <div style={{ fontSize: 12.5, color: '#8a8a90', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>{nameOf(e.person_email)}</span>
                  {e.supplier && <span>· {e.supplier}</span>}
                  <Chip color={e.entry_type === 'investering' ? '#1d4ed8' : '#7c3aed'} bg={e.entry_type === 'investering' ? '#eff6ff' : '#f5f3ff'}>
                    {e.entry_type === 'investering' ? 'Investering' : 'Privé gebruik'}
                  </Chip>
                  {!e.in_tax_return && <Chip color="#6e6e73" bg="#f2f2f7">Niet in aangifte</Chip>}
                </div>
                {e.notes && <div style={{ fontSize: 12.5, color: '#6e6e73', marginTop: 4 }}>{e.notes}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 110 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{money(e.amount_cents)}</div>
                <div style={{ fontSize: 12, color: '#8a8a90' }}>BTW {money(e.vat_cents)} ({e.vat_rate}%)</div>
              </div>
              <div style={{ width: 175, flexShrink: 0 }}>
                {e.vat_to_person
                  ? (e.vat_paid_at
                    ? <Chip color="#15803d" bg="#ecfdf3" onClick={() => togglePaid(e)} title={`Ontvangen op ${fmtDate(e.vat_paid_at)} — klik om ongedaan te maken`}>BTW ontvangen · {fmtShort(e.vat_paid_at)}</Chip>
                    : <Chip color="#c2410c" bg="#fff7ed" onClick={() => togglePaid(e)} title="Klik als de BTW is uitbetaald">BTW te ontvangen</Chip>)
                  : <Chip color="#6e6e73" bg="#f2f2f7">Geen BTW terug</Chip>}
              </div>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0, fontSize: 13, fontWeight: 600 }}>
                {e.has_attachment && <button onClick={() => openAttachment(e)} title={e.attachment_name} style={{ background: 'none', border: 'none', color: '#007aff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0 }}>Bijlage</button>}
                <button onClick={() => setModal(e)} style={{ background: 'none', border: 'none', color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0 }}>Bewerk</button>
                <button onClick={() => remove(e)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0 }}>Verwijder</button>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: '#8a8a90', marginTop: 16, lineHeight: 1.5 }}>
          Dit overzicht is een administratie-hulpmiddel en geen fiscaal advies. Laat de verwerking van privé gebruik en de uitbetaling van BTW aan jezelf controleren door je boekhouder.
        </p>
      </>}

      {fileOver && !modal && !payoutFor && (
        <div style={{ position: 'fixed', inset: 8, border: '3px dashed #FF751F', borderRadius: 22, background: 'rgba(255,117,31,.05)', zIndex: 240, pointerEvents: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <div style={{ marginTop: 18, background: '#1d1d1f', color: '#fff', borderRadius: 14, padding: '10px 18px', fontSize: 14, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}>
            Laat los voor een nieuwe rekening, of op een rekening om hem als bijlage toe te voegen
          </div>
        </div>
      )}

      {dragEntry && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 16, display: 'flex', justifyContent: 'center', zIndex: 250, pointerEvents: 'none', padding: '0 12px' }}>
          <div style={{ pointerEvents: 'auto', background: '#1d1d1f', borderRadius: 20, padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', boxShadow: '0 12px 40px rgba(0,0,0,.35)' }}>
            {people.map(p => (
              <DockTarget key={p.email} label={p.name} current={dragEntry.person_email === p.email}
                onDrop={() => moveEntry(dragEntry, { person_email: p.email }, p.name)} />
            ))}
            <style>{`@media (max-width: 640px) { .fin-dock-divider { display: none !important; } }`}</style>
            <div className="fin-dock-divider" style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.18)', margin: '0 4px' }} />
            <DockTarget label="Investering" current={dragEntry.entry_type === 'investering'}
              onDrop={() => moveEntry(dragEntry, { entry_type: 'investering' }, 'Investering')} />
            <DockTarget label="Privé gebruik" current={dragEntry.entry_type === 'prive'}
              onDrop={() => moveEntry(dragEntry, { entry_type: 'prive' }, 'Privé gebruik')} />
          </div>
        </div>
      )}

      {notice && (
        <div role="status" onClick={() => setNotice(null)} style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 24, zIndex: 260, maxWidth: 'min(560px, calc(100vw - 32px))', cursor: 'pointer',
          background: notice.ok ? '#1d1d1f' : '#d70015', color: '#fff', borderRadius: 14, padding: '12px 18px', fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, boxShadow: '0 8px 24px rgba(0,0,0,.3)' }}>
          {notice.text}
        </div>
      )}

      {payoutFor && <PayoutModal person={payoutFor} onClose={() => setPayoutFor(null)} onDone={() => { setPayoutFor(null); load() }} />}

      {modal && (
        <EntryModal key={modal === 'new' ? `new-${dropQueue[0]?.id || 'x'}` : `edit-${modal.id}`}
          entry={modal === 'new' ? null : modal} people={people}
          initialFile={modal === 'new' ? dropQueue[0]?.file : undefined}
          queueLabel={modal === 'new' && dropTotal > 1 ? `Bestand ${dropTotal - dropQueue.length + 1} van ${dropTotal}` : undefined}
          onClose={() => { setModal(null); setDropQueue([]); setDropTotal(0) }}
          onSaved={() => {
            if (modal === 'new' && dropQueue.length > 1) { setDropQueue(q => q.slice(1)); load() }
            else { setModal(null); setDropQueue([]); setDropTotal(0); load() }
          }} />
      )}
    </div>
  )
}
