'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadProgress } from '@/lib/reader/progress'

export default function ResumePage() {
  const router = useRouter()

  useEffect(() => {
    const p = loadProgress()

    // Intro not done yet
    if (!p.introCompleted) {
      router.replace('/intro')
      return
    }

    // Find first incomplete chapter
    for (let num = 1; num <= 7; num++) {
      if (!p.chapters[String(num)]?.completed) {
        router.replace(`/chapter/${num}`)
        return
      }
    }

    // All chapters done → page de transition
    router.replace('/transition')
  }, [router])

  return (
    <div
      className="h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0a0d1a' }}
    >
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }} />
    </div>
  )
}
