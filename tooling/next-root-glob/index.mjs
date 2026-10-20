import { isAbsolute } from 'node:path'
import { globSync as find } from 'tinyglobby'

// Adaptador exclusivo para getRootDirs de @next/eslint-plugin-next 16.3.8.
// No pretende implementar la API completa de fast-glob. Rechaza usos nuevos
// para que una actualización del consumidor no reduzca el lint silenciosamente.
export const globSync = (pattern, options) => {
  if (typeof pattern !== 'string' || options?.onlyDirectories !== true ||
      Object.keys(options).some(key => key !== 'onlyDirectories')) {
    throw new TypeError('Uso de glob no soportado; revisar el adaptador de ESLint Next')
  }
  return find(pattern, {
    onlyDirectories: true,
    expandDirectories: false,
    absolute: isAbsolute(pattern),
  }).map(path => path.replace(/\/$/, ''))
}
