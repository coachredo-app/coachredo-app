'use client'

import { useEffect, useRef } from 'react'
import { BranchLayer } from './BranchLayer'
import { ScaledCanvas } from './ScaledCanvas'
import { CHAPTERS, HINGES, CONCLUSION, PHASE_LABELS } from './mindmap.content'
import { LANDSCAPE_GEOMETRY } from './mindmap.geometry'

const G = LANDSCAPE_GEOMETRY
const { canvas, core, phases, chapters, hinges, conclusion } = G
const { cx, cy, rInner, rMid, rOuter } = core

const PHASE_MAP = Object.fromEntries(phases.map(p => [p.id, p]))
const TEXT_COLOR: Record<string, string> = {
  voir: '#E3E8EF',
  recentrer: '#E3E8EF',
  agir: '#F1F4F8',
}

export function MindMapLandscape() {
  const wrapRef = useRef<HTMLDivElement>(null)

  // Request fullscreen on mount — silent fallback if denied
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => { /* scale-to-fit covers this */ })
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        backgroundColor: '#0B0F1A',
        background: 'radial-gradient(30% 68% at 44% 50%, rgba(201,168,76,0.08), transparent), #0B0F1A',
        overscrollBehavior: 'none',
      }}
    >
      <ScaledCanvas canvasW={canvas.w} canvasH={canvas.h} mode="landscape">
        <div
          style={{
            position: 'relative',
            width: canvas.w,
            height: canvas.h,
            overflow: 'hidden',
          }}
        >
          {/* SVG ribbons */}
          <BranchLayer geom={G} />

          {/* Nucleus */}
          <div
            style={{
              position: 'absolute',
              left: cx - rOuter,
              top: cy - rOuter,
              width: rOuter * 2,
              height: rOuter * 2,
              pointerEvents: 'none',
            }}
          >
            {/* Outer ring */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1px solid rgba(201,168,76,0.09)',
            }} />
            {/* Mid ring */}
            <div style={{
              position: 'absolute',
              left: rOuter - rMid, top: rOuter - rMid,
              width: rMid * 2, height: rMid * 2,
              borderRadius: '50%',
              border: '1px solid rgba(201,168,76,0.20)',
            }} />
            {/* Inner circle */}
            <div style={{
              position: 'absolute',
              left: rOuter - rInner, top: rOuter - rInner,
              width: rInner * 2, height: rInner * 2,
              borderRadius: '50%',
              border: '1px solid rgba(201,168,76,0.62)',
              background: '#0B0F1A',
              boxShadow: '0 0 64px rgba(201,168,76,0.18), inset 0 0 34px rgba(201,168,76,0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '0 12px',
              textAlign: 'center',
              overflow: 'hidden',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-icon.svg" width={28} height={28} alt="" style={{ flexShrink: 0 }} />
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-jakarta), sans-serif',
                  fontWeight: 800, fontSize: 14, letterSpacing: '.05em',
                  color: '#E8D59A', marginBottom: 2,
                }}>PLAN B</div>
                <div style={{
                  fontFamily: 'var(--font-jakarta), sans-serif',
                  fontWeight: 500, fontSize: 12, letterSpacing: '.12em',
                  color: '#C9A84C',
                }}>RENTABLE</div>
              </div>
              <div style={{ width: 28, height: 1, backgroundColor: 'rgba(201,168,76,0.5)', flexShrink: 0 }} />
              <div style={{
                fontFamily: 'var(--font-jakarta), sans-serif',
                fontWeight: 700, fontSize: 14, lineHeight: 1.3,
                color: '#F1F4F8',
              }}>
                La carte de ton parcours
              </div>
            </div>
          </div>

          {/* Phase labels */}
          {phases.map(p => (
            <div
              key={`label-${p.id}`}
              style={{
                position: 'absolute',
                left: p.label.left,
                top: p.label.top,
                width: p.label.width,
                textAlign: 'center',
                fontFamily: 'var(--font-jakarta), sans-serif',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: p.label.ls,
                color: p.titleTint,
                textTransform: 'uppercase',
              }}
            >
              {PHASE_LABELS[p.id]}
            </div>
          ))}

          {/* Chapter texts — CH. n inline, followed by text */}
          {chapters.map(ch => {
            const content = CHAPTERS.find(c => c.id === ch.id)!
            const phase = PHASE_MAP[ch.phase]
            return (
              <p
                key={`ch-${ch.id}`}
                style={{
                  position: 'absolute',
                  left: ch.text.left,
                  top: ch.text.top,
                  width: ch.text.width,
                  textAlign: ch.text.align,
                  fontFamily: 'var(--font-dm-sans, var(--font-jakarta), sans-serif)',
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: TEXT_COLOR[ch.phase],
                  margin: 0,
                  textWrap: 'pretty',
                } as React.CSSProperties}
              >
                <span style={{
                  fontFamily: 'var(--font-jakarta), sans-serif',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '.2em',
                  color: phase.chLabelTint,
                }}>
                  CH. {ch.id}&nbsp;&nbsp;
                </span>
                {content.text}
              </p>
            )
          })}

          {/* Hinge annotations */}
          {hinges.map(h => {
            const content = HINGES.find(x => x.id === h.id)!
            return (
              <p
                key={`hinge-${h.id}`}
                style={{
                  position: 'absolute',
                  left: h.text.left,
                  top: h.text.top,
                  width: h.text.width,
                  textAlign: h.text.align,
                  fontFamily: 'var(--font-dm-sans, var(--font-jakarta), sans-serif)',
                  fontStyle: 'italic',
                  fontSize: h.fontSize,
                  lineHeight: 1.4,
                  color: '#93A0B1',
                  margin: 0,
                }}
              >
                {content.text}
              </p>
            )
          })}

          {/* Conclusion */}
          <p
            style={{
              position: 'absolute',
              left: conclusion.left,
              top: conclusion.top,
              width: conclusion.width,
              textAlign: 'center',
              fontFamily: 'var(--font-dm-sans, var(--font-jakarta), sans-serif)',
              fontStyle: 'italic',
              fontSize: conclusion.fontSize,
              lineHeight: 1.4,
              color: '#C9CFD9',
              margin: 0,
            }}
          >
            {CONCLUSION}
          </p>
        </div>
      </ScaledCanvas>

      {/* Discrete exit zone — top-left 44×44, no visual marker */}
      <div
        aria-label="Retour"
        role="button"
        tabIndex={0}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: 44, height: 44,
          zIndex: 100,
          cursor: 'default',
        }}
        onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {})
            }
          }
        }}
      />
    </div>
  )
}
