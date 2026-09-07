'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductPhoto } from '@/components/product/ProductPhoto'
import { onFrame, useInView, usePrefersReducedMotion } from '@/lib/motion'
import { useI18n } from '@/lib/i18n/context'
import type { Product } from '@/lib/catalog/types'

const GpuAssembly = dynamic(() => import('@/components/three/GpuAssembly'), { ssr: false })

/**
 * Un tramo propio de scroll mantiene la pieza a la vista durante el despiece.
 * La posición absoluta del recorrido permite invertirlo y saltar a cualquier
 * punto sin depender de eventos anteriores ni secuestrar la rueda o el tacto.
 */
export function AssemblyVisual({ product }: { product: Product }) {
  const { t } = useI18n()
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const meter = useRef<HTMLSpanElement>(null)
  const progress = useRef(0)
  const near = useInView(track, { rootMargin: '480px 0px', once: true })
  const reduced = usePrefersReducedMotion()
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const onReady = useCallback(() => setLive(true), [])
  const onLost = useCallback(() => { setLive(false); setFailed(true) }, [])
  const animated = !reduced && !failed

  useEffect(() => {
    if (!animated) return
    return onFrame(() => {
      if (!track.current || !stage.current) return
      const rect = track.current.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const top = parseFloat(getComputedStyle(stage.current).top) || 0
      const travel = rect.height - stage.current.offsetHeight
      progress.current = Math.min(1, Math.max(0, (top - rect.top) / Math.max(1, travel)))
      if (meter.current) meter.current.style.transform = `scaleX(${progress.current})`
    })
  }, [animated])

  return (
    <div ref={track} className="gpu-scroll" data-testid="gpu-scroll" data-static={!animated}>
      <div ref={stage} className="gpu-scroll__stage u-plate rounded-part border border-rule bg-surface-sunk">
        <div className="absolute inset-0" style={{ opacity: live && animated ? 0 : 1 }} aria-hidden={live && animated}>
          <ProductPhoto product={product} sizes="(min-width: 1024px) 62vw, 100vw"
            className="absolute inset-0" imageClassName="h-full w-full object-contain p-8 lg:p-12" />
        </div>
        {near && animated ? <GpuAssembly progress={progress} onReady={onReady} onLost={onLost} className="absolute inset-0" /> : null}
        {live && animated ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4">
            <p className="u-label mb-3">{t('assembly.hint')}</p>
            <div className="h-px overflow-hidden bg-rule" aria-hidden="true">
              <span ref={meter} className="block h-full origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
            </div>
            <div className="u-label mt-3 flex justify-between gap-2" aria-hidden="true">
              <span>{t('assembly.closed')}</span><span>{t('assembly.open')}</span><span>{t('assembly.closed')}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
