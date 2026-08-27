'use client'

import { useRef, useEffect, useState, type ReactNode } from 'react'

interface Transform {
  scale: number
  offsetX: number
  offsetY: number
}

interface ScaledCanvasProps {
  canvasW: number
  canvasH: number
  mode: 'desktop' | 'landscape'
  children: ReactNode
}

export function ScaledCanvas({ canvasW, canvasH, mode, children }: ScaledCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [xf, setXf] = useState<Transform>({ scale: 1, offsetX: 0, offsetY: 0 })

  useEffect(() => {
    const compute = () => {
      const el = containerRef.current
      if (!el) return

      if (mode === 'desktop') {
        const cw = el.clientWidth
        const ch = el.clientHeight   // height determined by parent flex — key change
        if (cw === 0 || ch === 0) return
        const sFromW = Math.min(1, (cw - 48) / canvasW)
        const sFromH = ch / canvasH
        const s  = Math.min(sFromW, sFromH)
        const ox = (cw - canvasW * s) / 2
        const oy = Math.max(0, (ch - canvasH * s) / 2)
        setXf({ scale: s, offsetX: ox, offsetY: oy })
      } else {
        const vw = window.innerWidth
        const vh = window.innerHeight
        const s  = Math.min(vw / canvasW, vh / canvasH)
        const ox = (vw - canvasW * s) / 2
        const oy = (vh - canvasH * s) / 2
        setXf({ scale: s, offsetX: ox, offsetY: oy })
      }
    }

    compute()

    const ro = new ResizeObserver(compute)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', compute)
    window.addEventListener('orientationchange', compute)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
      window.removeEventListener('orientationchange', compute)
    }
  }, [mode, canvasW, canvasH])

  const { scale, offsetX, offsetY } = xf

  return (
    <div
      ref={containerRef}
      className="mm-sc-container"
      style={
        mode === 'landscape'
          ? { position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: '#0B0F1A', zIndex: 50 }
          : { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }
      }
    >
      <div
        className="mm-sc-transform"
        style={{
          position: 'absolute',
          top: offsetY,
          left: offsetX,
          width: canvasW,
          height: canvasH,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
