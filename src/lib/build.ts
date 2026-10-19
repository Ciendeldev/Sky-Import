'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { currentCatalog, type Catalog } from '@/lib/catalog/live'
import { BUILD_SLOTS, type Build, type BuildSlot } from '@/lib/compat'

interface BuildState {
  /** Guarda slugs, no productos: el catálogo puede cambiar entre visitas. */
  picks: Partial<Record<BuildSlot, string>>
  hydrated: boolean
  pick: (slot: BuildSlot, slug: string) => void
  unpick: (slot: BuildSlot) => void
  reset: () => void
  markHydrated: () => void
}

export const useBuild = create<BuildState>()(
  persist(
    (set, get) => ({
      picks: {},
      hydrated: false,
      pick: (slot, slug) => set({ picks: { ...get().picks, [slot]: slug } }),
      unpick: (slot) => {
        const next = { ...get().picks }
        delete next[slot]
        set({ picks: next })
      },
      reset: () => set({ picks: {} }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'sky-import:build:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ picks: state.picks }),
      merge: (persisted, current) => {
        const raw = (persisted as { picks?: unknown } | undefined)?.picks
        const picks: Partial<Record<BuildSlot, string>> = {}
        // El almacén se rehidrata al cargar el módulo, antes de que la página
        // traiga el catálogo vigente. Sin catálogo se conserva todo lo que tenga
        // forma de slug: `resolveBuild` ya ignora las piezas que no existen.
        const catalog = currentCatalog()
        if (raw && typeof raw === 'object') {
          for (const slot of BUILD_SLOTS) {
            const value = (raw as Record<string, unknown>)[slot]
            // Saneo: una pieza que ya no existe en el catálogo se descarta.
            if (typeof value === 'string' && (!catalog || catalog.bySlug.has(value))) {
              picks[slot] = value
            }
          }
        }
        return { ...current, picks }
      },
      onRehydrateStorage: () => (state) => {
        state?.markHydrated()
      },
    },
  ),
)

export function resolveBuild(
  picks: Partial<Record<BuildSlot, string>>,
  catalog: Pick<Catalog, 'bySlug'>,
): Build {
  const build: Build = {}
  for (const slot of BUILD_SLOTS) {
    const slug = picks[slot]
    if (!slug) continue
    const product = catalog.bySlug.get(slug)
    if (product) build[slot] = product
  }
  return build
}
