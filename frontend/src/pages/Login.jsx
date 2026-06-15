import React, { useState } from 'react'
import { api } from '../api.js'

export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState('login') // 'login' | 'register'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  function switchMode(m) { setMode(m); setError(null); setName(''); setEmail(''); setPassword('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = mode === 'login'
        ? await api.login(email, password)
        : await api.register(name, email, password)
      onLogin(result.token, { name: result.name, email: result.email })
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

        {/* Tab schakelaar */}
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

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="jouw@email.nl" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wachtwoord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder={mode === 'register' ? 'Minimaal 8 tekens' : '••••••••'} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[#111] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-black/80 transition-colors">
            {loading
              ? (mode === 'login' ? 'Inloggen...' : 'Account aanmaken...')
              : (mode === 'login' ? 'Inloggen' : 'Account aanmaken')}
          </button>
        </form>
      </div>
    </div>
  )
}
