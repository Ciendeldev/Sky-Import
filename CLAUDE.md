# Sky Import

Tienda de componentes para PC de Ciudad del Este, Paraguay. Catálogo tipado,
configurador de compatibilidad, carrito persistente y **cierre de venta por
WhatsApp**, con panel de administración sobre Supabase.

## Stack

- Next.js 16.3.4 (App Router) · React 19.2.8 · TypeScript 5.9.3 en `strict`
  con `noUncheckedIndexedAccess`
- Tailwind CSS 4.3.3, tokens en `@theme` dentro de `src/app/globals.css`
- Zustand 5 para carrito y armado · three.js y ogl para las piezas visuales
- Supabase (Postgres + Auth + RLS) para catálogo, cupones y pedidos
- Vitest · Playwright · axe-core
- **npm**, con `package-lock.json`. Node fijado en `.nvmrc` (24.19.0)

## Comandos

- `npm run dev` — servidor de desarrollo
- `npm run typecheck` — **debe pasar antes de cualquier commit**
- `npm run lint` · `npm test`
- `npm run build` · `npm run e2e` · `npm run a11y`
- `npm run verify` — lint + tipos + unitarias + build, en ese orden

## Reglas duras

1. **Nunca declares una tarea completa sin ejecutar typecheck + lint + test y
   LEER la salida.** El código de salida no es prueba de nada por sí solo.
2. **Consultá `LIBRERIAS.md` antes de escribir cualquier componente de interfaz,
   animación o efecto visual.** La regla completa está más abajo.
3. **Un solo motor de animación: el propio, en `src/lib/motion.ts`.** Un
   `requestAnimationFrame` compartido por toda la tienda. No introduzcas GSAP ni
   Motion; ver el motivo en `LIBRERIAS.md`.
4. **El USD es la fuente de verdad de todo precio.** Guaraní y real se derivan de
   `settings.fx` y se redondean de vitrina. Nunca escribas un precio en guaraníes
   en los datos.
5. **La disponibilidad se deriva de `units`.** No existe ningún campo «agotado»
   que pueda contradecirla.
6. **Todo texto que ve el cliente existe en los dos idiomas.** El diccionario en
   portugués está tipado como `Record<DictKey, string>`: si falta una clave,
   falla `tsc`. No lo silencies.
7. **Nada de `Intl` para dinero ni fechas en render.** Produce cadenas distintas
   en servidor y navegador y rompe la hidratación. Hay una regla de ESLint que lo
   impide; el formateo está en `src/lib/money.ts`.
8. **`SUPABASE_SERVICE_ROLE_KEY` jamás sale del servidor.** Salta todas las
   políticas RLS. `src/lib/supabase/server.ts` lleva `import 'server-only'` para
   que la compilación falle si alguien lo importa desde un componente de cliente.
9. **Ninguna contraseña en el repositorio**, ni en claro ni hasheada. Las cuentas
   se crean con `scripts/crear-admin.mjs` leyendo `.env.local`.
10. **Las migraciones y `src/lib/supabase/types.ts` cambian en el mismo commit.**
    Ese archivo es el espejo tipado del esquema.
11. No añadas dependencias sin justificarlo contra el presupuesto de
    `size-limit`.
12. Las decisiones estructurales van a `docs/adr/`.

## Convenciones

- **Comentarios en español**, y solo donde explican *por qué*, no *qué*. El
  proyecto tiene un estilo de comentario denso y razonado: seguilo.
- Los archivos de dominio viven en `src/lib/`; los de presentación en
  `src/components/<área>/`.
- El panel de administración vive en `src/app/admin/`, **fuera** de `[locale]`:
  es un segundo layout raíz, sin i18n, sin intro y sin motor 3D.
- Cifras comparables siempre en monoespaciada tabular.
- Objetivo táctil mínimo de 44 px en todo control.

## No tocar

- `.next/`, `node_modules/`, `tsconfig.tsbuildinfo` — generados.
- `.worktrees/` — copia huérfana de un worktree viejo. Está fuera de git y fuera
  del lint.
- `supabase/migrations/*.sql` ya aplicadas: se corrigen con una migración nueva,
  no editando la vieja.

---

## Regla: consulta de LIBRERIAS.md

ANTES de escribir, generar o modificar cualquier componente de interfaz,
animación o efecto visual, DEBES:

1. LEER `LIBRERIAS.md` completo.
2. COMPROBAR si alguna librería catalogada ya resuelve lo que vas a construir.
3. VERIFICAR la compatibilidad contra este proyecto, con estos cinco criterios:
   - Stack: ¿es compatible con el framework, la versión de React y el sistema de
     estilos que este proyecto usa de verdad?
   - Duplicación: ¿mete un segundo motor de animación, de scroll o de estilos?
     Si la respuesta es sí, DESCÁRTALA.
   - Peso: ¿cuánto suma al bundle? Contrástalo con el presupuesto de `size-limit`.
   - Licencia: ¿permite el uso que este proyecto le va a dar? **Este es un
     producto comercial**: comprobalo específicamente.
   - Accesibilidad: ¿tiene contrato ARIA y gestión de foco, o es decorativa?
4. DECIDIR y DEJARLO ESCRITO:
   - Si encaja → usala, y anotá en `LIBRERIAS.md` que se adoptó y para qué.
   - Si no encaja → escribí el componente a medida, y anotá en `LIBRERIAS.md`
     qué se descartó y POR QUÉ.
5. Si aparece una librería nueva que no está catalogada, AÑADILA con su ficha
   completa antes de usarla.

NO instales una librería de UI «por si acaso». Solo entra al proyecto lo que
tiene un uso concreto y decidido hoy.
