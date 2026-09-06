import { BUILD_SLOTS, type BuildSlot } from '@/lib/compat'

export type PcScenePartId =
  | 'case'
  | 'motherboard'
  | 'cpu'
  | 'ram-left'
  | 'ram-right'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'cooling'
  | 'cooling-fans'
  | 'motherboard-power'
  | 'gpu-power'

const PARTS_BY_SLOT: Record<BuildSlot, PcScenePartId[]> = {
  case: ['case'],
  motherboard: ['motherboard'],
  cpu: ['cpu'],
  ram: ['ram-left', 'ram-right'],
  storage: ['storage'],
  psu: ['psu'],
  cooling: ['cooling', 'cooling-fans'],
  gpu: ['gpu'],
}

const SCENE_SLOT_ORDER: BuildSlot[] = [
  'case',
  'motherboard',
  'cpu',
  'ram',
  'storage',
  'psu',
  'cooling',
  'gpu',
]

export interface PcAssemblyPlan {
  selectedCount: number
  totalSlots: number
  progress: number
  complete: boolean
  nextSlot: BuildSlot | null
  visibleParts: PcScenePartId[]
}

export function scenePartsForSlots(slots: readonly BuildSlot[]): PcScenePartId[] {
  return slots.flatMap((slot) => PARTS_BY_SLOT[slot])
}

export function getPcAssemblyPlan(picks: Partial<Record<BuildSlot, unknown>>): PcAssemblyPlan {
  const selectedSlots = BUILD_SLOTS.filter((slot) => Boolean(picks[slot]))
  const visibleParts = SCENE_SLOT_ORDER.filter((slot) => Boolean(picks[slot])).flatMap(
    (slot) => PARTS_BY_SLOT[slot],
  )

  if (picks.psu && picks.motherboard) visibleParts.push('motherboard-power')
  if (picks.psu && picks.gpu) visibleParts.push('gpu-power')

  const selectedCount = selectedSlots.length
  const complete = selectedCount === BUILD_SLOTS.length

  return {
    selectedCount,
    totalSlots: BUILD_SLOTS.length,
    progress: selectedCount / BUILD_SLOTS.length,
    complete,
    nextSlot: BUILD_SLOTS.find((slot) => !picks[slot]) ?? null,
    visibleParts,
  }
}
