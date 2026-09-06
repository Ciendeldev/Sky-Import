'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { BuildSlot } from '@/lib/compat'
import {
  getPcAssemblyPlan,
  scenePartsForSlots,
  type PcAssemblyPlan,
  type PcScenePartId,
} from '@/lib/pcAssemblyPlan'

type DiagnosticTone = 'error' | 'warning' | null

interface Props {
  picks: Partial<Record<BuildSlot, string>>
  powered: boolean
  checking: boolean
  diagnosticSlots: readonly BuildSlot[]
  diagnosticTone: DiagnosticTone
  coolingType?: 'aire' | 'liquida'
  onReady?: () => void
  onLost?: () => void
  className?: string
}

type SceneWindow = Window & {
  __pcBuilderReady?: boolean
  __pcBuilderState?: PcAssemblyPlan & {
    powered: boolean
    checking: boolean
    diagnosticSlots: readonly BuildSlot[]
  }
}

interface AnimatedPart {
  id: PcScenePartId
  group: THREE.Group
  home: THREE.Vector3
  homeQuaternion: THREE.Quaternion
  exploded: THREE.Vector3
  explodedQuaternion: THREE.Quaternion
  current: number
}

interface PulsePath {
  group: THREE.Group
  curve: THREE.CatmullRomCurve3
  pulse: THREE.Mesh
  offset: number
}

interface DiagnosticMarker {
  group: THREE.Group
  ring: THREE.Mesh
  light: THREE.PointLight
}

const DIAGNOSTIC_MARKER_OFFSETS: Record<PcScenePartId, [number, number, number]> = {
  case: [2.3, 2.2, 2.3],
  motherboard: [-2.1, 1.75, 2.2],
  cpu: [-1.4, 1.65, 2.1],
  'ram-left': [1.2, 1.7, 2.1],
  'ram-right': [1.65, 1.55, 2.1],
  gpu: [2.35, 1.35, 2.25],
  storage: [-1.9, 1.15, 2.1],
  psu: [-1.9, 1.45, 2.1],
  cooling: [-2.15, 2.15, 2.2],
  'cooling-fans': [2.1, 2.15, 2.15],
  'motherboard-power': [-1.8, 1.55, 2.1],
  'gpu-power': [1.9, 1.35, 2.1],
}

const DIAGNOSTIC_TARGET_Z: Record<PcScenePartId, number> = {
  case: 2.02,
  motherboard: 0.24,
  cpu: 0.22,
  'ram-left': 0.28,
  'ram-right': 0.28,
  gpu: 0.58,
  storage: 0.24,
  psu: 1.28,
  cooling: 0.72,
  'cooling-fans': 0.8,
  'motherboard-power': 0.2,
  'gpu-power': 0.25,
}

function makeFan(
  radius: number,
  ringMaterial: THREE.MeshStandardMaterial,
  bladeMaterial: THREE.MeshStandardMaterial,
  geometries: THREE.BufferGeometry[],
) {
  const group = new THREE.Group()
  const ringGeometry = new THREE.TorusGeometry(radius, radius * 0.065, 10, 48)
  geometries.push(ringGeometry)
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.castShadow = true
  group.add(ring)

  const rotor = new THREE.Group()
  const bladeGeometry = new RoundedBoxGeometry(radius * 0.58, radius * 0.18, 0.06, 3, 0.035)
  geometries.push(bladeGeometry)
  for (let index = 0; index < 7; index += 1) {
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial)
    blade.position.x = radius * 0.31
    blade.rotation.z = (index / 7) * Math.PI * 2 + 0.22
    blade.castShadow = true
    rotor.add(blade)
  }
  const hubGeometry = new THREE.CylinderGeometry(radius * 0.16, radius * 0.2, 0.09, 24)
  geometries.push(hubGeometry)
  const hub = new THREE.Mesh(hubGeometry, bladeMaterial)
  hub.rotation.x = Math.PI / 2
  hub.castShadow = true
  rotor.add(hub)
  group.add(rotor)

  return { group, rotor }
}

export default function PcBuildScene({
  picks,
  powered,
  checking,
  diagnosticSlots,
  diagnosticTone,
  coolingType,
  onReady,
  onLost,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const plan = useMemo(() => getPcAssemblyPlan(picks), [picks])
  const snapshotRef = useRef({
    plan,
    coolingType,
    powered,
    checking,
    diagnosticSlots,
    diagnosticTone,
  })

  useEffect(() => {
    snapshotRef.current = {
      plan,
      coolingType,
      powered,
      checking,
      diagnosticSlots,
      diagnosticTone,
    }
  }, [checking, coolingType, diagnosticSlots, diagnosticTone, plan, powered])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cleanup: (() => void) | undefined

    try {
      const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80)
      camera.position.set(8.7, 4.8, 13.4)
      camera.lookAt(0, -0.05, -0.2)

      const renderer = new THREE.WebGLRenderer({
        antialias: window.devicePixelRatio < 2,
        alpha: true,
        powerPreference: 'high-performance',
      })
      renderer.setClearColor(0x000000, 0)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.02
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'
      host.appendChild(renderer.domElement)

      const geometries: THREE.BufferGeometry[] = []
      const materials: THREE.Material[] = []
      const keepGeometry = <T extends THREE.BufferGeometry>(geometry: T) => {
        geometries.push(geometry)
        return geometry
      }
      const keepMaterial = <T extends THREE.Material>(material: T) => {
        materials.push(material)
        return material
      }
      const addBox = (
        group: THREE.Group,
        size: [number, number, number],
        position: [number, number, number],
        material: THREE.Material,
        radius = 0.05,
      ) => {
        const geometry = keepGeometry(new RoundedBoxGeometry(...size, 4, radius))
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(...position)
        mesh.castShadow = true
        mesh.receiveShadow = true
        group.add(mesh)
        return mesh
      }

      const pmrem = new THREE.PMREMGenerator(renderer)
      const room = new RoomEnvironment()
      const environment = pmrem.fromScene(room, 0.04).texture
      room.dispose()
      pmrem.dispose()
      scene.environment = environment

      scene.add(new THREE.HemisphereLight(0xdff5ff, 0x0b0f13, 0.92))
      const key = new THREE.DirectionalLight(0xeaf8ff, 4.1)
      key.position.set(-5, 7, 7)
      key.castShadow = true
      key.shadow.mapSize.set(1024, 1024)
      key.shadow.bias = -0.00025
      scene.add(key)
      const fill = new THREE.DirectionalLight(0x79b9d1, 1.15)
      fill.position.set(6, 1, 5)
      scene.add(fill)
      const rgbLight = new THREE.PointLight(0x36d5ff, 0, 12, 2)
      rgbLight.position.set(2.5, 0.8, 2.8)
      scene.add(rgbLight)

      const graphite = keepMaterial(
        new THREE.MeshPhysicalMaterial({ color: 0x171d21, metalness: 0.82, roughness: 0.34 }),
      )
      const graphiteSoft = keepMaterial(
        new THREE.MeshPhysicalMaterial({ color: 0x242d32, metalness: 0.62, roughness: 0.46 }),
      )
      const black = keepMaterial(
        new THREE.MeshPhysicalMaterial({ color: 0x070a0c, metalness: 0.38, roughness: 0.52 }),
      )
      const silver = keepMaterial(
        new THREE.MeshPhysicalMaterial({ color: 0xaeb9be, metalness: 0.98, roughness: 0.18 }),
      )
      const pcb = keepMaterial(
        new THREE.MeshPhysicalMaterial({ color: 0x102b2d, metalness: 0.28, roughness: 0.62 }),
      )
      const gold = keepMaterial(
        new THREE.MeshPhysicalMaterial({ color: 0xd0a348, metalness: 1, roughness: 0.25 }),
      )
      const cableMaterial = keepMaterial(
        new THREE.MeshStandardMaterial({ color: 0x20282c, metalness: 0.25, roughness: 0.62 }),
      )
      const rgbMaterial = keepMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x17333b,
          emissive: 0x051014,
          emissiveIntensity: 0.25,
          metalness: 0.4,
          roughness: 0.28,
        }),
      )
      const pulseMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xa8f4ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      const glassMaterial = keepMaterial(
        new THREE.MeshPhysicalMaterial({
          color: 0x74cdea,
          transparent: true,
          opacity: 0.075,
          transmission: 0.2,
          roughness: 0.12,
          metalness: 0.05,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      )
      const guideMaterial = keepMaterial(
        new THREE.LineBasicMaterial({ color: 0x4fcff2, transparent: true, opacity: 0.12 }),
      )
      const traceMaterial = keepMaterial(
        new THREE.LineBasicMaterial({ color: 0x45c7e9, transparent: true, opacity: 0.42 }),
      )

      const root = new THREE.Group()
      root.rotation.set(-0.08, -0.42, 0.01)
      root.position.y = 0.15
      scene.add(root)

      const guideGeometry = keepGeometry(new THREE.BoxGeometry(6.15, 6.05, 4.05))
      const guideEdges = keepGeometry(new THREE.EdgesGeometry(guideGeometry))
      const guide = new THREE.LineSegments(guideEdges, guideMaterial)
      root.add(guide)

      const animatedParts: AnimatedPart[] = []
      const registerPart = (
        id: PcScenePartId,
        group: THREE.Group,
        home: [number, number, number],
        exploded: [number, number, number],
        explodedRotation: [number, number, number] = [0, 0, 0],
      ) => {
        group.name = `pc-${id}`
        group.position.set(...home)
        const homeQuaternion = group.quaternion.clone()
        const explodedQuaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(...explodedRotation),
        )
        explodedQuaternion.premultiply(homeQuaternion)
        root.add(group)
        animatedParts.push({
          id,
          group,
          home: new THREE.Vector3(...home),
          homeQuaternion,
          exploded: new THREE.Vector3(...exploded),
          explodedQuaternion,
          current: 0,
        })
        return group
      }

      const rotors: THREE.Group[] = []

      // Case: structural rails, rear tray, PSU shroud and a nearly invisible glass side.
      const caseGroup = new THREE.Group()
      for (const x of [-3, 3]) {
        for (const z of [-1.95, 1.95]) addBox(caseGroup, [0.13, 6, 0.13], [x, 0, z], graphiteSoft, 0.03)
      }
      for (const y of [-3, 3]) {
        for (const z of [-1.95, 1.95]) addBox(caseGroup, [6.1, 0.13, 0.13], [0, y, z], graphiteSoft, 0.03)
        for (const x of [-3, 3]) addBox(caseGroup, [0.13, 0.13, 4], [x, y, 0], graphiteSoft, 0.03)
      }
      addBox(caseGroup, [5.72, 5.72, 0.12], [0, 0, -1.88], graphite, 0.05)
      addBox(caseGroup, [5.72, 0.72, 3.75], [0, -2.55, -0.05], black, 0.08)
      const glass = addBox(caseGroup, [5.76, 5.76, 0.055], [0, 0, 2], glassMaterial, 0.04)
      glass.castShadow = false
      registerPart('case', caseGroup, [0, 0, 0], [0, -5.8, -2.4], [0.08, 0.22, -0.08])

      // Motherboard with a real geometry hierarchy: PCB, socket, slots, heatsinks and traces.
      const motherboard = new THREE.Group()
      addBox(motherboard, [4.15, 4.45, 0.13], [0, 0, 0], pcb, 0.08)
      addBox(motherboard, [1.18, 1.1, 0.16], [-0.25, 0.45, 0.13], graphiteSoft, 0.05)
      addBox(motherboard, [1.28, 0.46, 0.2], [-1.18, 1.55, 0.14], silver, 0.04)
      addBox(motherboard, [0.72, 0.72, 0.2], [1.28, -1.12, 0.14], graphiteSoft, 0.05)
      for (let slot = 0; slot < 4; slot += 1) {
        addBox(motherboard, [0.1, 2.3, 0.12], [0.55 + slot * 0.24, 0.55, 0.14], black, 0.025)
      }
      for (let index = 0; index < 8; index += 1) {
        const points = [
          new THREE.Vector3(-1.75, -1.65 + index * 0.23, 0.09),
          new THREE.Vector3(-0.7, -1.2 + index * 0.14, 0.09),
          new THREE.Vector3(0.1, -0.8 + index * 0.08, 0.09),
        ]
        const lineGeometry = keepGeometry(new THREE.BufferGeometry().setFromPoints(points))
        motherboard.add(new THREE.Line(lineGeometry, traceMaterial))
      }
      registerPart('motherboard', motherboard, [-0.45, 0.15, -1.49], [-5.2, 1.3, 3.7], [0.1, -0.35, 0.22])

      const cpu = new THREE.Group()
      addBox(cpu, [0.95, 0.95, 0.13], [0, 0, 0], silver, 0.07)
      addBox(cpu, [0.71, 0.71, 0.04], [0, 0, 0.085], graphiteSoft, 0.04)
      registerPart('cpu', cpu, [-0.7, 0.6, -1.22], [-0.2, 4.4, 4.4], [-0.35, 0.3, 0.18])

      const makeRam = (id: 'ram-left' | 'ram-right', x: number, offsetX: number) => {
        const group = new THREE.Group()
        addBox(group, [0.2, 2.02, 0.14], [0, 0, 0], graphiteSoft, 0.035)
        addBox(group, [0.11, 1.72, 0.17], [0, 0.05, 0.08], rgbMaterial, 0.03)
        return registerPart(id, group, [x, 0.68, -1.2], [offsetX, 4.2, 3.2], [0.1, 0.15, 0.4])
      }
      makeRam('ram-left', 0.23, 1.4)
      makeRam('ram-right', 0.56, 2.2)

      const storage = new THREE.Group()
      addBox(storage, [1.5, 0.34, 0.09], [0, 0, 0], pcb, 0.04)
      for (let index = 0; index < 4; index += 1) {
        addBox(storage, [0.2, 0.22, 0.07], [-0.42 + index * 0.28, 0, 0.08], black, 0.025)
      }
      addBox(storage, [0.16, 0.32, 0.05], [0.66, 0, 0.05], gold, 0.015)
      storage.rotation.z = -0.18
      registerPart('storage', storage, [-1.05, -0.42, -1.19], [-4.2, -0.4, 3.5], [-0.08, 0.25, -0.28])

      const psu = new THREE.Group()
      addBox(psu, [2.25, 1.08, 2.35], [0, 0, 0], black, 0.11)
      const psuFan = makeFan(0.42, rgbMaterial, graphiteSoft, geometries)
      psuFan.group.position.set(0, 0, 1.2)
      psu.add(psuFan.group)
      rotors.push(psuFan.rotor)
      registerPart('psu', psu, [-1.55, -2.15, -0.5], [-4.8, -2.2, 3.5], [0.3, -0.5, 0.18])

      const gpu = new THREE.Group()
      addBox(gpu, [4.35, 1.35, 0.48], [0, 0, 0], graphite, 0.13)
      addBox(gpu, [4.02, 1.08, 0.12], [0, 0, 0.29], black, 0.1)
      for (const x of [-1.15, 1.15]) {
        const gpuFan = makeFan(0.45, rgbMaterial, black, geometries)
        gpuFan.group.position.set(x, 0, 0.37)
        gpu.add(gpuFan.group)
        rotors.push(gpuFan.rotor)
      }
      addBox(gpu, [2.25, 0.1, 0.07], [0.1, -0.7, 0], gold, 0.015)
      registerPart('gpu', gpu, [-0.25, -1.08, -0.35], [5.4, -0.4, 3.8], [0.22, -0.42, -0.16])

      // AIO and air tower are built together; selection decides which representation is visible.
      const cooling = new THREE.Group()
      const cpuBlock = new THREE.Group()
      addBox(cpuBlock, [0.82, 0.82, 0.34], [0, 0, 0], graphiteSoft, 0.16)
      addBox(cpuBlock, [0.55, 0.55, 0.1], [0, 0, 0.2], rgbMaterial, 0.12)
      cpuBlock.position.set(-0.68, 0.6, 0.15)
      cooling.add(cpuBlock)
      const radiator = new THREE.Group()
      addBox(radiator, [4.35, 0.28, 1.28], [0, 0, 0], black, 0.06)
      radiator.position.set(0, 2.58, 0.05)
      cooling.add(radiator)
      const tubeCurves = [
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.92, 0.82, 0.08),
          new THREE.Vector3(-1.2, 1.55, 0.3),
          new THREE.Vector3(-1.55, 2.4, 0.2),
        ]),
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.45, 0.82, 0.08),
          new THREE.Vector3(-0.2, 1.55, 0.38),
          new THREE.Vector3(0.2, 2.4, 0.22),
        ]),
      ]
      for (const curve of tubeCurves) {
        const tube = new THREE.Mesh(keepGeometry(new THREE.TubeGeometry(curve, 28, 0.06, 8, false)), cableMaterial)
        tube.castShadow = true
        cooling.add(tube)
      }
      const coolingGroup = registerPart('cooling', cooling, [-0.45, 0.15, -1.08], [0, 5, 3.9], [-0.22, 0.25, 0.16])

      const airTower = new THREE.Group()
      addBox(airTower, [1.15, 2.05, 1.35], [-0.68, 0.62, 0.04], silver, 0.08)
      const airFan = makeFan(0.52, rgbMaterial, graphiteSoft, geometries)
      airFan.group.position.set(-0.68, 0.62, 0.75)
      airTower.add(airFan.group)
      rotors.push(airFan.rotor)
      coolingGroup.add(airTower)

      const coolingFans = new THREE.Group()
      for (let index = 0; index < 3; index += 1) {
        const fan = makeFan(0.48, rgbMaterial, graphiteSoft, geometries)
        fan.group.position.set(-1.35 + index * 1.35, 2.55, 0.72)
        fan.group.rotation.x = Math.PI / 2
        coolingFans.add(fan.group)
        rotors.push(fan.rotor)
      }
      for (let index = 0; index < 3; index += 1) {
        const fan = makeFan(0.53, rgbMaterial, graphiteSoft, geometries)
        fan.group.position.set(2.78, 1.35 - index * 1.35, 0.18)
        fan.group.rotation.y = Math.PI / 2
        coolingFans.add(fan.group)
        rotors.push(fan.rotor)
      }
      registerPart('cooling-fans', coolingFans, [0, 0, 0], [4.5, 3.8, 1.8], [0.18, -0.22, 0.26])

      const pulsePaths: PulsePath[] = []
      const makeCable = (
        id: 'motherboard-power' | 'gpu-power',
        points: THREE.Vector3[],
        exploded: [number, number, number],
        offset: number,
      ) => {
        const group = new THREE.Group()
        const curve = new THREE.CatmullRomCurve3(points)
        const cable = new THREE.Mesh(
          keepGeometry(new THREE.TubeGeometry(curve, 42, 0.055, 8, false)),
          cableMaterial,
        )
        cable.castShadow = true
        group.add(cable)
        const pulse = new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(0.095, 16, 12)), pulseMaterial)
        pulse.visible = false
        group.add(pulse)
        pulsePaths.push({ group, curve, pulse, offset })
        registerPart(id, group, [0, 0, 0], exploded, [0.12, 0.2, 0.15])
      }
      makeCable(
        'motherboard-power',
        [
          new THREE.Vector3(-1.35, -1.85, -0.15),
          new THREE.Vector3(-2.15, -0.7, 0.2),
          new THREE.Vector3(-2.15, 1.45, -0.8),
          new THREE.Vector3(-1.9, 1.65, -1.2),
        ],
        [-3.4, -1.5, 2.8],
        0,
      )
      makeCable(
        'gpu-power',
        [
          new THREE.Vector3(-0.75, -1.95, -0.1),
          new THREE.Vector3(0.4, -1.65, 0.55),
          new THREE.Vector3(1.15, -0.85, 0.3),
          new THREE.Vector3(1.55, -0.75, -0.15),
        ],
        [3.8, -2.3, 2.5],
        0.42,
      )

      const diagnosticLineMaterial = keepMaterial(
        new THREE.LineBasicMaterial({
          color: 0xe8b23a,
          transparent: true,
          opacity: 0.94,
          depthTest: false,
          depthWrite: false,
        }),
      )
      const diagnosticSolidMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0xe8b23a,
          transparent: true,
          opacity: 0.96,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      )
      const diagnosticConeGeometry = keepGeometry(new THREE.ConeGeometry(0.085, 0.24, 12))
      const diagnosticRingGeometry = keepGeometry(new THREE.RingGeometry(0.22, 0.31, 32))
      const diagnosticMarkers = new Map<PcScenePartId, DiagnosticMarker>()
      const coneUp = new THREE.Vector3(0, 1, 0)

      for (const part of animatedParts) {
        const target = part.home.clone()
        target.z += DIAGNOSTIC_TARGET_Z[part.id]
        const origin = target.clone().add(new THREE.Vector3(...DIAGNOSTIC_MARKER_OFFSETS[part.id]))
        const marker = new THREE.Group()
        marker.name = `pc-diagnostic-${part.id}`
        marker.visible = false
        marker.renderOrder = 30

        const lineGeometry = keepGeometry(
          new THREE.BufferGeometry().setFromPoints([origin, target]),
        )
        const line = new THREE.Line(lineGeometry, diagnosticLineMaterial)
        line.renderOrder = 30
        marker.add(line)

        const arrow = new THREE.Mesh(diagnosticConeGeometry, diagnosticSolidMaterial)
        arrow.position.copy(target)
        arrow.quaternion.setFromUnitVectors(coneUp, target.clone().sub(origin).normalize())
        arrow.renderOrder = 31
        marker.add(arrow)

        const ring = new THREE.Mesh(diagnosticRingGeometry, diagnosticSolidMaterial)
        ring.position.copy(target)
        ring.renderOrder = 31
        marker.add(ring)

        const light = new THREE.PointLight(0xe8b23a, 0, 2.15, 2)
        light.position.copy(target)
        marker.add(light)

        root.add(marker)
        diagnosticMarkers.set(part.id, { group: marker, ring, light })
      }

      const groundMaterial = keepMaterial(new THREE.ShadowMaterial({ color: 0x020608, opacity: 0.28 }))
      const groundGeometry = keepGeometry(new THREE.PlaneGeometry(16, 12))
      const ground = new THREE.Mesh(groundGeometry, groundMaterial)
      ground.position.set(0, -3.15, 0)
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground)

      const resize = () => {
        const rect = host.getBoundingClientRect()
        const width = Math.max(1, Math.round(rect.width))
        const height = Math.max(1, Math.round(rect.height))
        renderer.setSize(width, height, false)
        if (width >= 640) {
          camera.position.set(7.65, 4.25, 11.75)
        } else {
          camera.position.set(8.7, 4.8, 13.4)
        }
        camera.lookAt(0, -0.05, -0.2)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      resize()
      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host)

      let visible = true
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting)
        },
        { rootMargin: '180px 0px' },
      )
      intersectionObserver.observe(host)

      const pointer = new THREE.Vector2()
      const pointerTarget = new THREE.Vector2()
      const onPointerMove = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect()
        pointerTarget.set(
          THREE.MathUtils.clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -1, 1),
          THREE.MathUtils.clamp(-(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1), -1, 1),
        )
      }
      const onPointerLeave = () => pointerTarget.set(0, 0)
      renderer.domElement.addEventListener('pointermove', onPointerMove)
      renderer.domElement.addEventListener('pointerleave', onPointerLeave)

      const onContextLost = (event: Event) => {
        event.preventDefault()
        setFailed(true)
        onLost?.()
      }
      renderer.domElement.addEventListener('webglcontextlost', onContextLost)

      const sceneWindow = window as SceneWindow
      let raf = 0
      let ready = false
      let previousTime = performance.now()
      let powerMix = 0
      const partTarget = new THREE.Vector3()
      const partQuaternion = new THREE.Quaternion()
      const rgbColor = new THREE.Color()
      const rgbBaseColor = new THREE.Color(0x19343b)
      const rgbBaseEmissive = new THREE.Color(0x041014)
      let visiblePartsSnapshot: PcScenePartId[] | undefined
      let visibleSet = new Set<PcScenePartId>()
      let diagnosticSlotsSnapshot: readonly BuildSlot[] | undefined
      let diagnosticSet = new Set<PcScenePartId>()

      const frame = (time: number) => {
        raf = requestAnimationFrame(frame)
        const delta = Math.min(0.05, (time - previousTime) / 1000)
        previousTime = time
        if (!visible && ready) return

        const snapshot = snapshotRef.current
        if (snapshot.plan.visibleParts !== visiblePartsSnapshot) {
          visiblePartsSnapshot = snapshot.plan.visibleParts
          visibleSet = new Set(visiblePartsSnapshot)
        }
        if (snapshot.diagnosticSlots !== diagnosticSlotsSnapshot) {
          diagnosticSlotsSnapshot = snapshot.diagnosticSlots
          diagnosticSet = new Set(scenePartsForSlots(diagnosticSlotsSnapshot))
        }
        sceneWindow.__pcBuilderState = {
          ...snapshot.plan,
          powered: snapshot.powered,
          checking: snapshot.checking,
          diagnosticSlots: snapshot.diagnosticSlots,
        }
        const reduced = reducedQuery.matches

        for (const part of animatedParts) {
          const target = visibleSet.has(part.id) ? 1 : 0
          const response = reduced ? 1 : 1 - Math.exp(-delta * (target > part.current ? 5.2 : 7.5))
          part.current = THREE.MathUtils.lerp(part.current, target, response)
          if (Math.abs(part.current - target) < 0.001) part.current = target
          const eased = THREE.MathUtils.smoothstep(part.current, 0, 1)
          partTarget.lerpVectors(part.exploded, part.home, eased)
          part.group.position.copy(partTarget)
          partQuaternion.copy(part.explodedQuaternion).slerp(part.homeQuaternion, eased)
          part.group.quaternion.copy(partQuaternion)
          part.group.scale.setScalar(0.84 + eased * 0.16)
          part.group.visible = part.current > 0.008
        }

        for (const [id, marker] of diagnosticMarkers) {
          const active =
            snapshot.diagnosticTone !== null && diagnosticSet.has(id) && visibleSet.has(id)
          marker.group.visible = active
          if (active) {
            const pulse = reduced ? 1 : 1 + Math.sin(time * 0.0065 + id.length) * 0.1
            marker.ring.scale.setScalar(pulse)
            marker.light.intensity = reduced ? 2.1 : 1.85 + pulse * 0.45
          } else {
            marker.light.intensity = 0
          }
        }

        const isAir = snapshot.coolingType === 'aire'
        airTower.visible = isAir
        radiator.visible = !isAir
        for (const tube of cooling.children) {
          if (tube === cpuBlock || tube === radiator || tube === airTower) continue
          tube.visible = !isAir
        }

        const powerTarget = snapshot.powered ? 1 : 0
        powerMix = THREE.MathUtils.lerp(powerMix, powerTarget, reduced ? 1 : 1 - Math.exp(-delta * 2.7))
        const hue = reduced ? 0.53 : 0.57 + Math.sin(time * 0.00042) * 0.055
        rgbColor.setHSL(hue, 0.92, 0.46)
        rgbMaterial.color.copy(rgbBaseColor).lerp(rgbColor, powerMix * 0.82)
        rgbMaterial.emissive.copy(rgbBaseEmissive).lerp(rgbColor, powerMix)
        rgbMaterial.emissiveIntensity = 0.22 + powerMix * 1.85
        pulseMaterial.color.copy(rgbColor)
        pulseMaterial.opacity = powerMix * 0.95
        rgbLight.color.copy(rgbColor)
        rgbLight.intensity = powerMix * 2.6
        guideMaterial.opacity = 0.1 + powerMix * 0.08
        traceMaterial.opacity = 0.28 + powerMix * 0.55

        if (!reduced) {
          const speed = delta * 10.5 * powerMix
          for (const rotor of rotors) rotor.rotation.z -= speed
        }

        for (const path of pulsePaths) {
          const cableVisible = !reduced && path.group.visible && powerMix > 0.04
          path.pulse.visible = cableVisible
          if (cableVisible) {
            const travel = (time * 0.00042 + path.offset) % 1
            path.pulse.position.copy(path.curve.getPointAt(travel))
            path.pulse.scale.setScalar(0.7 + Math.sin(time * 0.012 + path.offset * 10) * 0.18)
          }
        }

        pointer.lerp(pointerTarget, 0.065)
        if (!reduced) {
          root.rotation.x = -0.08 + pointer.y * 0.06 + Math.sin(time * 0.00045) * 0.012
          root.rotation.y = -0.42 + pointer.x * 0.1 + Math.sin(time * 0.00031) * 0.018
          root.position.y = 0.15 + Math.sin(time * 0.0006) * 0.035
        }

        renderer.render(scene, camera)
        if (!ready) {
          ready = true
          sceneWindow.__pcBuilderReady = true
          onReady?.()
        }
      }
      raf = requestAnimationFrame(frame)

      cleanup = () => {
        cancelAnimationFrame(raf)
        resizeObserver.disconnect()
        intersectionObserver.disconnect()
        renderer.domElement.removeEventListener('pointermove', onPointerMove)
        renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
        for (const geometry of geometries) geometry.dispose()
        for (const material of materials) material.dispose()
        environment.dispose()
        renderer.forceContextLoss()
        renderer.dispose()
        renderer.domElement.remove()
        sceneWindow.__pcBuilderReady = false
        delete sceneWindow.__pcBuilderState
      }
    } catch {
      queueMicrotask(() => setFailed(true))
      onLost?.()
    }

    return () => cleanup?.()
  }, [onLost, onReady])

  if (failed) return null
  return <div ref={hostRef} className={className} aria-hidden="true" />
}
