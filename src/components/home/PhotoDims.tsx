/**
 * COTAS QUE MIDEN LA PLACA, NO LA CAJA
 *
 * Las cotas del primer viewport se dibujaban con `ComponentDims`, un SVG de
 * viewBox fijo que se estira sobre el contenedor entero. Eso funcionaba
 * cuando dentro había un dibujo vectorial que llenaba el marco de canto a
 * canto: la línea de medida abarcaba el objeto porque el objeto era el marco.
 *
 * Con una fotografía dejó de ser cierto. La imagen es CUADRADA y entra con
 * `object-contain` en un marco de 4:3, así que ocupa el alto entero y solo
 * tres cuartos del ancho, centrada. Las cotas seguían pegadas a los bordes
 * del marco: el «304 mm» medía un tramo un tercio más largo que la placa, y
 * las etiquetas de vatios y bus flotaban en el vacío de la izquierda, lejos
 * de la pieza que decían describir. Una cota que no coincide con lo que mide
 * es peor que no poner cota: dice un número y señala otra cosa.
 *
 * Acá las cotas se cuelgan del CUADRADO que de verdad ocupa la foto y no del
 * marco. En la portada la imagen no lleva relleno: entra con `object-contain`
 * ocupando el alto ENTERO, así que su cuadrado mide exactamente el alto del
 * marco y va centrado. (Un primer intento le descontó un relleno que no
 * existe; el cuadrado salía más chico y la línea de medida quedaba trepada
 * sobre la placa en vez de por debajo.)
 *
 * Es HTML y no SVG a propósito: así el cuadrado se calcula con
 * `aspect-square` y sigue a la imagen sola, sin que nadie tenga que mantener
 * dos geometrías en paralelo.
 */
export function PhotoDims({
  main,
  notes,
}: {
  /** La medida grande, con su unidad ya escrita: «304 mm». */
  main?: string
  /** Hasta dos apuntes cortos: consumo, bus. */
  notes: string[]
}) {
  return (
    <div
      // La foto ocupa el alto entero del marco; `aspect-square` le da el ancho
      // exacto de ese cuadrado, y `left-1/2` lo centra igual que el navegador
      // centra una imagen con `object-contain`.
      className="pointer-events-none absolute inset-y-0 left-1/2 aspect-square -translate-x-1/2"
      aria-hidden="true"
    >
      {notes.slice(0, 2).map((note, i) => (
        <p
          key={note}
          className="absolute left-0 flex items-center gap-3 font-mono text-[0.8125rem] tracking-[0.08em] text-fg-low"
          style={{ top: `${5 + i * 7}%` }}
        >
          <span className="inline-block h-px w-5 bg-current" />
          {note}
        </p>
      ))}

      {/* La medida va bien abajo, no pegada a la placa: la tarjeta no llena su
          cuadrado —la foto trae margen transparente arriba y abajo— así que una
          medida a media altura se le monta encima. Al 2 % del borde queda holgada. */}
      {main ? (
        <div className="absolute inset-x-0 bottom-[2%] flex items-center gap-3 text-accent">
          <span className="h-2.5 w-px bg-current" />
          <span className="h-px flex-1 bg-current" />
          <span className="font-mono text-[0.8125rem] tracking-[0.1em] tabular-nums">{main}</span>
          <span className="h-px flex-1 bg-current" />
          <span className="h-2.5 w-px bg-current" />
        </div>
      ) : null}
    </div>
  )
}
