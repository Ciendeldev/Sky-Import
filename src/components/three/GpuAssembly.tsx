'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { damp, onFrame } from '@/lib/motion'
import { GPU_PARTS, gpuOpening, type GpuPartId } from '@/lib/rtx5090'

interface Props {
  progress: RefObject<number>
  selected: GpuPartId | null
  onSelect: (id: GpuPartId | null) => void
  onReady?: () => void
  onLost?: () => void
  className?: string
}

export default function GpuAssembly({ progress: scrollProgress, selected, onSelect, onReady, onLost, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const selection = useRef(selected)
  const [failed, setFailed] = useState(false)
  useEffect(() => { selection.current = selected }, [selected])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup: (() => void) | null = null

    void (async () => {
      const [THREE, { createRtx5090Model }, { RoomEnvironment }] = await Promise.all([
        import('three'),
        import('./createRtx5090Model'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
      ])
      if (disposed) return

      const renderer = new THREE.WebGLRenderer({
        antialias: true, alpha: true, powerPreference: 'low-power',
      })
      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.10
      renderer.outputColorSpace = THREE.SRGBColorSpace
      host.appendChild(renderer.domElement)
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y'

      const scene = new THREE.Scene()
      const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100)
      camera.position.set(6.5, 8.5, 12)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()
      const model = createRtx5090Model()
      model.root.rotation.set(0, -0.30, -0.075)
      scene.add(model.root)
      // El metal necesita reflejar algo: el entorno evita aclarar su albedo
      // hasta gris para compensar una iluminación sin reflejos.
      const room = new RoomEnvironment()
      const pmrem = new THREE.PMREMGenerator(renderer)
      const env = pmrem.fromScene(room, 0.04)
      room.dispose()
      pmrem.dispose()
      scene.environment = env.texture
      scene.environmentIntensity = 1.15
      const key = new THREE.DirectionalLight(0xfff3df, 3.0)
      key.position.set(-3, 7, 5)
      const fill = new THREE.DirectionalLight(0xb6d8ec, 1.5)
      fill.position.set(4, 3, -4)
      scene.add(key, fill, new THREE.HemisphereLight(0xd6e6ef, 0x42403c, 0.8))

      let w = 1, h = 1, visible = true, ready = false, lost = false
      let progress = scrollProgress.current
      let lastSelected: GpuPartId | null = null
      const point = new THREE.Vector3()
      const bounds = () => {
        model.root.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(model.root)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for(const x of [box.min.x, box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) {
          point.set(x,y,z).applyMatrix4(camera.matrixWorldInverse)
          minX=Math.min(minX,point.x); maxX=Math.max(maxX,point.x)
          minY=Math.min(minY,point.y); maxY=Math.max(maxY,point.y)
        }
        return {x:(maxX+minX)/2,y:(maxY+minY)/2,width:maxX-minX,height:maxY-minY}
      }
      const closedBounds = bounds()
      model.setOpening(1)
      const openBounds = bounds()
      model.setOpening(0)

      const fit = (opening: number) => {
        const b = {
          x:THREE.MathUtils.lerp(closedBounds.x,openBounds.x,opening),
          y:THREE.MathUtils.lerp(closedBounds.y,openBounds.y,opening),
          width:THREE.MathUtils.lerp(closedBounds.width,openBounds.width,opening),
          height:THREE.MathUtils.lerp(closedBounds.height,openBounds.height,opening),
        }
        const aspect=w/h
        const availableHeight=Math.max(0.50,1-115/h)
        const halfHeight=Math.max(b.height/availableHeight,b.width/aspect/0.9)/2
        // El pequeño desplazamiento reserva sitio al progreso de abajo.
        const cy=b.y-halfHeight*(32/h)
        camera.left=b.x-halfHeight*aspect; camera.right=b.x+halfHeight*aspect
        camera.top=cy+halfHeight; camera.bottom=cy-halfHeight
        camera.updateProjectionMatrix()
      }
      const resize = () => {
        w=Math.max(1,host.clientWidth); h=Math.max(1,host.clientHeight)
        renderer.setSize(w,h,false)
        fit(gpuOpening(progress))
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(host)
      const io = new IntersectionObserver(entries => { visible=entries.some(e=>e.isIntersecting) })
      io.observe(host)
      const contextLost = (event: Event) => {
        event.preventDefault(); lost=true; setFailed(true); onLost?.()
      }
      renderer.domElement.addEventListener('webglcontextlost',contextLost)
      const raycaster=new THREE.Raycaster()
      const pointer=new THREE.Vector2()
      let down: [number,number] | null = null
      const pointerDown=(e: PointerEvent) => {down=[e.clientX,e.clientY]}
      const pointerUp=(e: PointerEvent) => {
        if(!down || Math.hypot(e.clientX-down[0],e.clientY-down[1])>8) {down=null;return}
        down=null
        const rect=renderer.domElement.getBoundingClientRect()
        pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2)
        raycaster.setFromCamera(pointer,camera)
        let obj: import('three').Object3D | null = raycaster.intersectObject(model.root,true)[0]?.object ?? null
        while(obj&&!obj.userData.partId) obj=obj.parent
        const id=(obj?.userData.partId as GpuPartId | undefined)??null
        onSelect(id===selection.current?null:id)
      }
      renderer.domElement.addEventListener('pointerdown',pointerDown)
      renderer.domElement.addEventListener('pointerup',pointerUp)

      host.dataset.model = 'rtx-5090-founders-edition'
      host.dataset.partCount=String(GPU_PARTS.length)
      const stop=onFrame((_,delta)=>{
        if(lost||document.hidden||(!visible&&ready)) return
        progress=damp(progress,scrollProgress.current,14,delta)
        const opening=gpuOpening(progress)
        model.setOpening(opening)
        fit(opening)
        if(lastSelected!==selection.current) {
          model.select(selection.current)
          lastSelected=selection.current
        }
        const spin=Math.min(delta,50)/1000*(0.3+(1-opening)*2.7)
        for(const rotor of model.rotors) rotor.rotation.y+=spin
        renderer.render(scene,camera)
        host.dataset.assemblyProgress=progress.toFixed(3)
        host.dataset.assemblyOpen=opening.toFixed(3)
        host.dataset.drawCalls=String(renderer.info.render.calls)
        host.dataset.triangles=String(renderer.info.render.triangles)
        if(!ready) {ready=true; onReady?.()}
      })
      cleanup=()=>{
        stop();ro.disconnect();io.disconnect()
        renderer.domElement.removeEventListener('webglcontextlost',contextLost)
        renderer.domElement.removeEventListener('pointerdown',pointerDown)
        renderer.domElement.removeEventListener('pointerup',pointerUp)
        model.dispose();env.dispose()
        renderer.forceContextLoss();renderer.dispose();renderer.domElement.remove()
      }
      if(disposed) cleanup()
    })().catch(() => {
      cleanup?.()
      if(!disposed) {setFailed(true);onLost?.()}
    })
    return()=>{disposed=true;cleanup?.()}
  },[onLost,onReady,onSelect,scrollProgress])

  if(failed) return null
  return <div ref={hostRef} className={className} data-testid="gpu-assembly" aria-hidden="true" />
}
