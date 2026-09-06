import { describe, expect, it } from 'vitest'
import { diagnosePcBoot } from '@/lib/pcBootSequence'
import type { Issue } from '@/lib/compat'

/**
 * La prueba de encendido del configurador. El gesto —pulsar el botón y ver la
 * escena iluminarse— se comprueba a mano; lo que se decide acá es si el equipo
 * arranca, y eso sí conviene fijarlo.
 *
 * La regla que hace distinta esta función del resumen general: una fuente por
 * debajo de lo recomendado es solo un «aviso» en el tablero, pero impide
 * declarar que la máquina enciende. Puede arrancar y apagarse en un pico, y
 * decirle a alguien que su armado enciende cuando puede no hacerlo es peor que
 * no decir nada.
 */

const issue = (id: string, level: Issue['level']): Issue =>
  ({
    id,
    level,
    slots: ['psu'],
    title: { es: id, pt: id },
    detail: { es: id, pt: id },
  }) as Issue

describe('diagnosePcBoot', () => {
  it('no arranca nada con el armado incompleto', () => {
    expect(diagnosePcBoot(false, [])).toEqual({
      status: 'incomplete',
      issue: null,
      flaggedSlots: [],
    })
  })

  it('arranca cuando el armado está completo y limpio', () => {
    expect(diagnosePcBoot(true, [])).toEqual({
      status: 'passed',
      issue: null,
      flaggedSlots: [],
    })
  })

  it('una nota no impide el arranque', () => {
    expect(diagnosePcBoot(true, [issue('nota-cualquiera', 'nota')]).status).toBe('passed')
  })

  it('un aviso corriente tampoco lo impide', () => {
    expect(diagnosePcBoot(true, [issue('aviso-cualquiera', 'aviso')]).status).toBe('passed')
  })

  it('un bloqueo lo impide y señala la ranura culpable', () => {
    const r = diagnosePcBoot(true, [issue('socket-mismatch', 'bloqueo')])
    expect(r.status).toBe('failed')
    expect(r.issue?.id).toBe('socket-mismatch')
    expect(r.flaggedSlots).toEqual(['psu'])
  })

  it('la fuente corta lo impide aunque sea solo un aviso', () => {
    const r = diagnosePcBoot(true, [issue('psu-under', 'aviso')])
    expect(r.status).toBe('failed')
    expect(r.issue?.id).toBe('psu-under')
  })

  it('con varios problemas, manda el primero que corresponde', () => {
    const r = diagnosePcBoot(true, [issue('psu-under', 'aviso'), issue('socket', 'bloqueo')])
    expect(r.status).toBe('failed')
    expect(r.issue?.id).toBe('psu-under')
  })
})
