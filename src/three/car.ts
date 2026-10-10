import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
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

export const ACCENT = new THREE.Color('#d9531e')

const L = 4.7 // overall length
const W = 1.88 // overall width
const AXLE_F = 1.44
const AXLE_R = -1.44
const WHEEL_R = 0.355
const TRACK = 0.8 // wheel centre distance from the centreline

type MatOpts = THREE.MeshPhysicalMaterialParameters

function physical(opts: MatOpts) {
  return new THREE.MeshPhysicalMaterial({ envMapIntensity: 1, ...opts })
}

const palette = {
  paint: (): MatOpts => ({
    color: '#545b64',
    metalness: 0.35,
    roughness: 0.3,
    envMapIntensity: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  }),
  glass: (): MatOpts => ({ color: '#101317', metalness: 0.5, roughness: 0.02, clearcoat: 1, side: THREE.DoubleSide, envMapIntensity: 0.8 }),
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
function sculptedExtrude(
  shape: THREE.Shape,
  width: number,
  bevel: number,
  deform: Deform,
  capSurface?: (x: number, y: number) => number,
) {
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

  const build = (positions: Float32Array, analytic = false) => {
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
    if (analytic && capSurface) {
      // Flanks: take normals from the surface equation so long thin triangles shade smoothly.
      const p = merged.attributes.position
      const n = merged.attributes.normal
      const h = 0.002
      const v = new THREE.Vector3()
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        const y = p.getY(i)
        const fx = (capSurface(x + h, y) - capSurface(x - h, y)) / (2 * h)
        const fy = (capSurface(x, y + h) - capSurface(x, y - h)) / (2 * h)
        v.set(-fx, -fy, Math.sign(p.getZ(i)) || 1).normalize()
        n.setXYZ(i, v.x, v.y, v.z)
      }
    }
    return merged
  }

  const capGeo = build(subdivide(all.slice(caps.start * 3, (caps.start + caps.count) * 3), 3), true)
  const sideGeo = build(all.slice(sides.start * 3, (sides.start + sides.count) * 3))
  geo.dispose()
  return mergeGeometries([capGeo, sideGeo])!
}

/* ---------- Body surface ---------- */

const HALF_W = W / 2
const SILL = 0.22 // underside of the rocker
const ARCH_Y = WHEEL_R // arches are centred on the wheels
const ARCH = 0.405
const ARCH_DX = Math.sqrt(ARCH * ARCH - (ARCH_Y - SILL) ** 2)
const ARCH_A = Math.atan2(ARCH_Y - SILL, ARCH_DX) // angle where an arch meets the sill

/** Plan view: rounded nose and tail. */
function planFactor(x: number) {
  const front = 0.15 * Math.pow(smoothstep(1.45, 2.38, x), 1.9)
  const rear = 0.12 * Math.pow(smoothstep(1.55, 2.36, -x), 1.7)
  return 1 - front - rear
}

/** Cross-section: tucked rocker, full flank, a crisp shoulder line, then the shoulder rolls in. */
function sectionFactor(y: number) {
  const t = (y - 0.58) / 0.36
  const body = 1 - 0.05 * Math.min(1.6, t * t)
  const shoulder = 0.009 * Math.exp(-Math.pow((y - 0.8) / 0.022, 2))
  const rocker = 0.04 * (1 - smoothstep(0.22, 0.36, y))
  return body + shoulder - rocker
}

/** Extra width that flares the body around each wheel arch. */
function flare(x: number, y: number) {
  if (y > 0.9) return 0
  let bump = 0
  for (const ax of [AXLE_F, AXLE_R]) {
    const d = Math.hypot(x - ax, y - ARCH_Y)
    bump += Math.exp(-Math.pow((d - ARCH - 0.05) / 0.07, 2))
  }
  return 0.018 * bump * (1 - smoothstep(0.78, 0.9, y))
}

const bodyDeform: Deform = (x, y, z) => {
  const k = Math.abs(z) / HALF_W
  const nz = z * planFactor(x) * sectionFactor(y) + Math.sign(z) * flare(x, y) * k
  // Crown the hood and boot lid.
  const crown = 0.035 * (1 - k * k) * smoothstep(0.66, 0.86, y)
  return [x, y + crown, nz]
}

/** Outer surface of the left/right flank at (x, y). */
function flankZ(x: number, y: number, offset = 0.004) {
  return HALF_W * planFactor(x) * sectionFactor(y) + flare(x, y) + offset
}

const G_HALF = (W * 0.9) / 2
const glassTaper = (x: number, y: number) => planFactor(x) * (1 - 0.24 * smoothstep(0.92, 1.42, y))
/** Outer surface of the greenhouse at (x, y). */
function cabinZ(x: number, y: number, offset = 0.004) {
  return G_HALF * glassTaper(x, y) + offset
}

/** A tube laid on a surface, for panel gaps, pillars and trim. */
function surfaceLine(
  points: [number, number][],
  surface: (x: number, y: number, o?: number) => number,
  radius: number,
  mat: THREE.Material,
  side: 1 | -1,
  offset = 0.002,
) {
  const pts = points.map(([x, y]) => new THREE.Vector3(x, y, side * surface(x, y, offset)))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, pts.length * 16), radius, 8, false), mat)
}

/** Registration plate texture: EU band and a plain wordmark. */
function plateTexture() {
  const c = document.createElement('canvas')
  c.width = 520
  c.height = 112
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f4f2'
  g.fillRect(0, 0, 520, 112)
  g.fillStyle = '#1f3f9a'
  g.fillRect(0, 0, 52, 112)
  g.fillStyle = '#f4f4f2'
  g.font = '600 34px Arial, sans-serif'
  g.textAlign = 'center'
  g.fillText('I', 26, 92)
  g.fillStyle = '#16181b'
  g.font = '600 70px Arial, sans-serif'
  g.fillText('VEYLAR', 286, 82)
  g.strokeStyle = '#16181b'
  g.lineWidth = 4
  g.strokeRect(2, 2, 516, 108)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Window outline: the greenhouse silhouette offset inwards, sampled front to back. */
function windowLine(curves: THREE.CubicBezierCurve[], inset: number) {
  const pts: [number, number][] = []
  for (const cv of curves) {
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const p = cv.getPoint(t)
      const tan = cv.getTangent(t)
      // The profile runs front to back over the top, so the inward normal is (-tan.y, tan.x).
      pts.push([p.x - tan.y * inset, p.y + tan.x * inset])
    }
  }
  return pts.filter(([, y]) => y > 0.96)
}

/** Side glass between two x positions, bent onto the greenhouse surface. */
function sideWindow(top: [number, number][], xFront: number, xRear: number, side: 1 | -1, mat: THREE.Material) {
  const sill = 1.02
  const along = top.filter(([x]) => x <= xFront && x >= xRear)
  const at = (x: number) => {
    let best = top[0]
    for (const p of top) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p
    return Math.max(sill + 0.02, best[1])
  }
  const shape = new THREE.Shape()
  shape.moveTo(xFront, sill)
  shape.lineTo(xFront, at(xFront))
  for (const [x, y] of along) shape.lineTo(x, Math.max(sill + 0.02, y))
  shape.lineTo(xRear, at(xRear))
  shape.lineTo(xRear, sill)
  shape.closePath()
  const flat = new THREE.ShapeGeometry(shape, 12).toNonIndexed()
  const pos = subdivide(flat.attributes.position.array as Float32Array, 3)
  for (let i = 0; i < pos.length; i += 3) pos[i + 2] = side * cabinZ(pos[i], pos[i + 1], 0.003)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, mat)
}

/** Windscreen or rear screen: a curved panel following one profile curve across the width. */
function glassRibbon(curve: THREE.CubicBezierCurve, t0: number, t1: number, mat: THREE.Material) {
  const nu = 40
  const nv = 24
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= nu; i++) {
    const t = t0 + (t1 - t0) * (i / nu)
    const p = curve.getPoint(t)
    const tan = curve.getTangent(t)
    const nx = -tan.y
    const ny = tan.x
    const sgn = ny < 0 ? -1 : 1 // keep the normal pointing up and out
    const x = p.x + sgn * nx * 0.104
    const y = p.y + sgn * ny * 0.104
    const half = Math.max(0, cabinZ(x, y, 0) - 0.06)
    for (let j = 0; j <= nv; j++) pos.push(x, y, -half + (2 * half * j) / nv)
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j
      const b = a + nv + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, mat)
}

function bodyShell(materials: THREE.MeshPhysicalMaterial[]) {
  const g = new THREE.Group()
  const paint = physical(palette.paint())
  const glass = physical(palette.glass())
  const trim = physical(palette.trim())
  const gloss = physical({ color: '#0d0e10', metalness: 0.3, roughness: 0.12, clearcoat: 1 })
  const chrome = physical({ color: '#d9dde2', metalness: 1, roughness: 0.14 })
  const gap = physical({ color: '#26292e', metalness: 0.2, roughness: 0.7 })
  const liner = physical({ color: '#131416', metalness: 0, roughness: 0.95, side: THREE.DoubleSide })
  const inner = physical({ color: '#2b2e33', metalness: 0.2, roughness: 0.8, side: THREE.BackSide })
  const lens = physical({ color: '#202429', metalness: 0.2, roughness: 0.05, clearcoat: 1 })
  const redLens = physical({ color: '#5a0a08', metalness: 0.1, roughness: 0.1, clearcoat: 1, emissive: '#ff1d0a', emissiveIntensity: 0.25 })
  materials.push(paint, glass, trim, gloss, chrome, gap, liner, inner, lens, redLens)
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.2 })
  const red = new THREE.MeshStandardMaterial({ color: '#ff3a1c', emissive: '#ff2a10', emissiveIntensity: 2.2 })

  // Lower body: side profile of a modern electric saloon, arches cut out.
  const s = new THREE.Shape()
  s.moveTo(-2.25, 0.31)
  s.quadraticCurveTo(-2.05, 0.23, AXLE_R - ARCH_DX, SILL)
  s.absarc(AXLE_R, ARCH_Y, ARCH, Math.PI + ARCH_A, -ARCH_A, true)
  s.lineTo(AXLE_F - ARCH_DX, SILL)
  s.absarc(AXLE_F, ARCH_Y, ARCH, Math.PI + ARCH_A, -ARCH_A, true)
  s.lineTo(2.12, 0.24)
  s.quadraticCurveTo(2.29, 0.25, 2.33, 0.31)
  s.bezierCurveTo(2.37, 0.38, 2.385, 0.5, 2.365, 0.57)
  s.quadraticCurveTo(2.35, 0.66, 2.2, 0.7)
  s.bezierCurveTo(1.7, 0.78, 1.2, 0.87, 0.86, 0.9)
  s.lineTo(-1.62, 0.955)
  s.lineTo(-2.2, 0.97)
  s.lineTo(-2.235, 0.99)
  s.quadraticCurveTo(-2.33, 0.97, -2.35, 0.86)
  s.bezierCurveTo(-2.37, 0.66, -2.34, 0.42, -2.25, 0.31)

  const lower = sculptedExtrude(s, W, 0.085, bodyDeform, (x, y) => flankZ(x, y, 0))
  g.add(new THREE.Mesh(lower, paint), new THREE.Mesh(lower, inner))

  // Greenhouse: body-coloured structure, with glazing laid on top of it.
  const B1 = new THREE.CubicBezierCurve(new THREE.Vector2(0.92, 0.86), new THREE.Vector2(0.62, 1.04), new THREE.Vector2(0.27, 1.33), new THREE.Vector2(-0.02, 1.4))
  const B2 = new THREE.CubicBezierCurve(new THREE.Vector2(-0.02, 1.4), new THREE.Vector2(-0.35, 1.445), new THREE.Vector2(-0.78, 1.44), new THREE.Vector2(-1.06, 1.395))
  const B3 = new THREE.CubicBezierCurve(new THREE.Vector2(-1.06, 1.395), new THREE.Vector2(-1.36, 1.3), new THREE.Vector2(-1.6, 1.08), new THREE.Vector2(-1.78, 0.97))
  const c = new THREE.Shape()
  c.moveTo(0.92, 0.86)
  c.bezierCurveTo(0.62, 1.04, 0.27, 1.33, -0.02, 1.4)
  c.bezierCurveTo(-0.35, 1.445, -0.78, 1.44, -1.06, 1.395)
  c.bezierCurveTo(-1.36, 1.3, -1.6, 1.08, -1.78, 0.97)
  c.lineTo(-1.78, 0.92)
  c.lineTo(0.92, 0.86)
  const cabin = sculptedExtrude(c, W * 0.9, 0.1, (x, y, z) => [x, y, z * glassTaper(x, y)], (x, y) => cabinZ(x, y, 0))
  g.add(new THREE.Mesh(cabin, paint))
  g.add(glassRibbon(B1, 0.06, 0.985, glass), glassRibbon(B3, 0.04, 0.93, glass))
  const dlo = windowLine([B1, B2, B3], 0.075)
  for (const side of [1, -1] as const) {
    g.add(
      sideWindow(dlo, 0.8, -0.265, side, glass),
      sideWindow(dlo, -0.335, -1.62, side, glass),
      surfaceLine(dlo.filter(([, y]) => y > 0.99).map(([x, y]) => [x, y + 0.012] as [number, number]), cabinZ, 0.005, chrome, side),
    )
  }

  // Arch liners so the wheel wells read as solid.
  for (const ax of [AXLE_F, AXLE_R]) {
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(ARCH - 0.01, ARCH - 0.01, W * 0.86, 48, 1, true, -Math.PI / 2, Math.PI),
      liner,
    )
    arch.rotation.x = -Math.PI / 2
    arch.position.set(ax, ARCH_Y, 0)
    g.add(arch)
  }

  // Satin black side skirts, front intake, rear diffuser.
  const skirt = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.08, W * 0.955, 3, 0.03), trim)
  skirt.position.set(0, SILL + 0.04, 0)
  const intake = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, W * 0.56, 3, 0.03), gloss)
  intake.position.set(2.41, 0.36, 0)
  const splitter = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.025, W * 0.78, 2, 0.01), trim)
  splitter.position.set(2.33, 0.2, 0)
  const diffuser = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.1, W * 0.72, 3, 0.03), trim)
  diffuser.position.set(-2.34, 0.3, 0)
  g.add(skirt, intake, splitter, diffuser)

  // Number plates.
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.4, metalness: 0.1 })
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.112), plateMat)
  front.rotation.y = Math.PI / 2
  front.position.set(2.474, 0.47, 0)
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.112), plateMat)
  rear.rotation.y = -Math.PI / 2
  rear.position.set(-2.462, 0.56, 0)
  g.add(front, rear)

  // Light bar across the tail.
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, W * 0.6), red)
  bar.position.set(-2.432, 0.875, 0)
  g.add(bar)

  for (const side of [1, -1] as const) {
    // Headlamp: dark lens, LED brow and two projectors.
    const head = new THREE.Group()
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.062, 0.36, 4, 0.025), lens)
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.34), white)
    brow.position.set(0.062, 0.02, 0)
    head.add(hl, brow)
    for (const pz of [-0.07, 0.07]) {
      const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 24), chrome)
      proj.rotation.z = Math.PI / 2
      proj.position.set(0.064, -0.01, pz)
      head.add(proj)
    }
    head.position.set(2.365, 0.625, side * 0.56)
    head.rotation.set(0, side * 0.18, -0.22)
    g.add(head)

    // Tail lamp wrapping round the corner.
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.06, 0.38, 4, 0.025), redLens)
    tl.position.set(-2.37, 0.875, side * 0.56)
    tl.rotation.set(0, -side * 0.2, 0.08)
    const tlLed = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.34), red)
    tlLed.position.set(-0.062, 0, 0)
    tl.add(tlLed)
    g.add(tl)

    g.add(surfaceLine([[0.8, 1.03], [0.0, 1.035], [-0.9, 1.04], [-1.6, 1.045]], cabinZ, 0.006, chrome, side))

    // Door cuts, fuel flap, flush handles.
    g.add(
      surfaceLine([[0.82, 0.92], [0.8, 0.7], [0.78, 0.48], [0.76, 0.3]], flankZ, 0.0025, gap, side),
      surfaceLine([[-0.33, 0.95], [-0.34, 0.65], [-0.35, 0.3]], flankZ, 0.0025, gap, side),
      surfaceLine([[-1.2, 0.96], [-1.19, 0.76], [-1.1, 0.64], [-1.03, 0.56]], flankZ, 0.0025, gap, side),
      surfaceLine([[-1.7, 0.88], [-1.86, 0.88], [-1.86, 0.78], [-1.7, 0.78], [-1.7, 0.88]], flankZ, 0.0022, gap, side),
    )
    for (const hx of [0.2, -0.85]) {
      const handle = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.026, 0.014, 2, 0.006), chrome)
      handle.position.set(hx, 0.86, side * flankZ(hx, 0.86, 0.002))
      g.add(handle)
    }

    // Door mirror on a stalk.
    const mz = side * (flankZ(0.7, 0.96) + 0.03)
    const stalk = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.03, 0.1, 2, 0.01), gloss)
    stalk.position.set(0.7, 0.98, mz)
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.095, 0.2, 4, 0.04), paint)
    housing.position.set(0.68, 1.02, mz + side * 0.12)
    housing.rotation.y = side * 0.12
    const mirrorBase = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.1, 0.2, 3, 0.03), gloss)
    mirrorBase.position.set(0.645, 1.02, mz + side * 0.12)
    mirrorBase.rotation.y = side * 0.12
    g.add(stalk, housing, mirrorBase)
  }

  // Shark-fin antenna.
  const fin = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 6, 12), gloss)
  fin.rotation.z = Math.PI / 2 - 0.25
  fin.position.set(-0.98, 1.505, 0)
  g.add(fin)

  return g
}

function wheel(materials: THREE.MeshPhysicalMaterial[], side: 1 | -1) {
  const g = new THREE.Group()
  const rubber = physical(palette.rubber())
  const wall = physical({ color: '#232427', metalness: 0, roughness: 0.8 })
  const rim = physical({ color: '#3a3e44', metalness: 0.9, roughness: 0.25, clearcoat: 0.8 })
  const face = physical({ color: '#d4d8dd', metalness: 1, roughness: 0.16 })
  const barrel = physical({ color: '#1a1b1d', metalness: 0.4, roughness: 0.6 })
  const disc = physical({ color: '#8d9298', metalness: 0.9, roughness: 0.45 })
  const caliper = physical({ color: '#d9531e', metalness: 0.3, roughness: 0.35, clearcoat: 1 })
  materials.push(rubber, wall, rim, face, barrel, disc, caliper)
  const out = side

  // 245/40 R19 tyre: rounded sidewalls, flat tread with four grooves.
  const inner = 0.243
  const half = 0.122
  const pts: THREE.Vector2[] = []
  const wallPts = (sgn: number) => {
    const res: THREE.Vector2[] = []
    for (let i = 0; i <= 14; i++) {
      const t = i / 14
      res.push(new THREE.Vector2(inner + (WHEEL_R - 0.028 - inner) * t, sgn * half * (0.88 + 0.12 * Math.sin(t * Math.PI))))
    }
    return res
  }
  pts.push(...wallPts(-1))
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2)
    pts.push(new THREE.Vector2(WHEEL_R - 0.028 + Math.cos(a) * 0.028, -half + 0.028 + Math.sin(a) * 0.028 + 0.028))
  }
  const grooves = [-0.06, -0.02, 0.02, 0.06]
  for (let i = 0; i <= 48; i++) {
    const zz = -half + 0.03 + (i / 48) * (half * 2 - 0.06)
    const inGroove = grooves.some((gz) => Math.abs(zz - gz) < 0.005)
    pts.push(new THREE.Vector2(WHEEL_R - (inGroove ? 0.007 : 0), zz))
  }
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2)
    pts.push(new THREE.Vector2(WHEEL_R - 0.028 + Math.cos(a) * 0.028, half - 0.028 + Math.sin(a) * 0.028 - 0.028 + 0.028))
  }
  pts.push(...wallPts(1).reverse())
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(pts, 112), rubber)
  tyre.rotation.x = Math.PI / 2
  g.add(tyre)
  const sidewall = new THREE.Mesh(new THREE.RingGeometry(inner + 0.01, WHEEL_R - 0.035, 96), wall)
  sidewall.position.z = out * (half * 0.99)
  if (out < 0) sidewall.rotation.y = Math.PI
  g.add(sidewall)

  // Rim barrel, polished lip, brake disc and caliper.
  const barrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(inner, inner, 0.22, 72, 1, true), barrel)
  barrelMesh.rotation.x = Math.PI / 2
  const lip = new THREE.Mesh(new THREE.TorusGeometry(inner - 0.005, 0.007, 8, 96), face)
  lip.position.z = out * 0.1
  const discMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.026, 64), disc)
  discMesh.rotation.x = Math.PI / 2
  discMesh.position.z = out * 0.015
  const cal = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.17, 0.065, 3, 0.02), caliper)
  cal.position.set(-0.16, 0.06, out * 0.04)
  cal.rotation.z = 0.35
  g.add(barrelMesh, lip, discMesh, cal)

  // Five double spokes, slightly concave towards the hub.
  const spoke = new THREE.Shape()
  spoke.moveTo(-0.016, 0.062)
  spoke.lineTo(0.016, 0.062)
  spoke.lineTo(0.011, inner - 0.008)
  spoke.lineTo(-0.011, inner - 0.008)
  spoke.closePath()
  const spokeGeo = new THREE.ExtrudeGeometry(spoke, { depth: 0.022, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.006, bevelSegments: 3 })
  spokeGeo.translate(0, 0, -0.011)
  for (let i = 0; i < 5; i++) {
    for (const off of [-0.11, 0.11]) {
      const m = new THREE.Mesh(spokeGeo, face)
      m.rotation.z = (i / 5) * Math.PI * 2 + off
      m.rotation.y = out * 0.12 * (off > 0 ? 1 : -1) * 0
      m.position.z = out * 0.075
      g.add(m)
    }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.075, 0.05, 40), rim)
  hub.rotation.x = Math.PI / 2
  hub.position.z = out * 0.075
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 40), face)
  cap.rotation.x = Math.PI / 2
  cap.position.z = out * 0.102
  g.add(hub, cap)
  for (let i = 0; i < 5; i++) {
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 6), barrel)
    nut.rotation.x = Math.PI / 2
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5
    nut.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, out * 0.1)
    g.add(nut)
  }
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
