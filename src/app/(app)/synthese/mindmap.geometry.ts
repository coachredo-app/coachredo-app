import type { Phase } from './mindmap.content'

export interface GeomPhase {
  id: Phase
  tint: string
  chLabelTint: string
  titleTint: string
  node: { x: number; y: number }
  trunk: readonly [number, number, number, number, number, number, number, number]
  trunkOpacity: number
  label: { left: number; top: number; width: number; ls: string }
}

export interface GeomChapter {
  id: number
  phase: Phase
  limb: readonly [number, number, number, number, number, number, number, number]
  limbOpacity: number
  text: { left: number; top: number; width: number; align: 'left' | 'right' }
}

export interface GeomHinge {
  id: number
  text: { left: number; top: number; width: number; align: 'left' | 'right' | 'center' }
  mark: { x: number; y: number; r: number }
  fontSize: number
}

export interface GeomConclusion {
  left: number; top: number; width: number; fontSize: number
}

export interface MindMapGeometry {
  canvas: { w: number; h: number }
  core: { cx: number; cy: number; rInner: number; rMid: number; rOuter: number }
  phases: GeomPhase[]
  chapters: GeomChapter[]
  hinges: GeomHinge[]
  conclusion: GeomConclusion
  ribbon: {
    trunk: { w0: number; w1: number; n: number }
    limb:  { w0: number; w1: number; n: number }
  }
  nodeR: number
  nodeRing: boolean
}

// ── Desktop 1760 × 1245 ──────────────────────────────────────────────────────

export const DESKTOP_GEOMETRY: MindMapGeometry = {
  canvas: { w: 1760, h: 1245 },
  core: { cx: 910, cy: 565, rInner: 150, rMid: 166, rOuter: 200 },
  nodeR: 6,
  nodeRing: false,
  ribbon: {
    trunk: { w0: 18, w1: 10, n: 48 },
    limb:  { w0: 9,  w1: 2,  n: 58 },
  },
  phases: [
    {
      id: 'voir',
      tint: '#B58E38', chLabelTint: '#B79040', titleTint: '#C0973C',
      node: { x: 676, y: 558 },
      trunk: [744, 565, 726, 563, 706, 560, 676, 558],
      trunkOpacity: 0.70,
      label: { left: 530, top: 524, width: 140, ls: '.24em' },
    },
    {
      id: 'recentrer',
      tint: '#C9A84C', chLabelTint: '#C9A84C', titleTint: '#C9A84C',
      node: { x: 1130, y: 405 },
      trunk: [1044, 467, 1068, 452, 1100, 428, 1130, 405],
      trunkOpacity: 0.76,
      label: { left: 954, top: 352, width: 200, ls: '.24em' },
    },
    {
      id: 'agir',
      tint: '#F0C040', chLabelTint: '#F0C040', titleTint: '#F0C040',
      node: { x: 1130, y: 725 },
      trunk: [1044, 663, 1068, 678, 1100, 702, 1130, 725],
      trunkOpacity: 0.86,
      label: { left: 966, top: 756, width: 200, ls: '.24em' },
    },
  ],
  chapters: [
    { id: 1, phase: 'voir',      limb: [676, 543, 650, 470, 600, 350, 500, 262], limbOpacity: 0.78, text: { left: 185,  top: 222,  width: 300, align: 'right' } },
    { id: 2, phase: 'voir',      limb: [637, 558, 590, 560, 470, 562, 412, 564], limbOpacity: 0.78, text: { left: 97,   top: 510,  width: 300, align: 'right' } },
    { id: 3, phase: 'voir',      limb: [676, 573, 650, 646, 600, 766, 500, 854], limbOpacity: 0.78, text: { left: 185,  top: 800,  width: 300, align: 'right' } },
    { id: 4, phase: 'recentrer', limb: [1152, 390, 1180, 330, 1215, 252, 1300, 220], limbOpacity: 0.82, text: { left: 1318, top: 152,  width: 320, align: 'left' } },
    { id: 5, phase: 'recentrer', limb: [1205, 422, 1245, 434, 1280, 414, 1318, 408], limbOpacity: 0.82, text: { left: 1336, top: 354,  width: 320, align: 'left' } },
    { id: 6, phase: 'agir',      limb: [1180, 736, 1225, 748, 1275, 748, 1318, 742], limbOpacity: 0.88, text: { left: 1336, top: 702,  width: 320, align: 'left' } },
    { id: 7, phase: 'agir',      limb: [1152, 742, 1180, 800, 1215, 890, 1300, 930], limbOpacity: 0.88, text: { left: 1318, top: 876,  width: 320, align: 'left' } },
  ],
  hinges: [
    { id: 1, text: { left: 706,  top: 342, width: 250, align: 'left' }, mark: { x: 684,  y: 351, r: 5 }, fontSize: 18 },
    { id: 2, text: { left: 1180, top: 523, width: 260, align: 'left' }, mark: { x: 1156, y: 532, r: 5 }, fontSize: 18 },
  ],
  conclusion: { left: 560, top: 1058, width: 700, fontSize: 24 },
}

// ── Landscape 844 × 390 ──────────────────────────────────────────────────────

export const LANDSCAPE_GEOMETRY: MindMapGeometry = {
  canvas: { w: 844, h: 390 },
  core: { cx: 375, cy: 195, rInner: 76, rMid: 84, rOuter: 100 },
  nodeR: 5,
  nodeRing: true,
  ribbon: {
    trunk: { w0: 14, w1: 7,   n: 48 },
    limb:  { w0: 7,  w1: 1.8, n: 58 },
  },
  phases: [
    {
      id: 'voir',
      tint: '#B58E38', chLabelTint: '#B79040', titleTint: '#C0973C',
      node: { x: 258, y: 162 },
      trunk: [294, 172, 283, 169, 271, 165, 258, 162],
      trunkOpacity: 0.74,
      label: { left: 220, top: 118, width: 40, ls: '.12em' },
    },
    {
      id: 'recentrer',
      tint: '#C9A84C', chLabelTint: '#C9A84C', titleTint: '#C9A84C',
      node: { x: 468, y: 68 },
      trunk: [425, 127, 436, 112, 456, 89, 468, 68],
      trunkOpacity: 0.82,
      label: { left: 360, top: 78, width: 110, ls: '.20em' },
    },
    {
      id: 'agir',
      tint: '#F0C040', chLabelTint: '#F0C040', titleTint: '#F0C040',
      node: { x: 468, y: 299 },
      trunk: [431, 258, 444, 271, 458, 286, 468, 299],
      trunkOpacity: 0.92,
      label: { left: 372, top: 302, width: 84, ls: '.20em' },
    },
  ],
  chapters: [
    { id: 1, phase: 'voir',      limb: [258, 162, 268, 118, 256,  58, 224,  26], limbOpacity: 0.82, text: { left: 12,  top: 14,  width: 204, align: 'right' } },
    { id: 2, phase: 'voir',      limb: [258, 162, 246, 158, 234, 142, 224, 138], limbOpacity: 0.82, text: { left: 12,  top: 126, width: 204, align: 'right' } },
    { id: 3, phase: 'voir',      limb: [258, 162, 268, 208, 256, 266, 224, 298], limbOpacity: 0.82, text: { left: 12,  top: 286, width: 204, align: 'right' } },
    { id: 4, phase: 'recentrer', limb: [468,  68, 480,  48, 498,  28, 526,  16], limbOpacity: 0.88, text: { left: 534, top: 4,   width: 300, align: 'left'  } },
    { id: 5, phase: 'recentrer', limb: [468,  68, 482,  86, 502, 110, 526, 118], limbOpacity: 0.88, text: { left: 534, top: 106, width: 300, align: 'left'  } },
    { id: 6, phase: 'agir',      limb: [468, 299, 484, 284, 504, 276, 526, 272], limbOpacity: 0.94, text: { left: 534, top: 260, width: 300, align: 'left'  } },
    { id: 7, phase: 'agir',      limb: [468, 299, 484, 310, 504, 322, 526, 326], limbOpacity: 0.94, text: { left: 534, top: 314, width: 300, align: 'left'  } },
  ],
  hinges: [
    { id: 1, text: { left: 262, top: 40,  width: 190, align: 'center' }, mark: { x: 357, y: 20,  r: 5 }, fontSize: 14 },
    { id: 2, text: { left: 566, top: 198, width: 268, align: 'left'   }, mark: { x: 546, y: 208, r: 5 }, fontSize: 14 },
  ],
  conclusion: { left: 226, top: 322, width: 274, fontSize: 14 },
}
