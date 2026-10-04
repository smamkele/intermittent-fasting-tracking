import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css' // or index.css for Tailwind

const app = createApp(App)

// 1. Initialize Pinia store FIRST
const pinia = createPinia()
app.use(pinia)

// 2. Mount to DOM
app.mount('#app')