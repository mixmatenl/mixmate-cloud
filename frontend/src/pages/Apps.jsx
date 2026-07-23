import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const ICONS = {
  'mixmate-portaal.apk': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/>
    </svg>
  ),
  'mixmate-machine.apk': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
}

function formatSize(bytes) {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Apps() {
  const [apps, setApps]         = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [err, setErr]           = useState('')

  useEffect(() => {
    api.getApps().then(setApps).catch(() => setErr('Kon app-lijst niet laden'))
  }, [])

  async function handleDownload(filename) {
    setDownloading(filename)
    setErr('')
    try {
      await api.downloadApp(filename)
    } catch (e) {
      setErr(e.message || 'Download mislukt')
    }
    setDownloading(null)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1d1d1f', margin: '0 0 6px', letterSpacing: -.4 }}>Android Apps</h1>
        <p style={{ fontSize: 14, color: '#aeaeb2', margin: 0 }}>Download de MIXMATE apps als APK en installeer ze direct op een Android-telefoon of -tablet.</p>
      </div>

      {/* Installatiehandleiding */}
      <div style={{ background: '#fff8ee', borderRadius: 12, padding: '16px 18px', marginBottom: 28, fontSize: 14, color: '#6e6e73', lineHeight: 1.7 }}>
        <strong style={{ color: '#ff9500' }}>Installatie-instructies</strong><br />
        1. Download de APK op je Android-toestel (of kopieer het bestand naar het toestel).<br />
        2. Ga op het toestel naar <strong style={{ color: '#1d1d1f' }}>Instellingen → Beveiliging → Onbekende bronnen</strong> en schakel dit in.<br />
        3. Open de APK via je bestandsbeheer om te installeren.
      </div>

      {err && (
        <div style={{ background: '#fff1f0', border: '1px solid #ffd6d3', color: '#ff3b30', borderRadius: 10, padding: '11px 14px', fontSize: 13, marginBottom: 20 }}>{err}</div>
      )}

      {apps === null ? (
        <div style={{ textAlign: 'center', color: '#aeaeb2', padding: 48, fontSize: 14 }}>Laden…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {apps.map(app => (
            <div key={app.filename} style={{
              background: '#fff', borderRadius: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
              padding: '20px 22px',
              display: 'flex', alignItems: 'center', gap: 18,
            }}>
              {/* Icoon */}
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: app.available ? '#1d1d1f' : '#f2f2f7',
                color: app.available ? '#fff' : '#aeaeb2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {ICONS[app.filename]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>{app.name}</div>
                <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>{app.description}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, background: '#f2f2f7', borderRadius: 6, padding: '2px 8px', color: '#6e6e73' }}>
                    v{app.version}
                  </span>
                  {app.size && (
                    <span style={{ fontSize: 12, background: '#f2f2f7', borderRadius: 6, padding: '2px 8px', color: '#6e6e73' }}>
                      {formatSize(app.size)}
                    </span>
                  )}
                  {!app.available && (
                    <span style={{ fontSize: 12, background: '#fff1f0', borderRadius: 6, padding: '2px 8px', color: '#ff3b30' }}>
                      Nog niet geüpload
                    </span>
                  )}
                </div>
              </div>

              {/* Download knop */}
              <button
                onClick={() => handleDownload(app.filename)}
                disabled={!app.available || downloading === app.filename}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: app.available ? '#1d1d1f' : '#e5e5ea',
                  color: app.available ? '#fff' : '#aeaeb2',
                  fontSize: 14, fontWeight: 600,
                  cursor: app.available ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', flexShrink: 0,
                  opacity: downloading === app.filename ? .7 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {downloading === app.filename ? (
                  'Downloaden…'
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    APK
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bouwinstructies voor ontwikkelaar */}
      <div style={{ marginTop: 32, background: '#f2f2f7', borderRadius: 12, padding: '16px 18px', fontSize: 13, color: '#6e6e73', lineHeight: 1.7 }}>
        <strong style={{ color: '#1d1d1f' }}>APK bouwen (eenmalig)</strong><br />
        1. Open <code style={{ background: '#e5e5ea', borderRadius: 4, padding: '1px 5px' }}>mixmate-android-portaal</code> of <code style={{ background: '#e5e5ea', borderRadius: 4, padding: '1px 5px' }}>mixmate-android-local</code> in Android Studio.<br />
        2. Kies <strong>Build → Build Bundle(s) / APK(s) → Build APK(s)</strong>.<br />
        3. Kopieer het gegenereerde <code style={{ background: '#e5e5ea', borderRadius: 4, padding: '1px 5px' }}>.apk</code> bestand naar <code style={{ background: '#e5e5ea', borderRadius: 4, padding: '1px 5px' }}>backend/downloads/mixmate-portaal.apk</code> of <code style={{ background: '#e5e5ea', borderRadius: 4, padding: '1px 5px' }}>mixmate-machine.apk</code>.
      </div>

    </div>
  )
}
