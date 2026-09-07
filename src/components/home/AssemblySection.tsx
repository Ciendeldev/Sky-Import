'use client'

import Link from 'next/link'
import { AssemblyVisual } from '@/components/home/AssemblyVisual'
import { Reveal } from '@/components/ui/Reveal'
import { useI18n } from '@/lib/i18n/context'
import { RTX5090 } from '@/lib/rtx5090'
import { whatsappUrl } from '@/lib/whatsapp'

/** Pieza editorial, no SKU: no atribuirle el precio o stock de otra gráfica. */
export function AssemblySection() {
  const { t, path } = useI18n()
  const specs = [
    [t('assembly.memory'), RTX5090.memory],
    [t('assembly.bus'), RTX5090.bus],
    [t('assembly.cores'), RTX5090.cuda],
    [t('assembly.power'), RTX5090.power],
    [t('assembly.dimensions'), RTX5090.dimensionsMm.join(' × ') + ' mm'],
  ]
  return (
    <section className="u-page border-t border-rule py-24 lg:py-32" aria-labelledby="destacada">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="self-start lg:sticky lg:top-24 lg:col-span-4">
          <Reveal>
            <p className="u-eyebrow">{t('assembly.eyebrow')}</p>
            <h2 id="destacada" className="u-display mt-5 text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1.05]">
              GeForce<br />RTX 5090<span className="text-accent">.</span>
            </h2>
            <p className="u-label mt-4">{RTX5090.edition} / NVIDIA Blackwell</p>
            <p className="u-measure mt-6 text-[0.9375rem] leading-relaxed text-fg-mid">
              {t('assembly.description')}
            </p>
          </Reveal>
          <Reveal delayIndex={1}>
            <dl className="mt-8">
              {specs.map(([name,value])=>(
                <div key={name} className="u-spec">
                  <dt className="font-mono text-[0.625rem] tracking-[0.12em] uppercase text-fg-low">{name}</dt>
                  <dd className="font-mono text-[0.8125rem] tabular-nums text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delayIndex={2}>
            <a href={whatsappUrl(t('assembly.inquiry'))} target="_blank" rel="noopener noreferrer"
              className="u-btn u-btn-solid mt-8 inline-flex">
              {t('assembly.consult')}<span aria-hidden="true">↗</span>
            </a>
            <Link href={path('/catalogo?categoria=tarjetas-graficas')} className="mt-3 flex min-h-11 items-center text-sm text-fg-mid underline underline-offset-4">
              {t('assembly.catalog')}
            </Link>
            <p className="u-label mt-5 leading-relaxed normal-case tracking-normal">{t('assembly.note')}</p>
          </Reveal>
        </div>
        <div className="min-w-0 lg:col-span-8"><AssemblyVisual /></div>
      </div>
    </section>
  )
}
