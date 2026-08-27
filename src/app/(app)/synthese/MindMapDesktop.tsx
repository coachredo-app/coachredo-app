'use client'

import Link from 'next/link'
import { BranchLayer } from './BranchLayer'
import { ScaledCanvas } from './ScaledCanvas'
import { CHAPTERS, HINGES, CONCLUSION, CHROME, PHASE_LABELS } from './mindmap.content'
import { DESKTOP_GEOMETRY } from './mindmap.geometry'

const G = DESKTOP_GEOMETRY
const { canvas, core, phases, chapters, hinges, conclusion } = G
const { cx, cy, rInner, rMid, rOuter } = core

const PHASE_MAP = Object.fromEntries(phases.map(p => [p.id, p]))
const TEXT_COLOR: Record<string, string> = {
  voir: '#E3E8EF',
  recentrer: '#E3E8EF',
  agir: '#F1F4F8',
}

interface Props { bilanStatut: string | null }

export function MindMapDesktop({ bilanStatut }: Props) {
  const ctaLabel =
    bilanStatut === 'in_progress' ? CHROME.cta.in_progress
    : bilanStatut === 'completed'  ? CHROME.cta.completed
    : CHROME.cta.default

  return (
    <div
      className="mm-page-wrapper"
      style={{ backgroundColor: '#070A12', height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }

          /* Reset page structure */
          .mm-page-wrapper {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          .mm-chrome, .mm-cta { display: none !important; }
          .mm-canvas-flex  { display: block !important; flex: none !important; }

          /* A4 anchor — page break determined by this box height, not content coords */
          .mm-sc-container {
            position: relative !important;
            width: 297mm !important;
            height: 210mm !important;
            overflow: hidden !important;
            background: white !important;
          }

          /* Inner scaled layer — absolute so it doesn't expand the A4 container */
          .mm-sc-transform {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 1760px !important;
            height: 1245px !important;
            transform: scale(0.6375) !important;
            transform-origin: top left !important;
          }

          /* Artboard — natural size, no zoom */
          .mm-artboard {
            width: 1760px !important;
            height: 1245px !important;
            background: white !important;
            border: none !important;
            overflow: visible !important;
          }

          /* SVG gold: force color preservation */
          .mm-artboard svg {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Text colors for light background */
          .mm-nucleus-inner {
            background: #f5f5f0 !important;
            box-shadow: none !important;
          }
          .mm-ch-text    { color: #1f2937 !important; }
          .mm-ch-label   { color: #9a7233 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .mm-phase-label{ color: #9a7233 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .mm-hinge-text { color: #4b5563 !important; }
          .mm-conclusion { color: #374151 !important; }
          .mm-brand-url  { color: #7c4a2e !important; opacity: 1 !important; }
          .mm-brand-logo { opacity: 1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Chrome — above canvas */}
      <div
        className="mm-chrome"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 12px',
          maxWidth: 1200,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Link
          href="/fr/dashboard"
          style={{ color: '#A0AEC0', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          {CHROME.home}
        </Link>
        <button
          onClick={() => window.print()}
          style={{ color: '#A0AEC0', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {CHROME.print}
        </button>
      </div>

      {/* Canvas area — fills remaining space between chrome and CTA */}
      <div className="mm-canvas-flex" style={{ flex: 1, minHeight: 0 }}>
      <ScaledCanvas canvasW={canvas.w} canvasH={canvas.h} mode="desktop">
        <div
          className="mm-artboard"
          style={{
            position: 'relative',
            width: canvas.w,
            height: canvas.h,
            backgroundColor: '#0B0F1A',
            border: '1px solid rgba(201,168,76,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* SVG ribbons — behind everything */}
          <BranchLayer geom={G} />

          {/* CoachRedo branding — top-left, secondary, permanent */}
          <div style={{ position: 'absolute', left: 24, top: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/coachredo-logo.png"
              alt="CoachRedo"
              width={54}
              height={54}
              className="mm-brand-logo"
              style={{ opacity: 0.82, display: 'block' }}
            />
            <div
              className="mm-brand-url"
              style={{
                fontFamily: 'var(--font-dm-sans, var(--font-jakarta)), sans-serif',
                fontSize: 10,
                color: '#9ca3af',
                opacity: 0.55,
                letterSpacing: '.05em',
              }}
            >
              coachredo.app
            </div>
          </div>

          {/* Nucleus rings + inner circle */}
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
              border: '1px solid rgba(201,168,76,0.075)',
            }} />
            {/* Mid ring */}
            <div style={{
              position: 'absolute',
              left: rOuter - rMid, top: rOuter - rMid,
              width: rMid * 2, height: rMid * 2,
              borderRadius: '50%',
              border: '1px solid rgba(201,168,76,0.22)',
            }} />
            {/* Inner circle */}
            <div className="mm-nucleus-inner" style={{
              position: 'absolute',
              left: rOuter - rInner, top: rOuter - rInner,
              width: rInner * 2, height: rInner * 2,
              borderRadius: '50%',
              border: '1px solid rgba(201,168,76,0.60)',
              background: 'radial-gradient(100% 100% at 50% 26%, #171F2F, #0B0F1A)',
              boxShadow: '0 0 90px rgba(201,168,76,0.15), inset 0 0 54px rgba(201,168,76,0.055)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: '0 26px',
              textAlign: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-icon.svg" width={48} height={48} alt="" />
              <div>
                <div style={{
                  fontFamily: 'var(--font-jakarta), sans-serif',
                  fontWeight: 800, fontSize: 16, letterSpacing: '.05em',
                  color: '#E8D59A', marginBottom: 4,
                }}>PLAN B</div>
                <div style={{
                  fontFamily: 'var(--font-jakarta), sans-serif',
                  fontWeight: 500, fontSize: 14, letterSpacing: '.12em',
                  color: '#C9A84C',
                }}>RENTABLE</div>
              </div>
              <div style={{ width: 40, height: 1, backgroundColor: 'rgba(201,168,76,0.5)', flexShrink: 0 }} />
              <div style={{
                fontFamily: 'var(--font-jakarta), sans-serif',
                fontWeight: 700, fontSize: 24, letterSpacing: '-.02em',
                lineHeight: 1.25, color: '#F1F4F8',
              }}>
                La carte de ton parcours
              </div>
            </div>
          </div>

          {/* Phase labels */}
          {phases.map(p => (
            <div
              key={`label-${p.id}`}
              className="mm-phase-label"
              style={{
                position: 'absolute',
                left: p.label.left,
                top: p.label.top,
                width: p.label.width,
                textAlign: 'center',
                fontFamily: 'var(--font-jakarta), sans-serif',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: p.label.ls,
                color: p.titleTint,
                textTransform: 'uppercase',
              }}
            >
              {PHASE_LABELS[p.id]}
            </div>
          ))}

          {/* Chapter texts */}
          {chapters.map(ch => {
            const content = CHAPTERS.find(c => c.id === ch.id)!
            const phase = PHASE_MAP[ch.phase]
            return (
              <div
                key={`ch-${ch.id}`}
                style={{
                  position: 'absolute',
                  left: ch.text.left,
                  top: ch.text.top,
                  width: ch.text.width,
                  textAlign: ch.text.align,
                }}
              >
                <p
                  className="mm-ch-label"
                  style={{
                    fontFamily: 'var(--font-jakarta), sans-serif',
                    fontWeight: 600, fontSize: 12,
                    letterSpacing: '.22em',
                    color: phase.chLabelTint,
                    margin: '0 0 9px',
                    textTransform: 'uppercase',
                  } as React.CSSProperties}
                >
                  CH. {ch.id}
                </p>
                <p
                  className="mm-ch-text"
                  style={{
                    fontFamily: 'var(--font-dm-sans, var(--font-jakarta), sans-serif)',
                    fontSize: 18,
                    lineHeight: 1.55,
                    color: TEXT_COLOR[ch.phase],
                    margin: 0,
                    textWrap: 'pretty',
                  } as React.CSSProperties}
                >
                  {content.text}
                </p>
              </div>
            )
          })}

          {/* Hinge annotations */}
          {hinges.map(h => {
            const content = HINGES.find(x => x.id === h.id)!
            return (
              <p
                key={`hinge-${h.id}`}
                className="mm-hinge-text"
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
            className="mm-conclusion"
            style={{
              position: 'absolute',
              left: conclusion.left,
              top: conclusion.top,
              width: conclusion.width,
              textAlign: 'center',
              fontFamily: 'var(--font-dm-sans, var(--font-jakarta), sans-serif)',
              fontStyle: 'italic',
              fontSize: conclusion.fontSize,
              lineHeight: 1.5,
              color: '#C9CFD9',
              margin: 0,
            }}
          >
            {CONCLUSION}
          </p>
        </div>
      </ScaledCanvas>
      </div>

      {/* CTA — below canvas */}
      <div
        className="mm-cta"
        style={{ textAlign: 'center', padding: '40px 20px 48px' }}
      >
        <Link
          href="/bilan"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            backgroundColor: '#C9A84C',
            color: '#0B0F1A',
            borderRadius: 16,
            fontWeight: 700,
            fontSize: 14,
            fontFamily: 'var(--font-jakarta), sans-serif',
            letterSpacing: '.03em',
            boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
            textDecoration: 'none',
          }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
