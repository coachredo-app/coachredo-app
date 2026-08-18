const BILAN_KEY = 'planb_bilan'

export interface BilanData {
  responses: Record<string, string>
  completedAt: string | null
  sessionId: string | null
  currentStep: number
}

function empty(): BilanData {
  return { responses: {}, completedAt: null, sessionId: null, currentStep: 0 }
}

export function loadBilan(): BilanData {
  if (typeof window === 'undefined') return empty()
  try {
    const raw = localStorage.getItem(BILAN_KEY)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

function persist(data: BilanData): void {
  try {
    localStorage.setItem(BILAN_KEY, JSON.stringify(data))
  } catch {
    // quota exceeded — silently ignore
  }
}

export function saveBilanResponse(questionId: string, value: string): void {
  if (typeof window === 'undefined') return
  const data = loadBilan()
  if (value.trim()) {
    data.responses[questionId] = value.trim()
  } else {
    delete data.responses[questionId]
  }
  persist(data)
}

export function markBilanCompleted(): void {
  if (typeof window === 'undefined') return
  const data = loadBilan()
  if (!data.completedAt) {
    data.completedAt = new Date().toISOString()
    persist(data)
  }
}

export function saveBilanSession(sessionId: string): void {
  if (typeof window === 'undefined') return
  const data = loadBilan()
  data.sessionId = sessionId
  persist(data)
}

export function saveBilanStep(step: number): void {
  if (typeof window === 'undefined') return
  const data = loadBilan()
  data.currentStep = step
  persist(data)
}
