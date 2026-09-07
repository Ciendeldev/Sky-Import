/**
 * COTAS QUE MIDEN LA PLACA, NO LA CAJA NI LA FOTO
 *
 * Las cotas del primer viewport se dibujaban con `ComponentDims`, un SVG de
 * viewBox fijo que se estira sobre el contenedor entero. Funcionaba cuando
 * dentro había un dibujo vectorial que llenaba el marco de canto a canto: la
 * línea de medida abarcaba el objeto porque el objeto era el marco.
 *
 * Con una fotografía hay DOS desajustes encadenados, y hubo que corregir los
 * dos —el segundo solo se hizo visible una vez arreglado el primero—:
 *
 *   1. La imagen es cuadrada y entra con `object-contain` en un marco de 4:3,
 *      así que ocupa el alto entero y solo tres cuartos del ancho, centrada.
 *      Colgar las cotas del marco las dejaba un tercio más largas que la foto.
 *
 *   2. Y la pieza tampoco llena su propia foto: cada imagen del catálogo trae
 *      su margen transparente. La 5070 Ti ocupa el 75 % central de su cuadrado
 *      —12,5 % de aire a cada lado, medido con `npm run medir`—, así que una
 *      cota ajustada a la foto seguía sobrando exactamente ese tercio. Decía
 *      «304 mm» y señalaba aire.
 *
 * Por eso este componente pide los márgenes de la foto. No los adivina: se
 * miden del canal alfa con el script y se anotan donde se elige la pieza, para
 * que quien la cambie vea que hay un número que va con ella.
 */
export function PhotoDims({
  main,
  notes,
  trimX,
  baseY,
}: {
  /** La medida grande, con su unidad ya escrita: «304 mm». */
  main?: string
  /** Hasta dos apuntes cortos: consumo, bus. */
  notes: string[]
  /** Margen transparente lateral de la foto, en % del lado. `npm run medir`. */
  trimX: number
  /** Margen transparente inferior, en % del lado. De ahí cuelga la medida. */
  baseY: number
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
          className="absolute flex items-center gap-3 font-mono text-[0.8125rem] tracking-[0.08em] text-fg-low"
          // Alineadas con el canto izquierdo de la PIEZA, no con el de la foto.
          style={{ top: `${5 + i * 7}%`, left: `${trimX}%` }}
        >
          <span className="inline-block h-px w-5 bg-current" />
          {note}
        </p>
      ))}

      {/* La medida empieza y termina donde empieza y termina la tarjeta, y se
          apoya un poco por debajo de ella: pegada al canto se lee como parte
          del disipador, y en el fondo del marco se lee como un pie suelto.
          Un tercio del margen inferior es la distancia justa. */}
      {main ? (
        <div
          className="absolute flex items-center gap-3 text-accent"
          style={{
            left: `${trimX}%`,
            right: `${trimX}%`,
            bottom: `${Math.max(2, baseY * 0.34)}%`,
          }}
        >
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
