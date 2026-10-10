import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Illustrative VEYLAR concept car, built procedurally.
 * Units are metres. +X is the front of the car, +Y is up, Z is across the width.
 * Components are deliberately generic housings: the model shows where systems
 * sit and how they relate, never how they are built inside.
 */

export type PartKey =
  | 'body'
  | 'seats'
  | 'batteryCover'
  | 'batteryModules'
  | 'frame'
  | 'motorF'
  | 'motorR'
  | 'wheelFL'
  | 'wheelFR'
  | 'wheelRL'
  | 'wheelRR'
  | 'fuelCell'
  | 'genUnit'
  | 'ethanolTank'
  | 'waterTank'
  | 'power'
  | 'radiator'

export type Part = {
  key: PartKey
  group: THREE.Group
  /** Offset applied when the car is fully exploded, in car space. */
  explode: THREE.Vector3
  /** 'body' lifts first, 'parts' separate afterwards. */
  phase: 'body' | 'parts'
  materials: THREE.MeshPhysicalMaterial[]
  /** Where a label leader line attaches, in part-local space. */
  anchor: THREE.Vector3
}

export const ACCENT = new THREE.Color('#e0954a')

const L = 4.6 // overall length
const AXLE_F = 1.47
const AXLE_R = -1.48
const WHEEL_R = 0.365
const TRACK = 0.84 // wheel centre distance from the centreline

type MatOpts = THREE.MeshPhysicalMaterialParameters

function physical(opts: MatOpts) {
  return new THREE.MeshPhysicalMaterial({ envMapIntensity: 1, ...opts })
}

const palette = {
  paint: (): MatOpts => ({
    color: '#8e8a83',
    metalness: 0.8,
    roughness: 0.3,
    envMapIntensity: 1.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.08,
  }),
  glass: (): MatOpts => ({ color: '#0c0d0f', metalness: 0.5, roughness: 0.03, clearcoat: 1, envMapIntensity: 1, side: THREE.DoubleSide }),
  trim: (): MatOpts => ({ color: '#2a2d31', metalness: 0.4, roughness: 0.55 }),
  graphite: (): MatOpts => ({ color: '#3b3f45', metalness: 0.7, roughness: 0.4 }),
  aluminium: (): MatOpts => ({ color: '#c3c7cc', metalness: 0.9, roughness: 0.35 }),
  satin: (): MatOpts => ({ color: '#dfe2e5', metalness: 0.25, roughness: 0.5 }),
  rubber: (): MatOpts => ({ color: '#1d1e20', metalness: 0, roughness: 0.92 }),
  copper: (): MatOpts => ({ color: '#b07a56', metalness: 0.85, roughness: 0.35 }),
}


/* ---------- Hypercar body, built from cross-sections ---------- */

/** Smooth curve through [x, value] control points (Catmull-Rom), clamped at the ends. */
function profile(points: [number, number][]) {
  const pts = [...points].sort((a, b) => a[0] - b[0])
  return (x: number) => {
    if (x <= pts[0][0]) return pts[0][1]
    if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1]
    let i = 0
    while (x > pts[i + 1][0]) i++
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const t = (x - p1[0]) / (p2[0] - p1[0])
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0])
    const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0])
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2
  }
}

const NOSE = 2.3
const TAIL = -2.3
const FLOOR = 0.13
const SILL = 0.2
const ARCH = 0.43

// Proportions read off the VEYLAR design board (side, top, front and rear views).
const halfWidth = profile([
  [-2.3, 0.88], [-2.0, 0.98], [-1.45, 1.03], [-0.9, 0.99], [-0.2, 0.93], [0.6, 0.92], [1.45, 0.99], [1.95, 0.9], [2.3, 0.56],
])
const shoulder = profile([
  [-2.3, 0.86], [-2.0, 0.9], [-1.5, 0.93], [-0.9, 0.84], [0.2, 0.71], [0.9, 0.73], [1.5, 0.79], [1.95, 0.58], [2.3, 0.3],
])
const centre = profile([
  [-2.3, 0.86], [-1.9, 0.9], [-1.2, 0.88], [-0.9, 0.72], [0.9, 0.7], [1.15, 0.66], [1.6, 0.6], [2.0, 0.47], [2.3, 0.27],
])

function archTop(x: number) {
  let a = SILL
  for (const ax of [AXLE_F, AXLE_R]) {
    const dx = x - ax
    if (Math.abs(dx) < ARCH) a = Math.max(a, WHEEL_R + Math.sqrt(ARCH * ARCH - dx * dx))
  }
  return a
}

/** Half cross-section at x, from bottom centre round the flank to top centre. [z, y] */
function section(x: number): [number, number][] {
  const W = halfWidth(x)
  const a = archTop(x)
  const c = centre(x)
  const sh = Math.max(shoulder(x), a + 0.16)
  const inner = Math.min(0.64, W * 0.7)
  const lo = a + 0.045
  const hi = sh - 0.06
  return [
    [0, FLOOR],
    [inner, FLOOR],
    [inner, a],
    [W * 0.955, a],
    [W, lo],
    [W * 1.004, (lo + hi) / 2],
    [W * 0.985, hi],
    [W * 0.945, sh],
    [W * 0.74, sh + 0.035],
    [W * 0.42, Math.max(c, sh - 0.12) + 0.03],
    [W * 0.16, c + 0.006],
    [0, c],
  ]
}
/** Segments of the half-section drawn in satin black (floor, wheel wells, lower lip). */
const BLACK_SEGMENTS = new Set([0, 1, 2, 3])

/** Top surface height at (x, |z|), interpolated along the upper part of the section. */
function topY(x: number, z: number) {
  const s = section(x).slice(7)
  const az = Math.abs(z)
  for (let i = 0; i < s.length - 1; i++) {
    const [z0, y0] = s[i]
    const [z1, y1] = s[i + 1]
    if (az <= z0 && az >= z1) return y0 + ((az - z0) / (z1 - z0)) * (y1 - y0)
  }
  return s[s.length - 1][1]
}

/** Flank surface position at (x, y), interpolated along the side of the section. */
function flankZ(x: number, y: number) {
  const s = section(x).slice(3, 9)
  for (let i = 0; i < s.length - 1; i++) {
    const [z0, y0] = s[i]
    const [z1, y1] = s[i + 1]
    if (y >= y0 && y <= y1) return z0 + ((y - y0) / (y1 - y0 || 1)) * (z1 - z0)
  }
  return s[0][0]
}

/** Lofts the body through `stations` cross-sections; returns a creased, two-material mesh geometry. */
function loftBody(stations: number) {
  const pos: number[] = []
  const paintIdx: number[] = []
  const blackIdx: number[] = []
  let ringSize = 0
  for (let i = 0; i <= stations; i++) {
    const t = i / stations
    // Denser stations near the ends and the arches come from easing t.
    const x = TAIL + (NOSE - TAIL) * (0.5 - 0.5 * Math.cos(Math.PI * t))
    const half = section(x)
    const ring = [...half, ...half.slice(1, -1).reverse().map(([z, y]) => [-z, y] as [number, number])]
    ringSize = ring.length
    for (const [z, y] of ring) pos.push(x, y, z)
  }
  const halfSeg = section(0).length - 1
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < ringSize; j++) {
      const a = i * ringSize + j
      const b = i * ringSize + ((j + 1) % ringSize)
      const c = a + ringSize
      const d = b + ringSize
      const seg = j < halfSeg ? j : ringSize - 1 - j
      const target = BLACK_SEGMENTS.has(seg) ? blackIdx : paintIdx
      target.push(a, c, b, b, c, d)
    }
  }
  // Nose and tail faces: fans to their centroids, in black.
  for (const [start, flip] of [[0, true], [stations * ringSize, false]] as [number, boolean][]) {
    let cx = 0
    let cy = 0
    for (let j = 0; j < ringSize; j++) {
      cx += pos[(start + j) * 3]
      cy += pos[(start + j) * 3 + 1]
    }
    const centerIdx = pos.length / 3
    pos.push(cx / ringSize, cy / ringSize, 0)
    for (let j = 0; j < ringSize; j++) {
      const a = start + j
      const b = start + ((j + 1) % ringSize)
      if (flip) blackIdx.push(centerIdx, b, a)
      else blackIdx.push(centerIdx, a, b)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex([...paintIdx, ...blackIdx])
  geo.addGroup(0, paintIdx.length, 0)
  geo.addGroup(paintIdx.length, blackIdx.length, 1)
  return toCreasedNormals(geo, 0.5)
}

/** Canopy bubble: superellipse sections along a teardrop plan. */
function canopy() {
  const width = profile([[-1.15, 0.06], [-0.8, 0.42], [-0.2, 0.66], [0.4, 0.66], [0.9, 0.52], [1.14, 0.22]])
  const top = profile([[-1.15, 0.86], [-0.6, 1.04], [0.0, 1.12], [0.5, 1.06], [0.95, 0.82], [1.14, 0.68]])
  const n = 48
  const m = 32
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const x = -1.15 + (2.29 * i) / n
    const w = width(x)
    const base = centre(x) - 0.04
    const h = Math.max(0.02, top(x) - base)
    for (let j = 0; j <= m; j++) {
      const u = -1 + (2 * j) / m
      const y = base + h * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 2.4)), 1 / 2.4)
      pos.push(x, y, u * w)
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * (m + 1) + j
      const b = a + m + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return { geo, top }
}

function tube(points: THREE.Vector3[], radius: number, mat: THREE.Material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal')
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(48, points.length * 20), radius, 8, closed), mat)
}

/** Text plate for the VEYLAR wordmark on the nose and tail. */
function wordmark(width: number, height: number, color: string) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = Math.round((1024 * height) / width)
  const g = c.getContext('2d')!
  g.fillStyle = color
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `500 ${Math.round(c.height * 0.62)}px Archivo, Arial, sans-serif`
  const letters = 'VEYLAR'.split('')
  const step = c.width / (letters.length + 1)
  letters.forEach((l, i) => g.fillText(l, step * (i + 1), c.height / 2))
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
}

/** Perforated dark panel texture for the side intakes. */
function perforation() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#121214'
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#3a3a3e'
  for (let y = 0; y < 256; y += 10) {
    for (let x = (y / 10) % 2 ? 5 : 0; x < 256; x += 10) {
      g.beginPath()
      g.arc(x, y, 2, 0, Math.PI * 2)
      g.fill()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 4)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Side intake: a dark triangle laid on the flank, behind the front wheel and rising to the rear haunch. */
function sideIntake(side: 1 | -1, mat: THREE.Material) {
  const tri: [number, number][] = [[1.0, 0.25], [-1.03, 0.25], [-0.98, 0.74]]
  const n = 36
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  // Barycentric grid over the triangle, each vertex projected onto the flank.
  const vid = (i: number, j: number) => (i * (2 * n + 3 - i)) / 2 + j
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n - i; j++) {
      const a = i / n
      const b = j / n
      const c = 1 - a - b
      const x = tri[0][0] * c + tri[1][0] * a + tri[2][0] * b
      const y = tri[0][1] * c + tri[1][1] * a + tri[2][1] * b
      pos.push(x, y, side * (flankZ(x, y) + 0.004))
      uv.push((x + 1.1) / 2.2, (y - 0.2) / 0.6)
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) {
      const a = vid(i, j)
      const b = vid(i + 1, j)
      const c = vid(i, j + 1)
      idx.push(a, b, c)
      if (j < n - i - 1) idx.push(b, vid(i + 1, j + 1), c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, mat)
}

function bodyShell(materials: THREE.MeshPhysicalMaterial[]) {
  const g = new THREE.Group()
  const paint = physical(palette.paint())
  const black = physical({ color: '#141416', metalness: 0.35, roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide })
  const glass = physical(palette.glass())
  const intake = physical({ color: '#ffffff', map: perforation(), metalness: 0.4, roughness: 0.55, side: THREE.DoubleSide })
  const gold = physical({ color: '#b98b55', metalness: 1, roughness: 0.25 })
  materials.push(paint, black, glass, intake, gold)
  const amber = new THREE.MeshStandardMaterial({ color: '#ffb766', emissive: '#ff9a3c', emissiveIntensity: 2.6 })

  g.add(new THREE.Mesh(loftBody(180), [paint, black]))
  const cab = canopy()
  g.add(new THREE.Mesh(cab.geo, glass))

  for (const side of [1, -1] as const) {
    g.add(sideIntake(side, intake))

    // Y-shaped light signature: a long blade towards the badge, a short one down the front corner.
    const j = new THREE.Vector3(1.98, topY(1.98, 0.8) + 0.008, side * 0.8)
    const inward = [j, ...[2.05, 2.12, 2.19, 2.24].map((x, i) => {
      const z = 0.8 - (i + 1) * 0.11
      return new THREE.Vector3(x, topY(x, z) + 0.008, side * z)
    })]
    g.add(tube(inward, 0.011, amber))
    const down = [0.72, 0.6, 0.48, 0.36, 0.26].map((y, i) => {
      const x = 1.98 + i * 0.045
      return new THREE.Vector3(x, Math.min(y, shoulder(x) - 0.02), side * (flankZ(x, Math.min(y, shoulder(x) - 0.02)) + 0.006))
    })
    g.add(tube(down, 0.011, amber))

    // Camera mirror on a slim stalk.
    const mz = side * (halfWidth(0.85) * 0.78)
    const stalk = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.12, 0.03, 2, 0.01), black)
    stalk.position.set(0.85, topY(0.85, 0.72) + 0.05, mz)
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.11, 6, 12), paint)
    pod.rotation.z = Math.PI / 2
    pod.position.set(0.82, topY(0.85, 0.72) + 0.12, mz)
    g.add(stalk, pod)

    // Engine-deck vents behind the canopy.
    for (let k = 0; k < 7; k++) {
      const x = -1.2 - k * 0.11
      const z = side * 0.34
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.38), black)
      slat.position.set(x, topY(x, 0.34) + 0.012, z)
      slat.rotation.z = 0.5
      g.add(slat)
    }
  }

  // Gold line along the spine: nose, over the canopy, down the deck.
  const spine: THREE.Vector3[] = []
  for (let x = 2.22; x >= -2.2; x -= 0.1) {
    const onCanopy = x < 1.1 && x > -1.1
    const y = onCanopy ? Math.max(cab.top(x), topY(x, 0)) + 0.004 : topY(x, 0) + 0.006
    spine.push(new THREE.Vector3(x, y, 0))
  }
  g.add(tube(spine, 0.006, gold))

  // Rear: titanium upper fascia, a full-width light bar under it, a vertical blade in the diffuser.
  const fascia = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.17, halfWidth(TAIL) * 2 - 0.02, 3, 0.03), paint)
  fascia.position.set(TAIL - 0.005, shoulder(TAIL) - 0.06, 0)
  g.add(fascia)
  for (const side of [1, -1]) {
    const flank = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.5, 0.16, 3, 0.03), paint)
    flank.position.set(TAIL - 0.005, 0.5, side * (halfWidth(TAIL) - 0.09))
    flank.rotation.x = side * 0.25
    g.add(flank)
  }
  const bar = [-0.92, -0.7, -0.4, 0, 0.4, 0.7, 0.92].map((z) => new THREE.Vector3(TAIL - 0.05, 0.69 + (Math.abs(z) > 0.6 ? (Math.abs(z) - 0.6) * 0.35 : 0), z * halfWidth(TAIL)))
  g.add(tube(bar, 0.012, amber))
  g.add(tube([new THREE.Vector3(TAIL - 0.01, 0.5, 0), new THREE.Vector3(TAIL - 0.01, 0.22, 0)], 0.011, amber))
  for (const z of [-0.66, -0.42, -0.2, 0.2, 0.42, 0.66]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.012), black)
    fin.position.set(TAIL + 0.15, 0.24, z)
    g.add(fin)
  }
  const rearMark = wordmark(0.5, 0.06, '#d8d4cc')
  rearMark.rotation.y = -Math.PI / 2
  rearMark.position.set(TAIL - 0.048, 0.62, 0)
  g.add(rearMark)

  // Rear wing: a thin blade on two struts.
  const wing = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.02, 1.5, 2, 0.009), paint)
  wing.position.set(-2.14, 0.99, 0)
  wing.rotation.z = -0.08
  g.add(wing)
  for (const z of [-0.5, 0.5]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.02), black)
    strut.position.set(-2.12, 0.935, z)
    g.add(strut)
  }

  // Front: badge plate on the nose and a splitter.
  const frontMark = wordmark(0.42, 0.05, '#d8d4cc')
  frontMark.rotation.y = Math.PI / 2
  frontMark.position.set(NOSE + 0.006, 0.21, 0)
  g.add(frontMark)
  const splitter = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.02, 1.3, 2, 0.008), black)
  splitter.position.set(2.2, 0.12, 0)
  g.add(splitter)

  return g
}

function wheel(materials: THREE.MeshPhysicalMaterial[], side: 1 | -1) {
  const g = new THREE.Group()
  const rubber = physical(palette.rubber())
  const wall = physical({ color: '#202022', metalness: 0, roughness: 0.8 })
  const rim = physical({ color: '#18181a', metalness: 0.6, roughness: 0.3, clearcoat: 1 })
  const edge = physical({ color: '#8f8a82', metalness: 1, roughness: 0.2 })
  const disc = physical({ color: '#6d6f73', metalness: 0.9, roughness: 0.45 })
  const caliper = physical({ color: '#b98b55', metalness: 0.8, roughness: 0.3, clearcoat: 1 })
  materials.push(rubber, wall, rim, edge, disc, caliper)
  const out = side

  // Low-profile tyre.
  const inner = 0.27
  const half = 0.15
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector2(inner + ((WHEEL_R - 0.025 - inner) * i) / 8, -half * (0.9 + 0.1 * Math.sin((i / 8) * Math.PI))))
  for (let i = 0; i <= 40; i++) {
    const zz = -half + 0.02 + (i / 40) * (half * 2 - 0.04)
    const groove = [-0.07, 0, 0.07].some((gz) => Math.abs(zz - gz) < 0.005)
    pts.push(new THREE.Vector2(WHEEL_R - (groove ? 0.006 : 0), zz))
  }
  for (let i = 8; i >= 0; i--) pts.push(new THREE.Vector2(inner + ((WHEEL_R - 0.025 - inner) * i) / 8, half * (0.9 + 0.1 * Math.sin((i / 8) * Math.PI))))
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(pts, 112), rubber)
  tyre.rotation.x = Math.PI / 2
  const sidewall = new THREE.Mesh(new THREE.RingGeometry(inner + 0.008, WHEEL_R - 0.03, 96), wall)
  sidewall.position.z = out * half * 0.99
  if (out < 0) sidewall.rotation.y = Math.PI
  g.add(tyre, sidewall)

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(inner, inner, 0.28, 72, 1, true), rim)
  barrel.rotation.x = Math.PI / 2
  const lip = new THREE.Mesh(new THREE.TorusGeometry(inner - 0.004, 0.006, 8, 96), edge)
  lip.position.z = out * 0.13
  const discMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 64), disc)
  discMesh.rotation.x = Math.PI / 2
  discMesh.position.z = out * 0.02
  const cal = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.2, 0.07, 3, 0.02), caliper)
  cal.position.set(-0.19, 0.07, out * 0.045)
  cal.rotation.z = 0.35
  g.add(barrel, lip, discMesh, cal)

  // Five curved turbine blades, gloss black with a machined edge.
  const blade = new THREE.Shape()
  blade.moveTo(-0.03, 0.06)
  blade.quadraticCurveTo(0.05, 0.16, 0.02, inner - 0.006)
  blade.lineTo(-0.045, inner - 0.006)
  blade.quadraticCurveTo(-0.03, 0.15, -0.07, 0.07)
  blade.closePath()
  const bladeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 12 })
  bladeGeo.translate(0, 0, -0.015)
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(bladeGeo, rim)
    m.rotation.z = (i / 5) * Math.PI * 2
    m.position.z = out * 0.1
    if (out < 0) m.scale.x = -1
    g.add(m)
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.05, 40), rim)
  hub.rotation.x = Math.PI / 2
  hub.position.z = out * 0.1
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 6), edge)
  cap.rotation.x = Math.PI / 2
  cap.position.z = out * 0.128
  g.add(hub, cap)
  return g
}

function motor(materials: THREE.MeshPhysicalMaterial[]) {
  const g = new THREE.Group()
  const housing = physical(palette.aluminium())
  const dark = physical(palette.graphite())
  materials.push(housing, dark)
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 40), housing)
  can.rotation.x = Math.PI / 2
  can.position.z = -0.12
  g.add(can)
  const gearbox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.2), dark)
  gearbox.position.z = 0.18
  g.add(gearbox)
  for (const side of [-1, 1]) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12), dark)
    shaft.rotation.x = Math.PI / 2
    shaft.position.z = side * 0.52
    g.add(shaft)
  }
  return g
}

function capsule(radius: number, length: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 12, 32), mat)
  m.rotation.x = Math.PI / 2
  return m
}

export function buildCar() {
  const root = new THREE.Group()
  const parts: Part[] = []

  const add = (
    key: PartKey,
    build: (mats: THREE.MeshPhysicalMaterial[]) => THREE.Object3D,
    position: [number, number, number],
    explode: [number, number, number],
    phase: Part['phase'] = 'parts',
    anchor: [number, number, number] = [0, 0, 0],
  ) => {
    const materials: THREE.MeshPhysicalMaterial[] = []
    const group = new THREE.Group()
    group.add(build(materials))
    group.position.set(...position)
    group.userData.home = group.position.clone()
    root.add(group)
    parts.push({ key, group, explode: new THREE.Vector3(...explode), phase, materials, anchor: new THREE.Vector3(...anchor) })
  }

  add('body', bodyShell, [0, 0, 0], [0, 2.2, 0], 'body', [0.2, 1.3, 0])

  add(
    'frame',
    (m) => {
      const g = new THREE.Group()
      const mat = physical(palette.graphite())
      m.push(mat)
      for (const z of [-0.62, 0.62]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.1, 0.08), mat)
        rail.position.z = z
        g.add(rail)
      }
      for (const x of [-1.9, AXLE_R, AXLE_F, 1.9]) {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.24), mat)
        cross.position.x = x
        g.add(cross)
      }
      return g
    },
    [0, 0.24, 0],
    [0, -0.18, 0],
  )

  add(
    'batteryModules',
    (m) => {
      const g = new THREE.Group()
      const tray = physical(palette.graphite())
      const cell = physical(palette.satin())
      const bus = physical(palette.copper())
      m.push(tray, cell, bus)
      g.add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 1.3), tray))
      const modules = new THREE.InstancedMesh(new THREE.BoxGeometry(0.33, 0.09, 0.58), cell, 12)
      const tmp = new THREE.Object3D()
      let i = 0
      for (let col = 0; col < 6; col++) {
        for (const z of [-0.31, 0.31]) {
          tmp.position.set(-0.95 + col * 0.38, 0.07, z)
          tmp.updateMatrix()
          modules.setMatrixAt(i++, tmp.matrix)
        }
      }
      g.add(modules)
      const busbar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.015, 0.05), bus)
      busbar.position.y = 0.12
      g.add(busbar)
      return g
    },
    [-0.15, 0.26, 0],
    [0, -0.05, 0],
    'parts',
    [-0.6, 0.12, 0.5],
  )

  add(
    'batteryCover',
    (m) => {
      const mat = physical({ ...palette.aluminium(), roughness: 0.45 })
      m.push(mat)
      return new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.03, 1.34), mat)
    },
    [-0.15, 0.42, 0],
    [0, 0.5, 0],
  )

  add(
    'seats',
    (m) => {
      const g = new THREE.Group()
      const mat = physical({ color: '#4a4e55', metalness: 0.1, roughness: 0.75 })
      m.push(mat)
      for (const z of [-0.38, 0.38]) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.48), mat)
        base.position.set(0, 0, z)
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.46), mat)
        back.position.set(-0.27, 0.27, z)
        back.rotation.z = 0.22
        g.add(base, back)
      }
      return g
    },
    [-0.15, 0.3, 0],
    [0, 1.25, 0],
  )

  add('motorF', motor, [AXLE_F, WHEEL_R, 0], [0.5, -0.02, 0], 'parts', [0, 0.16, 0])
  add('motorR', motor, [AXLE_R, WHEEL_R, 0], [-0.5, -0.02, 0], 'parts', [0, 0.16, 0])

  const wheels: [PartKey, number, 1 | -1][] = [
    ['wheelFL', AXLE_F, 1],
    ['wheelFR', AXLE_F, -1],
    ['wheelRL', AXLE_R, 1],
    ['wheelRR', AXLE_R, -1],
  ]
  for (const [key, x, side] of wheels) {
    add(key, (m) => wheel(m, side), [x, WHEEL_R, side * TRACK], [Math.sign(x) * 0.25, 0, side * 0.6])
  }

  add(
    'fuelCell',
    (m) => {
      const g = new THREE.Group()
      const plate = physical(palette.satin())
      const end = physical(palette.graphite())
      m.push(plate, end)
      const count = 22
      const stack = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.26, 0.56), plate, count)
      const tmp = new THREE.Object3D()
      for (let i = 0; i < count; i++) {
        tmp.position.set(-0.2 + i * 0.019, 0, 0)
        tmp.updateMatrix()
        stack.setMatrixAt(i, tmp.matrix)
      }
      g.add(stack)
      for (const x of [-0.23, 0.23]) {
        const ep = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.6), end)
        ep.position.x = x
        g.add(ep)
      }
      return g
    },
    [-1.5, 0.7, 0],
    [-0.05, 0.85, 0],
    'parts',
    [0, 0.16, 0],
  )

  add(
    'genUnit',
    (m) => {
      const g = new THREE.Group()
      const shell = physical({ ...palette.aluminium(), roughness: 0.25 })
      const band = physical(palette.graphite())
      m.push(shell, band)
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.92), shell)
      g.add(box)
      for (const z of [-0.3, 0, 0.3]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 0.03), band)
        r.position.z = z
        g.add(r)
      }
      return g
    },
    [-0.75, 0.47, 0],
    [0.2, 1.05, 0],
    'parts',
    [0, 0.18, 0.3],
  )

  add(
    'ethanolTank',
    (m) => {
      const mat = physical(palette.satin())
      m.push(mat)
      return capsule(0.14, 0.95, mat)
    },
    [-1.98, 0.62, 0],
    [-0.45, 0.5, 0],
    'parts',
    [0, 0.14, 0.4],
  )

  add(
    'waterTank',
    (m) => {
      const mat = physical({ color: '#9fb2c4', metalness: 0.2, roughness: 0.35, clearcoat: 1 })
      m.push(mat)
      return capsule(0.11, 0.8, mat)
    },
    [-1.98, 0.32, 0],
    [-0.6, 0.05, 0],
    'parts',
    [0, 0.11, -0.3],
  )

  add(
    'power',
    (m) => {
      const g = new THREE.Group()
      const mat = physical(palette.graphite())
      const fin = physical(palette.aluminium())
      m.push(mat, fin)
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.44), mat))
      for (let i = 0; i < 7; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.012), fin)
        f.position.set(0, 0.07, -0.18 + i * 0.06)
        g.add(f)
      }
      return g
    },
    [0.45, 0.42, 0],
    [0.1, 0.7, 0],
    'parts',
    [0, 0.08, 0],
  )

  add(
    'radiator',
    (m) => {
      const mat = physical(palette.graphite())
      m.push(mat)
      return new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.1), mat)
    },
    [1.8, 0.3, 0],
    [0.5, 0.05, 0],
  )

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })

  return { root, parts, length: L }
}

/** Energy paths between the exploded components, in car space. */
export function energyPaths(parts: Part[]) {
  const at = (key: PartKey, dy = 0) => {
    const p = parts.find((x) => x.key === key)!
    return (p.group.userData.home as THREE.Vector3).clone().add(p.explode).add(new THREE.Vector3(0, dy, 0))
  }
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const curve = (...pts: THREE.Vector3[]) => new THREE.CatmullRomCurve3(pts, false, 'centripetal')

  return [
    curve(at('ethanolTank'), v(-1.6, 1.45, 0.2), at('genUnit')),
    curve(at('waterTank'), v(-1.9, 1.1, -0.2), at('genUnit', -0.1)),
    curve(at('genUnit'), v(-0.2, 1.75, 0), v(0.7, 1.75, 0), at('fuelCell')),
    curve(at('fuelCell'), v(0.85, 1.25, 0.15), at('power')),
    curve(at('power'), v(0.2, 0.7, 0.3), at('batteryModules', 0.15)),
    curve(at('power'), v(1.1, 0.9, -0.2), at('motorF', 0.1)),
    curve(at('batteryModules', 0.15), v(-1.4, 0.55, 0.3), at('motorR', 0.1)),
  ]
}
