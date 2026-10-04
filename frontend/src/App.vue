<script setup>
import { ref } from 'vue'
import Login from '@/components/Login.vue'
import Register from '@/components/Register.vue'
import { useAuthStore } from '@/stores/authStore'
import DashboardView from'@/views/DashboardView.vue'
const authStore = useAuthStore()

// 1. Reactive state to toggle view mode
const isRegistering = ref(false)

// 2. Event handler functions
function showRegister() {
  isRegistering.value = true
}

function showLogin() {
  console.log('Parent received switch-to-login event!')
  isRegistering.value = false
}

function handleAuthSuccess() {
  console.log('Auth success! User logged in or registered.')
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <!-- If user is logged in, show dashboard -->
    <div v-if="authStore.isAuthenticated">
      <DashboardView/>
    </div>

    <!-- If user is NOT logged in, show Auth views -->
    <div v-else class="w-full max-w-md">
      <!-- LOGIN VIEW -->
      <Login 
        v-if="!isRegistering" 
        @switch-to-register="showRegister" 
        @auth-success="handleAuthSuccess" 
      />

      <!-- REGISTER VIEW -->
      <Register 
        v-else 
        @switch-to-login="showLogin" 
        @auth-success="handleAuthSuccess" 
      />
    </div>
  </div>
</template>