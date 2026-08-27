'use client'

import { useMemo } from 'react'
import type { MindMapGeometry } from './mindmap.geometry'

function ribbonPath(
  coords: readonly [number, number, number, number, number, number, number, number],
  w0: number,
  w1: number,
  n: number,
): string {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = coords
  const left: Array<[number, number]> = []
  const right: Array<[number, number]> = []

  for (let i = 0; i <= n; i++) {
    const t = i / n
    const mt = 1 - t

    const px = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3
    const py = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3

    const tx = 3*(mt*mt*(x1-x0) + 2*mt*t*(x2-x1) + t*t*(x3-x2))
    const ty = 3*(mt*mt*(y1-y0) + 2*mt*t*(y2-y1) + t*t*(y3-y2))
    const len = Math.sqrt(tx*tx + ty*ty)
    if (len < 1e-6) continue

    const nx = -ty / len
    const ny =  tx / len
    const hw = (w1 + (w0 - w1) * Math.pow(1 - t, 1.5)) / 2

    left.push([px + hw * nx, py + hw * ny])
    right.push([px - hw * nx, py - hw * ny])
  }

  const pts = [...left, ...right.reverse()]
  if (pts.length === 0) return ''
  return pts.map(([x, y], i) =>
    `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  ).join(' ') + ' Z'
}

function diamond(x: number, y: number, r: number): string {
  return `M${x},${y-r} L${x+r},${y} L${x},${y+r} L${x-r},${y} Z`
}

interface BranchLayerProps {
  geom: MindMapGeometry
}

export function BranchLayer({ geom }: BranchLayerProps) {
  const { canvas, phases, chapters, hinges, ribbon, nodeR, nodeRing } = geom

  const phaseTintMap = useMemo(
    () => Object.fromEntries(phases.map(p => [p.id, p.tint])),
    [phases],
  )

  const trunkPaths = useMemo(
    () => phases.map(p => ({
      d: ribbonPath(p.trunk, ribbon.trunk.w0, ribbon.trunk.w1, ribbon.trunk.n),
      tint: p.tint,
      opacity: p.trunkOpacity,
    })),
    [phases, ribbon.trunk],
  )

  const limbPaths = useMemo(
    () => chapters.map(ch => ({
      d: ribbonPath(ch.limb, ribbon.limb.w0, ribbon.limb.w1, ribbon.limb.n),
      tint: phaseTintMap[ch.phase] ?? '#C9A84C',
      opacity: ch.limbOpacity,
    })),
    [chapters, ribbon.limb, phaseTintMap],
  )

  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      width={canvas.w}
      height={canvas.h}
      viewBox={`0 0 ${canvas.w} ${canvas.h}`}
    >
      {/* Trunks */}
      {trunkPaths.map((p, i) => (
        <path key={`trunk-${i}`} d={p.d} fill={p.tint} fillOpacity={p.opacity} />
      ))}

      {/* Limbs */}
      {limbPaths.map((p, i) => (
        <path key={`limb-${i}`} d={p.d} fill={p.tint} fillOpacity={p.opacity} />
      ))}

      {/* Phase node markers */}
      {phases.map(p => (
        <g key={`node-${p.id}`}>
          <circle cx={p.node.x} cy={p.node.y} r={nodeR} fill={p.tint} fillOpacity={0.95} />
          {nodeRing && (
            <circle
              cx={p.node.x} cy={p.node.y} r={nodeR * 2}
              fill="none" stroke={p.tint} strokeWidth={1} strokeOpacity={0.3}
            />
          )}
        </g>
      ))}

      {/* Hinge diamond markers */}
      {hinges.map(h => (
        <path
          key={`hinge-mark-${h.id}`}
          d={diamond(h.mark.x, h.mark.y, h.mark.r)}
          fill="#0B0F1A"
          stroke="#C9A84C"
          strokeWidth={1}
          strokeOpacity={0.75}
        />
      ))}
    </svg>
  )
}
