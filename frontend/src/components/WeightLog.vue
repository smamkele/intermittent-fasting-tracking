<script setup>
import { ref, computed } from 'vue'
import { todayStr, dateFromStr } from '@/utils/dateStr'

const props = defineProps({
  // [{ date: 'YYYY-MM-DD', weight: Number }] one entry per date, any order
  logs: { type: Array, default: () => [] },
  goalWeight: { type: Number, default: null },
  unit: { type: String, default: 'kg' },
})

const emit = defineEmits(['add-log', 'delete-log'])

// --- Form ---
const formDate = ref(todayStr())
const formWeight = ref('')
const formError = ref('')

function submit() {
  const weight = Number(formWeight.value)
  if (!formWeight.value || !Number.isFinite(weight) || weight < 20 || weight > 500) {
    formError.value = `Enter a weight between 20 and 500 ${props.unit}.`
    return
  }
  if (!formDate.value || formDate.value > todayStr()) {
    formError.value = 'Pick today or an earlier date.'
    return
  }
  formError.value = ''
  emit('add-log', { date: formDate.value, weight: Math.round(weight * 10) / 10 })
  formWeight.value = ''
}

// --- Derived data ---
const sorted = computed(() => [...props.logs].sort((a, b) => a.date.localeCompare(b.date)))
const first = computed(() => sorted.value[0] ?? null)
const latest = computed(() => sorted.value.at(-1) ?? null)

const change = computed(() =>
  first.value && latest.value ? Math.round((latest.value.weight - first.value.weight) * 10) / 10 : 0
)
const changeLabel = computed(() => {
  if (sorted.value.length < 2) return 'Log again to see your trend'
  const sign = change.value > 0 ? '+' : ''
  return `${sign}${change.value} ${props.unit} since ${fmtDate(first.value.date)}`
})

const goalProgress = computed(() => {
  if (!props.goalWeight || !first.value || !latest.value) return null
  const span = first.value.weight - props.goalWeight
  if (span === 0) return 100
  const pct = ((first.value.weight - latest.value.weight) / span) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
})

const toGoal = computed(() => {
  if (!props.goalWeight || !latest.value) return null
  return Math.round(Math.abs(latest.value.weight - props.goalWeight) * 10) / 10
})

// --- Chart (last 30 entries, positioned by date) ---
const W = 320, H = 130, PAD = 14

const chart = computed(() => {
  const pts = sorted.value.slice(-30)
  if (!pts.length) return null

  const weights = pts.map((p) => p.weight)
  if (props.goalWeight) weights.push(props.goalWeight)
  const lo = Math.min(...weights) - 0.5
  const hi = Math.max(...weights) + 0.5

  const times = pts.map((p) => dateFromStr(p.date).getTime())
  const t0 = times[0]
  const span = times.at(-1) - t0

  const x = (t) => (span ? PAD + ((t - t0) / span) * (W - PAD * 2) : W / 2)
  const y = (w) => PAD + (1 - (w - lo) / (hi - lo)) * (H - PAD * 2)

  const coords = pts.map((p, i) => ({ x: x(times[i]), y: y(p.weight), ...p }))
  return {
    coords,
    line: coords.map((c) => `${c.x},${c.y}`).join(' '),
    goalY: props.goalWeight ? y(props.goalWeight) : null,
  }
})

// --- History list ---
const showAll = ref(false)
const recent = computed(() => {
  const newestFirst = [...sorted.value].reverse()
  return showAll.value ? newestFirst : newestFirst.slice(0, 5)
})

const fmtDate = (s) =>
  dateFromStr(s).toLocaleDateString([], { day: 'numeric', month: 'short' })
</script>

<template>
  <section class="w-full max-w-2xl mx-auto p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white shadow-2xl">
    <header class="mb-6">
      <h2 class="text-xl font-bold tracking-tight">Weight</h2>
      <p class="text-xs text-slate-400 mt-0.5">Log your weight and watch the trend</p>
    </header>

    <!-- Summary -->
    <div class="flex items-end justify-between gap-4 mb-5">
      <div>
        <p class="text-4xl font-bold tabular-nums">
          {{ latest ? latest.weight : '—' }}
          <span class="text-base font-medium text-slate-400">{{ unit }}</span>
        </p>
        <p class="text-sm text-slate-400 mt-1">{{ changeLabel }}</p>
      </div>
      <div v-if="goalWeight" class="text-right text-sm">
        <p class="text-slate-400">Goal {{ goalWeight }} {{ unit }}</p>
        <p v-if="toGoal !== null" class="font-semibold text-amber-400">{{ toGoal }} {{ unit }} to go</p>
      </div>
    </div>

    <div v-if="goalProgress !== null" class="mb-6">
      <div
        class="h-2 rounded-full bg-slate-800 overflow-hidden"
        role="progressbar" :aria-valuenow="goalProgress" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to goal"
      >
        <div class="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all" :style="{ width: goalProgress + '%' }" />
      </div>
      <p class="text-xs text-slate-500 mt-1">{{ goalProgress }}% of the way to your goal</p>
    </div>

    <!-- Chart -->
    <div class="mb-6 rounded-2xl bg-slate-950/40 border border-slate-800 p-3">
      <svg v-if="chart" :viewBox="`0 0 ${W} ${H}`" class="w-full h-auto" role="img" aria-label="Weight over time">
        <line
          v-if="chart.goalY !== null"
          :x1="PAD" :x2="W - PAD" :y1="chart.goalY" :y2="chart.goalY"
          stroke="#34d399" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"
        />
        <polyline
          v-if="chart.coords.length > 1"
          :points="chart.line" fill="none" stroke="#fbbf24" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"
        />
        <circle v-for="c in chart.coords" :key="c.date" :cx="c.x" :cy="c.y" r="3.5" fill="#fbbf24">
          <title>{{ fmtDate(c.date) }}: {{ c.weight }} {{ unit }}</title>
        </circle>
      </svg>
      <p v-else class="text-sm text-slate-500 text-center py-10">Add your first weight to start the chart.</p>
    </div>

    <!-- Add entry -->
    <form class="flex flex-wrap items-end gap-3 mb-6" @submit.prevent="submit" novalidate>
      <label class="flex-1 min-w-[110px] text-xs text-slate-400">
        Weight ({{ unit }})
        <input v-model="formWeight" type="number" step="0.1" inputmode="decimal" class="field" placeholder="0.0" />
      </label>
      <label class="flex-1 min-w-[140px] text-xs text-slate-400">
        Date
        <input v-model="formDate" type="date" :max="todayStr()" class="field" />
      </label>
      <button type="submit" class="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm hover:bg-amber-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
        Save weight
      </button>
      <p v-if="formError" class="w-full text-sm text-red-400" role="alert">{{ formError }}</p>
    </form>

    <!-- History -->
    <div v-if="recent.length">
      <ul class="divide-y divide-slate-800">
        <li v-for="log in recent" :key="log.date" class="flex items-center justify-between py-2.5 text-sm">
          <span class="text-slate-400">{{ fmtDate(log.date) }}</span>
          <span class="font-semibold tabular-nums">{{ log.weight }} {{ unit }}</span>
          <button
            type="button" :aria-label="`Delete entry for ${fmtDate(log.date)}`"
            class="px-2 text-slate-500 hover:text-red-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded"
            @click="emit('delete-log', log.date)"
          >✕</button>
        </li>
      </ul>
      <button v-if="sorted.length > 5" type="button" class="mt-3 text-xs text-slate-400 hover:text-white" @click="showAll = !showAll">
        {{ showAll ? 'Show fewer' : `Show all ${sorted.length} entries` }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.field {
  @apply mt-1 block w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white
         focus:outline-none focus:ring-2 focus:ring-amber-300;
}
</style>