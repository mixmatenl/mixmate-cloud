import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MachineDetail from './pages/MachineDetail.jsx'
import Support from './pages/Support.jsx'
import Account from './pages/Account.jsx'
import Rapporten from './pages/Rapporten.jsx'
import Layout from './components/Layout.jsx'
import InstallBanner from './components/InstallBanner.jsx'

export default function App() {
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem('mm_token', urlToken)
      localStorage.setItem('mixmate_token', urlToken)
      const name  = params.get('name')  || ''
      const email = params.get('email') || ''
      if (name || email) {
        const u = JSON.stringify({ name, email })
        localStorage.setItem('mm_user', u)
        localStorage.setItem('mixmate_user', u)
      }
      window.history.replaceState({}, '', window.location.pathname)
      return urlToken
    }
    return localStorage.getItem('mm_token')
  })
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mm_user') || 'null') } catch { return null }
  })

  function onLogin(token, user) {
    localStorage.setItem('mm_token', token)
    localStorage.setItem('mm_user', JSON.stringify(user))
    localStorage.setItem('mixmate_token', token)
    localStorage.setItem('mixmate_user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  function onLogout() {
    localStorage.removeItem('mm_token')
    localStorage.removeItem('mm_user')
    localStorage.removeItem('mixmate_token')
    localStorage.removeItem('mixmate_user')
    setToken(null)
    setUser(null)
  }

  if (!token) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={onLogin} />} />
      </Routes>
    )
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Dashboard user={user} onLogout={onLogout} />} />
        <Route path="/machine/:machineId" element={<MachineDetail user={user} onLogout={onLogout} />} />
        <Route path="/rapporten" element={<Rapporten />} />
        <Route path="/support" element={<Support user={user} />} />
        <Route path="/account" element={<Account user={user} onLogout={onLogout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallBanner />
    </Layout>
  )
}
