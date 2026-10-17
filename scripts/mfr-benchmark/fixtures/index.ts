// ============================================================
// BENCHMARK-MFR V1 — Index des 5 fixtures — Phase 1
// ============================================================

import type { FixtureId } from '../types'
import type { FixtureBrute } from './helpers'
import { FIXTURE_RICHE } from './riche'
import { FIXTURE_PAUVRE } from './pauvre'
import { FIXTURE_CONTRADICTOIRE } from './contradictoire'
import { FIXTURE_AMBIGU } from './ambigu'
import { FIXTURE_GROUNDING_CIBLE } from './groundingCible'

export const FIXTURES: Readonly<Record<FixtureId, FixtureBrute>> = {
  RICHE: FIXTURE_RICHE,
  PAUVRE: FIXTURE_PAUVRE,
  CONTRADICTOIRE: FIXTURE_CONTRADICTOIRE,
  AMBIGU: FIXTURE_AMBIGU,
  GROUNDING_CIBLE: FIXTURE_GROUNDING_CIBLE,
}

export type { FixtureBrute } from './helpers'
