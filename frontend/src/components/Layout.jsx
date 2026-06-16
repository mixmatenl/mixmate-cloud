import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function NavRow({ icon, label, to, color = '#636366', active, onClick, danger }) {
  const navigate = useNavigate()
  function handleClick() {
    if (onClick) { onClick(); return }
    if (to) navigate(to)
  }
  return (
    <button onClick={handleClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px', background: active ? 'rgba(0,0,0,.04)' : 'none',
      border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 10,
      transition: 'background .15s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,.04)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: danger ? '#ff3b30' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{
        flex: 1, fontSize: 14, fontWeight: active ? 600 : 400,
        color: danger ? '#ff3b30' : '#1d1d1f',
      }}>{label}</span>
      {to && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </button>
  )
}

function NavGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div style={{ fontSize: 11, fontWeight: 600, color: '#aeaeb2', letterSpacing: .5, textTransform: 'uppercase', padding: '0 16px', marginBottom: 4 }}>
          {label}
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', padding: '4px 0' }}>
        {children}
      </div>
    </div>
  )
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Layout({ user, onLogout, children }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const path = location.pathname

  const sidebar = (
    <div style={{
      width: 260, flexShrink: 0, padding: '24px 12px',
      display: 'flex', flexDirection: 'column', gap: 0,
      overflowY: 'auto', height: '100%',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
            <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -.4, color: '#1d1d1f' }}>MIXMATE</span>
      </div>

      {/* User */}
      <NavGroup>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 20, background: '#1d1d1f',
            color: '#fff', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{initials(user?.name || user?.email)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Gebruiker'}</div>
            <div style={{ fontSize: 12, color: '#aeaeb2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
          </div>
        </div>
      </NavGroup>

      <div style={{ marginTop: 8 }} />

      <NavGroup label="Machines">
        <NavRow
          active={path === '/' || path.startsWith('/machine')}
          to="/"
          color="#007aff"
          label="Mijn machines"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><circle cx="12" cy="12" r="3"/></svg>}
        />
      </NavGroup>

      <NavGroup label="Ondersteuning">
        <NavRow
          active={path === '/support'}
          to="/support"
          color="#ff9500"
          label="Problemen melden"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
      </NavGroup>

      <NavGroup label="Account">
        <NavRow
          active={path === '/account'}
          to="/account"
          color="#636366"
          label="Mijn account"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
        />
        <NavRow
          danger
          label="Uitloggen"
          onClick={onLogout}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}
        />
      </NavGroup>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Mobile header */}
      <div style={{ display: 'none' }} className="mobile-header">
        <div style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,.08)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', position: 'sticky', top: 0, zIndex: 50 }}>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -.4, color: '#1d1d1f' }}>MIXMATE</span>
          <button onClick={() => setMobileOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div style={{ position: 'fixed', inset: 0, top: 52, background: '#f2f2f7', zIndex: 40, overflowY: 'auto' }} onClick={() => setMobileOpen(false)}>
            {sidebar}
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Sidebar */}
        <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid rgba(0,0,0,.06)', background: '#f2f2f7', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }} className="desktop-sidebar">
          {sidebar}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: block !important; }
        }
      `}</style>
    </div>
  )
}
