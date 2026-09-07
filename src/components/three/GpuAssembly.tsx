'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { damp, onFrame } from '@/lib/motion'

/**
 * ENSAMBLAJE — la pieza técnica de la casa.
 *
 * Una placa de video construida ENTERAMENTE EN CÓDIGO: no hay ningún modelo
 * importado, ninguna textura y ningún archivo binario. PCB, peine de aletas,
 * carcasa, dos ventiladores, backplate y soporte son primitivas colocadas por
 * geometría. Al desplazarse, las piezas viajan desde su posición explotada hasta
 * su lugar de montaje, y los ventiladores giran.
 *
 * Su ingeniería importa más que su belleza:
 *
 *   · **Montaje diferido.** El componente solo se importa cuando la sección se
 *     acerca (lo decide el envoltorio), así que no pesa nada hasta entonces.
 *   · **El avance se lee del rectángulo en cada cuadro**, no de eventos de
 *     scroll: con desplazamiento suave los eventos se pierden y la pieza queda a
 *     medio armar.
 *   · **`forceContextLoss()` ANTES de `dispose()`** al desmontar. Solo con
 *     `dispose` el navegador sigue contando el contexto WebGL y, tras una docena
 *     de montajes, deja de entregar contextos: la pieza «a veces no aparece».
 *   · **El respaldo estático no se oculta hasta que se pintó un cuadro real**, y
 *     vuelve si el contexto se pierde. Fallar hacia el dibujo, nunca hacia un
 *     hueco negro.
 *   · Se deja de renderizar fuera de pantalla y con la pestaña oculta.
 */

interface Props {
  progress: RefObject<number>

  /** Se llama cuando el primer cuadro real ya está pintado. */
  onReady?: () => void
  /** Se llama si el contexto se pierde y hay que volver al respaldo. */
  onLost?: () => void
  className?: string
}

export default function GpuAssembly({ progress: scrollProgress, onReady, onLost, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let cleanup: (() => void) | null = null

    void (async () => {
      let THREE: typeof import('three')
      try {
        THREE = await import('three')
      } catch {
        setFailed(true)
        onLost?.()
        return
      }
      if (disposed) return

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
      camera.position.set(4.8, 4.6, 8.6)
      camera.lookAt(0, 0.15, 0)

      let renderer: import('three').WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: window.devicePixelRatio < 2,
          alpha: true,
          powerPreference: 'low-power',
        })
      } catch {
        setFailed(true)
        onLost?.()
        return
      }

      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
      host.appendChild(renderer.domElement)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'

      // ── luz: clave desde arriba-izquierda, relleno frío, filo trasero ──────
      scene.add(new THREE.HemisphereLight(0xe6f4ff, 0x66717d, 2.6))
      const key = new THREE.DirectionalLight(0xfff4e6, 3.6)
      key.position.set(-4, 5, 3)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xb9e6fa, 2.2)
      fill.position.set(4, -1, 2)
      scene.add(fill)
      const rim = new THREE.DirectionalLight(0x55c8f5, 1.1)
      rim.position.set(1, 1, -5)
      scene.add(rim)

      const mat = (color: number, metalness: number, roughness: number) =>
        new THREE.MeshStandardMaterial({ color, metalness, roughness })

      const matDark = mat(0x343b42, 0.15, 0.62)
      const matBody = mat(0x64717b, 0.35, 0.38)
      const matSteel = mat(0xb7c4ce, 0.42, 0.35)
      const matPcb = mat(0x233b37, 0.1, 0.8)
      const matGold = mat(0xd8af61, 0.45, 0.3)
      // La franja de la carcasa es PINTURA, no una luz: emisión mínima, apenas
      // lo justo para que se lea en la sombra. El brief prohíbe el neón.
      const matSky = new THREE.MeshStandardMaterial({
        color: 0x55c8f5,
        emissive: 0x123f52,
        emissiveIntensity: 0.22,
        metalness: 0.45,
        roughness: 0.45,
      })

      const materials = [matDark, matBody, matSteel, matPcb, matGold, matSky]
      const geometries: Array<import('three').BufferGeometry> = []

      const track = (g: import('three').BufferGeometry) => {
        geometries.push(g)
        return g
      }

      const root = new THREE.Group()
      root.rotation.y = -0.42
      root.rotation.x = 0.14
      scene.add(root)

      /** Cada pieza recuerda su posición final y su desplazamiento explotado. */
      interface Part {
        object: import('three').Object3D
        home: import('three').Vector3
        offset: import('three').Vector3
      }
      const parts: Part[] = []

      const place = (
        object: import('three').Object3D,
        home: [number, number, number],
        offset: [number, number, number],
      ) => {
        object.position.set(...home)
        root.add(object)
        parts.push({
          object,
          home: new THREE.Vector3(...home),
          offset: new THREE.Vector3(...offset),
        })
      }

      // ── PCB ────────────────────────────────────────────────────────────────
      const pcb = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 0.06, 1.35)), matPcb)
      place(pcb, [0, -0.34, 0], [0, -1.1, 0])

      // dedos de contacto PCIe
      const fingers = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.05, 0.12)), matGold)
      fingers.position.set(-0.55, 0, 0.72)
      pcb.add(fingers)

      // El chip y las memorias hacen legible el circuito al separar el disipador.
      const chip = new THREE.Mesh(track(new THREE.BoxGeometry(0.64, 0.035, 0.56)), matSteel)
      chip.position.set(0, 0.055, 0)
      pcb.add(chip)
      const die = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.015, 0.3)), matBody)
      die.position.y = 0.025
      chip.add(die)
      const memoryGeo = track(new THREE.BoxGeometry(0.27, 0.035, 0.19))
      for (let n = 0; n < 8; n += 1) {
        const memory = new THREE.Mesh(memoryGeo, matDark)
        memory.position.set(-0.6 + (n % 4) * 0.4, 0.055, n < 4 ? -0.48 : 0.48)
        pcb.add(memory)
      }

      // ── backplate ──────────────────────────────────────────────────────────
      const backplate = new THREE.Mesh(track(new THREE.BoxGeometry(3.55, 0.05, 1.28)), matSteel)
      place(backplate, [0, -0.42, 0], [0, -1.3, -0.25])

      // ── peine de aletas: una sola geometría instanciada ─────────────────────
      const FIN_COUNT = 46
      const finGeo = track(new THREE.BoxGeometry(0.014, 0.52, 1.12))
      const fins = new THREE.InstancedMesh(finGeo, matSteel, FIN_COUNT)
      const dummy = new THREE.Object3D()
      for (let i = 0; i < FIN_COUNT; i += 1) {
        dummy.position.set(-1.55 + (i / (FIN_COUNT - 1)) * 3.1, 0, 0)
        dummy.updateMatrix()
        fins.setMatrixAt(i, dummy.matrix)
      }
      fins.instanceMatrix.needsUpdate = true
      place(fins, [0, 0.02, 0], [0, 0.8, 0])

      // caños de calor
      const pipeGeo = track(new THREE.CylinderGeometry(0.045, 0.045, 3.2, 10))
      const matCopper = mat(0xb87a4e, 0.92, 0.32)
      materials.push(matCopper)
      for (let i = 0; i < 3; i += 1) {
        const pipe = new THREE.Mesh(pipeGeo, matCopper)
        pipe.rotation.z = Math.PI / 2
        place(pipe, [0, -0.2, -0.36 + i * 0.36], [0, 0.9, 0])
      }

      // ── carcasa: marco abierto para que se vean las aletas ──────────────────
      const shroud = new THREE.Group()
      const railGeo = track(new THREE.BoxGeometry(3.5, 0.1, 0.09))
      const sideGeo = track(new THREE.BoxGeometry(0.09, 0.1, 1.3))
      const railTop = new THREE.Mesh(railGeo, matBody)
      railTop.position.set(0, 0, -0.63)
      const railBottom = new THREE.Mesh(railGeo, matBody)
      railBottom.position.set(0, 0, 0.63)
      const sideL = new THREE.Mesh(sideGeo, matBody)
      sideL.position.set(-1.72, 0, 0)
      const sideR = new THREE.Mesh(sideGeo, matBody)
      sideR.position.set(1.72, 0, 0)
      const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(3.5, 0.03, 0.03)), matSky)
      stripe.position.set(0, 0.06, -0.63)
      shroud.add(railTop, railBottom, sideL, sideR, stripe)
      place(shroud, [0, 0.3, 0], [0, 1.3, 0])

      // ── dos ventiladores ──────────────────────────────────────────────────
      const hubGeo = track(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 14))
      const bladeGeo = track(new THREE.BoxGeometry(0.4, 0.022, 0.12))
      const ringGeo = track(new THREE.TorusGeometry(0.52, 0.022, 6, 26))
      const fanGroups: Array<import('three').Group> = []
      for (let f = 0; f < 2; f += 1) {
        const fan = new THREE.Group()
        const hub = new THREE.Mesh(hubGeo, matDark)
        fan.add(hub)
        for (let b = 0; b < 9; b += 1) {
          const blade = new THREE.Mesh(bladeGeo, matSteel)
          const a = (b / 9) * Math.PI * 2
          blade.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3)
          blade.rotation.y = -a
          blade.rotation.z = 0.32
          fan.add(blade)
        }
        const ring = new THREE.Mesh(ringGeo, matDark)
        ring.rotation.x = Math.PI / 2
        fan.add(ring)
        fanGroups.push(fan)
        place(fan, [-0.95 + f * 1.9, 0.34, 0], [(f - 0.5) * 0.9, 1.75, 0])
      }

      // ── soporte con salidas de video ───────────────────────────────────────
      const bracket = new THREE.Group()
      const plate = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.95, 1.3)), matSteel)
      bracket.add(plate)
      for (let i = 0; i < 3; i += 1) {
        const port = new THREE.Mesh(track(new THREE.BoxGeometry(0.03, 0.11, 0.24)), matDark)
        port.position.set(0.03, -0.12, -0.36 + i * 0.36)
        bracket.add(port)
      }
      place(bracket, [-1.83, -0.1, 0], [-0.85, 0, 0])

      // ── bucle ──────────────────────────────────────────────────────────────
      let visible = true
      let ready = false
      let progress = scrollProgress.current
      let lost = false

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

      const resize = () => {
        const rect = host.getBoundingClientRect()
        const w = Math.max(1, Math.round(rect.width))
        const h = Math.max(1, Math.round(rect.height))
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.fov = w / h < 1 ? 44 : 34
        camera.updateProjectionMatrix()
      }
      resize()

      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host)

      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) visible = entry.isIntersecting
      })
      io.observe(host)

      const onContextLost = (event: Event) => {
        event.preventDefault()
        lost = true
        setFailed(true)
        onLost?.()
      }
      renderer.domElement.addEventListener('webglcontextlost', onContextLost)

      const temp = new THREE.Vector3()

      // El recorrido pertenece al contenedor alto, nunca al canvas sticky.
      // Ida y vuelta dependen de la posición, no del sentido del último scroll.
      const stop = onFrame((_, delta) => {
        if (lost || document.hidden || (!visible && ready)) return
        const dt = delta / 1000
        progress = damp(progress, scrollProgress.current, 14, delta)
        const opening = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)))
        const eased = reduced.matches ? 1 : 1 - opening * opening

        for (const part of parts) {
          temp.copy(part.offset).multiplyScalar(1 - eased).add(part.home)
          part.object.position.copy(temp)
        }

        root.rotation.y = -0.42 + (1 - eased) * 0.5

        if (!reduced.matches) {
          const spin = dt * (0.6 + eased * 7)
          for (const fan of fanGroups) fan.rotation.y += spin
        }

        renderer.render(scene, camera)
        host.dataset.assemblyProgress = progress.toFixed(3)
        host.dataset.assemblyOpen = (1 - eased).toFixed(3)

        if (!ready) {
          ready = true
          onReady?.()
        }
      })

      cleanup = () => {
        stop()
        resizeObserver.disconnect()
        io.disconnect()
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
        for (const g of geometries) g.dispose()
        for (const m of materials) m.dispose()
        // El orden importa: sin `forceContextLoss` el navegador sigue contando
        // este contexto y a la docena de montajes deja de entregar contextos.
        renderer.forceContextLoss()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [onLost, onReady, scrollProgress])

  if (failed) return null

  return <div ref={hostRef} className={className} data-testid="gpu-assembly" aria-hidden="true" />
}
