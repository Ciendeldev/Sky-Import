'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { onFrame, useInView, usePrefersReducedMotion } from '@/lib/motion'
import { useI18n } from '@/lib/i18n/context'
import { GPU_PARTS, type GpuPartId } from '@/lib/rtx5090'

const GpuAssembly = dynamic(() => import('@/components/three/GpuAssembly'), { ssr: false })

/** Scroll nativo: no atrapa rueda ni tacto. El fallback muestra la misma FE. */
export function AssemblyVisual() {
  const { t, locale } = useI18n()
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const meter = useRef<HTMLSpanElement>(null)
  const progress = useRef(0)
  const near = useInView(track, { rootMargin: '480px 0px', once: true })
  const reduced = usePrefersReducedMotion()
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selected,setSelected] = useState<GpuPartId | null>(null)
  const onReady = useCallback(() => setLive(true), [])
  const onLost = useCallback(() => { setLive(false); setFailed(true) }, [])
  const onSelect = useCallback((id: GpuPartId | null) => setSelected(id),[])
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
      <div ref={stage} className="gpu-scroll__stage gpu5090-stage rounded-part border border-rule">
        <div className="absolute inset-0" style={{ opacity: live && animated ? 0 : 1 }} aria-hidden={live && animated}>
          <Image src="/images/rtx5090-assembled.webp" alt={t('assembly.alt')} fill
            sizes="(min-width: 1024px) 62vw, 100vw" className="object-contain p-4" />
        </div>
        {near && animated ? <GpuAssembly progress={progress} selected={selected} onSelect={onSelect}
          onReady={onReady} onLost={onLost} className="absolute inset-0" /> : null}
        <div className="gpu5090-top">
          <span className="u-label">RTX 5090 <span className="opacity-50">/ FE</span></span>
          {live && animated ? (
            <select className="gpu5090-select" aria-label={t('assembly.select')}
              value={selected??''} onChange={e=>onSelect((e.target.value||null) as GpuPartId|null)}>
              <option value="">{t('assembly.all')}</option>
              {GPU_PARTS.map(part=><option key={part.id} value={part.id}>{part[locale]}</option>)}
            </select>
          ) : <span className="u-label">{t('assembly.static')}</span>}
        </div>
        {live && animated ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-5 lg:inset-x-6">
            <p className="u-label mb-3">{t('assembly.hint')}</p>
            <div className="h-px overflow-hidden bg-rule" aria-hidden="true">
              <span ref={meter} className="block h-full origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
            </div>
            <div className="u-label mt-3 flex justify-between gap-2" aria-hidden="true">
              <span>01 / {t('assembly.closed')}</span><span>02 / {t('assembly.open')}</span><span>03 / {t('assembly.closed')}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
