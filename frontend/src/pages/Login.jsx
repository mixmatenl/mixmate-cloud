import React, { useState } from 'react'
import { api } from '../api.js'

const SHOPIFY_DOMAIN   = import.meta.env.VITE_SHOPIFY_DOMAIN || ''
const SHOPIFY_SF_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || ''

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Stap 1: Shopify klanttoken ophalen
      const sfResp = await fetch(
        `https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SHOPIFY_SF_TOKEN,
          },
          body: JSON.stringify({
            query: `
              mutation {
                customerAccessTokenCreate(input: {
                  email: "${email.replace(/"/g, '')}",
                  password: "${password.replace(/"/g, '')}"
                }) {
                  customerAccessToken { accessToken }
                  userErrors { message }
                }
              }
            `,
          }),
        }
      )
      const sfData = await sfResp.json()
      const errors = sfData?.data?.customerAccessTokenCreate?.userErrors
      if (errors?.length) throw new Error(errors[0].message)
      const accessToken = sfData?.data?.customerAccessTokenCreate?.customerAccessToken?.accessToken
      if (!accessToken) throw new Error('Inloggen mislukt')

      // Stap 2: Wissel Shopify token in voor MIXMATE token
      const result = await api.loginShopify(accessToken)
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

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="jouw@email.nl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Inloggen...' : 'Inloggen met shop account'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Log in met hetzelfde account als op de MIXMATE webshop
        </p>
      </div>
    </div>
  )
}
