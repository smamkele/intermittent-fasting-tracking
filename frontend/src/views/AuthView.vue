<script setup>
import { ref } from 'vue'
import Login from '@/components/Login.vue'
import Register from '@/components/Register.vue'

// Reactive state tracking active tab
const currentView = ref('login')
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- 1. Ensure event name matches @switch-to-register -->
      <Login 
        v-if="currentView === 'login'" 
        @switch-to-register="currentView = 'register'"
        @auth-success="console.log('LoggedIn')"
      />

      <!-- 2. Render Register view when currentView is 'register' -->
      <Register 
        v-else-if="currentView === 'register'" 
        @switch-to-login="currentView = 'login'"
        @auth-success="console.log('Registered')"
      />
    </div>
  </div>
</template>