import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:       '#F5F4F0',
  surface:  '#FFFFFF',
  border:   'rgba(0,0,0,0.11)',
  text1:    '#0F0F0E',
  text2:    '#4B4B4B',
  text3:    '#8A8A84',
  accent:   '#111110',
}

// ── Iconen (Lucide-stijl stroke, 16×16) ──────────────────────────────────────
const Icon = ({ d, size = 16, color = 'currentColor', strokeWidth = 1.6, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
)

const Icons = {
  dashboard:   <Icon><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></Icon>,
  machine:     <Icon><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><circle cx="12" cy="12" r="3"/></Icon>,
  chart:       <Icon><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></Icon>,
  alert:       <Icon><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Icon>,
  doc:         <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>,
  shop:        <Icon><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></Icon>,
  check:       <Icon><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Icon>,
  users:       <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  festival:    <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>,
  task:        <Icon><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Icon>,
  email:       <Icon><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Icon>,
  user:        <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  logout:      <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Icon>,
  contract:    <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Icon>,
  person:      <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  package:     <Icon><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></Icon>,
  flask:       <Icon><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></Icon>,
  tool:        <Icon><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Icon>,
  quote:       <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>,
  wrench:      <Icon><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Icon>,
  webshop:     <Icon><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></Icon>,
}

// ── NavRow ─────────────────────────────────────────────────────────────────────
function NavRow({ icon, label, to, active, onClick, subtle }) {
  const navigate = useNavigate()
  function handleClick() {
    if (onClick) { onClick(); return }
    if (to) navigate(to)
  }
  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px', background: active ? 'rgba(0,0,0,0.08)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8,
        transition: 'background 0.12s',
        color: subtle ? T.text3 : active ? T.text1 : T.text2,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.6, color: active ? T.text1 : T.text2, display: 'flex' }}>
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: active ? 600 : 400, letterSpacing: '-0.01em', color: subtle ? T.text3 : active ? T.text1 : T.text2 }}>
        {label}
      </span>
    </button>
  )
}

// ── NavSubRow ─────────────────────────────────────────────────────────────────
function NavSubRow({ label, to, active }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px 5px 34px', background: active ? 'rgba(0,0,0,0.04)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: active ? T.text1 : T.text3, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: active ? T.text1 : T.text2, fontWeight: active ? 500 : 400 }}>{label}</span>
    </button>
  )
}

// ── NavSection ─────────────────────────────────────────────────────────────────
function NavSection({ label, children }) {
  return (
    <div style={{ marginBottom: 2 }}>
      {label && (
        <div style={{ fontSize: 10.5, fontWeight: 600, color: T.text3, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 10px 4px' }}>
          {label}
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: T.border, margin: '6px 0' }} />
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot() {
  const [online, setOnline] = useState(navigator.onLine)
  const [apiOk, setApiOk] = useState(true)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const check = () => fetch('/api/health').then(r => setApiOk(r.ok)).catch(() => setApiOk(false))
    check()
    const iv = setInterval(check, 30000)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(iv) }
  }, [])

  const ok = online && apiOk
  const color = ok ? '#22c55e' : '#ef4444'

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShow(s => !s)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
      >
        <div style={{ position: 'relative', width: 8, height: 8 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.25, animation: ok ? 'pulse 2s infinite' : 'none' }} />
          <div style={{ position: 'absolute', inset: '2px', borderRadius: '50%', background: color }} />
        </div>
      </button>
      {show && (
        <div style={{ position: 'absolute', bottom: '120%', right: 0, background: '#fff', border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.08)', zIndex: 100 }}>
          <span style={{ fontSize: 12, color: T.text1, fontWeight: 500 }}>{ok ? 'Systeem actief' : online ? 'Server niet bereikbaar' : 'Geen verbinding'}</span>
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:.25} 50%{transform:scale(2.5);opacity:.1} }`}</style>
    </div>
  )
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const ADMIN_EMAILS = ['r.muller@mixmate.nl', 'info@mixmate.nl', 'h.louwrink@mixmate.nl']

export default function Layout({ user, onLogout, children }) {
  const isAdmin    = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  const isEmployee = !!user?.is_employee
  const location   = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const path = location.pathname

  const sidebar = (
    <div style={{
      width: 232, flexShrink: 0, padding: '16px 10px 12px',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', height: '100%',
      background: T.bg,
      borderRight: `1px solid ${T.border}`,
    }}>
      {/* Logo + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 16px' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em', color: T.text1, flex: 1 }}>MIXMATE</span>
        <StatusDot />
      </div>

      {/* User chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', marginBottom: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 9 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '0.02em' }}>
          {initials(user?.name || user?.email)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Gebruiker'}</div>
          <div style={{ fontSize: 11, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
        </div>
      </div>

      <Divider />

      {/* ── Medewerker nav ── */}
      {isEmployee && (() => {
        const empS = new URLSearchParams(location.search).get('s')
        const inPortaal = path === '/personeel'
        return (
          <NavSection label="Portaal">
            <NavRow active={inPortaal && (!empS || empS === 'dashboard')} to="/personeel" icon={Icons.dashboard} label="Dashboard" />
            <NavRow active={inPortaal && empS === 'festivals'} to="/personeel?s=festivals" icon={Icons.festival} label="Festivals" />
            <NavRow active={inPortaal && empS === 'contract'} to="/personeel?s=contract" icon={Icons.contract} label="Contractgegevens" />
            <NavRow active={inPortaal && empS === 'gegevens'} to="/personeel?s=gegevens" icon={Icons.person} label="Persoonlijke gegevens" />
            <NavRow active={inPortaal && empS === 'melding'} to="/personeel?s=melding" icon={Icons.alert} label="Probleem melden" />
          </NavSection>
        )
      })()}

      {/* ── Klant nav ── */}
      {!isAdmin && !isEmployee && (
        <>
          <NavSection label="Machines">
            <NavRow active={path === '/' || path.startsWith('/machine')} to="/" icon={Icons.machine} label="Mijn machines" />
            <NavRow active={path === '/rapporten'} to="/rapporten" icon={Icons.chart} label="Rapporten" />
          </NavSection>

          <NavSection label="Ondersteuning">
            <NavRow active={path === '/support'} to="/support" icon={Icons.alert} label="Problemen melden" />
            <NavRow active={path === '/meldingen'} to="/meldingen" icon={Icons.doc} label="Mijn meldingen" />
          </NavSection>

          <NavSection label="Winkel">
            <NavRow active={path === '/bestellen'} to="/bestellen" icon={Icons.shop} label="Glazen & servies" />
            <NavRow active={path === '/verbruiksartikelen'} to="/verbruiksartikelen" icon={Icons.package} label="Verbruiksartikelen" />
            <NavRow active={path === '/ingredienten'} to="/ingredienten" icon={Icons.flask} label="Ingrediënten & siropen" />
            <NavRow active={path === '/onderhoud'} to="/onderhoud" icon={Icons.tool} label="Onderhoudssets" />
            <NavRow active={path === '/mijn-bestellingen'} to="/mijn-bestellingen" icon={Icons.check} label="Mijn bestellingen" />
          </NavSection>
        </>
      )}

      {/* ── Admin nav ── */}
      {isAdmin && (() => {
        const sp = new URLSearchParams(window.location.search)
        const s = sp.get('s'), f = sp.get('f'), t = sp.get('t')
        const inAdmin = path === '/admin'
        const inPersoneel = path === '/personeel/beheer'
        const inWebshop = path === '/webshop'

        return (
          <>
            <NavSection label="Machines">
              <NavRow active={path === '/' || path.startsWith('/machine')} to="/" icon={Icons.machine} label="Machines" />
            </NavSection>

            <NavSection label="Service">
              <NavRow active={inAdmin && s === 'meldingen'} to="/admin?s=meldingen" icon={Icons.alert} label="Meldingen" />
              {inAdmin && s === 'meldingen' && <>
                <NavSubRow active={f === 'open'} to="/admin?s=meldingen&f=open" label="Open" />
                <NavSubRow active={f === 'actief'} to="/admin?s=meldingen&f=actief" label="Actief" />
                <NavSubRow active={f === 'opgelost'} to="/admin?s=meldingen&f=opgelost" label="Opgelost" />
              </>}
              <NavRow active={inAdmin && s === 'offertes'} to="/admin?s=offertes" icon={Icons.quote} label="Offertes" />
              {inAdmin && s === 'offertes' && <>
                <NavSubRow active={f === 'open'} to="/admin?s=offertes&f=open" label="Open" />
                <NavSubRow active={f === 'actief'} to="/admin?s=offertes&f=actief" label="Actief" />
                <NavSubRow active={f === 'voorstel'} to="/admin?s=offertes&f=voorstel" label="Voorstel" />
                <NavSubRow active={f === 'afgesloten'} to="/admin?s=offertes&f=afgesloten" label="Afgesloten" />
              </>}
              <NavRow active={inAdmin && s === 'bestellingen'} to="/admin?s=bestellingen" icon={Icons.check} label="Bestellingen" />
              {inAdmin && s === 'bestellingen' && <>
                <NavSubRow active={f === 'nieuw'} to="/admin?s=bestellingen&f=nieuw" label="Nieuw" />
                <NavSubRow active={f === 'verzonden'} to="/admin?s=bestellingen&f=verzonden" label="Verzonden" />
                <NavSubRow active={f === 'facturen'} to="/admin?s=bestellingen&f=facturen" label="Facturen" />
              </>}
              <NavRow active={inPersoneel && t === 'pilot'} to="/personeel/beheer?t=pilot" icon={Icons.doc} label="Pilot" />
              <NavRow active={path.startsWith('/onderhoud') && path === '/onderhoud'} to="/onderhoud" icon={Icons.wrench} label="Onderhoudbeheer" />
            </NavSection>

            <NavSection label="Klanten">
              <NavRow active={inAdmin && s === 'klanten'} to="/admin?s=klanten" icon={Icons.users} label="Klanten" />
              <NavRow active={inAdmin && s === 'nieuwsbrief'} to="/admin?s=nieuwsbrief" icon={Icons.email} label="Nieuwsbrief" />
              {inAdmin && s === 'nieuwsbrief' && <>
                <NavSubRow active={f === 'opstellen'} to="/admin?s=nieuwsbrief&f=opstellen" label="Opstellen" />
                <NavSubRow active={f === 'historie'} to="/admin?s=nieuwsbrief&f=historie" label="Historie" />
              </>}
            </NavSection>

            {user?.email?.toLowerCase() === 'r.muller@mixmate.nl' && (
              <NavSection label="Personeel">
                <NavRow active={inPersoneel && (!t || t === 'medewerkers')} to="/personeel/beheer?t=medewerkers" icon={Icons.users} label="Medewerkers" />
                <NavRow active={inPersoneel && t === 'festivals'} to="/personeel/beheer?t=festivals" icon={Icons.festival} label="Festivals" />
                <NavRow active={inPersoneel && t === 'taken'} to="/personeel/beheer?t=taken" icon={Icons.task} label="Taken" />
              </NavSection>
            )}

            <NavSection label="Webshop">
              <NavRow active={inWebshop} to="/webshop" icon={Icons.webshop} label="Webshop" />
              {inWebshop && <>
                <NavSubRow active={f === 'producten'} to="/webshop?f=producten" label="Producten" />
                <NavSubRow active={f === 'categorieen'} to="/webshop?f=categorieen" label="Categorieën" />
                <NavSubRow active={f === 'rapportages'} to="/webshop?f=rapportages" label="Rapportages" />
              </>}
            </NavSection>
          </>
        )
      })()}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      <Divider />

      {/* Account */}
      <NavSection>
        <NavRow active={path === '/account'} to="/account" icon={Icons.user} label="Mijn account" />
        <NavRow onClick={onLogout} icon={Icons.logout} label="Uitloggen" subtle />
      </NavSection>
    </div>
  )

  // ── Mobile hamburger ──────────────────────────────────────────────────────
  const hamburger = (
    <button onClick={() => setMobileOpen(o => !o)} style={{
      position: 'fixed', top: 14, left: 14, zIndex: 200,
      width: 36, height: 36, borderRadius: 9,
      background: T.surface, border: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text1} strokeWidth="2" strokeLinecap="round">
        {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
      </svg>
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Desktop */}
      <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
        <div className="desktop-sidebar" style={{ display: 'none' }}>
          {sidebar}
        </div>
        <style>{`
          @media (min-width: 768px) { .desktop-sidebar { display: flex !important; } .mobile-fab { display: none !important; } }
          @media (max-width: 767px) { .desktop-sidebar { display: none !important; } }
        `}</style>

        {/* Mobile overlay */}
        <div className="mobile-fab">
          {hamburger}
          {mobileOpen && (
            <>
              <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 150, backdropFilter: 'blur(2px)' }} />
              <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 232, zIndex: 160, overflowY: 'auto' }}>
                {sidebar}
              </div>
            </>
          )}
        </div>

        {/* Inhoud */}
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
