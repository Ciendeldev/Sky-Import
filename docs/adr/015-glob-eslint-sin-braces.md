# Búsqueda de raíces de Next sin braces

Fecha: 20/10/2026.

## Problema y decisión

`@next/eslint-plugin-next@16.3.8` incorpora `fast-glob`, que incorpora
`micromatch` y `braces@3.0.3`. El aviso GHSA-vfj7-8cjw-p6xm no tiene una
versión corregida de braces en la fecha de esta decisión.

El plugin utiliza únicamente `globSync(pattern, { onlyDirectories: true })`
para resolver `settings.next.rootDir`. Se reemplaza esa dependencia por un
adaptador local de `tinyglobby@0.2.17`, limitado a la versión exacta del plugin.
El adaptador conserva rutas absolutas y relativas, excluye archivos y evita
expandir automáticamente todos los subdirectorios. Rechaza opciones nuevas
para que un cambio del consumidor produzca un fallo visible.

No se copia ni renombra el código vulnerable: `braces`, `micromatch` y la
implementación original de `fast-glob` salen del árbol instalado. El alias
`fast-glob` resuelve al paquete local `@sky-import/next-root-glob`.
El código de producción no cambia.

## Controles conservados

- `npm audit --audit-level=high` sigue ejecutándose sobre todas las dependencias.
- No hay lista de excepciones, filtros de avisos ni `continue-on-error`.
- Se mantienen las reglas de Next, TypeScript, React y accesibilidad.
- Seis pruebas verifican la resolución de raíces (incluidos patrones y rutas
  Windows) y que la regla de navegación siga rechazando enlaces incorrectos.
- El paquete local usa ESM, consumible mediante `require()` en Node 22.13+
  y en Node 24, que es la versión usada por `.nvmrc` y CI.

## Mantenimiento

Al actualizar el plugin de Next, revisar su uso de glob y retirar este
adaptador si la versión oficial elimina la dependencia vulnerable. El
override está acotado a `16.3.8`: una actualización no lo heredará
silenciosamente. El lockfile y `npm ci` deben conservar el enlace al paquete
local en `tooling/next-root-glob`.

Referencias:

- [Aviso de seguridad](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- [tinyglobby y su API](https://github.com/SuperchupuDev/tinyglobby).
- [Uso de glob en Next 16.3.8](https://github.com/vercel/next.js/blob/v16.3.8/packages/eslint-plugin-next/src/utils/get-root-dirs.ts).
