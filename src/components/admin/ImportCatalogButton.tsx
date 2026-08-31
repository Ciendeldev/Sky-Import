'use client'

import { useState, useTransition } from 'react'
import { importStaticCatalog, type ActionResult } from '@/lib/admin/actions'

/**
 * Vuelca el catálogo tipado del proyecto en la base. Se usa una vez, al montar
 * la tienda; después el catálogo vive en la base y se edita desde el panel.
 *
 * Por defecto NO pisa el stock ya cargado: si el operador contó unidades a
 * mano, una reimportación no se las lleva por delante.
 */
export function ImportCatalogButton() {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  const [overwrite, setOverwrite] = useState(false)

  return (
    <div>
      <button
        type="button"
        className="a-btn a-btn--solid"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult(await importStaticCatalog(overwrite))
          })
        }
      >
        {pending ? 'Importando…' : 'Importar el catálogo del proyecto'}
      </button>

      <label className="mt-3 flex items-center gap-2 text-[0.8125rem] text-fg-mid">
        <input
          type="checkbox"
          checked={overwrite}
          onChange={(e) => setOverwrite(e.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        Reemplazar también las unidades en stock
      </label>

      {result ? (
        <p className={`a-note mt-4 ${result.ok ? 'a-note--ok' : 'a-note--error'}`} role="status">
          {result.ok ? result.message : result.error}
        </p>
      ) : null}
    </div>
  )
}
