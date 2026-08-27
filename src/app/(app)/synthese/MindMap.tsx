'use client'

import { useEffect, useState } from 'react'
import { MindMapDesktop } from './MindMapDesktop'
import { MindMapLandscape } from './MindMapLandscape'
import { RotatePrompt } from './RotatePrompt'

type View = 'desktop' | 'landscape' | 'portrait'

function detectView(): View {
  const isNarrow    = matchMedia('(max-width: 900px)').matches
  const isLandscape = matchMedia('(orientation: landscape)').matches
  const isShort     = matchMedia('(max-height: 500px)').matches
  if (!isNarrow)              return 'desktop'
  if (isLandscape && isShort) return 'landscape'
  return 'portrait'
}

interface Props { bilanStatut: string | null }

export function MindMap({ bilanStatut }: Props) {
  // null = pre-hydration (avoid SSR/client mismatch)
  const [view, setView] = useState<View | null>(null)

  useEffect(() => {
    const mqs = [
      matchMedia('(max-width: 900px)'),
      matchMedia('(orientation: landscape)'),
      matchMedia('(max-height: 500px)'),
    ]
    const update = () => setView(detectView())
    update()
    mqs.forEach(mq => mq.addEventListener('change', update))
    return () => mqs.forEach(mq => mq.removeEventListener('change', update))
  }, [])

  if (view === null)        return <div style={{ backgroundColor: '#0B0F1A', minHeight: '100dvh' }} />
  if (view === 'landscape') return <MindMapLandscape />
  if (view === 'portrait')  return <RotatePrompt />
  return <MindMapDesktop bilanStatut={bilanStatut} />
}
