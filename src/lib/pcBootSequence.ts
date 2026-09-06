import type { BuildSlot, Issue } from '@/lib/compat'

export type PcBootDiagnostic =
  | { status: 'incomplete'; issue: null; flaggedSlots: [] }
  | { status: 'passed'; issue: null; flaggedSlots: [] }
  | { status: 'failed'; issue: Issue; flaggedSlots: BuildSlot[] }

/**
 * El resumen general conserva avisos útiles, pero el arranque es más estricto:
 * una fuente por debajo de lo recomendado puede apagarse en un pico y por eso
 * se trata como un fallo de encendido, aunque no sea una incompatibilidad física.
 */
export function diagnosePcBoot(complete: boolean, issues: Issue[]): PcBootDiagnostic {
  if (!complete) return { status: 'incomplete', issue: null, flaggedSlots: [] }

  const issue = issues.find((item) => item.level === 'bloqueo' || item.id === 'psu-under')
  if (!issue) return { status: 'passed', issue: null, flaggedSlots: [] }

  return {
    status: 'failed',
    issue,
    flaggedSlots: [...issue.slots],
  }
}
