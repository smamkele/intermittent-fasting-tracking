import { ref, computed, onMounted, onUnmounted } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/authStore'

export const useFastingStore = defineStore('fasting', () => {
  const authUser = useAuthStore()
  const apiUrl='http://localhost:4000'
  // Extract user ID safely
  const currentUserId = computed(() => authUser.user?.id || authUser.user?.userId || null)
  
  const activeFast = ref(null) // Holds active fast record from DB
  const history = ref([])
  const weightLogs = ref([])
  const stats = ref({ totalFasts: 0, completionRate: 0 })
  
  const selectedProtocol = ref()
  const targetHours = ref()
  
  const now = ref(new Date())
  const loading = ref(false)
  const error = ref(null)

  // --- TIMER TICKING LOOP ---
  let timerInterval = null

  function startTimerLoop() {
    if (timerInterval) clearInterval(timerInterval)
    now.value = new Date()
    timerInterval = setInterval(() => {
      now.value = new Date()
    }, 1000)
  }

  // --- API FETCH ACTION ---
async function fetchActiveFast() {
  if (!currentUserId.value) return
  loading.value = true
  try {
    const response = await fetch(`${apiUrl}/api/fasts/active?userId=${currentUserId.value}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authUser.token}` // Fixed template literal & Bearer prefix
      }
    })

    if (!response.ok) throw new Error('Network response was not ok')

    const data = await response.json()
    
    if (data && data.startTime) {
      activeFast.value = data
      targetHours.value = data.targetHours || 36
      startTimerLoop() // Start live timer ticking once data is loaded
    } else {
      activeFast.value = null
    }
  } catch (err) {
    error.value = 'Failed to fetch active fast'
    console.error('Fetch active fast error:', err)
  } finally {
    loading.value = false
  }
}
  async function startFast() {
  if (!currentUserId.value) return
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${apiUrl}/api/fasts/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' ,
       'Authorization': `Bearer ${authUser.token}`  
      },
      
      body: JSON.stringify({
        userId: currentUserId.value,
        protocol: selectedProtocol.value,
        targetHours: targetHours.value,
        startTime: new Date().toISOString(),
      }),
    })
    if (!response.ok) throw new Error()
    activeFast.value = await response.json()
    startTimerLoop()
  } catch {
    error.value = 'Could not start your fast. Try again.'
  } finally {
    loading.value = false
  }
}
async function endFast({ moodRating, journalNotes, completed } = {}) {
  if (!activeFast.value?.id) return false
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${apiUrl}/api/fasts/${activeFast.value.id}/end`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json',
        'Authorization': `Bearer ${authUser.token}`  
       },
      body: JSON.stringify({ moodRating, journalNotes, completed }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Request failed')
    if (data.count === 0) throw new Error('Fast not found')

    history.value.unshift({
      ...activeFast.value,
      endTime: new Date().toISOString(),
      completed: completed ?? true,
      moodRating,
      journalNotes,
    })
    activeFast.value = null
    stopTimerLoop()
    return true
  } catch (err) {
    error.value = err.message || 'Could not end your fast. Try again.'
    return false
  } finally {
    loading.value = false
  }
}

function stopTimerLoop() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = null
}

  // --- GETTERS & CALCULATED STATE ---
  const isFasting = computed(() => !!activeFast.value)

  const startTime = computed(() => {
    if (!activeFast.value || !activeFast.value.startTime) return null
    const date = new Date(activeFast.value.startTime)
    return isNaN(date.getTime()) ? null : date
  })

  const targetEndTime = computed(() => {
    if (!startTime.value) return null
    const end = new Date(startTime.value)
    end.setHours(end.getHours() + (activeFast.value.targetHours || targetHours.value))
    return end
  })

  // Elapsed seconds since fast started
  const elapsedSeconds = computed(() => {
    if (!startTime.value) return 0
    const diff = Math.floor((now.value.getTime() - startTime.value.getTime()) / 1000)
    return diff > 0 ? diff : 0
  })

  // Total target duration in seconds
  const totalTargetSeconds = computed(() => {
    const hours = activeFast.value ? activeFast.value.targetHours : targetHours.value
    return (hours || 36) * 3600
  })

  // Remaining seconds until goal reached
  const remainingSeconds = computed(() => {
    const diff = totalTargetSeconds.value - elapsedSeconds.value
    return diff > 0 ? diff : 0
  })

  // Progress percentage (0 - 100)
  const progressPercentage = computed(() => {
    if (!isFasting.value || totalTargetSeconds.value === 0) return 0
    const pct = (elapsedSeconds.value / totalTargetSeconds.value) * 100
    return Math.min(100, Math.max(0, Number(pct.toFixed(1))))
  })

  // Formatted Digital Clock String (HH:MM:SS)
  const formattedTimer = computed(() => {
    const totalSecs = isFasting.value ? elapsedSeconds.value : 0
    const hrs = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  // Live Physiological Stage Identifier
  const currentStage = computed(() => {
    const hours = elapsedSeconds.value / 3600
    if (!isFasting.value) return { name: 'Feeding Window', stage: 0 }
    if (hours < 4) return { name: 'Anabolic (Digestion)', stage: 1 }
    if (hours < 12) return { name: 'Blood Sugar Drop', stage: 2 }
    if (hours < 18) return { name: 'Fat Burning Mode', stage: 3 }
    if (hours < 24) return { name: 'Ketosis Onset', stage: 4 }
    if (hours < 48) return { name: 'Autophagy Peak', stage: 5 }
    return { name: 'Deep Cellular Renewal', stage: 6 }
  })
  

  return {
    activeFast,
    selectedProtocol,
    targetHours,
    isFasting,
    startTime,
    targetEndTime,
    startFast,
    elapsedSeconds,
    remainingSeconds,
    progressPercentage,
    formattedTimer,
    currentStage,
    history,
    weightLogs,
    endFast,
    fetchActiveFast,
    startTimerLoop
  }
})