import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GPU_PARTS, gpuPartOpening, type GpuPartId } from '@/lib/rtx5090'

type V3 = [number, number, number]

/**
 * Fábrica procedural, sin mallas externas. Patrones de img2threejs:
 * Shape extruida para huecos reales, superficies barridas para las aspas,
 * instancias para repetición y un único árbol para despiece y selección.
 * Las dimensiones externas siguen la FE; el circuito oculto es ilustrativo.
 */
export function createRtx5090Model() {
  const root = new THREE.Group()
  root.name = 'rtx5090-founders-edition'
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const nodes = new Map<GpuPartId, THREE.Group>()
  const rotors: THREE.Group[] = []
  const keep = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry)
    return geometry
  }
  const material = (color: number, metalness: number, roughness: number) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness })
    materials.add(m)
    return m
  }
  const graphite = material(0x292b2d, 0.88, 0.33)
  const edge = material(0x92918b, 1, 0.26)
  const nickel = material(0x797d80, 1, 0.34)
  const finMaterial = material(0x35383a, 0.94, 0.42)
  const polymer = material(0x161819, 0, 0.36)
  const hubMaterial = material(0x414446, 0.92, 0.26)
  const boardMaterial = material(0x182421, 0, 0.72)
  const ceramic = material(0x26282a, 0, 0.68)
  const gold = material(0xc6a45b, 1, 0.26)
  const dieMaterial = material(0x455c68, 0.72, 0.16)
  const solder = material(0xa0a3a3, 1, 0.38)

  for (const part of GPU_PARTS) {
    const group = new THREE.Group()
    group.name = part.id
    group.userData.partId = part.id
    group.position.set(part.home[0], part.home[1], part.home[2])
    root.add(group)
    nodes.set(part.id, group)
  }
  const group = (id: GpuPartId) => nodes.get(id)!

  const mesh = (parent: THREE.Object3D, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, at: V3 = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat)
    m.name = name
    m.userData.explodeWithParent = true
    m.position.set(...at)
    parent.add(m)
    return m
  }
  const box = (parent: THREE.Object3D, name: string, size: V3, at: V3, mat: THREE.Material, bevel = 0.015) =>
    mesh(parent, name, keep(new RoundedBoxGeometry(...size, 2, Math.min(bevel, ...size.map(v => v / 3)))), mat, at)

  const instance = (parent: THREE.Object3D, name: string, geo: THREE.BufferGeometry, mat: THREE.Material, points: V3[]) => {
    const m = new THREE.InstancedMesh(geo, mat, points.length)
    const dummy = new THREE.Object3D()
    points.forEach((p, i) => {
      dummy.position.set(...p)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    m.name = name
    m.userData.explodeWithParent = true
    parent.add(m)
    return m
  }

  const roundedRect = (w: number, h: number, radius: number) => {
    const shape = new THREE.Shape()
    const x = -w / 2, y = -h / 2, r = radius
    shape.moveTo(x + r, y)
    shape.lineTo(x + w - r, y)
    shape.quadraticCurveTo(x + w, y, x + w, y + r)
    shape.lineTo(x + w, y + h - r)
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    shape.lineTo(x + r, y + h)
    shape.quadraticCurveTo(x, y + h, x, y + h - r)
    shape.lineTo(x, y + r)
    shape.quadraticCurveTo(x, y, x + r, y)
    return shape
  }
  const extrude = (shape: THREE.Shape, depth: number, bevel = 0.014) => keep(new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelSegments: 2,
    steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 16,
  }).translate(0, 0, -depth / 2).rotateX(-Math.PI / 2))

  // Los huecos se estrechan hacia el centro: el marco en reloj de arena es
  // una de las diferencias visibles de la FE, no dos círculos en una caja.
  const faceShape = roundedRect(6.08, 2.74, 0.25)
  for (const sign of [-1, 1]) {
    const hole = new THREE.Path()
    const p = (x: number) => sign * x
    hole.moveTo(p(0.15), 0)
    hole.bezierCurveTo(p(0.15), 0.13, p(0.68), 0.96, p(0.91), 1.20)
    hole.quadraticCurveTo(p(0.98), 1.27, p(1.1), 1.27)
    hole.lineTo(p(2.75), 1.27)
    hole.quadraticCurveTo(p(2.94), 1.27, p(2.94), 1.04)
    hole.lineTo(p(2.94), -1.04)
    hole.quadraticCurveTo(p(2.94), -1.27, p(2.75), -1.27)
    hole.lineTo(p(1.1), -1.27)
    hole.quadraticCurveTo(p(0.98), -1.27, p(0.91), -1.20)
    hole.bezierCurveTo(p(0.68), -0.96, p(0.15), -0.13, p(0.15), 0)
    faceShape.holes.push(hole)
  }
  const frame = group('frame')
  mesh(frame, 'hourglass-machined-face', extrude(faceShape, 0.10), edge, [0, 0.03, 0])
  const insetFace = mesh(frame, 'anodized-inset-face', extrude(faceShape, 0.055, 0.008), graphite, [0, 0.065, 0])
  insetFace.scale.set(0.991, 1, 0.978)
  for(const sign of [-1,1]) {
    const sideShape=new THREE.Shape()
    const x=(v: number)=>sign*v
    sideShape.moveTo(x(0.78),-1.36)
    sideShape.lineTo(x(2.78),-1.36)
    sideShape.quadraticCurveTo(x(3.03),-1.36,x(3.03),-1.11)
    sideShape.lineTo(x(3.03),1.11)
    sideShape.quadraticCurveTo(x(3.03),1.36,x(2.78),1.36)
    sideShape.lineTo(x(0.78),1.36)
    sideShape.lineTo(x(0.78),1.24)
    sideShape.lineTo(x(2.75),1.24)
    sideShape.quadraticCurveTo(x(2.91),1.24,x(2.91),1.08)
    sideShape.lineTo(x(2.91),-1.08)
    sideShape.quadraticCurveTo(x(2.91),-1.24,x(2.75),-1.24)
    sideShape.lineTo(x(0.78),-1.24)
    sideShape.closePath()
    mesh(frame,'rounded-end-wall-'+sign,extrude(sideShape,0.80,0.01),graphite,[0,-0.315,0])
    const panelShape=roundedRect(1.60,0.80,0.02)
    for(const y of [-0.11,0.06]) {
      panelShape.holes.push(new THREE.Path(roundedRect(1.28,0.055,0.024).getPoints(14).map(p=>new THREE.Vector2(p.x,p.y+y))))
    }
    const panelGeo=keep(new THREE.ExtrudeGeometry(panelShape,{depth:0.10,bevelEnabled:true,bevelSize:0.007,bevelThickness:0.007,bevelSegments:2,steps:1,curveSegments:12}).translate(0,0,-0.05))
    mesh(frame,'recessed-side-vent-panel-'+sign,panelGeo,graphite,[0,-0.315,sign*1.31])
  }

  const screwGeo = keep(new THREE.CylinderGeometry(0.041, 0.037, 0.024, 12))
  const screwSlots = keep(new THREE.BoxGeometry(0.042, 0.002, 0.008))
  const screws = (parent: THREE.Object3D, points: V3[]) => {
    instance(parent, 'countersunk-fasteners', screwGeo, nickel, points)
    instance(parent, 'fastener-recesses', screwSlots, polymer, points.map(([x,y,z]) => [x,y + 0.013,z]))
  }

  // Un barrido con torsión a lo largo del radio da volumen y paso variable a
  // cada aspa. Ambas caras tienen normales propias; no hay tarjetas planas.
  const bladeGeo = (() => {
    const positions: number[] = [], indices: number[] = []
    const rows = 16, cols = 7
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= rows; i++) {
        const t = i / rows, r = 0.30 + t * 0.83
        const sweep = -0.38 + 0.60 * t - 0.08 * t * t
        const width = 0.76 - 0.07 * t
        for (let j = 0; j <= cols; j++) {
          const u = j / cols - 0.5
          const angle = sweep + u * width
          const y = u * (0.19 - 0.075 * t) + Math.sin((u + 0.5) * Math.PI) * 0.008 + (side ? -0.009 : 0.009)
          positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r)
        }
      }
    }
    const faceCount = (rows + 1) * (cols + 1)
    const quad = (a: number, b: number, c: number, d: number) => indices.push(a,b,d,b,c,d)
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const a = side * faceCount + i * (cols + 1) + j
        if (side === 0) quad(a, a + cols + 1, a + cols + 2, a + 1)
        else quad(a, a + 1, a + cols + 2, a + cols + 1)
      }
    }
    for (let i = 0; i < rows; i++) {
      const a = i * (cols + 1), b = a + cols
      quad(a, a + faceCount, a + faceCount + cols + 1, a + cols + 1)
      quad(b, b + cols + 1, b + faceCount + cols + 1, b + faceCount)
    }
    for (let j = 0; j < cols; j++) {
      quad(j, j + 1, j + 1 + faceCount, j + faceCount)
      const a = rows * (cols + 1) + j
      quad(a, a + faceCount, a + faceCount + 1, a + 1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return keep(geo)
  })()
  const ringGeo = keep(new THREE.CylinderGeometry(1.154, 1.154, 0.21, 72, 1, true))
  const lipGeo = keep(new THREE.TorusGeometry(1.154, 0.015, 6, 72).rotateX(Math.PI / 2))
  const hubGeo = keep(new THREE.CylinderGeometry(0.34, 0.32, 0.16, 48))
  const capGeo = keep(new THREE.CylinderGeometry(0.295, 0.295, 0.01, 48))
  for (const id of ['fan-a', 'fan-b'] as const) {
    const fan = group(id)
    mesh(fan, 'retaining-ring', ringGeo, polymer)
    mesh(fan, 'machined-ring-lip', lipGeo, nickel, [0, 0.108, 0])
    const rotor = new THREE.Group()
    rotor.name = 'rotor-' + id
    rotor.userData.explodeWithParent = true
    fan.add(rotor)
    mesh(rotor, 'motor-hub', hubGeo, polymer)
    mesh(rotor, 'brushed-hub-cap', capGeo, hubMaterial, [0, 0.09, 0])
    for (let b = 0; b < 7; b++) {
      const blade = mesh(rotor, 'swept-blade-' + b, bladeGeo, polymer)
      blade.rotation.y = b * Math.PI * 2 / 7
    }
    rotors.push(rotor)
  }

  const finGeo = keep(new THREE.BoxGeometry(0.017, 0.43, 2.28))
  for (const id of ['fins-a', 'fins-b'] as const) {
    const fins = group(id)
    instance(fins, 'parallel-fin-bank', finGeo, finMaterial,
      Array.from({length: 57}, (_,i): V3 => [-1.14 + i * 2.28 / 56, 0, 0]))
    box(fins, 'radiator-base', [2.34, 0.055, 0.10], [0, -0.222, -0.91], nickel)
    box(fins, 'radiator-base-return', [2.34, 0.055, 0.10], [0, -0.222, 0.91], nickel)
    for (const sign of [-1, 1]) box(fins, 'radiator-tie-' + sign, [2.32, 0.04, 0.05], [0, 0.17, sign * 0.89], nickel)
  }

  const vapor = group('vapor')
  mesh(vapor, 'three-dimensional-vapor-chamber', extrude(roundedRect(1.74, 2.30, 0.18), 0.16, 0.035), nickel)
  instance(vapor, 'central-active-fins', keep(new THREE.BoxGeometry(0.018,0.29,2.15)), finMaterial,
    Array.from({length:33},(_,i): V3 => [-0.70+i*1.40/32,0.24,0]))
  box(vapor, 'cold-plate', [0.74, 0.035, 0.77], [0, -0.093, 0], hubMaterial)
  // Seis recorridos por lado. La cámara es central; los caños doblan hacia
  // las dos aletas, tal como se observa en el despiece térmico de NVIDIA.
  for (const sign of [-1, 1]) for (let i = 0; i < 6; i++) {
    const z = -0.91 + i * 0.365
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sign * 0.66, 0, z * 0.81),
      new THREE.Vector3(sign * 0.96, 0.055, z * 0.9),
      new THREE.Vector3(sign * 1.29, 0.15, z),
      new THREE.Vector3(sign * 2.76, 0.15, z),
    ])
    mesh(vapor, 'integrated-heatpipe-' + sign + '-' + i, keep(new THREE.TubeGeometry(curve, 18, 0.048, 8, false)), nickel)
  }
  screws(vapor, [[-0.72,0.1,-0.92], [0.72,0.1,-0.92], [-0.72,0.1,0.92], [0.72,0.1,0.92]])

  const pcb = group('pcb')
  const pcbShape = roundedRect(1.72, 2.24, 0.075)
  mesh(pcb, 'compact-multilayer-pcb', extrude(pcbShape, 0.045, 0.005), boardMaterial)
  box(pcb, 'blackwell-substrate', [0.72, 0.025, 0.73], [0, 0.037, 0], ceramic)
  box(pcb, 'blackwell-gb202-die', [0.48, 0.02, 0.5], [0, 0.061, 0], dieMaterial, 0.006)
  const memories: V3[] = []
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) memories.push([side * 0.59, 0.049, -0.72 + i * 0.36])
    for (let i = 0; i < 3; i++) memories.push([-0.30 + i * 0.30, 0.049, side * 0.66])
  }
  instance(pcb, 'gddr7-packages-16', keep(new THREE.BoxGeometry(0.19,0.046,0.25)), ceramic, memories)
  const smd: V3[] = [], pads: V3[] = []
  for (let row = 0; row < 4; row++) for (let col = 0; col < 19; col++) {
    const p: V3 = [-0.76 + col * 0.084, 0.04, (row < 2 ? -1 : 1) * (0.89 + row % 2 * 0.105)]
    smd.push(p)
    pads.push([p[0] - 0.026,p[1],p[2]], [p[0] + 0.026,p[1],p[2]])
  }
  instance(pcb, 'surface-mount-capacitors', keep(new THREE.BoxGeometry(0.039,0.023,0.042)), ceramic, smd)
  instance(pcb, 'solder-terminations', keep(new THREE.BoxGeometry(0.015,0.024,0.042)), solder, pads)
  // Las pistas son marcas del PCB, no piezas independientes del despiece.
  const traces: number[] = []
  for (let i = 0; i < 18; i++) {
    const x = -0.74 + i * 0.087
    for (const sign of [-1,1]) traces.push(x,0.026,sign*1.08, x,0.026,sign*0.79)
  }
  const traceGeo = keep(new THREE.BufferGeometry())
  traceGeo.setAttribute('position', new THREE.Float32BufferAttribute(traces,3))
  const traceMaterial = new THREE.LineBasicMaterial({color:0x64735c, transparent:true,opacity:0.48})
  materials.add(traceMaterial)
  const lines = new THREE.LineSegments(traceGeo,traceMaterial)
  lines.name = 'pcb-copper-tracks'
  lines.userData.explodeWithParent = true
  pcb.add(lines)
  box(pcb, 'pcie-tongue', [1.56,0.035,0.16], [-0.025,-0.001,1.18], boardMaterial)
  instance(pcb, 'pcie-gold-fingers', keep(new THREE.BoxGeometry(0.026,0.003,0.14)), gold,
    Array.from({length:37},(_,i): V3 => [-0.74 + i*0.04,0.019,1.18]).filter((_,i)=>i!==8&&i!==9))
  screws(pcb, [[-0.75,0.04,-1.03],[0.75,0.04,-1.03],[-0.75,0.04,1.03],[0.75,0.04,1.03]])
  const power = new THREE.Group()
  power.name = 'angled-12v-2x6'
  power.userData.explodeWithParent = true
  power.position.set(0.45,0.05,-1.11)
  power.rotation.x = -0.18
  pcb.add(power)
  box(power, 'power-socket-base', [0.40,0.04,0.18], [0,0,0], polymer)
  for(const sign of [-1,1]) {
    box(power, 'power-socket-wall-' + sign, [0.027,0.18,0.20], [sign*0.204,0.1,0], polymer)
    box(power, 'power-socket-rim-' + sign, [0.40,0.18,0.025], [0,0.1,sign*0.099], polymer)
  }
  instance(power, 'power-terminal-pins', keep(new THREE.BoxGeometry(0.018,0.12,0.018)), gold,
    Array.from({length:12},(_,i): V3 => [-0.15+(i%6)*0.06,0.08,i<6?-0.038:0.038]))
  box(power, 'sense-contact-header', [0.24,0.075,0.045], [0,0.15,-0.13], polymer)

  const back = group('backplate')
  mesh(back, 'central-backplate', extrude(roundedRect(1.80,2.44,0.16),0.06), graphite)
  for(const sign of [-1,1]) {
    box(back, 'flow-through-edge-' + sign, [5.77,0.065,0.07], [0,0,sign*1.27], graphite)
    box(back, 'flow-through-return-' + sign, [0.12,0.065,2.47], [sign*2.91,0,0], graphite)
  }
  screws(back,[[-0.7,0.05,-1.05],[0.7,0.05,-1.05],[-0.7,0.05,1.05],[0.7,0.05,1.05]])

  // Aberturas pasantes del soporte: el hueco no se finge con una calcomanía.
  const io = group('io')
  const ioShape = roundedRect(2.60,0.75,0.05)
  for(let i=0;i<4;i++) {
    const h = new THREE.Path()
    const x=-1.13+i*0.58
    h.moveTo(x,-0.21); h.lineTo(x+0.40,-0.21)
    h.lineTo(x+0.44,-0.16); h.lineTo(x+0.44,0.02)
    h.lineTo(x,0.02); h.closePath()
    ioShape.holes.push(h)
  }
  const ioGeo = keep(new THREE.ExtrudeGeometry(ioShape,{depth:0.045,bevelEnabled:false,curveSegments:6}))
  const plate = mesh(io, 'dual-slot-output-bracket', ioGeo,nickel)
  plate.rotation.y = Math.PI / 2
  for(let i=0;i<4;i++) {
    box(io,'display-connector-housing-'+i,[0.18,0.27,0.48],[0.12,-0.105,0.91-i*0.58],nickel)
    box(io,'display-connector-cavity-'+i,[0.006,0.15,0.35],[-0.006,-0.105,0.91-i*0.58],polymer)
  }
  box(io, 'case-mounting-tab',[0.25,0.065,2.60],[-0.07,0.39,0],nickel)

  const label = (parent: THREE.Object3D, text: string, at: V3, size: [number,number], side = false) => {
    if (typeof document === 'undefined') return
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#deded8'
    ctx.font = '600 78px Arial, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(text,512,64)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    textures.add(texture)
    const mat = new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,metalness:0.25,roughness:0.45,polygonOffset:true,polygonOffsetFactor:-1})
    materials.add(mat)
    const m=mesh(parent,'inscription-'+text,keep(new THREE.PlaneGeometry(...size)),mat,at)
    if(!side) m.rotation.x = -Math.PI/2
  }
  label(frame,'RTX 5090',[0,0.11,0.95],[0.59,0.085])
  label(frame,'GEFORCE RTX',[1.68,-0.20,1.381],[1.25,0.16],true)

  const select = (id: GpuPartId | null) => {
    for(const [partId,node] of nodes) {
      node.traverse(obj => {
        if(!(obj instanceof THREE.Mesh)) return
        // La selección solo cambia emisión; no clona materiales en cada cuadro.
        if(!obj.userData.originalMaterial) obj.userData.originalMaterial=obj.material
        if(!obj.userData.selectionMaterial) {
          const original = obj.userData.originalMaterial as THREE.Material
          if(original instanceof THREE.MeshStandardMaterial) {
            const highlight=original.clone()
            highlight.emissive.set(0x55c8f5)
            highlight.emissiveIntensity=0.18
            materials.add(highlight)
            obj.userData.selectionMaterial=highlight
          }
        }
        obj.material=id===partId && obj.userData.selectionMaterial ? obj.userData.selectionMaterial : obj.userData.originalMaterial
      })
    }
  }
  const displacement = new THREE.Vector3()
  const setOpening = (opening: number) => {
    for(const part of GPU_PARTS) {
      group(part.id).position.set(part.home[0], part.home[1], part.home[2]).addScaledVector(
        displacement.set(part.offset[0],part.offset[1],part.offset[2]), gpuPartOpening(opening,part.delay))
    }
  }
  root.userData.sculptRuntime = {
    nodes: Object.fromEntries(nodes),
    destructionGroups: GPU_PARTS.map(part=>({id:part.id,nodeIds:[part.id]})),
  }
  return {
    root, nodes, rotors, setOpening, select,
    dispose() {
      geometries.forEach(g=>g.dispose())
      materials.forEach(m=>m.dispose())
      textures.forEach(t=>t.dispose())
    },
  }
}
