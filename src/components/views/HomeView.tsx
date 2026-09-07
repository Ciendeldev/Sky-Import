'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRef } from 'react'

import { FieldPatch } from '@/components/background/FieldPatch'
import { ComponentDims } from '@/components/render/ComponentRender'
import { ProductPhoto } from '@/components/product/ProductPhoto'
import { ProductCard } from '@/components/catalog/ProductCard'
import { AssemblySection } from '@/components/home/AssemblySection'
import { Trace } from '@/components/motif/Trace'
import { Counter, Magnetic, Parallax, Reveal, SplitWords } from '@/components/motion/Motion'
import { EdgeGlow } from '@/components/motion/EdgeGlow'
import { Cell, CellGrid } from '@/components/motion/Cell'
import { CtaBody } from '@/components/ui/Cta'
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/catalog/categories'
import { PRODUCTS } from '@/lib/catalog/products'
import { GUIDES } from '@/content/guides'
import { useI18n } from '@/lib/i18n/context'
import { useParallax } from '@/lib/motion'
import { CONTACT, hasWhatsapp, whatsappLink } from '@/config/site'
import { CURRENCIES } from '@/lib/money'

/** Los hilos del primer viewport: pesados, así que solo en el cliente y diferidos. */
const Threads = dynamic(() => import('@/components/background/Threads'), { ssr: false })

const FEATURED = PRODUCTS.filter((product) => product.featured).slice(0, 6)
const COUNT_BY_CATEGORY = new Map<string, number>()
for (const product of PRODUCTS) {
  COUNT_BY_CATEGORY.set(product.category, (COUNT_BY_CATEGORY.get(product.category) ?? 0) + 1)
}
/**
 * La pieza que abre la tienda.
 *
 * Era la 5080 Founders Edition: dos ventiladores, carcasa plana y una toma
 * casi de frente. Técnicamente es la más potente del catálogo, pero en la
 * portada se leía apagada — parecía un lingote, no una placa de video.
 *
 * La 5070 Ti es una MSI Ventus 3X: tres ventiladores grandes, fotografiada a
 * tres cuartos, con las aspas y el disipador a la vista. Es lo que alguien
 * reconoce como «placa de video» a dos metros de la pantalla, que es lo único
 * que se le pide a la imagen que abre una tienda. Sigue siendo generación
 * actual y sigue siendo NVIDIA; las cotas que la rodean salen del catálogo,
 * así que se actualizan solas.
 */
const HERO_GPU = PRODUCTS.find((product) => product.slug === 'geforce-rtx-5070-ti-16gb') ?? PRODUCTS[0]!

/**
 * Cada categoría se representa con la fotografía de una pieza real suya, no con
 * un icono. Un dibujo genérico de «gabinete» no dice nada que la foto de un
 * gabinete concreto no diga mejor.
 */
const CATEGORY_PRODUCT = new Map(
  CATEGORY_ORDER.map((category) => [
    category,
    PRODUCTS.find((product) => product.category === category) ?? PRODUCTS[0]!,
  ]),
)

/** Celdas que ocupan más de una posición: rompen la monotonía de la retícula. */
const WIDE = new Set(['tarjetas-graficas', 'gabinetes'])

export function HomeView() {
  const { t, locale, path } = useI18n()
  const heroArt = useRef<HTMLDivElement>(null)
  useParallax(heroArt, { distance: 34 })

  return (
    <>
      {/* ─────────────────────────────────────────────────────────── HERO ── */}
      {/* El relleno superior cede cuando la pantalla es baja, y NADA MÁS.
          Con 144 px fijos, en un monitor de 1080 al que la barra de tareas y
          la del navegador le quitan lo suyo, «Ver catálogo» y «Arma tu PC»
          quedaban aplastados contra el borde de abajo. `clamp` deja el valor
          de siempre en pantallas altas y solo lo recorta cuando hace falta. */}
      <section
        className="u-plate relative overflow-hidden pt-28 lg:pt-[clamp(4.5rem,11vh,9rem)]"
        aria-labelledby="titular"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.55]" aria-hidden="true">
          <Threads className="h-full w-full" amplitude={1.15} distance={0.34} />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-surface to-transparent"
          aria-hidden="true"
        />

        <div className="u-page relative grid items-center gap-10 pb-14 lg:grid-cols-12 lg:gap-8 lg:pb-20">
          <div className="lg:col-span-6 xl:col-span-5">
            <Reveal from="left" distance={16}>
              <p className="u-eyebrow">{t('home.hero.eyebrow')}</p>
            </Reveal>

            {/* El titular no se queda quieto: una luz lo recorre cada siete
                segundos, línea tras línea, con un reposo largo entre pasadas
                para que nunca compita con la lectura. */}
            <h1 id="titular" className="u-display mt-6 text-[clamp(2.6rem,7vw,5.5rem)]">
              <SplitWords
                as="span"
                start="now"
                delay={560}
                step={64}
                alive
                aliveDelay={0}
                text={t('home.hero.title1')}
                className="block"
              />
              <SplitWords
                as="span"
                start="now"
                delay={680}
                step={64}
                alive
                aliveDelay={480}
                text={t('home.hero.title2')}
                className="block"
              />
              <SplitWords
                as="span"
                start="now"
                delay={800}
                step={64}
                alive
                aliveDelay={980}
                text={t('home.hero.title3')}
                className="block text-fg-mid"
              />
            </h1>

            <Reveal delayIndex={4}>
              <p className="u-measure mt-7 text-[1.0625rem] leading-relaxed text-fg-mid">
                {t('home.hero.lede')}
              </p>

              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                {/* La acción principal de toda la tienda. No es un botón: es una
                    pieza conectada. Corriente dando la vuelta al perímetro sin
                    parar, halo que se enciende por el lado del que viene el
                    puntero, relleno que entra barriendo, escuadras que encuadran
                    y un rótulo que respira con la flecha insistiendo. */}
                <Magnetic strength={0.16}>
                  <EdgeGlow>
                    <Link href={path('/catalogo')} className="u-cta" data-lead>
                      <CtaBody>
                        <span className="u-invite">{t('cta.catalog')}</span>
                        <span className="u-nudge" aria-hidden="true">
                          →
                        </span>
                      </CtaBody>
                    </Link>
                  </EdgeGlow>
                </Magnetic>

                <Magnetic strength={0.22}>
                  <Link href={path('/armar')} className="u-btn u-btn-line">
                    {t('cta.build')}
                  </Link>
                </Magnetic>
              </div>
            </Reveal>
          </div>

          {/* La pieza desborda el margen: no está encajonada. La foto es lo
              primero que se ve de la tienda, así que carga con prioridad y sus
              cotas se superponen encima en vez de sustituirla. */}
          <div className="relative lg:col-span-6 xl:col-span-7 lg:-mr-[6vw]">
            <div ref={heroArt} className="u-hero-art relative aspect-[4/3] rounded-part">
              {/* El halo respira detrás de la placa. No es un fondo: es la luz
                  que insinúa que la pieza está encendida. Va detrás de la foto
                  y no la toca. */}
              <span className="u-hero-art__halo" aria-hidden="true" />
              <ProductPhoto
                product={HERO_GPU}
                priority
                sizes="(min-width: 1280px) 58vw, (min-width: 1024px) 50vw, 92vw"
              />
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <ComponentDims
                  dims={[
                    HERO_GPU.compat.kind === 'gpu' ? `${HERO_GPU.compat.lengthMm} mm` : '',
                    HERO_GPU.compat.kind === 'gpu' ? `${HERO_GPU.compat.tgpW} W` : '',
                    HERO_GPU.compat.kind === 'gpu' ? HERO_GPU.compat.bus : '',
                  ].filter(Boolean)}
                  className="h-full w-full"
                />
              </div>
              <span className="u-sweep" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* El manifiesto empieza antes del scroll, con las cifras subiendo. */}
        <div className="u-rule" />
        <dl className="u-page relative grid grid-cols-2 gap-x-6 py-6 sm:grid-cols-4">
          {[
            { label: t('home.manifest.pieces'), value: PRODUCTS.length },
            { label: t('home.manifest.categories'), value: CATEGORY_ORDER.length },
            { label: t('home.manifest.currencies'), text: CURRENCIES.join(' · ') },
            { label: t('home.manifest.check'), text: t('home.manifest.checkValue') },
          ].map((item, i) => (
            <Reveal key={item.label} delayIndex={i} className="py-2">
              <dt className="u-label">{item.label}</dt>
              <dd className="mt-1.5 font-mono text-[0.9375rem] tabular-nums text-fg">
                {item.value !== undefined ? <Counter value={item.value} /> : item.text}
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ────────────────────────────────────────────────────── CATEGORÍAS ── */}
      <section className="u-page border-t border-rule py-24 lg:py-32" aria-labelledby="categorias">
        <div className="max-w-[62ch]">
          <Reveal>
            <p className="u-eyebrow">{t('home.categories.eyebrow')}</p>
          </Reveal>
          <SplitWords
            as="h2"
            text={t('home.categories.title')}
            className="u-display mt-5 text-[clamp(1.9rem,4vw,3rem)]"
          />
          <Reveal delayIndex={2}>
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-fg-mid">
              {t('home.categories.lede')}
            </p>
          </Reveal>
        </div>

        {/* Retícula de celdas: cada una reacciona por proximidad, no por hover. */}
        <CellGrid className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_ORDER.map((slug, i) => {
            const meta = CATEGORY_META[slug]
            const representante = CATEGORY_PRODUCT.get(slug)!
            const wide = WIDE.has(slug)
            return (
              <Reveal
                key={slug}
                delayIndex={i}
                from="scale"
                className={wide ? 'sm:col-span-2' : undefined}
              >
                <Cell
                  as="a"
                  href={`${path('/catalogo')}?categoria=${slug}`}
                  className="group flex h-full min-h-[184px] flex-col justify-between p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[0.6875rem] tabular-nums text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="relative block aspect-square w-24 shrink-0 opacity-85 transition-all duration-500 ease-rail group-hover:-translate-y-1 group-hover:opacity-100">
                      <ProductPhoto product={representante} sizes="96px" />
                    </span>
                  </div>

                  {/* Jerarquía explícita: el nombre manda, la función explica y
                      el recuento es un dato técnico. Todo por encima del umbral
                      de contraste incluso con la celda encendida del todo. */}
                  <div>
                    <p className="u-display-sm text-[1.1875rem] leading-tight text-fg">
                      {meta.name[locale]}
                    </p>
                    <p className="mt-2 text-[0.8125rem] leading-snug text-fg-mid">
                      {meta.role[locale]}
                    </p>
                    <p className="mt-4 flex items-center gap-2 border-t border-rule pt-3 font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-mid">
                      <span className="tabular-nums text-fg">
                        {COUNT_BY_CATEGORY.get(slug) ?? 0}
                      </span>
                      {t('home.categories.count')}
                      <span
                        className="ml-auto inline-block text-accent transition-transform duration-300 ease-rail group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </p>
                  </div>

                  {/* Lectura de proximidad al pie de la celda. */}
                  <span className="u-cell__rail" aria-hidden="true" />
                </Cell>
              </Reveal>
            )
          })}
        </CellGrid>
      </section>

      {/* ────────────────────────────────────────────────────── DESTACADOS ──
          Uno de los DOS tramos con campo de vías en toda la tienda. Aquí sí:
          las piezas se apoyan sobre la placa, que es la idea de la casa, y el
          fondo estaba plano. */}
      <section
        className="relative border-t border-rule py-24 lg:py-32"
        aria-labelledby="destacados"
      >
        <FieldPatch spacing={30} intensity={0.72} />
        <div className="u-page relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <p className="u-eyebrow">{t('home.featured.eyebrow')}</p>
            </Reveal>
            <SplitWords
              as="h2"
              text={t('home.featured.title')}
              className="u-display mt-5 text-[clamp(1.9rem,4vw,3rem)]"
            />
          </div>
          <Reveal delayIndex={1}>
            <Link
              href={path('/catalogo')}
              className="u-link u-tap font-mono text-[0.6875rem] tracking-[0.14em] uppercase text-fg-mid"
            >
              {t('cta.viewAll')}
            </Link>
          </Reveal>
        </div>

        <Reveal delayIndex={2}>
          <p className="u-measure mt-5 text-[0.9375rem] leading-relaxed text-fg-mid">
            {t('home.featured.lede')}
          </p>
        </Reveal>

          <div className="mt-12 grid gap-x-6 gap-y-12 border-b border-rule pb-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((product, i) => (
              <Reveal key={product.slug} delayIndex={i}>
                <ProductCard product={product} index={i} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────── ENSAMBLAJE ── */}
      <AssemblySection />

      {/* ══ SEGUNDA SUPERFICIE ══ el configurador y las guías van sobre aluminio.
          El configurador es el OTRO tramo con campo: el fondo claro liso lo
          pedía, y el trazado que ya tiene encima se lee como la misma placa. */}
      <div data-surface="aluminio" className="bg-surface text-fg">
        <section className="relative overflow-hidden" aria-labelledby="configurador">
          <FieldPatch spacing={30} intensity={0.62} />
          <div className="pointer-events-none absolute inset-0 text-steel opacity-30">
            <Trace width={1400} height={520} lines={9} seed={73} className="h-full w-full" />
          </div>

          <div className="u-page relative py-24 lg:py-32">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Reveal>
                  <p className="u-eyebrow">{t('home.builder.eyebrow')}</p>
                </Reveal>
                <SplitWords
                  as="h2"
                  text={t('home.builder.title')}
                  className="u-display mt-5 text-[clamp(2rem,4.5vw,3.5rem)]"
                />
                <Reveal delayIndex={2}>
                  <p className="u-measure mt-6 text-[1.0625rem] leading-relaxed text-fg-mid">
                    {t('home.builder.lede')}
                  </p>
                  <Magnetic strength={0.24}>
                    <Link href={path('/armar')} className="u-btn u-btn-solid mt-9">
                      {t('home.builder.cta')}
                      <span className="u-nudge" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </Magnetic>
                </Reveal>
              </div>

              <div className="lg:col-span-5">
                <ul className="border-t border-rule">
                  {(
                    [
                      ['cpu', 'motherboard'],
                      ['ram', 'motherboard'],
                      ['gpu', 'psu'],
                      ['gpu', 'case'],
                    ] as const
                  ).map(([a, b], i) => (
                    <Reveal
                      as="li"
                      key={`${a}-${b}`}
                      delayIndex={i}
                      from="right"
                      className="flex items-center gap-3 border-b border-rule py-4"
                    >
                      <span className="font-mono text-[0.625rem] tabular-nums text-accent">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[0.75rem] text-fg">{t(`build.slot.${a}`)}</span>
                      <span className="h-px flex-1 bg-rule" aria-hidden="true" />
                      <span className="font-mono text-[0.75rem] text-fg">{t(`build.slot.${b}`)}</span>
                    </Reveal>
                  ))}
                </ul>
                <p className="u-label mt-4 leading-relaxed normal-case tracking-normal">
                  {t('build.disclaimer')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Las guías NO llevan campo: son texto para leer y ya están sobre la
            misma superficie de aluminio que el configurador, que sí lo lleva.
            Dos tramos seguidos con el mismo fondo animado es justo lo que
            convertía el efecto en ruido. */}
        <section className="border-t border-rule py-24 lg:py-32" aria-labelledby="guias">
          <div className="u-page">
            <Reveal>
              <p className="u-eyebrow">{t('home.guides.eyebrow')}</p>
            </Reveal>
            <SplitWords
              as="h2"
              text={t('home.guides.title')}
              className="u-display mt-5 text-[clamp(1.9rem,4vw,3rem)]"
            />
            <Reveal delayIndex={2}>
              <p className="u-measure mt-5 text-[0.9375rem] leading-relaxed text-fg-mid">
                {t('home.guides.lede')}
              </p>
            </Reveal>

            <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {GUIDES.map((guide, i) => (
                <Reveal
                  as="li"
                  key={guide.slug}
                  delayIndex={i}
                  className="border-t border-rule pt-6"
                >
                  <Link href={path(`/guias/${guide.slug}`)} className="group block">
                    <span className="font-mono text-[0.6875rem] tabular-nums text-accent">
                      {guide.index}
                    </span>
                    <h3 className="u-display-sm mt-3 text-[1.375rem]">
                      <span className="relative inline">
                        {guide.title[locale]}
                        <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-[320ms] ease-rail group-hover:scale-x-100" />
                      </span>
                    </h3>
                    <p className="u-measure mt-3 text-[0.9375rem] leading-relaxed text-fg-mid">
                      {guide.standfirst[locale]}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ─────────────────────────────────────────────────────── BENEFICIOS ── */}
      <section className="u-page border-t border-rule py-24 lg:py-32" aria-labelledby="beneficios">
        <Reveal>
          <p className="u-eyebrow">{t('home.benefits.eyebrow')}</p>
        </Reveal>
        <SplitWords
          as="h2"
          text={t('home.benefits.title')}
          className="u-display mt-5 text-[clamp(1.9rem,4vw,3rem)]"
        />

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n, i) => (
            <Reveal key={n} delayIndex={i} className="group border-t border-rule pt-5">
              <span className="font-mono text-[0.6875rem] tabular-nums text-accent">
                {String(n).padStart(2, '0')}
              </span>
              <span className="mt-3 block h-px w-8 origin-left scale-x-100 bg-accent transition-transform duration-500 ease-rail group-hover:scale-x-[3]" />
              <h3 className="mt-3 text-[1.0625rem] font-medium leading-snug text-fg">
                {t(`home.benefit${n}.title` as 'home.benefit1.title')}
              </h3>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-fg-mid">
                {t(`home.benefit${n}.body` as 'home.benefit1.body')}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────── CÓMO COMPRAR ──
          Toda tienda que cierra por mensajería explica esto en la portada, y
          por buenos motivos: quien entra por primera vez no sabe si acá se
          paga con tarjeta, si hay carrito de verdad o si le van a pedir datos
          que no quiere dar. Tres pasos y se acabó la duda. */}
      <section className="u-page border-t border-rule py-20 lg:py-24" aria-label={t('home.how.title')}>
        <Reveal>
          <p className="u-eyebrow">{t('home.how.eyebrow')}</p>
        </Reveal>
        <SplitWords
          as="h2"
          className="u-display mt-5 max-w-[16ch] text-[clamp(1.9rem,4vw,3rem)]"
          text={t('home.how.title')}
        />

        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-3">
          {[1, 2, 3].map((n, i) => (
            <Reveal key={n} as="li" delayIndex={i} className="group border-t border-rule pt-5">
              <span className="font-mono text-[0.6875rem] tabular-nums text-accent">
                {String(n).padStart(2, '0')}
              </span>
              <span className="mt-3 block h-px w-8 origin-left bg-accent transition-transform duration-500 ease-rail group-hover:scale-x-[3]" />
              <h3 className="mt-3 text-[1.0625rem] font-medium leading-snug text-fg">
                {t(`home.how${n}.title` as 'home.how1.title')}
              </h3>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-fg-mid">
                {t(`home.how${n}.body` as 'home.how1.body')}
              </p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ────────────────────────────────────────────────────────── CIERRE ── */}
      {hasWhatsapp ? (
        <section className="relative overflow-hidden border-t border-rule">
          <Parallax distance={22} className="pointer-events-none absolute inset-0 text-steel opacity-20">
            <Trace width={1400} height={260} lines={4} seed={7} className="h-full w-full" />
          </Parallax>
          <div className="u-page relative flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between">
            <Reveal>
              <p className="u-eyebrow">{t('footer.contact')}</p>
              <p className="u-display-sm mt-4 text-[clamp(1.375rem,3vw,2rem)] tabular-nums">
                {CONTACT.whatsappDisplay}
              </p>
            </Reveal>
            <Reveal delayIndex={1}>
              <Magnetic strength={0.26}>
                <a
                  href={whatsappLink(t('wa.generic'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="u-btn u-btn-solid"
                >
                  {t('cta.whatsapp')}
                </a>
              </Magnetic>
            </Reveal>
          </div>
        </section>
      ) : null}
    </>
  )
}
