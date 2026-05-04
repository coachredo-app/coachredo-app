'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'planb_ambient_muted'

// C major pad: C3, E3, G3, C4
const FREQS = [130.81, 164.81, 196.0, 261.63]

export function useAmbientSound() {
  const [muted, setMuted] = useState(true)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'false') {
      setMuted(false)
    }
  }, [])

  function buildGraph(ctx: AudioContext) {
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, ctx.currentTime)
    masterRef.current = master

    // Warm lowpass
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 650
    filter.Q.value = 0.4

    // Delay / reverb
    const delay = ctx.createDelay(3)
    delay.delayTime.value = 2.8
    const feedback = ctx.createGain()
    feedback.gain.value = 0.35
    const delayGain = ctx.createGain()
    delayGain.gain.value = 0.3

    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(delayGain)
    delayGain.connect(master)

    FREQS.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const oscGain = ctx.createGain()
      oscGain.gain.value = 0.22

      // Slow tremolo LFO
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.03 + i * 0.008
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.04
      lfo.connect(lfoGain)
      lfoGain.connect(oscGain.gain)
      lfo.start()

      osc.connect(oscGain)
      oscGain.connect(filter)
      oscGain.connect(delay)
      osc.start()
    })

    filter.connect(master)
    master.connect(ctx.destination)
  }

  function ensureStarted() {
    if (startedRef.current) return
    startedRef.current = true
    const ctx = new AudioContext()
    ctxRef.current = ctx
    buildGraph(ctx)
  }

  // Sync gain to muted state
  useEffect(() => {
    const master = masterRef.current
    const ctx = ctxRef.current
    if (!master || !ctx) return
    if (muted) {
      master.gain.setTargetAtTime(0.001, ctx.currentTime, 1.5)
    } else {
      master.gain.setTargetAtTime(0.18, ctx.currentTime, 1.5)
    }
  }, [muted])

  function toggle() {
    const next = !muted
    setMuted(next)
    localStorage.setItem(STORAGE_KEY, String(next))
    if (!next) {
      ensureStarted()
      // resume if suspended (iOS)
      ctxRef.current?.resume()
    }
  }

  useEffect(() => {
    return () => {
      ctxRef.current?.close()
    }
  }, [])

  return { muted, toggle }
}
