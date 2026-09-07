import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createRtx5090Model } from '@/components/three/createRtx5090Model'
import { GPU_PARTS, gpuOpening } from '@/lib/rtx5090'

describe('RTX 5090 procedural', () => {
  it('retorna exactamente al montaje sin acumular deriva al invertir o saltar el scroll', () => {
    const model = createRtx5090Model()
    const home = new Map([...model.nodes].map(([id,node])=>[id,node.position.clone()]))
    for (const p of [0.7,0.2,0.5,0.99,0.31,1,0.51,0]) model.setOpening(gpuOpening(p))
    for(const [id,node] of model.nodes) expect(node.position.distanceTo(home.get(id)!)).toBeLessThan(1e-10)
    model.setOpening(gpuOpening(0.5))
    for(const part of GPU_PARTS) {
      const expected = new THREE.Vector3(...part.offset)
      const actual = model.nodes.get(part.id)!.position.clone().sub(home.get(part.id)!)
      expect(actual.distanceTo(expected)).toBeLessThan(1e-10)
    }
    model.dispose()
  })

  it('los huecos de los ventiladores son pasantes y cada malla pertenece a una pieza seleccionable', () => {
    const model = createRtx5090Model()
    model.root.updateMatrixWorld(true)
    for(const x of [-1.65,1.65]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x,4,0),new THREE.Vector3(0,-1,0))
      expect(ray.intersectObject(model.nodes.get('frame')!,true)).toHaveLength(0)
    }
    for(const [id,x] of [['fins-a',-1.65],['fins-b',1.65]] as const) {
      const airflow=new THREE.Raycaster(new THREE.Vector3(x,-4,0),new THREE.Vector3(0,1,0))
      expect(airflow.intersectObject(model.nodes.get(id)!,true)).toHaveLength(0)
    }
    const centerRay = new THREE.Raycaster(new THREE.Vector3(0,4,0.9),new THREE.Vector3(0,-1,0))
    expect(centerRay.intersectObject(model.nodes.get('frame')!,true).length).toBeGreaterThan(0)
    model.root.traverse(obj=>{
      if(!(obj instanceof THREE.Mesh)) return
      expect(obj.name).not.toBe('')
      let parent: THREE.Object3D|null=obj
      while(parent&&!parent.userData.partId) parent=parent.parent
      expect(parent).not.toBeNull()
      const positions=obj.geometry.getAttribute('position')
      for(let i=0;i<positions.count;i++) {
        expect(Number.isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i))).toBe(true)
      }
    })
    model.dispose()
  })

  it('libera geometrías y materiales incluso después de seleccionar distintas piezas', () => {
    const model = createRtx5090Model()
    model.select('pcb');model.select('frame');model.select(null)
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>()
    model.root.traverse(obj=>{
      if(obj instanceof THREE.Mesh) {
        geometries.add(obj.geometry)
        const m=Array.isArray(obj.material)?obj.material:[obj.material]
        m.forEach(material=>materials.add(material))
      }
    })
    let released=0
    for(const resource of [...geometries,...materials]) resource.addEventListener('dispose',()=>released++)
    model.dispose()
    expect(released).toBe(geometries.size+materials.size)
  })
})
