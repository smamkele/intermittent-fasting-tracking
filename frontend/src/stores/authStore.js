import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AuthAPI } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const token = ref(localStorage.getItem('jwt_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user_profile') || 'null'))
  const loading = ref(false)
  const error = ref(null)

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!token.value)

  // --- ACTIONS ---

  // Helper: Persist Auth Credentials
  function setAuthData(authToken, userData) {
    token.value = authToken
    user.value = userData
    localStorage.setItem('jwt_token', authToken)
    localStorage.setItem('user_profile', JSON.stringify(userData))
  }

  // 1. LOGIN
  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const response = await AuthAPI.login(email, password)
      
      if (response.error) {
        throw new Error(response.error)
      }

      setAuthData(response.token, response.user)
      return { success: true }
    } catch (err) {
      error.value = err.message || 'Login failed. Please check your credentials.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 2. REGISTER
  async function register(email, password, name) {
    loading.value = true
    error.value = null
    try {
      const response = await AuthAPI.register(email, password, name)

      if (response.error) {
        throw new Error(response.error)
      }

      setAuthData(response.token, response.user)
      return { success: true }
    } catch (err) {
      error.value = err.message || 'Registration failed. Try a different email.'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // 3. LOGOUT
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('jwt_token')
    localStorage.removeItem('user_profile')
  }

  // 4. FETCH CURRENT USER (Token Validation on Startup)
  async function fetchUser() {
    if (!token.value) return
    try {
      const userData = await AuthAPI.getMe()
      if (userData.error) {
        logout()
      } else {
        user.value = userData
        localStorage.setItem('user_profile', JSON.stringify(userData))
      }
    } catch (err) {
      logout()
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    fetchUser
  }
})