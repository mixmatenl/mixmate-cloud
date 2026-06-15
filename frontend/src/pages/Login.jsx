import React, { useState } from 'react'
import { api } from '../api.js'

export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState('login') // 'login' | 'register' | 'forgot' | 'verify'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [code,     setCode]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [info,     setInfo]     = useState(null)

  function switchMode(m) {
    setMode(m); setError(null); setInfo(null)
    setName(''); setPassword(''); setCode('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null); setInfo(null)
    try {
      if (mode === 'login') {
        const r = await api.login(email, password)
        onLogin(r.token, { name: r.name, email: r.email })

      } else if (mode === 'register') {
        const r = await api.register(name, email, password)
        onLogin(r.token, { name: r.name, email: r.email })

      } else if (mode === 'forgot') {
        await api.forgotPassword(email)
        setInfo('De verificatiecode staat nu op het scherm van je MIXMATE machine.')
        setMode('verify')

      } else if (mode === 'verify') {
        const r = await api.resetPassword(email, code, password)
        onLogin(r.token, { name: r.name, email: r.email })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight text-[#111]">MIXMATE</div>
          <div className="text-sm text-gray-500 mt-1">Mijn machine beheren</div>
        </div>

        {/* Tab schakelaar — alleen bij login/register */}
        {(mode === 'login' || mode === 'register') && (
          <div className="flex bg-gray-200 rounded-xl p-1 mb-4">
            <button onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'login' ? 'bg-white shadow-sm text-[#111]' : 'text-gray-500 hover:text-gray-700'
              }`}>Inloggen</button>
            <button onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'register' ? 'bg-white shadow-sm text-[#111]' : 'text-gray-500 hover:text-gray-700'
              }`}>Account aanmaken</button>
          </div>
        )}

        {/* Terugknop bij forgot/verify */}
        {(mode === 'forgot' || mode === 'verify') && (
          <button onClick={() => switchMode('login')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Terug naar inloggen
          </button>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">

          {mode === 'forgot' && (
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Wachtwoord vergeten</div>
              <div className="text-xs text-gray-500 mt-1">Voer je e-mailadres in. De code verschijnt op je machine.</div>
            </div>
          )}
          {mode === 'verify' && (
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Nieuw wachtwoord instellen</div>
              <div className="text-xs text-gray-500 mt-1">Voer de code van het machinescherm in en kies een nieuw wachtwoord.</div>
            </div>
          )}

          {info && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-3 py-2">{info}</div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                autoComplete="name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Jouw naam" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mailadres</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              autoComplete="email"
              readOnly={mode === 'verify'}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 ${mode === 'verify' ? 'bg-gray-50 text-gray-500' : ''}`}
              placeholder="jouw@email.nl" />
          </div>

          {mode === 'verify' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Verificatiecode van de machine</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required
                inputMode="numeric" maxLength={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 tracking-widest font-mono text-center text-lg"
                placeholder="123456" />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {mode === 'verify' ? 'Nieuw wachtwoord' : 'Wachtwoord'}
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder={mode === 'login' ? '••••••••' : 'Minimaal 8 tekens'} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[#111] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-black/80 transition-colors">
            {loading ? 'Bezig...' : {
              login:    'Inloggen',
              register: 'Account aanmaken',
              forgot:   'Stuur verificatiecode naar machine',
              verify:   'Wachtwoord opslaan',
            }[mode]}
          </button>
        </form>

        {mode === 'login' && (
          <div className="text-center mt-4">
            <button onClick={() => switchMode('forgot')}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Wachtwoord vergeten?
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
