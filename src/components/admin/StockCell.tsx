'use client'

import { useState, useTransition } from 'react'
import { setStock } from '@/lib/admin/actions'

/**
 * Ajuste de stock en la propia lista.
 *
 * Guarda al salir del campo o con Enter, no en cada tecla: escribir «12» no
 * puede pasar por un estado intermedio donde el stock quedó en 1 y alguien
 * compró la última unidad.
 *
 * El valor que llega por props manda cuando cambia: si el servidor devolvió
 * otra cifra —porque entró un pedido mientras tanto—, el campo la refleja en
 * vez de quedarse con la que el operador había tecleado.
 */
export function StockCell({ id, units }: { id: string; units: number }) {
  const [value, setValue] = useState(String(units))
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)

  // Ajuste durante el render, no en un efecto: si el servidor devuelve otra
  // cifra, el campo la toma en el mismo paso de render, sin un fotograma
  // intermedio mostrando el número viejo.
  const [seenUnits, setSeenUnits] = useState(units)
  if (seenUnits !== units) {
    setSeenUnits(units)
    setValue(String(units))
  }

  function commit() {
    const next = Math.max(0, Math.floor(Number(value)))
    if (!Number.isFinite(next) || next === units) {
      setValue(String(units))
      return
    }
    start(async () => {
      await setStock(id, next)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1400)
    })
  }

  return (
    <span className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setValue(String(units))
        }}
        aria-label="Unidades en stock"
        className="a-field a-num w-[76px] px-2 py-1"
        style={{ minHeight: '36px' }}
      />
      {saved ? (
        <span className="text-[0.6875rem] text-accent" role="status">
          ✓
        </span>
      ) : null}
    </span>
  )
}
