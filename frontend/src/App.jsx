import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MachineDetail from './pages/MachineDetail.jsx'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('mm_token'))
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('mm_user') || 'null') } catch { return null }
  })

  function onLogin(token, user) {
    localStorage.setItem('mm_token', token)
    localStorage.setItem('mm_user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }

  function onLogout() {
    localStorage.removeItem('mm_token')
    localStorage.removeItem('mm_user')
    setToken(null)
    setUser(null)
  }

  return (
    <Routes>
      <Route path="/login" element={
        token ? <Navigate to="/" replace /> : <Login onLogin={onLogin} />
      } />
      <Route path="/" element={
        token ? <Dashboard user={user} onLogout={onLogout} /> : <Navigate to="/login" replace />
      } />
      <Route path="/machine/:machineId" element={
        token ? <MachineDetail user={user} onLogout={onLogout} /> : <Navigate to="/login" replace />
      } />
    </Routes>
  )
}
