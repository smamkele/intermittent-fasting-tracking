<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import FastingTimer from '@/components/FastingTimer.vue'
import { useAuthStore } from '@/stores/authStore'
import { useFastingStore } from '@/stores/fastingStore'

const authStore = useAuthStore()
const fastingStore = useFastingStore()
const { isFasting, currentStage, weightLogs } = storeToRefs(fastingStore)

const name = computed(() => authStore.user?.name || 'Faster')
const initial = computed(() => name.value.charAt(0).toUpperCase())

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
})
const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

const latestWeight = computed(() => {
  if (!weightLogs.value.length) return null
  return [...weightLogs.value].sort((a, b) => a.date.localeCompare(b.date)).at(-1).weight
})

const tiles = computed(() => [
  { label: 'Status', value: isFasting.value ? 'Fasting' : 'Feeding window', accent: isFasting.value },
  { label: 'Stage', value: isFasting.value ? currentStage.value.name : '—' },
  { label: 'Latest weight', value: latestWeight.value !== null ? `${latestWeight.value} kg` : '—' },
])
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white bg-[radial-gradient(60%_40%_at_15%_0%,rgba(232,145,58,0.14),transparent)]">
    <!-- Top bar -->
    <header class="sticky top-0 z-10 backdrop-blur bg-slate-950/70 border-b border-slate-800/80">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-bold grid place-items-center" aria-hidden="true">
            {{ initial }}
          </div>
          <div>
            <h1 class="text-base font-semibold leading-tight">{{ greeting }}, {{ name }}</h1>
            <p class="text-xs text-slate-400">{{ today }}</p>
          </div>
        </div>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 border border-slate-700 hover:border-rose-400/60 hover:text-rose-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          @click="authStore.logout()"
        >
          Sign out
        </button>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <!-- At-a-glance -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Summary">
        <div
          v-for="t in tiles"
          :key="t.label"
          class="rounded-2xl bg-slate-900 border border-slate-800 px-5 py-4"
        >
          <p class="text-xs text-slate-400">{{ t.label }}</p>
          <p class="mt-1 text-lg font-semibold truncate" :class="t.accent ? 'text-amber-400' : 'text-white'">
            {{ t.value }}
          </p>
        </div>
      </section>

      <!-- Tracker + weight -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,480px)_1fr] gap-6 items-start">
        <FastingTimer />
      </div>
    </main>
  </div>
</template>