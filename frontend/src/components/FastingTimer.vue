<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFastingStore } from '@/stores/fastingStore'

const store = useFastingStore()
const {
  isFasting, startTime, targetEndTime, remainingSeconds, progressPercentage,
  formattedTimer, currentStage, selectedProtocol, targetHours, loading, error,
} = storeToRefs(store)

onMounted(() => {
  store.fetchActiveFast()
  store.startTimerLoop() // keeps the clock ticking even before a fast is loaded
})

// --- Protocols (only selectable while not fasting) ---
const protocols = [
  { id: 'F_16_8', label: '16:8', hours: 16 },
  { id: 'F_18_6', label: '18:6', hours: 18 },
  { id: 'OMAD_24', label: '24h', hours: 24 },
  { id: 'ADF_36_12', label: '36:12', hours: 36 },
]

const showStartPrompt = ref(false)

function pickProtocol(p) {
  if (isFasting.value) return
  selectedProtocol.value = p.id
  targetHours.value = p.hours
  showStartPrompt.value = true // offer to start right away
}

async function confirmStart() {
  await store.startFast()
  if (isFasting.value) showStartPrompt.value = false
}

// --- Ending a fast ---
const moods = [
  { value: 1, emoji: '😣', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
]
const showEndPanel = ref(false)
const mood = ref(null)
const notes = ref('')
const completedFlag = ref(true)
const goalReached = computed(() => isFasting.value && remainingSeconds.value === 0)

function openEnd() {
  completedFlag.value = goalReached.value // ending early defaults to "not completed"
  showEndPanel.value = true
}

async function confirmEnd() {
  const ok = await store.endFast({
    moodRating: mood.value ?? undefined,
    journalNotes: notes.value.trim() || undefined,
    completed: completedFlag.value,
  })
  if (ok) {
    showEndPanel.value = false
    mood.value = null
    notes.value = ''
  }
}

// --- Ring geometry ---
const R = 118
const CIRC = 2 * Math.PI * R
const dashOffset = computed(() => CIRC * (1 - progressPercentage.value / 100))

// --- Stage ladder ---
const stages = [
  { n: 1, name: 'Anabolic (Digestion)', range: '0–4h', note: 'Your body is still processing the last meal.' },
  { n: 2, name: 'Blood Sugar Drop', range: '4–12h', note: 'Insulin falls and glycogen starts to be used.' },
  { n: 3, name: 'Fat Burning Mode', range: '12–18h', note: 'Stored fat becomes the main fuel.' },
  { n: 4, name: 'Ketosis Onset', range: '18–24h', note: 'Ketone production ramps up.' },
  { n: 5, name: 'Autophagy Peak', range: '24–48h', note: 'Cells clear out damaged components.' },
  { n: 6, name: 'Deep Cellular Renewal', range: '48h+', note: 'Extended fast. Check in with your doctor if you go long.' },
]

// --- Formatting ---
const remainingLabel = computed(() => {
  if (!isFasting.value) return 'No active fast'
  if (remainingSeconds.value === 0) return 'Goal reached'
  const h = Math.floor(remainingSeconds.value / 3600)
  const m = Math.floor((remainingSeconds.value % 3600) / 60)
  return `${h}h ${m}m to go`
})

const fmt = (d) =>
  d ? d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
</script>

<template>
  <main class="ft">
    <header class="ft__head">
      <h1>Fasting</h1>
      <p class="ft__state" :class="{ 'is-on': isFasting }">
        {{ isFasting ? currentStage.name : 'Feeding window' }}
      </p>
    </header>

    <!-- Ring -->
    <section class="ring" aria-label="Fast progress">
      <svg viewBox="0 0 280 280" role="img" :aria-label="`${progressPercentage}% of fast complete`">
        <defs>
          <linearGradient id="ember" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#E8913A" />
            <stop offset="1" stop-color="#2F7F86" />
          </linearGradient>
        </defs>
        <circle class="ring__track" cx="140" cy="140" :r="R" />
        <circle
          class="ring__bar"
          cx="140" cy="140" :r="R"
          :stroke-dasharray="CIRC"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 140 140)"
        />
      </svg>
      <div class="ring__center">
        <output class="ring__time">{{ formattedTimer }}</output>
        <span class="ring__sub">{{ remainingLabel }}</span>
        <span v-if="isFasting" class="ring__pct">{{ progressPercentage }}%</span>
      </div>
    </section>

    <!-- Times -->
    <dl class="times">
      <div>
        <dt>Started</dt>
        <dd>{{ fmt(startTime) }}</dd>
      </div>
      <div>
        <dt>Goal ({{ targetHours }}h)</dt>
        <dd>{{ fmt(targetEndTime) }}</dd>
      </div>
    </dl>

    <!-- Protocol -->
    <section class="protocols" aria-label="Fasting protocol">
      <button
        v-for="p in protocols"
        :key="p.id"
        type="button"
        class="chip"
        :class="{ 'is-active': selectedProtocol === p.id }"
        :disabled="isFasting"
        :aria-pressed="selectedProtocol === p.id"
        @click="pickProtocol(p)"
      >
        {{ p.label }}
      </button>
    </section>

    <!-- Start prompt: appears after picking a protocol with no active fast -->
    <section v-if="!isFasting && showStartPrompt" class="start" aria-live="polite">
      <p class="start__text">Start a {{ targetHours }}-hour fast now?</p>
      <div class="start__actions">
        <button type="button" class="start__go" :disabled="loading" @click="confirmStart">
          {{ loading ? 'Starting…' : 'Start fast' }}
        </button>
        <button type="button" class="start__cancel" :disabled="loading" @click="showStartPrompt = false">
          Not yet
        </button>
      </div>
      <p v-if="error" class="start__error" role="alert">{{ error }}</p>
    </section>

    <!-- End fast -->
    <section v-if="isFasting">
      <button v-if="!showEndPanel" type="button" class="end__open" @click="openEnd">End fast</button>

      <form v-else class="start" @submit.prevent="confirmEnd">
        <p class="start__text">How did it go?</p>

        <div class="mood" role="group" aria-label="Mood">
          <button
            v-for="m in moods"
            :key="m.value"
            type="button"
            class="mood__btn"
            :class="{ 'is-active': mood === m.value }"
            :aria-pressed="mood === m.value"
            :aria-label="m.label"
            @click="mood = mood === m.value ? null : m.value"
          >{{ m.emoji }}</button>
        </div>

        <label class="end__field">
          Notes
          <textarea v-model="notes" rows="3" maxlength="500" placeholder="Hunger, energy, anything worth remembering" />
        </label>

        <label class="end__check">
          <input v-model="completedFlag" type="checkbox" />
          Count this as a completed fast
        </label>

        <div class="start__actions">
          <button type="submit" class="start__go" :disabled="loading">
            {{ loading ? 'Saving…' : 'Save and end' }}
          </button>
          <button type="button" class="start__cancel" :disabled="loading" @click="showEndPanel = false">
            Keep fasting
          </button>
        </div>
        <p v-if="error" class="start__error" role="alert">{{ error }}</p>
      </form>
    </section>

    <!-- Stage ladder -->
    <section class="stages">
      <h2>What's happening</h2>
      <ol>
        <li
          v-for="s in stages"
          :key="s.n"
          :class="{
            'is-done': isFasting && currentStage.stage > s.n,
            'is-current': isFasting && currentStage.stage === s.n,
          }"
          :aria-current="isFasting && currentStage.stage === s.n ? 'step' : undefined"
        >
          <span class="stages__dot" />
          <div>
            <p class="stages__name">{{ s.name }} <small>{{ s.range }}</small></p>
            <p v-if="isFasting && currentStage.stage === s.n" class="stages__note">{{ s.note }}</p>
          </div>
        </li>
      </ol>
    </section>
  </main>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600&display=swap');

.ft {
  --fog: #e8eef1;
  --ink: #16263a;
  --tide: #2f7f86;
  --ember: #e8913a;
  --salt: #ffffff;
  --muted: #5c6f80;

  width: 100%;
  box-sizing: border-box;
  border-radius: 28px;
  padding: 28px 24px 36px;
  background: var(--fog);
  color: var(--ink);
  font-family: 'Figtree', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.ft__head { display: flex; justify-content: space-between; align-items: baseline; }
.ft__head h1 { font: 700 1.6rem 'Bricolage Grotesque', sans-serif; margin: 0; }
.ft__state { margin: 0; color: var(--muted); font-weight: 500; }
.ft__state.is-on { color: var(--tide); }

/* Ring */
.ring { position: relative; width: min(300px, 80vw); margin: 0 auto; }
.ring svg { width: 100%; display: block; }
.ring__track { fill: var(--salt); stroke: #d3dde3; stroke-width: 14; }
.ring__bar {
  fill: none;
  stroke: url(#ember);
  stroke-width: 14;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s ease;
}
.ring__center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px;
}
.ring__time {
  font: 700 2.6rem/1 'Bricolage Grotesque', sans-serif;
  font-variant-numeric: tabular-nums;
}
.ring__sub { color: var(--muted); font-size: 0.95rem; }
.ring__pct { color: var(--ember); font-weight: 600; }

/* Times */
.times { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; }
.times div { background: var(--salt); border-radius: 14px; padding: 14px 16px; }
.times dt { color: var(--muted); font-size: 0.85rem; }
.times dd { margin: 4px 0 0; font-weight: 600; }

/* Protocol chips */
.protocols { display: flex; gap: 8px; }
.chip {
  flex: 1; padding: 12px 0; border: 2px solid transparent; border-radius: 999px;
  background: var(--salt); color: var(--ink); font: 600 1rem 'Figtree', sans-serif; cursor: pointer;
}
.chip.is-active { border-color: var(--tide); color: var(--tide); }
.chip:disabled { cursor: default; opacity: 0.55; }
.chip:focus-visible { outline: 3px solid var(--ember); outline-offset: 2px; }

/* Start prompt */
.start { background: var(--salt); border-radius: 16px; padding: 16px; border-left: 4px solid var(--ember); }
.start__text { margin: 0 0 12px; font-weight: 600; }
.start__actions { display: flex; gap: 8px; }
.start__go, .start__cancel {
  padding: 11px 18px; border-radius: 999px; font: 600 0.95rem 'Figtree', sans-serif; cursor: pointer; border: 0;
}
.start__go { background: var(--ember); color: var(--ink); flex: 1; }
.start__cancel { background: var(--fog); color: var(--ink); }
.start__go:disabled, .start__cancel:disabled { opacity: 0.6; cursor: default; }
.start__go:focus-visible, .start__cancel:focus-visible { outline: 3px solid var(--tide); outline-offset: 2px; }
.start__error { margin: 10px 0 0; color: #b3261e; font-size: 0.9rem; }

/* End fast */
.end__open {
  width: 100%; padding: 14px; border: 2px solid var(--ink); border-radius: 999px;
  background: transparent; color: var(--ink); font: 600 1rem 'Figtree', sans-serif; cursor: pointer;
}
.end__open:focus-visible { outline: 3px solid var(--ember); outline-offset: 2px; }
.mood { display: flex; gap: 8px; margin-bottom: 14px; }
.mood__btn {
  flex: 1; padding: 10px 0; font-size: 1.4rem; border: 2px solid transparent;
  border-radius: 12px; background: var(--fog); cursor: pointer;
}
.mood__btn.is-active { border-color: var(--tide); background: var(--salt); }
.mood__btn:focus-visible { outline: 3px solid var(--ember); outline-offset: 2px; }
.end__field { display: block; font-size: 0.85rem; color: var(--muted); margin-bottom: 12px; }
.end__field textarea {
  display: block; width: 100%; margin-top: 4px; padding: 10px 12px; box-sizing: border-box;
  border: 2px solid var(--fog); border-radius: 12px; font: 400 1rem 'Figtree', sans-serif;
  color: var(--ink); resize: vertical;
}
.end__field textarea:focus-visible { outline: none; border-color: var(--tide); }
.end__check { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 0.95rem; }

/* Stage ladder */
.stages h2 { font: 700 1.1rem 'Bricolage Grotesque', sans-serif; margin: 0 0 14px; }
.stages ol { list-style: none; margin: 0; padding: 0; position: relative; }
.stages li { display: flex; gap: 14px; padding-bottom: 18px; position: relative; color: var(--muted); }
.stages li:not(:last-child)::before {
  content: ''; position: absolute; left: 7px; top: 18px; bottom: 0; width: 2px; background: #cdd8df;
}
.stages__dot {
  width: 16px; height: 16px; border-radius: 50%; margin-top: 2px; flex: none;
  background: var(--fog); border: 2px solid #b6c4ce; position: relative; z-index: 1;
}
.stages__name { margin: 0; font-weight: 500; }
.stages__name small { margin-left: 6px; font-size: 0.8rem; }
.stages__note { margin: 4px 0 0; font-size: 0.9rem; color: var(--ink); }
.stages li.is-done { color: var(--ink); }
.stages li.is-done .stages__dot { background: var(--tide); border-color: var(--tide); }
.stages li.is-done::before { background: var(--tide); }
.stages li.is-current { color: var(--ink); }
.stages li.is-current .stages__name { font-weight: 600; }
.stages li.is-current .stages__dot { background: var(--ember); border-color: var(--ember); }

@media (prefers-reduced-motion: reduce) {
  .ring__bar { transition: none; }
}
</style>