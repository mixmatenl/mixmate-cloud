import { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    if (ios) { setIsIos(true); setShow(true); return }

    const handler = e => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function install() {
    if (!prompt) return
    prompt.prompt()
    prompt.userChoice.then(() => { setShow(false); setPrompt(null) })
  }

  function dismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setShow(false)
  }

  if (!show || installed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999,
      background: '#1c1c1e', color: '#fff', borderRadius: 16,
      padding: '14px 16px', display: 'flex', alignItems: 'flex-start',
      gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{ fontSize: 24, flexShrink: 0 }}>🍹</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Installeer MIXMATE</div>
        {isIos ? (
          <div style={{ fontSize: 12, color: '#aeaeb2', lineHeight: 1.4 }}>
            Tik op <strong style={{ color: '#fff' }}>Delen</strong> en dan <strong style={{ color: '#fff' }}>"Zet op beginscherm"</strong> om de app te installeren.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#aeaeb2' }}>Voeg toe aan je beginscherm voor snelle toegang</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {!isIos && (
          <button onClick={install} style={{
            background: '#007aff', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Installeer</button>
        )}
        <button onClick={dismiss} style={{
          background: 'rgba(255,255,255,0.1)', color: '#aeaeb2', border: 'none',
          borderRadius: 8, padding: '6px 14px', fontSize: 12,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Sluiten</button>
      </div>
    </div>
  )
}
