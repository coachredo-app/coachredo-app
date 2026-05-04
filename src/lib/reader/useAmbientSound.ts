'use client'

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'planb_ambient_muted'

// Soft pad: two detuned pairs around C3 and G3
// Triangle waves are much warmer/softer than sine
const VOICES: { freq: number; detune: number }[] = [
  { freq: 130.81, detune: -3 },  // C3 slightly flat
  { freq: 130.81, detune: +4 },  // C3 slightly sharp → gentle chorus
  { freq: 196.0,  detune: -2 },  // G3
  { freq: 196.0,  detune: +5 },  // G3 detuned → pad width
]

export function useAmbientSound() {
  const [muted, setMuted] = useState(true)
  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'false') setMuted(false)
  }, [])

  function buildGraph(ctx: AudioContext) {
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, ctx.currentTime)
    masterRef.current = master

    // Aggressive lowpass — remove all brightness
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 320
    filter.Q.value = 0.2

    // Very subtle reverb
    const delay = ctx.createDelay(4)
    delay.delayTime.value = 3.2
    const feedback = ctx.createGain()
    feedback.gain.value = 0.2
    const wetGain = ctx.createGain()
    wetGain.gain.value = 0.18

    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wetGain)
    wetGain.connect(master)

    VOICES.forEach((v, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = v.freq
      osc.detune.value = v.detune

      const oscGain = ctx.createGain()
      oscGain.gain.value = 0.09   // very quiet per voice

      // Ultra-slow volume breathe (0.02–0.04 Hz)
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.02 + i * 0.005
      const lfoDepth = ctx.createGain()
      lfoDepth.gain.value = 0.015  // barely perceptible
      lfo.connect(lfoDepth)
      lfoDepth.connect(oscGain.gain)
      lfo.start()

      osc.connect(oscGain)
      oscGain.connect(filter)
      oscGain.connect(delay)
      osc.start()
    })

    filter.connect(master)
    master.connect(ctx.destination)
  }

  useEffect(() => {
    const master = masterRef.current
    const ctx = ctxRef.current
    if (!master || !ctx) return
    if (muted) {
      master.gain.setTargetAtTime(0.001, ctx.currentTime, 2.0)
    } else {
      master.gain.setTargetAtTime(0.07, ctx.currentTime, 2.5)  // very soft target
    }
  }, [muted])

  function ensureStarted() {
    if (startedRef.current) return
    startedRef.current = true
    const ctx = new AudioContext()
    ctxRef.current = ctx
    buildGraph(ctx)
  }

  function toggle() {
    const next = !muted
    setMuted(next)
    localStorage.setItem(STORAGE_KEY, String(next))
    if (!next) {
      ensureStarted()
      ctxRef.current?.resume()
    }
  }

  useEffect(() => {
    return () => { ctxRef.current?.close() }
  }, [])

  return { muted, toggle }
}
