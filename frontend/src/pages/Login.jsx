import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function Login({ onLogin }) {
  const [mode,     setMode]     = useState('login') // 'login' | 'register' | 'forgot' | 'verify' | 'verifyemail'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [code,     setCode]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [info,     setInfo]     = useState(null)
  // 2FA-stap: challenge (code invoeren) of setup (kiezen/instellen)
  const [challenge,  setChallenge]  = useState('')
  const [tfaMethod,  setTfaMethod]  = useState('totp')
  const [setupToken, setSetupToken] = useState('')
  const [enroll,     setEnroll]     = useState(null) // { qr, manual_key, enroll_token }

  // Afhandelen van reset-link vanuit e-mail: ?mode=reset&email=...&code=...
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('mode') === 'reset') {
      setEmail(p.get('email') || '')
      setCode(p.get('code') || '')
      setMode('verify')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (p.get('mode') === 'verifyemail') {
      setEmail(p.get('email') || '')
      setCode(p.get('code') || '')
      setMode('verifyemail')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  function switchMode(m) {
    setMode(m); setError(null); setInfo(null)
    setName(''); setPassword(''); setCode('')
  }

  // Verwerkt het antwoord van login/verify/reset/2FA: sessie, of nog een 2FA-stap
  function handleAuth(r) {
    setPassword(''); setCode(''); setError(null)
    if (r.twofa_required) {
      setChallenge(r.challenge); setTfaMethod(r.method); setMode('twofa')
      setInfo(r.method === 'email'
        ? 'We hebben een 6-cijferige inlogcode naar je e-mailadres gestuurd. Controleer ook je spam.'
        : null)
    } else if (r.twofa_setup_required) {
      setSetupToken(r.setup_token); setEnroll(null); setMode('twofachoose'); setInfo(null)
    } else {
      onLogin(r.token, { name: r.name, email: r.email, must_change_password: !!r.must_change_password })
    }
  }

  async function startAuthenticator() {
    setLoading(true); setError(null)
    try {
      setEnroll(await api.twofaSetup(setupToken))
      setMode('twofaapp')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  async function chooseEmail() {
    setLoading(true); setError(null)
    try { handleAuth(await api.twofaUseEmail(setupToken)) }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null); setInfo(null)
    try {
      if (mode === 'login') {
        handleAuth(await api.login(email, password))

      } else if (mode === 'register') {
        const r = await api.register(name, email, password)
        if (r.verification_required) {
          setPassword(''); setCode(''); setMode('verifyemail')
          setInfo('We hebben een 6-cijferige code gestuurd naar je e-mailadres. Vul die hier in om je account te activeren. Controleer ook je spam.')
        } else {
          onLogin(r.token, { name: r.name, email: r.email, must_change_password: false })
        }

      } else if (mode === 'verifyemail') {
        handleAuth(await api.verifyEmail(email, code))

      } else if (mode === 'forgot') {
        await api.forgotPassword(email)
        setInfo('We hebben een e-mail gestuurd met een herstelcode. Controleer ook je spam.')
        setMode('verify')

      } else if (mode === 'verify') {
        handleAuth(await api.resetPassword(email, code, password))

      } else if (mode === 'twofa') {
        handleAuth(await api.twofaVerify(challenge, code))

      } else if (mode === 'twofaapp') {
        handleAuth(await api.twofaEnable(enroll.enroll_token, code))
      }
    } catch (err) {
      if (mode === 'login' && err.status === 403 && /geverifieerd/i.test(err.message)) {
        setPassword(''); setCode(''); setMode('verifyemail')
        setInfo('Je e-mailadres is nog niet bevestigd. We hebben een nieuwe code gestuurd. Controleer ook je spam.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight text-[#111]">MIXMATE</div>
          <div className="text-sm text-gray-500 mt-1">MIXMATE</div>
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
        {(mode === 'forgot' || mode === 'verify' || mode === 'verifyemail' || mode === 'twofa' || mode === 'twofachoose' || mode === 'twofaapp') && (
          <button onClick={() => switchMode('login')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Terug naar inloggen
          </button>
        )}

        {mode === 'twofachoose' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Beveilig je account</div>
              <div className="text-xs text-gray-500 mt-1">
                Kies hoe je voortaan de tweede inlogstap doet. Dit is nodig om in te loggen.
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
            )}
            <button type="button" onClick={startAuthenticator} disabled={loading}
              className="w-full bg-[#111] text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50 hover:bg-black/80 transition-colors">
              {loading ? 'Bezig...' : 'Instellen met authenticator-app'}
            </button>
            <div className="text-[11px] text-gray-400 text-center -mt-2">Aanbevolen · werkt met Microsoft Authenticator</div>
            <button type="button" onClick={chooseEmail} disabled={loading}
              className="w-full border border-gray-200 text-gray-700 rounded-lg py-3 text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors">
              Overslaan — kies 2FA via e-mail
            </button>
            <div className="text-[11px] text-gray-400 text-center -mt-2">Je krijgt bij elke login een code per mail</div>
          </div>
        )}

        {mode !== 'twofachoose' && <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">

          {mode === 'forgot' && (
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Wachtwoord vergeten</div>
              <div className="text-xs text-gray-500 mt-1">Voer je e-mailadres in. Je ontvangt een herstelcode per e-mail.</div>
            </div>
          )}
          {mode === 'verifyemail' && (
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Bevestig je e-mailadres</div>
              <div className="text-xs text-gray-500 mt-1">Voer de 6-cijferige code uit je e-mail in.</div>
            </div>
          )}
          {mode === 'twofa' && (
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Tweestapsverificatie</div>
              <div className="text-xs text-gray-500 mt-1">
                {tfaMethod === 'email'
                  ? 'Voer de 6-cijferige code uit je e-mail in.'
                  : 'Open Microsoft Authenticator (of je eigen authenticator-app) en voer de 6-cijferige code voor MIXMATE in.'}
              </div>
            </div>
          )}
          {mode === 'twofaapp' && enroll && (
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Koppel je authenticator-app</div>
              <ol className="text-xs text-gray-500 mt-2 text-left space-y-1 list-decimal pl-4">
                <li>Open <b>Microsoft Authenticator</b> en tik op <b>+</b> → <b>Ander account</b> (of Werk-/schoolaccount → QR-code scannen).</li>
                <li>Scan deze QR-code.</li>
                <li>Voer hieronder de 6-cijferige code in die de app toont.</li>
              </ol>
              <img src={enroll.qr} alt="QR-code voor authenticator-app" width={200} height={200}
                className="mx-auto mt-3 rounded-lg border border-gray-200" />
              <details className="mt-3 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer">QR scannen lukt niet? Voer de sleutel handmatig in</summary>
                <div className="mt-2 font-mono text-sm tracking-wider text-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 select-all break-all">{enroll.manual_key}</div>
                <div className="text-[11px] text-gray-400 mt-1 text-center">Type: tijdgebaseerd · account: {email}</div>
              </details>
            </div>
          )}
          {mode === 'verify' && (
            <div className="text-center pb-1">
              <div className="text-base font-semibold text-[#111]">Nieuw wachtwoord instellen</div>
              <div className="text-xs text-gray-500 mt-1">Voer de 6-cijferige code uit je e-mail in en kies een nieuw wachtwoord.</div>
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

          {!mode.startsWith('twofa') && <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mailadres</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              autoComplete="email"
              readOnly={mode === 'verify' || mode === 'verifyemail'}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 ${(mode === 'verify' || mode === 'verifyemail') ? 'bg-gray-50 text-gray-500' : ''}`}
              placeholder="jouw@email.nl" />
          </div>}

          {(mode === 'verify' || mode === 'verifyemail' || mode === 'twofa' || mode === 'twofaapp') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {mode === 'twofaapp' || (mode === 'twofa' && tfaMethod === 'totp') ? 'Code uit je authenticator-app' : 'Verificatiecode uit je e-mail'}
              </label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required
                inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus={mode.startsWith('twofa')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 tracking-widest font-mono text-center text-lg"
                placeholder="123456" />
            </div>
          )}

          {mode !== 'forgot' && mode !== 'verifyemail' && !mode.startsWith('twofa') && (
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
              forgot:   'Herstelcode versturen',
              verify:   'Wachtwoord opslaan',
              verifyemail: 'Account activeren',
              twofa:    'Doorgaan',
              twofaapp: 'Koppelen en inloggen',
            }[mode]}
          </button>
        </form>}

        {mode === 'twofa' && tfaMethod === 'email' && (
          <div className="text-center mt-4">
            <button onClick={async () => {
                setError(null)
                try { await api.twofaResend(challenge); setInfo('Nieuwe code verstuurd. Controleer ook je spam.') }
                catch (e) { setError(e.message) }
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Geen code ontvangen? Opnieuw versturen
            </button>
          </div>
        )}

        {mode === 'verifyemail' && (
          <div className="text-center mt-4">
            <button onClick={async () => {
                setError(null)
                try { await api.resendVerification(email); setInfo('Nieuwe code verstuurd. Controleer ook je spam.') }
                catch (e) { setError(e.message) }
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Geen code ontvangen? Opnieuw versturen
            </button>
          </div>
        )}

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
