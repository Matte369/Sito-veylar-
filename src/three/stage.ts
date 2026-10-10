import * as THREE from 'three'
import { ACCENT, buildCar, energyPaths, type Part, type PartKey } from './car'

export type Chapter = {
  id: string
  title: string
  body: string
  /** Scroll progress range (0-1) where the chapter is on screen. */
  range: [number, number]
  focus: PartKey[]
  labels: { part: PartKey; text: string }[]
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'hero',
    title: 'Energy, reimagined.',
    body: 'An Italian electric car platform that generates its own energy on board, from bioethanol and water.',
    range: [0, 0.09],
    focus: [],
    labels: [],
  },
  {
    id: 'platform',
    title: 'Built from the platform up.',
    body: 'Under the body sits a flat electric platform. Every part of the energy system is designed into it from the start.',
    range: [0.12, 0.27],
    focus: [],
    labels: [
      { part: 'body', text: 'Body' },
      { part: 'frame', text: 'Platform' },
    ],
  },
  {
    id: 'drive',
    title: 'Battery and electric drive.',
    body: 'A low battery pack and an electric motor on each axle give balance and instant response. The battery works together with an onboard energy source.',
    range: [0.3, 0.45],
    focus: ['batteryModules', 'motorF', 'motorR'],
    labels: [
      { part: 'batteryModules', text: 'Battery pack' },
      { part: 'motorF', text: 'Front e-motor' },
      { part: 'motorR', text: 'Rear e-motor' },
    ],
  },
  {
    id: 'hydrogen',
    title: 'Hydrogen, made on board.',
    body: 'A compact unit generates hydrogen from bioethanol and water. A fuel cell turns it into electricity while you drive.',
    range: [0.48, 0.62],
    focus: ['genUnit', 'fuelCell', 'ethanolTank', 'waterTank'],
    labels: [
      { part: 'genUnit', text: 'Hydrogen generation' },
      { part: 'fuelCell', text: 'Fuel cell' },
      { part: 'ethanolTank', text: 'Bioethanol' },
      { part: 'waterTank', text: 'Water' },
    ],
  },
  {
    id: 'power',
    title: 'Power, managed intelligently.',
    body: 'Control software balances fuel cell output and battery charge moment by moment, adapting to the way you drive.',
    range: [0.65, 0.79],
    focus: ['power'],
    labels: [
      { part: 'power', text: 'Power electronics' },
      { part: 'batteryModules', text: 'Battery' },
      { part: 'fuelCell', text: 'Fuel cell' },
    ],
  },
  {
    id: 'further',
    title: 'Freedom to go further.',
    body: 'A platform designed for extended range and a more flexible relationship with energy. This is the car VEYLAR is developing.',
    range: [0.9, 1.01],
    focus: [],
    labels: [],
  },
]

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** How present a chapter is at a given progress, with soft edges. */
export function chapterWeight(c: Chapter, p: number, fade = 0.03) {
  return smooth(c.range[0] - fade, c.range[0], p) * (1 - smooth(c.range[1], c.range[1] + fade, p))
}

/** Photo studio for reflections: grey cove with large soft light panels. */
function studioEnvironment() {
  const env = new THREE.Scene()
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(30, 14, 30),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#8e939a'), side: THREE.BackSide }),
  )
  room.position.y = 5
  env.add(room)
  const panel = (w: number, h: number, intensity: number, pos: [number, number, number], rot: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide }),
    )
    m.position.set(...pos)
    m.rotation.set(...rot)
    env.add(m)
  }
  panel(14, 3.5, 6, [0, 11.5, 0], [Math.PI / 2, 0, 0]) // overhead softbox, long highlight on the roof and hood
  panel(10, 2.2, 3.2, [0, 4, -14.5], [0, 0, 0]) // back strip
  panel(10, 2.2, 3.2, [0, 4, 14.5], [0, Math.PI, 0]) // front strip, the line along the flanks
  panel(2.2, 8, 2.4, [14.5, 4, 0], [0, -Math.PI / 2, 0])
  panel(2.2, 8, 2.4, [-14.5, 4, 0], [0, Math.PI / 2, 0])
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: '#c7cbd0' }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.9
  env.add(floor)
  return env
}

/** Soft ambient-occlusion blob that grounds the car on the floor. */
function contactShadow() {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(20,24,30,0.55)')
  grad.addColorStop(0.55, 'rgba(20,24,30,0.28)')
  grad.addColorStop(1, 'rgba(20,24,30,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.003
  mesh.renderOrder = -1
  return mesh
}

export class VeylarStage {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  private pivot = new THREE.Group()
  private parts: Part[]
  private flow: { tube: THREE.Mesh; curve: THREE.CatmullRomCurve3; pulses: THREE.Mesh[] }[] = []
  private flowMat: THREE.MeshStandardMaterial
  private highlight = new Map<PartKey, number>()
  private width = 1
  private height = 1
  private tmp = new THREE.Vector3()
  private target = new THREE.Vector3()

  /** Showcase mode: car centred in its canvas, no layout offset. */
  centered = false

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(studioEnvironment(), 0.02).texture
    pmrem.dispose()

    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(3, 8, 4)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -5
    key.shadow.camera.right = 5
    key.shadow.camera.top = 5
    key.shadow.camera.bottom = -5
    key.shadow.radius = 6
    key.shadow.bias = -0.0005
    this.scene.add(key, new THREE.HemisphereLight(0xf4f6f8, 0xc9ccd0, 0.6))

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ color: 0x2a3038, opacity: 0.12 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const car = buildCar()
    this.parts = car.parts
    this.pivot.add(car.root)
    car.root.add(contactShadow())
    this.scene.add(this.pivot)
    for (const p of this.parts) {
      for (const m of p.materials) m.emissive = ACCENT.clone()
    }

    this.flowMat = new THREE.MeshStandardMaterial({
      color: ACCENT,
      emissive: ACCENT,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.9,
    })
    const pulseGeo = new THREE.SphereGeometry(0.035, 16, 16)
    const pulseMat = new THREE.MeshBasicMaterial({ color: '#ffd9c4' })
    for (const curve of energyPaths(this.parts)) {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.012, 8, false), this.flowMat)
      const pulses = [0, 1, 2].map(() => new THREE.Mesh(pulseGeo, pulseMat))
      car.root.add(tube, ...pulses)
      this.flow.push({ tube, curve, pulses })
    }
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    // Desktop: push the car to the right of the copy. Portrait: lift it above the copy.
    if (this.centered) this.camera.clearViewOffset()
    else if (width >= 900) this.camera.setViewOffset(width, height, -width * 0.12, 0, width, height)
    else this.camera.setViewOffset(width, height, 0, height * 0.16, width, height)
    this.camera.updateProjectionMatrix()
  }

  /** Renders one frame for scroll progress p (0-1). */
  update(p: number, time: number, sway: boolean, spin?: number) {
    const lift = smooth(0.08, 0.24, p) * (1 - smooth(0.85, 0.95, p))
    const spread = smooth(0.24, 0.38, p) * (1 - smooth(0.79, 0.88, p))
    const open = Math.max(lift, spread)

    for (const part of this.parts) {
      const amount = part.phase === 'body' ? lift : spread
      part.group.position.copy(part.group.userData.home).addScaledVector(part.explode, easeInOut(amount))
    }

    const idle = sway ? Math.sin(time * 0.4) * 0.06 * (1 - smooth(0.02, 0.1, p)) : 0
    this.pivot.rotation.y = -0.7 + easeInOut(smooth(0.05, 0.96, p)) * Math.PI * 2 + idle
    if (spin !== undefined) this.pivot.rotation.y = spin

    // Frame the car: wider shot when exploded, lower eye line when assembled.
    const portrait = this.width < 900
    const radius = lerp(2.75, 3.6, open) * (portrait ? 0.94 : 1.06)
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect)
    const dist = radius / Math.tan(Math.min(vHalf, hHalf * (portrait ? 1 : 0.8)))
    const elev = lerp(0.14, 0.22, open)
    this.target.set(0, lerp(0.62, 1.35, open), 0)
    this.camera.position.set(0, this.target.y + Math.sin(elev) * dist, Math.cos(elev) * dist)
    this.camera.lookAt(this.target)

    // Accent glow on the components the current chapter talks about.
    const want = new Map<PartKey, number>()
    for (const c of CHAPTERS) {
      const w = chapterWeight(c, p)
      for (const k of c.focus) want.set(k, Math.max(want.get(k) ?? 0, w))
    }
    for (const part of this.parts) {
      const cur = this.highlight.get(part.key) ?? 0
      const next = lerp(cur, want.get(part.key) ?? 0, 0.15)
      this.highlight.set(part.key, next)
      for (const m of part.materials) m.emissiveIntensity = next * 0.12
    }

    // Energy flow: paths draw in, then pulses travel along them.
    const flow = smooth(0.62, 0.7, p) * (1 - smooth(0.79, 0.83, p))
    for (const f of this.flow) {
      const idx = f.tube.geometry.index!
      f.tube.geometry.setDrawRange(0, Math.floor(idx.count * flow))
      f.tube.visible = flow > 0.001
      f.pulses.forEach((pulse, i) => {
        pulse.visible = flow > 0.95
        if (pulse.visible) pulse.position.copy(f.curve.getPointAt((time * 0.35 + i / 3) % 1))
      })
    }

    this.renderer.render(this.scene, this.camera)
  }

  /** Screen position (CSS px) of a part's label anchor. */
  project(key: PartKey) {
    const part = this.parts.find((x) => x.key === key)!
    this.tmp.copy(part.anchor)
    part.group.localToWorld(this.tmp)
    this.tmp.project(this.camera)
    return {
      x: (this.tmp.x * 0.5 + 0.5) * this.width,
      y: (-this.tmp.y * 0.5 + 0.5) * this.height,
      inFront: this.tmp.z < 1,
    }
  }

  dispose() {
    this.renderer.dispose()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry.dispose()
        const m = mesh.material
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m.dispose()
      }
    })
  }
}
