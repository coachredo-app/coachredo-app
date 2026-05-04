'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'planb_ambient_muted'

export function useAmbientSound() {
  const [muted, setMuted] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio('/music/ambient.mp3')
    audio.loop = true
    audio.volume = 0.18
    audioRef.current = audio

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'false') {
      setMuted(false)
      audio.play().catch(() => {})
    }

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    const next = !muted
    setMuted(next)
    localStorage.setItem(STORAGE_KEY, String(next))
    if (next) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  return { muted, toggle }
}
