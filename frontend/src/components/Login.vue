<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const emit = defineEmits(['switch-to-register', 'auth-success'])
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

async function handleSubmit() {
  if (!email.value || !password.value) return

  const result = await authStore.login(email.value, password.value)
  if (result.success) {
    emit('auth-success')
  }
}
</script>

<template>
  <div class="w-full max-w-md mx-auto p-8 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800">
    <div class="mb-8 text-center">
      <h2 class="text-2xl font-bold tracking-tight">Welcome Back</h2>
      <p class="text-xs text-slate-400 mt-1">Sign in to track your fasting schedules and progress</p>
    </div>

    <!-- Error Banner -->
    <div 
      v-if="authStore.error" 
      class="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 text-center font-medium"
    >
      {{ authStore.error }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Email Address
        </label>
        <input 
          v-model="email" 
          type="email" 
          placeholder="developer@example.com"
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          required
        />
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Password
        </label>
        <input 
          v-model="password" 
          type="password" 
          placeholder="••••••••"
          class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          required
        />
      </div>

      <button 
        type="submit" 
        :disabled="authStore.loading"
        class="w-full py-3.5 mt-2 bg-emerald-500 hover:bg-emerald-600 font-semibold text-sm rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
      >
        <span v-if="authStore.loading" class="animate-spin text-lg">◌</span>
        <span>{{ authStore.loading ? 'Signing In...' : 'Sign In' }}</span>
      </button>

      <!-- Move link inside or outside form, but ensure type="button" is set -->
      <div class="mt-6 text-center text-xs text-slate-400">
        Don't have an account? 
<button 
  type="button" 
  @click="() => { console.log('Create Account clicked!'); emit('switch-to-register'); }" 
  class="text-emerald-400 font-semibold hover:underline ml-1 cursor-pointer"
>
  Create Account
</button>
      </div>
    </form>
  </div>
</template>