import type { Product } from '@/lib/catalog/types'
import { checkBuild, type Build, type BuildSlot, type Issue } from '@/lib/compat'

export interface BuildCandidateAssessment {
  fit: 'compatible' | 'conflict'
  issues: Issue[]
}

/**
 * Evalúa una sustitución contra las piezas que ya están elegidas. Solo devuelve
 * conflictos relacionados con la ranura abierta: un problema independiente no
 * debe esconder una alternativa que sí encaja en esa posición.
 */
export function assessBuildCandidate(
  build: Build,
  slot: BuildSlot,
  candidate: Product,
): BuildCandidateAssessment {
  const candidateBuild: Build = { ...build, [slot]: candidate }
  const issues = checkBuild(candidateBuild).filter(
    (issue) =>
      issue.slots.includes(slot) && (issue.level === 'bloqueo' || issue.id === 'psu-under'),
  )

  return {
    fit: issues.length === 0 ? 'compatible' : 'conflict',
    issues,
  }
}
