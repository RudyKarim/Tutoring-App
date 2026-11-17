"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Three procedural centerpieces. Each receives `weight` — a ref (0..1) for how
 * "focused" it is — so it can brighten and animate more while active.
 *
 * Performance notes: parts that never move relative to each other are merged into a
 * single geometry (one draw call), repeated moving parts use instancing, and nothing
 * is allocated inside `useFrame`. The faculty point lights live in HomeCanvas (pooled),
 * so each piece adds no lights of its own.
 */
export interface PieceProps {
  weight: React.MutableRefObject<number>;
  hovered: React.MutableRefObject<boolean>;
  /** 1 = full motion, ~0.15 when the user prefers reduced motion. */
  motion: number;
  /** False while the piece is off-screen: skip all per-frame work. */
  live: React.MutableRefObject<boolean>;
  /** Low-power tier: fewer decorative objects and segments. */
  low: boolean;
}

const damp = THREE.MathUtils.damp;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

type V3 = readonly [number, number, number];

/** Bake a transform into a geometry and normalise it so it can be merged with any other. */
function place(g: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
  _m.compose(_v.set(...pos), _q.setFromEuler(_e.set(...rot)), _s.set(...scale));
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  out.applyMatrix4(_m);
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(out.getAttribute("position").count * 2), 2));
  return out;
}
function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return g;
}
/** Dispose geometries created in useMemo when the piece unmounts or rebuilds. */
function useDispose(...items: (THREE.BufferGeometry | THREE.Material | undefined)[]) {
  useEffect(() => () => items.forEach((i) => i?.dispose()), items); // eslint-disable-line react-hooks/exhaustive-deps
}
/** Round-segment count, reduced on the low tier. */
const seg = (n: number, low: boolean) => Math.max(6, Math.round(low ? n * 0.6 : n));

/* ------------------------------------------------------------------ */
/* Engineering — gear train, spinning turbine, blue light rings        */
/* ------------------------------------------------------------------ */

function gearGeometry(radius: number, teeth: number, depth: number, hole = 0.18) {
  const shape = new THREE.Shape();
  const inner = radius * 0.86;
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [inner, a],
      [radius, a + step * 0.18],
      [radius, a + step * 0.5],
      [inner, a + step * 0.68],
    ];
    pts.forEach(([r, ang], j) => {
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, radius * hole, 0, Math.PI * 2, true);
  shape.holes.push(h);
  // Spokes cut-outs
  for (let s = 0; s < 5; s++) {
    const a0 = (s / 5) * Math.PI * 2 + 0.25;
    const p = new THREE.Path();
    p.absarc(Math.cos(a0) * radius * 0.52, Math.sin(a0) * radius * 0.52, radius * 0.17, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6 });
  g.center();
  return g;
}

const GEARS = [
  { r: 1.15, t: 24, pos: [-0.55, 0.35, 0] as V3, dir: 1 },
  { r: 0.62, t: 13, pos: [1.12, 0.9, 0.02] as V3, dir: -1 },
  { r: 0.82, t: 17, pos: [0.98, -0.62, -0.02] as V3, dir: -1 },
];
const NUTS = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2;
  const r = 2.15 + (i % 2) * 0.35;
  // Horizontal orbit around the gear train (kept low so it never rises into the faculty title).
  return { i, hex: i % 3 === 0, pos: [Math.cos(a) * r, Math.sin(a * 2) * 0.25, Math.sin(a) * r * 0.8] as V3, rx: 0, ry: 0 };
});

export function EngineeringPiece({ weight, hovered, motion, live, low }: PieceProps) {
  const geo = useMemo(() => {
    const gears = GEARS.map((g) => gearGeometry(g.r, g.t, 0.22));
    const axles = merge(GEARS.map((g) => place(new THREE.CylinderGeometry(g.r * 0.17, g.r * 0.17, 0.5, seg(16, low)), [g.pos[0], g.pos[1], 0], [Math.PI / 2, 0, 0])));
    const hub = new THREE.CylinderGeometry(0.32, 0.4, 0.5, seg(24, low));
    hub.rotateX(Math.PI / 2);
    const blades = merge(Array.from({ length: 14 }, (_, i) => place(new THREE.BoxGeometry(0.07, 1.9, 0.28), [0, 0, 0], [0, 0.5, (i / 14) * Math.PI * 2])));
    const bearing = new THREE.TorusGeometry(1.08, 0.07, seg(12, low), seg(72, low));
    // The inner ring brightens with focus; the outer two keep a steady glow (two draws, not three).
    // Rings orbit almost flat (small tilts) instead of tumbling, so they stay below the title.
    const ringGeo = (i: number) => {
      const g = new THREE.TorusGeometry([2.1, 2.45, 2.8][i], 0.012, 4, seg(96, low));
      g.rotateX(Math.PI / 2 + [0.22, -0.32, 0.42][i]); // lay flat, then tilt slightly…
      g.rotateY(i * 0.7); // …then turn about the vertical axis (tilt never grows)
      return place(g);
    };
    const rings = ringGeo(0);
    const ringsOuter = merge([ringGeo(1), ringGeo(2)]);
    const hex = new THREE.CylinderGeometry(0.13, 0.13, 0.09, 6);
    const bar = new THREE.BoxGeometry(0.07, 0.36, 0.07);
    return { gears, axles, hub, blades, bearing, rings, ringsOuter, hex, bar };
  }, [low]);
  useDispose(...geo.gears, geo.axles, geo.hub, geo.blades, geo.bearing, geo.rings, geo.ringsOuter, geo.hex, geo.bar);

  const gearRefs = useRef<(THREE.Mesh | null)[]>([]);
  const turbine = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);
  const speed = useRef(0.3);
  const wobble = useRef(0);
  const nuts = useRef<THREE.Group>(null);
  const hexes = useRef<THREE.InstancedMesh>(null);
  const bars = useRef<THREE.InstancedMesh>(null);
  const state = useRef(NUTS.map((n) => ({ ...n })));

  useFrame((_, dt) => {
    if (!live.current) return;
    const w = weight.current;
    const m = motion * (0.3 + 0.7 * w); // neighbours barely move
    speed.current = damp(speed.current, (0.25 + w * 0.9 + (hovered.current ? 0.8 : 0)) * motion, 3, dt);
    const base = speed.current * dt;
    for (let i = 0; i < GEARS.length; i++) {
      const g = gearRefs.current[i];
      // Meshing ratio: angular speed inversely proportional to tooth count.
      if (g) g.rotation.z += (GEARS[i].dir * base * 24) / GEARS[i].t;
    }
    if (turbine.current) turbine.current.rotation.z -= base * 6;
    if (rings.current) {
      wobble.current += dt * m;
      rings.current.rotation.x = Math.sin(wobble.current * 0.5) * 0.12;
      rings.current.rotation.y += dt * 0.22 * m;
    }
    if (nuts.current && hexes.current && bars.current) {
      nuts.current.rotation.y += dt * 0.35 * m;
      let h = 0, b = 0;
      for (const n of state.current) {
        n.rx += dt * (0.6 + n.i * 0.1) * m;
        n.ry += dt * 0.4 * m;
        _m.compose(_v.set(...n.pos), _q.setFromEuler(_e.set(n.rx, n.ry, 0)), _s.set(1, 1, 1));
        if (n.hex) hexes.current.setMatrixAt(h++, _m);
        else bars.current.setMatrixAt(b++, _m);
      }
      hexes.current.instanceMatrix.needsUpdate = true;
      bars.current.instanceMatrix.needsUpdate = true;
    }
    if (ringMat.current) ringMat.current.emissiveIntensity = damp(ringMat.current.emissiveIntensity, 0.6 + w * 2.6, 4, dt);
  });

  const nHex = NUTS.filter((n) => n.hex).length;
  return (
    <group>
      {GEARS.map((g, i) => (
        <mesh key={i} ref={(m) => { gearRefs.current[i] = m; }} geometry={geo.gears[i]} position={g.pos} rotation={[0, 0, i * 0.13]}>
          <meshStandardMaterial color={i === 0 ? "#9aa3ad" : "#6b737c"} metalness={0.95} roughness={0.28} />
        </mesh>
      ))}
      {/* Axles (merged) */}
      <mesh geometry={geo.axles}>
        <meshStandardMaterial color="#22262b" metalness={1} roughness={0.35} />
      </mesh>
      {/* Turbine behind the gear train: hub + 14 blades merged into one mesh */}
      <group ref={turbine} position={[-0.55, 0.35, -0.65]}>
        <mesh geometry={geo.hub}>
          <meshStandardMaterial color="#2c3138" metalness={1} roughness={0.25} />
        </mesh>
        <mesh geometry={geo.blades}>
          <meshStandardMaterial color="#8892a0" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
      {/* Bearing ring around the turbine */}
      <mesh geometry={geo.bearing} position={[-0.55, 0.35, -0.65]}>
        <meshStandardMaterial color="#3a414a" metalness={1} roughness={0.2} />
      </mesh>
      {/* Orbiting precision components (instanced; skipped on the low tier) */}
      {!low && (
        <group ref={nuts} position={[0.15, 0.2, 0]}>
          <instancedMesh ref={hexes} args={[geo.hex, undefined, nHex]} frustumCulled={false}>
            <meshStandardMaterial color="#9aa3ad" metalness={1} roughness={0.25} />
          </instancedMesh>
          <instancedMesh ref={bars} args={[geo.bar, undefined, NUTS.length - nHex]} frustumCulled={false}>
            <meshStandardMaterial color="#9aa3ad" metalness={1} roughness={0.25} />
          </instancedMesh>
        </group>
      )}
      {/* Blue light rings (merged) */}
      <group ref={rings} position={[0.15, 0.2, -0.2]} rotation={[0, 0, 0, "YXZ"]}>
        <mesh geometry={geo.rings}>
          <meshStandardMaterial ref={ringMat} color="#0c1f36" emissive="#5aa9ff" emissiveIntensity={1} toneMapped={false} />
        </mesh>
        <mesh geometry={geo.ringsOuter}>
          <meshStandardMaterial color="#0c1f36" emissive="#5aa9ff" emissiveIntensity={1} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Finance — metal columns, gold price curve, rings, coin stack        */
/* ------------------------------------------------------------------ */

const FLOATERS: { p: V3; s: number; k: 0 | 1 | 2 }[] = [
  // Kept around the top of the columns so they never rise into the faculty title.
  { p: [-2.4, 1.35, -0.6], s: 0.26, k: 0 },
  { p: [-1.1, 1.55, -0.9], s: 0.18, k: 1 },
  { p: [1.3, 1.75, -0.5], s: 0.22, k: 2 },
  { p: [2.5, 1.2, -0.8], s: 0.3, k: 1 },
  { p: [0.2, 1.7, -1.2], s: 0.16, k: 0 },
];
const HEIGHTS = [0.9, 1.4, 1.1, 1.9, 1.6, 2.5, 2.2, 3.0];
const polyFor = (k: 0 | 1 | 2) => (k === 0 ? new THREE.OctahedronGeometry(1) : k === 1 ? new THREE.IcosahedronGeometry(1, 0) : new THREE.TetrahedronGeometry(1));

export function FinancePiece({ weight, hovered, motion, live, low }: PieceProps) {
  const geo = useMemo(() => {
    const pts = HEIGHTS.map((h, i) => new THREE.Vector3(-1.75 + i * 0.5, h - 1.05 + 0.35, 0.45));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
    const tube = new THREE.TubeGeometry(curve, low ? 80 : 120, 0.035, low ? 6 : 8, false);
    const column = new THREE.CylinderGeometry(0.16, 0.16, 1, seg(24, low));
    const plinth = new THREE.BoxGeometry(4.4, 0.14, 1.3);
    const rings = merge([2.3, 2.7].map((r, i) => place(new THREE.TorusGeometry(r, 0.02, seg(8, low), seg(110, low)), [0, 0, 0], [0, 0, i * 0.4])));
    const coins = merge(Array.from({ length: 9 }, (_, i) => place(new THREE.CylinderGeometry(0.3, 0.3, 0.07, seg(32, low)), [Math.sin(i * 1.7) * 0.03, 0.05 + i * 0.085, Math.cos(i * 1.3) * 0.03])));
    const polys = ([0, 1, 2] as const).map(polyFor);
    // All floater outlines in one line buffer; vertices are rewritten each frame as the floaters move.
    const edgeSrc = FLOATERS.map((f) => {
      const e = new THREE.EdgesGeometry(polyFor(f.k).scale(f.s * 1.01, f.s * 1.01, f.s * 1.01));
      const arr = (e.getAttribute("position").array as Float32Array).slice();
      e.dispose();
      return arr;
    });
    const edges = new THREE.BufferGeometry();
    edges.setAttribute("position", new THREE.BufferAttribute(new Float32Array(edgeSrc.reduce((n, a) => n + a.length, 0)), 3).setUsage(THREE.DynamicDrawUsage));
    return { tube, column, plinth, rings, coins, polys, edges, edgeSrc };
  }, [low]);
  useDispose(geo.tube, geo.column, geo.plinth, geo.rings, geo.coins, geo.edges, ...geo.polys);

  const tubeMat = useRef<THREE.MeshStandardMaterial>(null);
  const rings = useRef<THREE.Group>(null);
  const coins = useRef<THREE.Group>(null);
  const cols = useRef<THREE.InstancedMesh>(null);
  const polys = useRef<(THREE.InstancedMesh | null)[]>([]);
  const lines = useRef<THREE.LineSegments>(null);
  const draw = useRef(0);
  const clock = useRef(0);
  const colY = useRef(HEIGHTS.map(() => 0.5));
  const spin = useRef(FLOATERS.map(() => ({ x: 0, y: 0 })));

  // Per-column colours (alternating steel) for the instanced columns.
  useEffect(() => {
    const c = cols.current;
    if (!c) return;
    const a = new THREE.Color("#3a3d44"), b = new THREE.Color("#5b6069");
    HEIGHTS.forEach((_, i) => c.setColorAt(i, i % 2 ? a : b));
    c.instanceColor!.needsUpdate = true;
  }, [geo]);

  useFrame((_, dt) => {
    if (!live.current) return;
    const w = weight.current;
    const m = motion * (0.3 + 0.7 * w);
    const t = (clock.current += dt * m);
    // Price curve "draws" itself in as Finance becomes active.
    draw.current = damp(draw.current, 0.25 + w * 0.75, 2.2, dt);
    geo.tube.setDrawRange(0, Math.floor(geo.tube.index!.count * draw.current));
    if (tubeMat.current) tubeMat.current.emissiveIntensity = damp(tubeMat.current.emissiveIntensity, 0.5 + w * 2.4 + (hovered.current ? 1 : 0), 4, dt);
    const c = cols.current;
    if (c) {
      for (let i = 0; i < HEIGHTS.length; i++) {
        const target = HEIGHTS[i] * (0.55 + 0.45 * w) + Math.sin(t * 0.8 + i) * 0.04 * w;
        const y = (colY.current[i] = damp(colY.current[i], target, 3, dt));
        _m.compose(_v.set(-1.75 + i * 0.5, -1.05 + y / 2, 0), _q.identity(), _s.set(1, y, 1));
        c.setMatrixAt(i, _m);
      }
      c.instanceMatrix.needsUpdate = true;
    }
    if (rings.current) {
      rings.current.rotation.y += dt * (0.2 + w * 0.4) * m;
      rings.current.rotation.x = Math.sin(t * 0.3) * 0.25 + 1.2;
    }
    if (coins.current) coins.current.rotation.y += dt * (0.3 + (hovered.current ? 1.2 : 0)) * motion;
    if (!low && lines.current) {
      const out = geo.edges.getAttribute("position") as THREE.BufferAttribute;
      const arr = out.array as Float32Array;
      const counts = [0, 0, 0];
      let o = 0;
      FLOATERS.forEach((f, i) => {
        const s = spin.current[i];
        s.x += dt * 0.3 * m;
        s.y += dt * (0.25 + i * 0.05) * m;
        _m.compose(_v.set(f.p[0], f.p[1] + Math.sin(t * 0.7 + i * 1.3) * 0.12, f.p[2]), _q.setFromEuler(_e.set(s.x, s.y, 0)), _s.set(f.s, f.s, f.s));
        polys.current[f.k]?.setMatrixAt(counts[f.k]++, _m);
        // Outline: same transform minus the scale (outline vertices are pre-scaled).
        _m.compose(_v, _q, _s.set(1, 1, 1));
        const src = geo.edgeSrc[i];
        for (let j = 0; j < src.length; j += 3) {
          _v.set(src[j], src[j + 1], src[j + 2]).applyMatrix4(_m);
          arr[o++] = _v.x; arr[o++] = _v.y; arr[o++] = _v.z;
        }
      });
      out.needsUpdate = true;
      polys.current.forEach((p) => { if (p) p.instanceMatrix.needsUpdate = true; });
    }
  });

  return (
    <group>
      <instancedMesh ref={cols} args={[geo.column, undefined, HEIGHTS.length]} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.22} />
      </instancedMesh>
      {/* Base plinth */}
      <mesh geometry={geo.plinth} position={[0, -1.12, 0]}>
        <meshStandardMaterial color="#141418" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh geometry={geo.tube}>
        <meshStandardMaterial ref={tubeMat} color="#3d2c08" emissive="#d8b35a" emissiveIntensity={1} metalness={1} roughness={0.2} toneMapped={false} />
      </mesh>
      {/* YXZ: tilt first, then spin about the vertical, so the rings sweep around rather than up into the title */}
      <group ref={rings} position={[0, 0.4, -0.4]} rotation={[1.2, 0, 0, "YXZ"]}>
        <mesh geometry={geo.rings}>
          <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.18} />
        </mesh>
      </group>
      {/* Floating geometric data sculptures: one instanced mesh per shape + one outline buffer */}
      {!low && (
        <>
          {([0, 1, 2] as const).map((k) => (
            <instancedMesh key={k} ref={(m) => { polys.current[k] = m; }} args={[geo.polys[k], undefined, FLOATERS.filter((f) => f.k === k).length]} frustumCulled={false}>
              <meshStandardMaterial color="#1b1a17" metalness={1} roughness={0.15} />
            </instancedMesh>
          ))}
          <lineSegments ref={lines} geometry={geo.edges} frustumCulled={false}>
            <lineBasicMaterial color="#d8b35a" toneMapped={false} />
          </lineSegments>
        </>
      )}
      {/* Coin stack (merged) */}
      <group ref={coins} position={[2.45, -1.05, 0.6]}>
        <mesh geometry={geo.coins}>
          <meshStandardMaterial color="#d8b35a" metalness={1} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Law — stone portico, burgundy light seams, scale of justice         */
/* ------------------------------------------------------------------ */

const COLUMNS_X = [-1.6, -0.8, 0.8, 1.6];

export function LawPiece({ weight, hovered, motion, live, low }: PieceProps) {
  const geo = useMemo(() => {
    // Every static stone block → one geometry.
    const s = new THREE.Shape();
    s.moveTo(-2.1, 0);
    s.lineTo(2.1, 0);
    s.lineTo(0, 0.72);
    s.closePath();
    const ped = new THREE.ExtrudeGeometry(s, { depth: 1.1, bevelEnabled: false });
    ped.translate(0, 0, -0.55);
    const stone = merge([
      ...[0, 1, 2].map((i) => place(new THREE.BoxGeometry(4.6 - i * 0.3, 0.16, 1.7 - i * 0.24), [0, -1.0 + i * 0.16, 0.22 - i * 0.12])),
      ...COLUMNS_X.flatMap((x) => [
        place(new THREE.CylinderGeometry(0.17, 0.2, 1.9, seg(20, low)), [x, 0.42, 0]),
        place(new THREE.BoxGeometry(0.5, 0.12, 0.5), [x, 1.42, 0]),
        place(new THREE.BoxGeometry(0.48, 0.1, 0.48), [x, -0.56, 0]),
      ]),
      place(new THREE.BoxGeometry(4.3, 0.26, 1.15), [0, 1.55, 0]),
      place(ped, [0, 1.68, 0]),
    ]);
    const seams = merge([
      place(new THREE.BoxGeometry(4.6, 0.012, 0.012), [0, -0.915, 1.075]),
      place(new THREE.BoxGeometry(4.3, 0.012, 0.012), [0, -0.755, 0.835]),
      place(new THREE.BoxGeometry(4.0, 0.012, 0.012), [0, -0.595, 0.595]),
      place(new THREE.BoxGeometry(4.3, 0.014, 0.014), [0, 1.415, 0.58]),
      place(new THREE.BoxGeometry(4.3, 0.014, 0.014), [0, 1.685, 0.58]),
    ]);
    const stand = merge([
      place(new THREE.CylinderGeometry(0.025, 0.035, 1.4, 12), [0, 0.7, 0]),
      place(new THREE.CylinderGeometry(0.18, 0.22, 0.05, seg(24, low)), [0, 0.02, 0]),
    ]);
    const rod = new THREE.CylinderGeometry(0.018, 0.018, 1.0, 12);
    rod.rotateZ(Math.PI / 2);
    const strings = merge([-1, 1].map((sg) => place(new THREE.CylinderGeometry(0.004, 0.004, 0.46, 4), [sg * 0.08, -0.22, 0], [0, 0, sg * 0.35])));
    const pan = new THREE.CylinderGeometry(0.2, 0.12, 0.05, seg(24, low));
    pan.translate(0, -0.45, 0);
    return { stone, seams, stand, rod, strings, pan };
  }, [low]);
  useDispose(geo.stone, geo.seams, geo.stand, geo.rod, geo.strings, geo.pan);

  const seamMat = useRef<THREE.MeshStandardMaterial>(null);
  const beam = useRef<THREE.Group>(null);
  const panL = useRef<THREE.Group>(null);
  const panR = useRef<THREE.Group>(null);
  const tilt = useRef(0.18);
  const clock = useRef(0);

  useFrame((_, dt) => {
    if (!live.current) return;
    const w = weight.current;
    const t = (clock.current += dt * motion * (0.3 + 0.7 * w));
    if (seamMat.current) seamMat.current.emissiveIntensity = damp(seamMat.current.emissiveIntensity, 0.4 + w * 2.8, 3, dt);
    // Scale settles toward balance when focused; tips when hovered.
    const target = hovered.current ? Math.sin(t * 2.2) * 0.22 : (1 - w) * 0.18 + Math.sin(t * 0.9) * 0.03;
    tilt.current = damp(tilt.current, target, 2.5, dt);
    if (beam.current) beam.current.rotation.z = tilt.current;
    if (panL.current) panL.current.rotation.z = -tilt.current;
    if (panR.current) panR.current.rotation.z = -tilt.current;
  });

  return (
    <group position={[0, -0.25, 0]}>
      <mesh geometry={geo.stone}>
        <meshStandardMaterial color="#57534f" roughness={0.72} metalness={0.1} />
      </mesh>
      <mesh geometry={geo.seams}>
        <meshStandardMaterial ref={seamMat} color="#1a0508" emissive="#c23a50" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      {/* Scale of justice, in the doorway */}
      <group position={[0, -0.43, 0.15]}>
        <mesh geometry={geo.stand}>
          <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.25} />
        </mesh>
        <group ref={beam} position={[0, 1.38, 0]}>
          <mesh geometry={geo.rod}>
            <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.25} />
          </mesh>
          {([[-0.5, panL], [0.5, panR]] as const).map(([x, ref]) => (
            <group key={x} ref={ref} position={[x, 0, 0]}>
              <mesh geometry={geo.strings}>
                <meshStandardMaterial color="#8c7a55" />
              </mesh>
              <mesh geometry={geo.pan}>
                <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.25} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
