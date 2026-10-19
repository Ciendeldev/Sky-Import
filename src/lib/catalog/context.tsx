'use client'

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useCart } from '@/lib/cart'
import { buildCatalog, registerCatalog, type Catalog, type CatalogSnapshot } from './live'

/**
 * EL CATÁLOGO, REPARTIDO
 *
 * El layout lee la foto en el servidor y la baja como dato. Todo componente
 * que pinte un precio, un stock o una tasa la lee de este contexto: ninguno
 * vuelve a importar `products.ts` ni `FX`, que eran justamente las copias que
 * se desalineaban con el panel.
 *
 * Como la foto viaja dentro del HTML, el servidor y el primer render del
 * navegador ven los mismos números y la hidratación no tiene nada que
 * corregir.
 */

const CatalogContext = createContext<Catalog | null>(null)

export function CatalogProvider({
  snapshot,
  children,
}: {
  snapshot: CatalogSnapshot
  children: ReactNode
}) {
  const catalog = useMemo(() => buildCatalog(snapshot), [snapshot])

  useEffect(() => {
    registerCatalog(catalog)
    // El carrito se rehidrata al cargar el módulo, antes de que exista esta
    // foto, así que su saneo por stock se hace recién ahora.
    useCart.getState().reconcile()
  }, [catalog])

  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
}

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error('useCatalog se usó fuera de <CatalogProvider>.')
  return catalog
}
