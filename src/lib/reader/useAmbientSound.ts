'use client'

import { useEffect, useRef, useState } from 'react'

const MUTED_KEY = 'planb_ambient_muted'
const TIME_KEY = 'planb_ambient_time'

export function useAmbientSound() {
  const [muted, setMuted] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio('/music/ambient.mp3')
    audio.loop = true
    audio.volume = 0.18
    audioRef.current = audio

    // Restore position
    const savedTime = parseFloat(localStorage.getItem(TIME_KEY) || '0')
    if (savedTime > 0) audio.currentTime = savedTime

    // Save position every 5s
    const interval = setInterval(() => {
      if (!audio.paused) {
        localStorage.setItem(TIME_KEY, String(audio.currentTime))
      }
    }, 5000)

    // Save position on page hide
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem(TIME_KEY, String(audio.currentTime))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const stored = localStorage.getItem(MUTED_KEY)
    if (stored === 'false') {
      setMuted(false)
      audio.play().catch(() => {})
    }

    return () => {
      localStorage.setItem(TIME_KEY, String(audio.currentTime))
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      audio.pause()
      audio.src = ''
    }
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    const next = !muted
    setMuted(next)
    localStorage.setItem(MUTED_KEY, String(next))
    if (next) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  return { muted, toggle }
}
