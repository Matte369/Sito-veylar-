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
    color: '#aeb4bb',
    metalness: 0.82,
    roughness: 0.3,
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

/**
 * Extrudes a side profile across the width and sculpts it in plan view.
 * Caps (the flat flanks) are subdivided so the taper bends them smoothly,
 * and they are shaded separately from the rounded edges to avoid streaks.
 */
function sculptedExtrude(
  shape: THREE.Shape,
  width: number,
  bevel: number,
  taper: (x: number, y: number) => number,
) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
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
      positions[i + 2] *= taper(positions[i], positions[i + 1])
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

function bodyShell(materials: THREE.MeshPhysicalMaterial[]) {
  const g = new THREE.Group()
  const paint = physical(palette.paint())
  const glass = physical(palette.glass())
  const trim = physical(palette.trim())
  materials.push(paint, glass, trim)

  // Lower body: side profile with both wheel arches cut out.
  const s = new THREE.Shape()
  const sill = 0.3
  const arch = 0.44
  s.moveTo(-2.3, sill + 0.04)
  s.lineTo(AXLE_R - arch, sill)
  s.absarc(AXLE_R, sill, arch, Math.PI, 0, true)
  s.lineTo(AXLE_F - arch, sill)
  s.absarc(AXLE_F, sill, arch, Math.PI, 0, true)
  s.lineTo(2.22, sill)
  s.quadraticCurveTo(2.36, sill + 0.02, 2.38, 0.46)
  s.quadraticCurveTo(2.4, 0.6, 2.3, 0.66)
  s.bezierCurveTo(1.7, 0.8, 1.15, 0.88, 0.78, 0.9)
  s.lineTo(-1.75, 0.94)
  s.bezierCurveTo(-2.05, 0.94, -2.28, 0.9, -2.34, 0.8)
  s.quadraticCurveTo(-2.4, 0.6, -2.3, sill + 0.04)

  const lower = sculptedExtrude(s, W, 0.09, (x, y) => {
    const ends = 1 - 0.13 * Math.pow(smoothstep(1.4, 2.4, Math.abs(x)), 1.6)
    const shoulder = 1 - 0.05 * smoothstep(0.7, 0.95, y)
    return ends * shoulder
  })
  const lowerMesh = new THREE.Mesh(lower, paint)
  g.add(lowerMesh)

  // Greenhouse: a single dark glass canopy, fastback.
  const c = new THREE.Shape()
  c.moveTo(0.82, 0.88)
  c.bezierCurveTo(0.55, 1.08, 0.25, 1.32, -0.15, 1.36)
  c.bezierCurveTo(-0.7, 1.4, -1.1, 1.34, -1.5, 1.18)
  c.bezierCurveTo(-1.8, 1.06, -1.98, 0.98, -2.08, 0.92)
  c.lineTo(0.82, 0.88)
  const canopy = sculptedExtrude(c, W * 0.86, 0.1, (_x, y) => 1 - 0.2 * smoothstep(0.92, 1.38, y))
  g.add(new THREE.Mesh(canopy, glass))

  // Dark sill and diffuser trim.
  const sillGeo = new THREE.BoxGeometry(2.0, 0.07, W * 0.96)
  const sillMesh = new THREE.Mesh(sillGeo, trim)
  sillMesh.position.set(0, sill + 0.02, 0)
  g.add(sillMesh)

  // Light signatures: a full-width white bar at the front, a red bar at the rear.
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.025, W * 0.78),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.2 }),
  )
  front.position.set(2.31, 0.64, 0)
  front.rotation.z = -0.25
  g.add(front)
  const rear = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.03, W * 0.84),
    new THREE.MeshStandardMaterial({ color: '#ff3a1c', emissive: '#ff2a10', emissiveIntensity: 2 }),
  )
  rear.position.set(-2.355, 0.8, 0)
  g.add(rear)

  return g
}

function wheel(materials: THREE.MeshPhysicalMaterial[], side: 1 | -1) {
  const g = new THREE.Group()
  const rubber = physical(palette.rubber())
  const rim = physical(palette.graphite())
  const disc = physical(palette.aluminium())
  materials.push(rubber, rim, disc)

  // Tyre: lathe a rounded section around the axle.
  const pts: THREE.Vector2[] = []
  const inner = 0.27
  const outer = WHEEL_R
  const half = 0.13
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI
    pts.push(new THREE.Vector2(outer - 0.04 + Math.cos(a) * 0.04, Math.sin(a) * half))
  }
  pts.unshift(new THREE.Vector2(inner, -half * 0.9))
  pts.push(new THREE.Vector2(inner, half * 0.9))
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), rubber)
  tyre.rotation.x = Math.PI / 2
  g.add(tyre)

  // Rim face with five aero spokes.
  const face = new THREE.Mesh(new THREE.CylinderGeometry(inner, inner, 0.2, 48), rim)
  face.rotation.x = Math.PI / 2
  g.add(face)
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, inner * 1.7, 0.03), disc)
    spoke.position.z = side * 0.11
    spoke.rotation.z = (i / 5) * Math.PI * 2
    g.add(spoke)
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 24), disc)
  hub.rotation.x = Math.PI / 2
  hub.position.z = side * 0.12
  g.add(hub)
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
