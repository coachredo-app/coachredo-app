import Link from 'next/link'
import { CHROME } from './mindmap.content'

export function RotatePrompt() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100dvh',
        backgroundColor: '#0B0F1A',
        background:
          'radial-gradient(58% 32% at 50% 46%, rgba(201,168,76,0.07), transparent), #0B0F1A',
        overflowX: 'hidden',
      }}
    >
      {/* Chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          minHeight: 48,
        }}
      >
        <Link
          href="/fr/dashboard"
          style={{
            color: '#A0AEC0',
            fontSize: 14,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 48,
            alignSelf: 'center',
          }}
        >
          {CHROME.home}
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            color: '#A0AEC0',
            fontSize: 14,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            minHeight: 48,
          }}
        >
          {CHROME.print}
        </button>
      </div>

      {/* Bloc marque — centré à top:168 */}
      <div
        style={{
          position: 'absolute',
          top: 168,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo-icon.svg" width={44} height={44} alt="" />
        <div style={{ textAlign: 'center', lineHeight: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-jakarta), sans-serif',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '.05em',
              color: '#E8D59A',
              marginBottom: 4,
            }}
          >
            PLAN B
          </div>
          <div
            style={{
              fontFamily: 'var(--font-jakarta), sans-serif',
              fontWeight: 500,
              fontSize: 14,
              letterSpacing: '.12em',
              color: '#C9A84C',
            }}
          >
            RENTABLE
          </div>
        </div>
        <div style={{ width: 36, height: 1, backgroundColor: 'rgba(201,168,76,0.5)' }} />
        <div
          style={{
            fontFamily: 'var(--font-jakarta), sans-serif',
            fontWeight: 700,
            fontSize: 24,
            color: '#F1F4F8',
            textAlign: 'center',
            lineHeight: 1.25,
            padding: '0 24px',
          }}
        >
          La carte de ton parcours
        </div>
      </div>

      {/* Cercle rotation — centré à top:398 */}
      <div
        style={{
          position: 'absolute',
          top: 398,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.22)',
          boxShadow: 'inset 0 0 44px rgba(201,168,76,0.055)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Phone + rotation icon */}
        <svg width={80} height={80} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          {/* Phone body (inclined -24°) */}
          <g transform="rotate(-24, 40, 40)">
            <rect x={28} y={16} width={24} height={40} rx={4} stroke="#C9A84C" strokeWidth={1.6} fill="none" />
            <line x1={31} y1={51} x2={49} y2={51} stroke="#C9A84C" strokeWidth={1.6} />
          </g>
          {/* Rotation arc — top right quadrant */}
          <path
            d="M 54 20 A 20 20 0 0 1 72 38"
            stroke="#C9A84C"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
          />
          {/* Arrow tip */}
          <polyline
            points="68,32 72,38 66,40"
            stroke="#C9A84C"
            strokeWidth={1.6}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Texte invitation — top:636 */}
      <p
        style={{
          position: 'absolute',
          top: 636,
          left: 55,
          width: 280,
          fontSize: 18,
          lineHeight: 1.5,
          color: '#D7DDE5',
          fontFamily: 'var(--font-dm-sans, var(--font-jakarta), sans-serif)',
          textAlign: 'center',
          margin: 0,
        }}
      >
        {CHROME.rotateInvitation}
      </p>
    </div>
  )
}
