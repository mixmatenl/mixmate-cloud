const BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('mm_token')
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Onbekende fout' }))
    throw new Error(err.detail || 'Fout')
  }
  return res.json()
}

export const api = {
  // Auth
  loginShopify: (access_token) => req('POST', '/api/auth/shopify', { access_token }),

  // Machines
  getMachines:   ()              => req('GET',    '/api/machines'),
  pairMachine:   (code)          => req('POST',   '/api/machines/pair', { code }),
  unpairMachine: (machine_id)    => req('DELETE', `/api/machines/${machine_id}`),
  machineStatus: (machine_id)    => req('GET',    `/api/machines/${machine_id}/status`),

  // Machine data (doorgestuurd naar Pi)
  getRecipes:      (machine_id)        => req('GET',  `/api/machines/${machine_id}/recipes`),
  getPumps:        (machine_id)        => req('GET',  `/api/machines/${machine_id}/pumps`),
  getSettings:     (machine_id)        => req('GET',  `/api/machines/${machine_id}/settings`),
  updateSettings:  (machine_id, data)  => req('POST', `/api/machines/${machine_id}/settings`, data),
}
