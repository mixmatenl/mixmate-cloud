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
    const error = new Error(err.detail || 'Fout')
    error.status = res.status
    throw error
  }
  return res.json()
}

export const api = {
  // Auth
  login:          (email, password)              => req('POST', '/api/auth/login',           { email, password }),
  register:       (name, email, password)        => req('POST', '/api/auth/register',        { name, email, password }),
  changePassword:  (current_password, new_password) => req('POST', '/api/auth/change-password',  { current_password, new_password }),
  forgotPassword:  (email)                          => req('POST', '/api/auth/forgot-password',  { email }),
  resetPassword:   (email, code, password)          => req('POST', '/api/auth/reset-password',   { email, code, password }),

  // Machines
  getMachines:   ()              => req('GET',    '/api/machines'),
  pairMachine:   (code)          => req('POST',   '/api/machines/pair', { code }),
  unpairMachine: (machine_id)    => req('DELETE', `/api/machines/${machine_id}`),
  renameMachine:      (machine_id, name)          => req('PATCH', `/api/machines/${machine_id}`, { name }),
  updateMachine:      (machine_id, body)          => req('PATCH', `/api/machines/${machine_id}`, body),
  patch:              (path, body)                => req('PATCH', path, body),
  machineStatus: (machine_id)    => req('GET',    `/api/machines/${machine_id}/status`),

  // Machine data (doorgestuurd naar Pi)
  getRecipes:       (mid)           => req('GET',    `/api/machines/${mid}/recipes`),
  createRecipe:     (mid, data)     => req('POST',   `/api/machines/${mid}/recipes`, data),
  updateRecipe:     (mid, id, data) => req('PATCH',  `/api/machines/${mid}/recipes/${id}`, data),
  deleteRecipe:     (mid, id)       => req('DELETE', `/api/machines/${mid}/recipes/${id}`),

  getIngredients:   (mid)           => req('GET',    `/api/machines/${mid}/ingredients`),
  createIngredient: (mid, data)     => req('POST',   `/api/machines/${mid}/ingredients`, data),
  deleteIngredient: (mid, id)       => req('DELETE', `/api/machines/${mid}/ingredients/${id}`),

  getGlasses:       (mid)           => req('GET',    `/api/machines/${mid}/glasses`),
  createGlass:      (mid, data)     => req('POST',   `/api/machines/${mid}/glasses`, data),
  updateGlass:      (mid, id, data) => req('PATCH',  `/api/machines/${mid}/glasses/${id}`, data),
  deleteGlass:      (mid, id)       => req('DELETE', `/api/machines/${mid}/glasses/${id}`),

  getCategories:    (mid)           => req('GET',    `/api/machines/${mid}/categories`),
  createCategory:   (mid, data)     => req('POST',   `/api/machines/${mid}/categories`, data),
  updateCategory:   (mid, id, data) => req('PATCH',  `/api/machines/${mid}/categories/${id}`, data),
  deleteCategory:   (mid, id)       => req('DELETE', `/api/machines/${mid}/categories/${id}`),

  getPumps:         (mid)           => req('GET',    `/api/machines/${mid}/pumps`),
  updatePump:       (mid, id, data) => req('PATCH',  `/api/machines/${mid}/pumps/${id}`, data),

  getSettings:      (mid)           => req('GET',    `/api/machines/${mid}/settings`),
  updateSettings:   (mid, data)     => req('POST',   `/api/machines/${mid}/settings`, data),

  getMachineInfo:   (mid)           => req('GET',    `/api/machines/${mid}/info`),

  // Support
  submitSupport:  (data)               => req('POST',  '/api/support',                  data),
  getTickets:     ()                   => req('GET',   '/api/support/tickets'),
  updateTicket:   (id, data)           => req('PATCH', `/api/support/tickets/${id}`,    data),

  // Update
  triggerUpdate: (machine_id) => req('POST', `/api/machines/${machine_id}/trigger-update`),

  // Spoelroutine
  flushMachine:    (mid, pumps) => req('POST', `/api/machines/${mid}/flush`, { pumps }),
  getFlushStatus:  (mid)        => req('GET',  `/api/machines/${mid}/flush-status`),
  getFlushLog:      (mid)        => req('GET',   `/api/machines/${mid}/flush-log`),
  getFlushSchedule: (mid)        => req('GET',   `/api/machines/${mid}/flush-schedule`),
  updateFlushSchedule: (mid, data) => req('PATCH', `/api/machines/${mid}/flush-schedule`, data),
  getBlockStatus:  (mid)        => req('GET',  `/api/machines/${mid}/block-status`),
  blockMachine:    (mid)        => req('POST', `/api/machines/${mid}/block`),
  unblockMachine:  (mid)        => req('POST', `/api/machines/${mid}/unblock`),

  // Team
  getMembers:    (mid)              => req('GET',    `/api/machines/${mid}/members`),
  addMember:     (mid, email, role) => req('POST',   `/api/machines/${mid}/members`, { email, role }),
  updateMember:  (mid, id, role)    => req('PATCH',  `/api/machines/${mid}/members/${id}`, { role }),
  removeMember:  (mid, id)          => req('DELETE', `/api/machines/${mid}/members/${id}`),

  // Receptvergrendeling
  getLocks:      (mid)       => req('GET',    `/api/machines/${mid}/locks`),
  lockRecipe:    (mid, rid)  => req('POST',   `/api/machines/${mid}/recipes/${rid}/lock`),
  unlockRecipe:  (mid, rid)  => req('DELETE', `/api/machines/${mid}/recipes/${rid}/lock`),

  // Rapporten
  getMachinePours:     (mid, date) => req('GET', `/api/machines/${mid}/pours${date ? `?date=${date}` : ''}`),
  getMachinePourStats: (mid)       => req('GET', `/api/machines/${mid}/pour-stats`),

  // Admin
  adminMe:              ()              => req('GET',   '/api/admin/me'),
  adminSearchCustomers: (q)             => req('GET',   `/api/admin/customers?q=${encodeURIComponent(q || '')}`),
  adminRestartMachine:  (machine_id)    => req('POST',  `/api/admin/machines/${machine_id}/restart`),
  adminGetTickets:      ()              => req('GET',   '/api/admin/tickets'),
  adminUpdateTicket:    (id, data)      => req('PATCH', `/api/admin/tickets/${id}`, data),
  adminAddResponse:     (id, message)   => req('POST',  `/api/admin/tickets/${id}/responses`, { message }),
  adminGetResponses:    (id)            => req('GET',   `/api/support/tickets/${id}/responses`),

  // Demo sync
  getDemoStatus:     (mid) => req('GET',  `/api/machines/${mid}/demo-status`),
  exitDemoSlideshow: (mid) => req('POST', `/api/machines/${mid}/demo/exit-slideshow`),
  activateDemo:      (mid) => req('POST', `/api/machines/${mid}/demo/activate`),
  deactivateDemo:    (mid) => req('POST', `/api/machines/${mid}/demo/deactivate`),
}
