'use client'

import { useSyncExternalStore } from 'react'

/**
 * ¿Terminó la cortina de entrada?
 *
 * La intro marca `html[data-intro-running]` mientras se está reproduciendo y lo
 * quita al abrirse. Este gancho observa ese atributo para que el trabajo pesado
 * —compilar shaders, construir geometría— espere su turno.
 *
 * No es una preferencia estética: montar la escena 3D del armador durante la
 * intro ocupaba el hilo principal y retrasaba el cierre de la cortina casi un
 * segundo, lo que se veía como una entrada trabada en la única página que
 * carga WebGL.
 *
 * Se observa con `useSyncExternalStore` en vez de copiar el valor a estado desde
 * un efecto, igual que el resto de las preferencias del proyecto: el DOM es la
 * fuente de verdad y React solo se suscribe a ella.
 */
function subscribe(notify: () => void): () => void {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-intro-running'],
  })
  return () => observer.disconnect()
}

function getSnapshot(): boolean {
  return !document.documentElement.hasAttribute('data-intro-running')
}

/**
 * En el servidor se responde `false`: sin este valor, el primer HTML traería la
 * escena montada y volveríamos al problema que esto resuelve.
 */
function getServerSnapshot(): boolean {
  return false
}

export function useIntroDone(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
