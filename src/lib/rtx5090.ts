/** Proporciones públicas de la FE; interior ilustrativo, no un plano de fabricación.
 * Reconstrucción por código guiada por img2threejs (Apache-2.0).
 */
export const RTX5090 = {
  name: 'GeForce RTX 5090',
  edition: 'Founders Edition',
  dimensionsMm: [304, 137, 40],
  memory: '32 GB GDDR7',
  bus: '512 bit',
  cuda: '21.760',
  power: '575 W',
  source: 'https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/',
} as const

export const GPU_PARTS = [
  { id: 'frame', es: 'Carcasa', pt: 'Carcaça', home: [0, 0.29, 0], offset: [0, 1.38, 0], delay: 0.02 },
  { id: 'fan-a', es: 'Ventilador 01', pt: 'Ventoinha 01', home: [-1.65, 0.27, 0], offset: [-0.28, 2.65, 0], delay: 0 },
  { id: 'fan-b', es: 'Ventilador 02', pt: 'Ventoinha 02', home: [1.65, 0.27, 0], offset: [0.28, 2.65, 0], delay: 0.04 },
  { id: 'fins-a', es: 'Disipador 01', pt: 'Dissipador 01', home: [-1.68, -0.02, 0], offset: [-0.65, 0.40, 0], delay: 0.10 },
  { id: 'fins-b', es: 'Disipador 02', pt: 'Dissipador 02', home: [1.68, -0.02, 0], offset: [0.65, 0.40, 0], delay: 0.10 },
  { id: 'vapor', es: 'Cámara de vapor', pt: 'Câmara de vapor', home: [0, -0.27, 0], offset: [0, -0.28, 0], delay: 0.18 },
  { id: 'pcb', es: 'PCB · GPU · GDDR7', pt: 'PCB · GPU · GDDR7', home: [0, -0.40, 0], offset: [0, -1.05, 0.12], delay: 0.24 },
  { id: 'backplate', es: 'Placa posterior', pt: 'Placa traseira', home: [0, -0.47, 0], offset: [0, -1.70, 0.12], delay: 0.18 },
  { id: 'io', es: 'Soporte y salidas', pt: 'Suporte e saídas', home: [-3.09, -0.06, 0], offset: [-0.85, -0.2, 0], delay: 0.08 },
] as const

export type GpuPartId = typeof GPU_PARTS[number]['id']

/** Ida y vuelta simétricas; desfase por capa sin historial ni acumulación. */
export function gpuOpening(progress: number): number {
  return Math.sin(Math.PI * Math.min(1, Math.max(0, progress))) ** 2
}
export function gpuPartOpening(opening: number, delay: number): number {
  const t = Math.min(1, Math.max(0, (opening - delay) / (1 - delay)))
  return t * t * (3 - 2 * t)
}
