import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

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

export const ACCENT = new THREE.Color('#d9531e')

const L = 4.7 // overall length
const W = 1.94 // overall width
const AXLE_F = 1.45
const AXLE_R = -1.45
const WHEEL_R = 0.37
const TRACK = 0.84 // wheel centre distance from the centreline

type MatOpts = THREE.MeshPhysicalMaterialParameters

function physical(opts: MatOpts) {
  return new THREE.MeshPhysicalMaterial({ envMapIntensity: 1, ...opts })
}

const palette = {
  paint: (): MatOpts => ({
    color: '#8c9299',
    metalness: 0.65,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  }),
  glass: (): MatOpts => ({ color: '#1a1e23', metalness: 0.3, roughness: 0.04, clearcoat: 1 }),
  trim: (): MatOpts => ({ color: '#2a2d31', metalness: 0.4, roughness: 0.55 }),
  graphite: (): MatOpts => ({ color: '#3b3f45', metalness: 0.7, roughness: 0.4 }),
  aluminium: (): MatOpts => ({ color: '#c3c7cc', metalness: 0.9, roughness: 0.35 }),
  satin: (): MatOpts => ({ color: '#dfe2e5', metalness: 0.25, roughness: 0.5 }),
  rubber: (): MatOpts => ({ color: '#1d1e20', metalness: 0, roughness: 0.92 }),
  copper: (): MatOpts => ({ color: '#b07a56', metalness: 0.85, roughness: 0.35 }),
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Splits every triangle into four, `levels` times (non-indexed positions). */
function subdivide(positions: Float32Array, levels: number) {
  let tris = positions
  for (let l = 0; l < levels; l++) {
    const out = new Float32Array(tris.length * 4)
    let o = 0
    const v = (i: number) => [tris[i], tris[i + 1], tris[i + 2]]
    const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    for (let i = 0; i < tris.length; i += 9) {
      const a = v(i)
      const b = v(i + 3)
      const c = v(i + 6)
      const ab = mid(a, b)
      const bc = mid(b, c)
      const ca = mid(c, a)
      for (const t of [a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca]) {
        out[o++] = t[0]
        out[o++] = t[1]
        out[o++] = t[2]
      }
    }
    tris = out
  }
  return tris
}

type Deform = (x: number, y: number, z: number) => [number, number, number]

/**
 * Extrudes a side profile across the width, then sculpts it with `deform`.
 * The flanks are subdivided so they can bend smoothly, and they are shaded
 * separately from the rounded edges so the reflections stay clean.
 */
function sculptedExtrude(shape: THREE.Shape, width: number, bevel: number, deform: Deform) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    steps: 28,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 10,
    curveSegments: 64,
  })
  geo.translate(0, 0, -(width - bevel * 2) / 2)
  const all = geo.attributes.position.array as Float32Array
  const [caps, sides] = geo.groups

  const build = (positions: Float32Array) => {
    for (let i = 0; i < positions.length; i += 3) {
      const [x, y, z] = deform(positions[i], positions[i + 1], positions[i + 2])
      positions[i] = x
      positions[i + 1] = y
      positions[i + 2] = z
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const merged = mergeVertices(g, 1e-4)
    merged.computeVertexNormals()
    return merged
  }

  const capGeo = build(subdivide(all.slice(caps.start * 3, (caps.start + caps.count) * 3), 3))
  const sideGeo = build(all.slice(sides.start * 3, (sides.start + sides.count) * 3))
  geo.dispose()
  return mergeGeometries([capGeo, sideGeo])!
}

/* ---------- Body surface ---------- */

const HALF_W = W / 2
const SILL = 0.3
const ARCH = 0.44

/** Plan view: rounded nose and tail. */
function planFactor(x: number) {
  const front = 0.17 * Math.pow(smoothstep(1.25, 2.42, x), 1.8)
  const rear = 0.13 * Math.pow(smoothstep(1.35, 2.38, -x), 1.6)
  return 1 - front - rear
}

/** Cross-section: flanks bulge out at mid height and tuck in at sill and shoulder. */
function sectionFactor(y: number) {
  const t = (y - 0.6) / 0.34
  return 1 - 0.065 * Math.min(1.4, t * t)
}

/** Extra width that flares the body around each wheel arch. */
function flare(x: number, y: number) {
  if (y > 0.92) return 0
  let bump = 0
  for (const ax of [AXLE_F, AXLE_R]) {
    const d = Math.hypot(x - ax, y - SILL)
    bump += Math.exp(-Math.pow((d - 0.53) / 0.09, 2))
  }
  return 0.028 * bump * (1 - smoothstep(0.82, 0.92, y))
}

const bodyDeform: Deform = (x, y, z) => {
  const k = Math.abs(z) / HALF_W
  const nz = z * planFactor(x) * sectionFactor(y) + Math.sign(z) * flare(x, y) * k
  // Crown the hood and rear deck.
  const crown = 0.04 * (1 - k * k) * smoothstep(0.72, 0.9, y) * (1 - smoothstep(0.95, 1.0, y))
  return [x, y + crown, nz]
}

/** Outer surface position on the left flank (+Z) for detail placement. */
function flankZ(x: number, y: number, offset = 0.004) {
  return HALF_W * planFactor(x) * sectionFactor(y) + flare(x, y) + offset
}

/** A thin dark line drawn on the flank, for panel gaps. */
function panelLine(points: [number, number][], mat: THREE.Material, side: 1 | -1) {
  const pts = points.map(([x, y]) => new THREE.Vector3(x, y, side * flankZ(x, y, 0.002)))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 12), 0.0026, 6, false), mat)
}

function bodyShell(materials: THREE.MeshPhysicalMaterial[]) {
  const g = new THREE.Group()
  const paint = physical(palette.paint())
  const glass = physical(palette.glass())
  const trim = physical(palette.trim())
  const gap = physical({ color: '#3a3e44', metalness: 0.2, roughness: 0.7 })
  const liner = physical({ color: '#131416', metalness: 0, roughness: 0.95, side: THREE.DoubleSide })
  const inner = physical({ color: '#2b2e33', metalness: 0.2, roughness: 0.8, side: THREE.BackSide })
  materials.push(paint, glass, trim, gap, liner, inner)

  // Lower body: side profile with both wheel arches cut out.
  const s = new THREE.Shape()
  s.moveTo(-2.3, SILL + 0.05)
  s.lineTo(AXLE_R - ARCH, SILL)
  s.absarc(AXLE_R, SILL, ARCH, Math.PI, 0, true)
  s.lineTo(AXLE_F - ARCH, SILL)
  s.absarc(AXLE_F, SILL, ARCH, Math.PI, 0, true)
  s.lineTo(2.2, SILL)
  s.quadraticCurveTo(2.37, SILL + 0.02, 2.41, 0.42)
  s.quadraticCurveTo(2.44, 0.54, 2.33, 0.6)
  s.bezierCurveTo(1.85, 0.7, 1.25, 0.86, 0.8, 0.9)
  s.lineTo(-1.7, 0.95)
  s.bezierCurveTo(-2.05, 0.95, -2.29, 0.91, -2.35, 0.8)
  s.quadraticCurveTo(-2.41, 0.6, -2.3, SILL + 0.05)

  const lower = sculptedExtrude(s, W, 0.1, bodyDeform)
  g.add(new THREE.Mesh(lower, paint))
  // Dark interior face, visible when the shell is lifted off the platform.
  g.add(new THREE.Mesh(lower, inner))

  // Greenhouse: one dark glass canopy with strong tumblehome.
  const c = new THREE.Shape()
  c.moveTo(0.84, 0.88)
  c.bezierCurveTo(0.55, 1.08, 0.25, 1.32, -0.15, 1.36)
  c.bezierCurveTo(-0.7, 1.4, -1.1, 1.34, -1.5, 1.18)
  c.bezierCurveTo(-1.8, 1.06, -1.98, 0.99, -2.1, 0.93)
  c.lineTo(0.84, 0.88)
  const canopy = sculptedExtrude(c, W * 0.88, 0.12, (x, y, z) => [
    x,
    y,
    z * planFactor(x) * (1 - 0.22 * smoothstep(0.92, 1.4, y)),
  ])
  g.add(new THREE.Mesh(canopy, glass))

  // Black arch liners so the wheel wells read as solid.
  for (const ax of [AXLE_F, AXLE_R]) {
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(ARCH - 0.01, ARCH - 0.01, W * 0.86, 40, 1, true, -Math.PI / 2, Math.PI), liner)
    arch.rotation.x = -Math.PI / 2
    arch.position.set(ax, SILL, 0)
    g.add(arch)
  }

  // Sill blade, front intake and rear diffuser in satin black.
  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, W * 0.95), trim)
  sill.position.set(0, SILL + 0.02, 0)
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, W * 0.6), trim)
  intake.position.set(2.32, 0.4, 0)
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, W * 0.7), trim)
  diffuser.position.set(-2.3, 0.37, 0)
  g.add(sill, intake, diffuser)

  // Lights: full-width DRL with slim headlamp pods, red light bar at the rear.
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.4 })
  const red = new THREE.MeshStandardMaterial({ color: '#ff3a1c', emissive: '#ff2a10', emissiveIntensity: 2.2 })
  const drl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, W * 0.74), white)
  drl.position.set(2.35, 0.585, 0)
  drl.rotation.z = -0.45
  g.add(drl)
  for (const side of [1, -1] as const) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.3), glass)
    pod.position.set(2.24, 0.585, side * 0.6)
    pod.rotation.set(0, side * 0.4, -0.35)
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.22), white)
    lamp.position.set(0.045, 0, 0)
    pod.add(lamp)
    g.add(pod)
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, W * 0.82), red)
  tail.position.set(-2.358, 0.8, 0)
  g.add(tail)

  // Panel gaps, flush handles and camera mirrors on both flanks.
  for (const side of [1, -1] as const) {
    g.add(
      panelLine([[0.74, 0.9], [0.7, 0.7], [0.66, 0.5], [0.62, 0.36]], gap, side),
      panelLine([[-0.36, 0.93], [-0.38, 0.65], [-0.38, 0.36]], gap, side),
      panelLine([[-0.98, 0.94], [-0.98, 0.78], [-0.94, 0.64], [-0.96, 0.52]], gap, side),
      panelLine([[-1.68, 0.84], [-1.88, 0.84], [-1.88, 0.73], [-1.68, 0.73], [-1.68, 0.84]], gap, side),
    )
    for (const hx of [0.18, -0.78]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.012), trim)
      handle.position.set(hx, 0.83, side * flankZ(hx, 0.83, 0.002))
      g.add(handle)
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.1), trim)
    arm.position.set(0.66, 0.95, side * (flankZ(0.66, 0.9) + 0.03))
    const cam = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.08, 6, 16), paint)
    cam.rotation.z = Math.PI / 2
    cam.position.set(0.64, 0.96, side * (flankZ(0.66, 0.9) + 0.09))
    g.add(arm, cam)
  }

  return g
}

function wheel(materials: THREE.MeshPhysicalMaterial[], side: 1 | -1) {
  const g = new THREE.Group()
  const rubber = physical(palette.rubber())
  const rim = physical({ color: '#2f3237', metalness: 0.85, roughness: 0.28, clearcoat: 0.6 })
  const face = physical({ color: '#c9cdd2', metalness: 0.95, roughness: 0.18 })
  const barrel = physical({ color: '#1a1b1d', metalness: 0.4, roughness: 0.6 })
  const disc = physical({ color: '#8d9298', metalness: 0.9, roughness: 0.45 })
  const caliper = physical({ color: '#d9531e', metalness: 0.3, roughness: 0.35, clearcoat: 1 })
  materials.push(rubber, rim, face, barrel, disc, caliper)
  const out = side // the visible face points away from the car

  // Tyre section: sidewall bulge, shoulder and a tread with four grooves.
  const inner = 0.265
  const half = 0.125
  const pts: THREE.Vector2[] = [new THREE.Vector2(inner, -half * 0.86)]
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    pts.push(new THREE.Vector2(inner + (WHEEL_R - 0.03 - inner) * t, -half * (0.86 + 0.14 * Math.sin(t * Math.PI))))
  }
  const grooves = [-0.07, -0.025, 0.025, 0.07]
  for (let i = 0; i <= 40; i++) {
    const zz = -half + 0.02 + (i / 40) * (half * 2 - 0.04)
    const inGroove = grooves.some((gz) => Math.abs(zz - gz) < 0.006)
    pts.push(new THREE.Vector2(WHEEL_R - (inGroove ? 0.008 : 0), zz))
  }
  for (let i = 10; i >= 0; i--) {
    const t = i / 10
    pts.push(new THREE.Vector2(inner + (WHEEL_R - 0.03 - inner) * t, half * (0.86 + 0.14 * Math.sin(t * Math.PI))))
  }
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), rubber)
  tyre.rotation.x = Math.PI / 2
  g.add(tyre)

  // Rim barrel and lip.
  const barrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(inner, inner, 0.22, 64, 1, true), barrel)
  barrelMesh.rotation.x = Math.PI / 2
  const lip = new THREE.Mesh(new THREE.TorusGeometry(inner - 0.006, 0.008, 8, 64), face)
  lip.position.z = out * 0.1
  g.add(barrelMesh, lip)

  // Brake disc and caliper behind the spokes.
  const discMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 48), disc)
  discMesh.rotation.x = Math.PI / 2
  discMesh.position.z = out * 0.02
  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.06), caliper)
  cal.position.set(-0.17, 0.05, out * 0.04)
  cal.rotation.z = 0.35
  g.add(discMesh, cal)

  // Ten-spoke aero face: tapered twin spokes over a dark centre.
  const centre = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.04, 32), rim)
  centre.rotation.x = Math.PI / 2
  centre.position.z = out * 0.085
  g.add(centre)
  const spokeShape = new THREE.Shape()
  spokeShape.moveTo(-0.022, 0.07)
  spokeShape.lineTo(0.022, 0.07)
  spokeShape.lineTo(0.012, inner - 0.01)
  spokeShape.lineTo(-0.012, inner - 0.01)
  spokeShape.closePath()
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    bevelSegments: 2,
  })
  for (let i = 0; i < 10; i++) {
    const spoke = new THREE.Mesh(spokeGeo, i % 2 ? face : rim)
    spoke.rotation.z = (i / 10) * Math.PI * 2
    spoke.position.z = out * 0.08 - 0.01
    g.add(spoke)
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 32), face)
  cap.rotation.x = Math.PI / 2
  cap.position.z = out * 0.11
  g.add(cap)
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
    [-0.2, 0.52, 0],
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
    [0.92, 0.66, 0],
    [0.35, 0.95, 0],
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
    [-0.95, 0.62, 0],
    [-0.2, 1.0, 0],
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
    [-1.48, 0.76, 0],
    [-0.55, 0.55, 0],
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
    [-1.98, 0.5, 0],
    [-0.75, 0.15, 0],
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
    [0.38, 0.5, 0],
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
    [2.08, 0.48, 0],
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
