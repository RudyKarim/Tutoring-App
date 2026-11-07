"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Three procedural centerpieces. Each receives `weight` — a ref (0..1) for how
 * "focused" it is — so it can brighten and animate more while active.
 */
export interface PieceProps {
  weight: React.MutableRefObject<number>;
  hovered: React.MutableRefObject<boolean>;
  /** 1 = full motion, ~0.15 when the user prefers reduced motion. */
  motion: number;
}

const damp = THREE.MathUtils.damp;

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

export function EngineeringPiece({ weight, hovered, motion }: PieceProps) {
  const gears = useMemo(
    () => [
      { r: 1.15, t: 24, pos: [-0.55, 0.35, 0] as const, dir: 1 },
      { r: 0.62, t: 13, pos: [1.12, 0.9, 0.02] as const, dir: -1 },
      { r: 0.82, t: 17, pos: [0.98, -0.62, -0.02] as const, dir: -1 },
    ].map((g) => ({ ...g, geo: gearGeometry(g.r, g.t, 0.22) })),
    [],
  );
  const gearRefs = useRef<(THREE.Mesh | null)[]>([]);
  const turbine = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const speed = useRef(0.3);
  const nuts = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const w = weight.current;
    speed.current = damp(speed.current, (0.25 + w * 0.9 + (hovered.current ? 0.8 : 0)) * motion, 3, dt);
    const base = speed.current * dt;
    gears.forEach((g, i) => {
      const m = gearRefs.current[i];
      // Meshing ratio: angular speed inversely proportional to tooth count.
      if (m) m.rotation.z += (g.dir * base * 24) / g.t;
    });
    if (turbine.current) turbine.current.rotation.z -= base * 6;
    if (rings.current) {
      rings.current.rotation.x += dt * 0.15 * motion;
      rings.current.rotation.y += dt * 0.22 * motion;
    }
    if (nuts.current) {
      nuts.current.rotation.z += dt * 0.35 * motion;
      nuts.current.children.forEach((c, i) => { c.rotation.x += dt * (0.6 + i * 0.1) * motion; c.rotation.y += dt * 0.4 * motion; });
    }
    if (ringMat.current) ringMat.current.emissiveIntensity = damp(ringMat.current.emissiveIntensity, 0.6 + w * 2.6, 4, dt);
    if (light.current) light.current.intensity = damp(light.current.intensity, 2 + w * 14, 4, dt);
  });

  return (
    <group>
      <pointLight ref={light} color="#5aa9ff" position={[0, 0.4, 2.2]} distance={9} decay={2} />
      {gears.map((g, i) => (
        <mesh key={i} ref={(m) => { gearRefs.current[i] = m; }} geometry={g.geo} position={g.pos} rotation={[0, 0, i * 0.13]} castShadow>
          <meshStandardMaterial color={i === 0 ? "#9aa3ad" : "#6b737c"} metalness={0.95} roughness={0.28} />
        </mesh>
      ))}
      {/* Axles */}
      {gears.map((g, i) => (
        <mesh key={`a${i}`} position={[g.pos[0], g.pos[1], 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[g.r * 0.17, g.r * 0.17, 0.5, 24]} />
          <meshStandardMaterial color="#22262b" metalness={1} roughness={0.35} />
        </mesh>
      ))}
      {/* Turbine behind the gear train */}
      <group ref={turbine} position={[-0.55, 0.35, -0.65]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.4, 0.5, 32]} />
          <meshStandardMaterial color="#2c3138" metalness={1} roughness={0.25} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} rotation={[0, 0.5, (i / 14) * Math.PI * 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.07, 1.9, 0.28]} />
            <meshStandardMaterial color="#8892a0" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* Bearing ring around the turbine */}
      <mesh position={[-0.55, 0.35, -0.65]}>
        <torusGeometry args={[1.08, 0.07, 16, 96]} />
        <meshStandardMaterial color="#3a414a" metalness={1} roughness={0.2} />
      </mesh>
      {/* Orbiting precision components */}
      <group ref={nuts} position={[0.15, 0.2, 0]}>
        {Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          const r = 2.15 + (i % 2) * 0.35;
          return (
            <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * 0.62, Math.sin(a * 2) * 0.5]}>
              {i % 3 === 0 ? <cylinderGeometry args={[0.13, 0.13, 0.09, 6]} /> : <boxGeometry args={[0.07, 0.36, 0.07]} />}
              <meshStandardMaterial color="#9aa3ad" metalness={1} roughness={0.25} />
            </mesh>
          );
        })}
      </group>
      {/* Blue light rings */}
      <group ref={rings} position={[0.15, 0.2, -0.2]}>
        {[2.1, 2.45, 2.8].map((r, i) => (
          <mesh key={i} rotation={[Math.PI / 2 + i * 0.5, i * 0.7, 0]}>
            <torusGeometry args={[r, 0.012, 8, 160]} />
            <meshStandardMaterial ref={i === 0 ? ringMat : undefined} color="#0c1f36" emissive="#5aa9ff" emissiveIntensity={1} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const FLOATERS: { p: [number, number, number]; s: number; k: number }[] = [
  { p: [-2.4, 1.9, -0.6], s: 0.26, k: 0 },
  { p: [-1.1, 2.6, -0.9], s: 0.18, k: 1 },
  { p: [1.3, 2.9, -0.5], s: 0.22, k: 2 },
  { p: [2.5, 1.6, -0.8], s: 0.3, k: 1 },
  { p: [0.2, 3.3, -1.2], s: 0.16, k: 0 },
];

/* ------------------------------------------------------------------ */
/* Finance — metal columns, gold price curve, rings, coin stack        */
/* ------------------------------------------------------------------ */

export function FinancePiece({ weight, hovered, motion }: PieceProps) {
  const heights = [0.9, 1.4, 1.1, 1.9, 1.6, 2.5, 2.2, 3.0];
  const curve = useMemo(() => {
    const pts = heights.map((h, i) => new THREE.Vector3(-1.75 + i * 0.5, h - 1.05 + 0.35, 0.45));
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.035, 10, false), [curve]);
  const tubeRef = useRef<THREE.Mesh>(null);
  const tubeMat = useRef<THREE.MeshStandardMaterial>(null);
  const rings = useRef<THREE.Group>(null);
  const coins = useRef<THREE.Group>(null);
  const cols = useRef<(THREE.Mesh | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const draw = useRef(0);
  const shapes = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    const w = weight.current;
    const t = state.clock.elapsedTime;
    // Price curve "draws" itself in as Finance becomes active.
    draw.current = damp(draw.current, 0.25 + w * 0.75, 2.2, dt);
    tube.setDrawRange(0, Math.floor(tube.index!.count * draw.current));
    if (tubeMat.current) tubeMat.current.emissiveIntensity = damp(tubeMat.current.emissiveIntensity, 0.5 + w * 2.4 + (hovered.current ? 1 : 0), 4, dt);
    cols.current.forEach((c, i) => {
      if (!c) return;
      const target = heights[i] * (0.55 + 0.45 * w) + Math.sin(t * 0.8 + i) * 0.04 * w;
      c.scale.y = damp(c.scale.y, target, 3, dt);
      c.position.y = -1.05 + c.scale.y / 2;
    });
    if (rings.current) {
      rings.current.rotation.y += dt * (0.2 + w * 0.4) * motion;
      rings.current.rotation.x = Math.sin(t * 0.3) * 0.25 + 1.2;
    }
    if (coins.current) coins.current.rotation.y += dt * (0.3 + (hovered.current ? 1.2 : 0)) * motion;
    if (shapes.current) {
      shapes.current.children.forEach((c, i) => {
        c.position.y = FLOATERS[i].p[1] + Math.sin(t * 0.7 * motion + i * 1.3) * 0.12;
        c.rotation.x += dt * 0.3 * motion;
        c.rotation.y += dt * (0.25 + i * 0.05) * motion;
      });
    }
    if (light.current) light.current.intensity = damp(light.current.intensity, 2 + w * 12, 4, dt);
  });

  return (
    <group>
      <pointLight ref={light} color="#ffd27a" position={[0.4, 1.2, 2.2]} distance={9} decay={2} />
      {heights.map((_, i) => (
        <mesh key={i} ref={(m) => { cols.current[i] = m; }} position={[-1.75 + i * 0.5, 0, 0]} scale={[1, 0.5, 1]}>
          <cylinderGeometry args={[0.16, 0.16, 1, 32]} />
          <meshStandardMaterial color={i % 2 ? "#3a3d44" : "#5b6069"} metalness={1} roughness={0.22} />
        </mesh>
      ))}
      {/* Base plinth */}
      <mesh position={[0, -1.12, 0]}>
        <boxGeometry args={[4.4, 0.14, 1.3]} />
        <meshStandardMaterial color="#141418" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh ref={tubeRef} geometry={tube}>
        <meshStandardMaterial ref={tubeMat} color="#3d2c08" emissive="#d8b35a" emissiveIntensity={1} metalness={1} roughness={0.2} toneMapped={false} />
      </mesh>
      <group ref={rings} position={[0, 0.5, -0.4]}>
        {[2.3, 2.7].map((r, i) => (
          <mesh key={i} rotation={[0, 0, i * 0.4]}>
            <torusGeometry args={[r, 0.02, 12, 180]} />
            <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.18} />
          </mesh>
        ))}
      </group>
      {/* Floating geometric data sculptures */}
      <group ref={shapes}>
        {FLOATERS.map((f, i) => (
          <group key={i} position={f.p}>
            <mesh>
              {f.k === 0 ? <octahedronGeometry args={[f.s]} /> : f.k === 1 ? <icosahedronGeometry args={[f.s, 0]} /> : <tetrahedronGeometry args={[f.s]} />}
              <meshStandardMaterial color="#1b1a17" metalness={1} roughness={0.15} />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[f.k === 0 ? new THREE.OctahedronGeometry(f.s * 1.01) : f.k === 1 ? new THREE.IcosahedronGeometry(f.s * 1.01, 0) : new THREE.TetrahedronGeometry(f.s * 1.01)]} />
              <lineBasicMaterial color="#d8b35a" toneMapped={false} />
            </lineSegments>
          </group>
        ))}
      </group>
      {/* Coin stack */}
      <group ref={coins} position={[2.45, -1.05, 0.6]}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[Math.sin(i * 1.7) * 0.03, 0.05 + i * 0.085, Math.cos(i * 1.3) * 0.03]}>
            <cylinderGeometry args={[0.3, 0.3, 0.07, 48]} />
            <meshStandardMaterial color="#d8b35a" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Law — stone portico, burgundy light seams, scale of justice         */
/* ------------------------------------------------------------------ */

export function LawPiece({ weight, hovered, motion }: PieceProps) {
  const pediment = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.1, 0);
    s.lineTo(2.1, 0);
    s.lineTo(0, 0.72);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.1, bevelEnabled: false });
    g.translate(0, 0, -0.55);
    return g;
  }, []);
  const seamMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const beam = useRef<THREE.Group>(null);
  const panL = useRef<THREE.Group>(null);
  const panR = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const tilt = useRef(0.18);

  const stone = { color: "#57534f", roughness: 0.72, metalness: 0.1 };
  const seam = (key: string, pos: [number, number, number], size: [number, number, number]) => (
    <mesh key={key} position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={(m) => { if (m && !seamMats.current.includes(m)) seamMats.current.push(m); }}
        color="#1a0508"
        emissive="#c23a50"
        emissiveIntensity={1}
        toneMapped={false}
      />
    </mesh>
  );

  useFrame((state, dt) => {
    const w = weight.current;
    const t = state.clock.elapsedTime;
    seamMats.current.forEach((m) => { m.emissiveIntensity = damp(m.emissiveIntensity, 0.4 + w * 2.8, 3, dt); });
    // Scale settles toward balance when focused; tips when hovered.
    const target = hovered.current ? Math.sin(t * 2.2 * motion) * 0.22 : (1 - w) * 0.18 + Math.sin(t * 0.9 * motion) * 0.03;
    tilt.current = damp(tilt.current, target, 2.5, dt);
    if (beam.current) beam.current.rotation.z = tilt.current;
    if (panL.current) panL.current.rotation.z = -tilt.current;
    if (panR.current) panR.current.rotation.z = -tilt.current;
    if (light.current) light.current.intensity = damp(light.current.intensity, 2 + w * 13, 4, dt);
  });

  const columnsX = [-1.6, -0.8, 0.8, 1.6];
  return (
    <group position={[0, -0.25, 0]}>
      <pointLight ref={light} color="#ff5a6e" position={[0, 0.6, 2.4]} distance={9} decay={2} />
      {/* Steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, -1.0 + i * 0.16, 0.22 - i * 0.12]}>
          <boxGeometry args={[4.6 - i * 0.3, 0.16, 1.7 - i * 0.24]} />
          <meshStandardMaterial {...stone} />
        </mesh>
      ))}
      {seam("s0", [0, -0.915, 1.075], [4.6, 0.012, 0.012])}
      {seam("s1", [0, -0.755, 0.835], [4.3, 0.012, 0.012])}
      {seam("s2", [0, -0.595, 0.595], [4.0, 0.012, 0.012])}
      {/* Columns */}
      {columnsX.map((x) => (
        <group key={x} position={[x, 0.42, 0]}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.2, 1.9, 20]} />
            <meshStandardMaterial {...stone} />
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <boxGeometry args={[0.5, 0.12, 0.5]} />
            <meshStandardMaterial {...stone} />
          </mesh>
          <mesh position={[0, -0.98, 0]}>
            <boxGeometry args={[0.48, 0.1, 0.48]} />
            <meshStandardMaterial {...stone} />
          </mesh>
        </group>
      ))}
      {/* Entablature + pediment */}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[4.3, 0.26, 1.15]} />
        <meshStandardMaterial {...stone} />
      </mesh>
      {seam("s3", [0, 1.415, 0.58], [4.3, 0.014, 0.014])}
      {seam("s4", [0, 1.685, 0.58], [4.3, 0.014, 0.014])}
      <mesh geometry={pediment} position={[0, 1.68, 0]}>
        <meshStandardMaterial {...stone} />
      </mesh>
      {/* Scale of justice, in the doorway */}
      <group position={[0, -0.43, 0.15]}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 1.4, 12]} />
          <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.05, 32]} />
          <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.25} />
        </mesh>
        <group ref={beam} position={[0, 1.38, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 1.0, 12]} />
            <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.25} />
          </mesh>
          {([[-0.5, panL], [0.5, panR]] as const).map(([x, ref]) => (
            <group key={x} ref={ref} position={[x, 0, 0]}>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.08, -0.22, 0]} rotation={[0, 0, s * 0.35]}>
                  <cylinderGeometry args={[0.004, 0.004, 0.46, 4]} />
                  <meshStandardMaterial color="#8c7a55" />
                </mesh>
              ))}
              <mesh position={[0, -0.45, 0]}>
                <cylinderGeometry args={[0.2, 0.12, 0.05, 32]} />
                <meshStandardMaterial color="#b8923e" metalness={1} roughness={0.25} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
