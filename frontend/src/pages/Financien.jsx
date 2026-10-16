import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

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
const vatFrom = (cents, rate) => Math.round(cents * rate / (100 + rate))

const S = {
  card:  { background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16 },
  label: { fontSize: 11, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 },
  inp:   { width: '100%', border: '1px solid #e5e5ea', borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff' },
  btn:   { background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost: { background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
}

function Metric({ label, value, sub, accent }) {
  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid #f2f2f7' }}>
      <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, color: accent || '#1d1d1f', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#8a8a90', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function PersonCard({ person, sum }) {
  const initials = person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ ...S.card, padding: '18px 20px 6px', flex: '1 1 320px', minWidth: 0 }}>
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
        sub={`Totaal ${money(sum.vat_refund_total_cents)} · al ontvangen ${money(sum.vat_refund_paid_cents)}`} />
      <Metric label="Privé gebruik (wel in aangifte, geen inbreng)" value={money(sum.prive_incl_cents)}
        sub={`BTW ${money(sum.prive_vat_cents)} · waarvan in aangifte ${money(sum.prive_in_aangifte_incl_cents)}`} />
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

function EntryModal({ entry, people, onClose, onSaved }) {
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
  const [notes, setNotes]     = useState(entry?.notes || '')
  const [file, setFile]       = useState(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState(null)

  const cents = parseMoney(amount)
  const autoVat = cents != null ? vatFrom(cents, Number(rate)) : null
  const vatCents = vatTouched ? parseMoney(vatText) : autoVat
  const personName = people.find(p => p.email === person)?.name || ''

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
          <div style={{ fontSize: 18, fontWeight: 800 }}>{editing ? 'Rekening bewerken' : 'Rekening toevoegen'}</div>
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

        <div style={{ marginTop: 16 }}><div style={S.label}>Bonnetje of factuur</div>
          {editing && entry.has_attachment && !removeFile && !file && (
            <div style={{ fontSize: 13, color: '#3a3a3c', marginBottom: 8 }}>
              Huidige bijlage: <b>{entry.attachment_name}</b>{' '}
              <button type="button" onClick={() => setRemoveFile(true)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Verwijderen</button>
            </div>
          )}
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => { setFile(e.target.files?.[0] || null); setRemoveFile(false) }} style={{ fontSize: 13 }} />
          <div style={{ fontSize: 12, color: '#8a8a90', marginTop: 4 }}>PDF, JPG, PNG of WEBP, maximaal 10 MB.</div>
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
      <p style={{ fontSize: 14, color: '#6e6e73', margin: '0 0 24px' }}>
        Rekeningen van investeringen en privé gebruik, met de BTW die per persoon terugkomt.
      </p>

      {err && <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#d70015', borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{err}</div>}

      {!data ? <div style={{ color: '#aeaeb2', padding: 40, textAlign: 'center' }}>Laden…</div> : <>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          {people.map(p => <PersonCard key={p.email} person={p} sum={data.summary[p.email]} />)}
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

        <div style={{ ...S.card, overflow: 'hidden' }}>
          {data.entries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>
              Nog geen rekeningen{(year || person || kind) ? ' met deze filters' : ''}. Voeg de eerste toe.
            </div>
          ) : data.entries.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '14px 18px', borderTop: i ? '1px solid #f2f2f7' : 'none', opacity: busyId === e.id ? .5 : 1 }}>
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

      {modal && (
        <EntryModal entry={modal === 'new' ? null : modal} people={people} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
