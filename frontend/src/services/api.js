const API_BASE = 'http://localhost:4000/api'

// Helper to attach authorization headers
const getHeaders = () => {
  const token = localStorage.getItem('jwt_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

export const AuthAPI = {
  async register(email, password, name) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    })
    return res.json()
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return res.json()
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() })
    return res.json()
  }
}

export const FastingAPI = {
  async getActiveFast() {
    const res = await fetch(`${API_BASE}/fasts/active`, { headers: getHeaders() })
    return res.json()
  },

  async startFast(payload) {
    const res = await fetch(`${API_BASE}/fasts/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })
    return res.json()
  },

  async endFast(fastId, payload) {
    const res = await fetch(`${API_BASE}/fasts/${fastId}/end`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })
    return res.json()
  },

  async getAnalytics() {
    const res = await fetch(`${API_BASE}/analytics`, { headers: getHeaders() })
    return res.json()
  }
}