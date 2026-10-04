<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const emit = defineEmits(['switch-to-login', 'auth-success'])
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const localError = ref(null)

async function handleSubmit() {
  localError.value = null

  if (password.value !== confirmPassword.value) {
    localError.value = 'Passwords do not match.'
    return
  }

  if (password.value.length < 6) {
    localError.value = 'Password must be at least 6 characters long.'
    return
  }

  console.log('Sending registration request for:', email.value)
  const result = await authStore.register(email.value, password.value, name.value)
  
  if (result.success) {
    console.log('Registration succeeded! Emitting auth-success...')
    emit('auth-success')
  } else {
    console.error('Registration failed:', result.error)
  }
}
</script>

<template>
  <div class="w-full max-w-md mx-auto p-8 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800">
    <div class="mb-8 text-center">
      <h2 class="text-2xl font-bold tracking-tight">Create Account</h2>
      <p class="text-xs text-slate-400 mt-1">Start tracking your custom fasting & ADF protocols</p>
    </div>

    <!-- Local Error or Store Error Alert -->
    <div 
      v-if="localError || authStore.error" 
      class="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 text-center font-medium"
    >
      {{ localError || authStore.error }}
    </div>

    <!-- IMPORTANT: @submit.prevent handles Enter key AND Button clicks -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
        <input 
          v-model="name" 
          type="text" 
          placeholder="Jane Doe"
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
        <input 
          v-model="email" 
          type="email" 
          placeholder="developer@example.com"
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
        <input 
          v-model="password" 
          type="password" 
          placeholder="••••••••"
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
        <input 
          v-model="confirmPassword" 
          type="password" 
          placeholder="••••••••"
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          required
        />
      </div>

      <!-- Make sure type="submit" is explicitly set -->
      <button 
        type="submit" 
        :disabled="authStore.loading"
        class="w-full py-3.5 mt-2 bg-emerald-500 hover:bg-emerald-600 font-semibold text-sm rounded-2xl transition active:scale-[0.98] disabled:opacity-50"
      >
        <span v-if="authStore.loading">Creating Account...</span>
        <span v-else>Register</span>
      </button>
    </form>

    <div class="mt-6 text-center text-xs text-slate-400">
      Already have an account? 
      <button 
        type="button" 
        @click="emit('switch-to-login')" 
        class="text-emerald-400 font-semibold hover:underline ml-1"
      >
        Sign In
      </button>
    </div>
  </div>
</template>