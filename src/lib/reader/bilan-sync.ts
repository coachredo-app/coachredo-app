import { saveBilanResponseAction, updateCurrentStepAction } from '@/app/(app)/bilan/actions'

export async function syncBilanResponse(
  sessionId: string,
  questionId: string,
  famille: string,
  value: string
): Promise<void> {
  try {
    const result = await saveBilanResponseAction(sessionId, questionId, famille, value)
    if (result.error && result.error !== 'BILAN_CLOSED') {
      console.error('[bilan-sync] syncBilanResponse failed — question:', questionId, result.error)
    }
  } catch (err) {
    console.error('[bilan-sync] syncBilanResponse failed — question:', questionId, err)
  }
}

export async function updateCurrentStep(sessionId: string, step: number): Promise<void> {
  try {
    const result = await updateCurrentStepAction(sessionId, step)
    if (result.error && result.error !== 'BILAN_CLOSED') {
      console.error('[bilan-sync] updateCurrentStep failed — step:', step, result.error)
    }
  } catch (err) {
    console.error('[bilan-sync] updateCurrentStep failed — step:', step, err)
  }
}
