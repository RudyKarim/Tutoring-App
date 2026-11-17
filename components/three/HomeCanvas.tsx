"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { EngineeringPiece, FinancePiece, LawPiece, type PieceProps } from "./FacultyCenterpieces";

/** Distance between centerpieces along the gallery. Close enough that neighbours peek in at the edges. */
export const SPACING = 6.6;
const ACCENTS = ["#5aa9ff", "#d8b35a", "#b0384a"].map((c) => new THREE.Color(c));

/** `?debug3d` exposes screen-space bounds of the sculptures (used by the layout tests). */
const DEBUG = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug3d");

/**
 * Fitting the sculptures between the faculty title and the bottom bar.
 * Effective vertical extent of the tallest sculpture at scale 1, in world units, measured on screen:
 * top of the finance price curve, and the front edge of the pedestal (which projects lower
 * than its true height because it is nearer the camera).
 */
const FIT_TOP = 2.42;
const FIT_BOTTOM = -2.5;
const FIT_MARGIN_TOP = 12; // px between the title's letters and the top of the sculpture
const FIT_MARGIN_BOTTOM = 8; // px between the pedestal and the bottom bar

export type Tier = "high" | "low";

/** Mutable state shared between the DOM controller and the 3D scene (no React re-renders). */
export interface Rig {
  progress: number; // 0..2, fractional while moving
  enter: number; // 0..1 fly-in animation toward the active piece
  pointer: { x: number; y: number }; // -1..1
  dragging: boolean;
  reduced: boolean; // prefers-reduced-motion
  /** Free vertical band for the sculpture, in px from the top of the hero (set by the page). */
  band?: { top: number; bottom: number };
}

interface Props {
  rig: React.MutableRefObject<Rig>;
  onSelect: (index: number) => void;
  active: boolean; // false when the hero is off-screen or the tab is hidden: stop rendering
  tier: Tier;
  /** True when the tier was forced with ?quality=…: keep it and the resolution fixed. */
  locked?: boolean;
  /** Called once the first frame has been drawn (so the page can fade out its placeholder). */
  onReady?: () => void;
}

/** Scene-internal state that never triggers React renders. */
interface Shared {
  weights: number[]; // damped focus per slot, written by Slot
  slots: (THREE.Group | null)[];
  hovered: boolean;
  busy: boolean; // camera still converging
  fit: { s: number; drop: number }; // sculpture scale and vertical offset that fit the free band
}

const damp = THREE.MathUtils.damp;

/** Narrow (portrait) viewports frame the scene further back and higher up. */
function useFraming() {
  const { size } = useThree();
  const aspect = size.width / size.height;
  return { narrow: aspect < 0.8, aspect };
}

const _target = new THREE.Color();
const _p = new THREE.Vector3();

function CameraRig({ rig, shared, low }: { rig: Props["rig"]; shared: Shared; low: boolean }) {
  const { camera, scene, size } = useThree();
  const { narrow, aspect } = useFraming();
  const look = useRef(new THREE.Vector3(0, 0.4, 0));
  const accent = useRef(ACCENTS[0].clone());
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.SpotLight>(null);

  useFrame((_, dt) => {
    const { progress, enter, pointer, reduced } = rig.current;
    const baseZ = narrow ? 15.5 : aspect < 1.3 ? 11.5 : 9.6;
    const x = progress * SPACING;
    // Travel: mid-transition the camera pulls back and dips, like a dolly between exhibits.
    const travel = Math.sin((((progress % 1) + 1) % 1) * Math.PI);
    // Gentle mouse parallax only once a faculty has settled.
    const settled = 1 - Math.min(1, Math.abs(progress - Math.round(progress)) * 4);
    const par = reduced ? 0 : 0.45 * settled * (1 - enter);
    const frameY = narrow ? -0.35 : 0;

    // Fit: largest scale (never above the original) whose top clears the title and whose pedestal
    // clears the bottom bar; then the vertical offset closest to the original placement.
    const band = rig.current.band;
    const lookY = 0.45 + frameY;
    const h = size.height;
    const ppu = h / (2 * baseZ * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)));
    const base = narrow ? 0.86 : 1; // Slot's own narrow-screen scale
    let fs = 1, drop = 0;
    if (band && band.bottom > band.top) {
      const top = band.top + FIT_MARGIN_TOP, bottom = band.bottom - FIT_MARGIN_BOTTOM;
      fs = Math.max(0.45, Math.min(1, (bottom - top) / ((FIT_TOP - FIT_BOTTOM) * base * ppu)));
      const maxDrop = lookY + (h / 2 - top) / ppu - fs * base * FIT_TOP; // highest allowed
      const minDrop = lookY - (bottom - h / 2) / ppu - fs * base * FIT_BOTTOM; // lowest allowed
      drop = minDrop > maxDrop ? (minDrop + maxDrop) / 2 : Math.min(maxDrop, Math.max(minDrop, 0));
    }
    shared.fit.s = fs;
    shared.fit.drop = drop;

    // Fly-in: head for the (possibly smaller, lower) sculpture rather than the original spot.
    const pieceY = drop + fs * base * 0.45;
    const tx = x + pointer.x * par;
    const ty = 0.75 + frameY + pointer.y * par * 0.5 - travel * 0.25 - enter * 0.35 + enter * (pieceY - 0.45);
    const tz = baseZ + travel * 2.2 - enter * (baseZ - 2.4 * Math.max(0.6, fs));
    const k = reduced ? 20 : 5;
    camera.position.x = damp(camera.position.x, tx, k, dt);
    camera.position.y = damp(camera.position.y, ty, k, dt);
    camera.position.z = damp(camera.position.z, tz, k, dt);
    look.current.x = damp(look.current.x, x, k + 1, dt);
    look.current.y = damp(look.current.y, 0.45 + frameY + enter * (0.1 + pieceY - 0.45), k, dt);
    camera.lookAt(look.current);
    shared.busy = Math.abs(camera.position.x - tx) + Math.abs(camera.position.y - ty) + Math.abs(camera.position.z - tz) + Math.abs(look.current.x - x) > 0.002;

    // Blend lighting and atmosphere toward the active faculty's accent (no allocations).
    const i = Math.max(0, Math.min(2, Math.floor(progress)));
    const f = Math.max(0, Math.min(1, progress - i));
    _target.copy(ACCENTS[i]).lerp(ACCENTS[Math.min(2, i + 1)], f);
    accent.current.lerp(_target, 1 - Math.exp(-4 * dt));
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(accent.current).multiplyScalar(0.03);
    if (fill.current) {
      fill.current.color.copy(accent.current);
      fill.current.position.set(x - 5, 4, 4);
      fill.current.target.position.set(x, 0, 0);
      fill.current.target.updateMatrixWorld();
    }
    if (rim.current) {
      rim.current.color.copy(accent.current);
      rim.current.position.set(x + 3, 5, -5);
      rim.current.target.position.set(x, 0.5, 0);
      rim.current.target.updateMatrixWorld();
    }
    if (key.current) {
      key.current.position.set(x + 4, 7, 6);
      key.current.target.position.set(x, 0, 0);
      key.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <directionalLight ref={key} intensity={1.3} color="#fff4e6" />
      {!low && <spotLight ref={fill} intensity={34} angle={0.6} penumbra={1} distance={22} />}
      <spotLight ref={rim} intensity={60} angle={0.5} penumbra={1} distance={20} />
    </>
  );
}

/**
 * Faculty point lights, pooled. Each sculpture used to carry its own light (three always-on
 * lights shading every pixel); only the two pieces nearest the camera are ever lit noticeably,
 * so two lights follow them instead (one on the low tier).
 */
const PIECE_LIGHTS = [
  { color: new THREE.Color("#5aa9ff"), pos: [0, 0.4, 2.2] as const, k: 14 },
  { color: new THREE.Color("#ffd27a"), pos: [0.4, 1.2, 2.2] as const, k: 12 },
  { color: new THREE.Color("#ff5a6e"), pos: [0, 0.35, 2.4] as const, k: 13 },
];
function PieceLights({ rig, shared, low }: { rig: Props["rig"]; shared: Shared; low: boolean }) {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const intensity = useRef([16, 2, 2]);
  useFrame((_, dt) => {
    for (let j = 0; j < 3; j++) intensity.current[j] = damp(intensity.current[j], 2 + shared.weights[j] * PIECE_LIGHTS[j].k, 4, dt);
    const p = rig.current.progress;
    const first = low ? Math.max(0, Math.min(2, Math.round(p))) : Math.max(0, Math.min(1, Math.floor(p)));
    lights.current.forEach((l, n) => {
      const j = first + n;
      const g = shared.slots[j];
      if (!l || !g) return;
      const cfg = PIECE_LIGHTS[j];
      l.color.copy(cfg.color);
      // Lights are placed in the (scaled) sculpture space; compensate so illumination is unchanged.
      l.intensity = intensity.current[j] * shared.fit.s * shared.fit.s;
      l.distance = 9 * shared.fit.s;
      l.position.copy(_p.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]).applyMatrix4(g.matrixWorld));
    });
  });
  return (
    <>
      {Array.from({ length: low ? 1 : 2 }, (_, n) => (
        <pointLight key={n} ref={(l) => { lights.current[n] = l; }} distance={9} decay={2} />
      ))}
    </>
  );
}

/** Radial alpha texture so floors fade into the transparent background with no seam. */
function useRadialFade() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.55, "#666");
    grad.addColorStop(1, "#000");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Slot({ index, rig, shared, low, fade, onSelect, children }: { index: number; rig: Props["rig"]; shared: Shared; low: boolean; fade: THREE.Texture; onSelect: Props["onSelect"]; children: (p: PieceProps) => React.ReactNode }) {
  const group = useRef<THREE.Group | null>(null);
  const floor = useRef<THREE.Mesh>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);
  const weight = useRef(index === 0 ? 1 : 0);
  const hovered = useRef(false);
  const live = useRef(true);
  const { narrow } = useFraming();
  const accent = ["#5aa9ff", "#d8b35a", "#b0384a"][index];

  useFrame((state, dt) => {
    const { progress, reduced } = rig.current;
    const offset = index - progress; // <0: already passed (left), >0: upcoming (right)
    const dist = Math.abs(offset);
    weight.current = damp(weight.current, Math.max(0, 1 - dist), 5, dt);
    shared.weights[index] = weight.current;
    const g = group.current;
    if (!g) return;
    // Skip drawing (and animating) pieces that are fully off-screen.
    live.current = dist < 1.75;
    g.visible = live.current;
    const { s: fs, drop } = shared.fit;
    if (floor.current) {
      floor.current.visible = live.current;
      floor.current.position.y = drop - 1.5 * fs;
      floor.current.scale.setScalar(fs);
    }
    if (!live.current) return;
    const t = state.clock.elapsedTime;
    const m = reduced ? 0.15 : 1;
    const c = Math.min(1, dist);
    // Outgoing pieces rotate away and recede; incoming ones swing in from depth.
    g.rotation.y = -offset * 0.85 + Math.sin(t * 0.22 * m + index) * 0.1 * m;
    g.position.z = -c * 3.6;
    g.position.x = -Math.sign(offset) * c * 0.6;
    g.position.y = drop + Math.sin(t * 0.6 * m + index * 2) * 0.06 * m;
    g.scale.setScalar(fs * (narrow ? 0.86 : 1) * (1 - c * 0.28));
    if (rimMat.current) rimMat.current.emissiveIntensity = 0.3 + weight.current * 2.2;
  });

  const isActive = () => Math.abs(rig.current.progress - index) < 0.08;

  return (
    <group position={[index * SPACING, 0, 0]}>
      <group
        ref={(g) => { group.current = g; shared.slots[index] = g; }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!isActive()) return;
          hovered.current = shared.hovered = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hovered.current = shared.hovered = false;
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (rig.current.dragging) return;
          onSelect(index);
        }}
      >
        {children({ weight, hovered, live, low, motion: rig.current.reduced ? 0.15 : 1 })}
        {/* Exhibition pedestal with an accent light seam */}
        <mesh position={[0, -1.42, 0]} userData={{ pedestal: true }}>
          <cylinderGeometry args={[2.7, 2.85, 0.16, low ? 40 : 64]} />
          <meshStandardMaterial color="#0e0e12" metalness={0.85} roughness={0.32} />
        </mesh>
        <mesh position={[0, -1.335, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ pedestal: true }}>
          <torusGeometry args={[2.7, 0.012, 4, low ? 64 : 96]} />
          <meshStandardMaterial ref={rimMat} color="#000" emissive={accent} emissiveIntensity={1} toneMapped={false} />
        </mesh>
      </group>
      {/* Floor pool of light that fades into the background (large transparent area: off on the low tier) */}
      {!low && (
        <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
          <circleGeometry args={[6, 48]} />
          <meshStandardMaterial color="#0b0b0f" metalness={0.9} roughness={0.4} transparent alphaMap={fade} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/**
 * On-demand rendering + adaptive quality.
 * - While anything moves (gallery travel, drag, fly-in, parallax, hover, damping tails) it renders every frame.
 * - When the scene is idle, only the slow ambient motion remains, so it renders every other display frame.
 * - It measures frame rate during busy periods and steps resolution down (or up), demoting to the
 *   low tier if even the lowest resolution can't keep up. The first ~2.5s always count as busy,
 *   which doubles as the initial frame-rate check.
 */
function FrameDriver({ rig, shared, active, onStats, onReady }: { rig: Props["rig"]; shared: Shared; active: boolean; onStats: (fps: number) => void; onReady?: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  const st = useRef({ p: NaN, e: NaN, px: NaN, py: NaN, quietUntil: 0, last: 0, prevBusy: false, samples: [] as number[], frames: 0, ready: false, pending: 0 });

  useEffect(() => {
    if (!active) return;
    st.current.quietUntil = performance.now() + 2500;
    invalidate();
    const s = st.current;
    return () => cancelAnimationFrame(s.pending);
  }, [active, invalidate]);

  useFrame(() => {
    const s = st.current;
    const r = rig.current;
    const now = performance.now();
    if (r.progress !== s.p || r.enter !== s.e || r.pointer.x !== s.px || r.pointer.y !== s.py || r.dragging || shared.hovered || shared.busy) {
      s.quietUntil = now + 1800;
      s.p = r.progress; s.e = r.enter; s.px = r.pointer.x; s.py = r.pointer.y;
    }
    const busy = now < s.quietUntil;
    // Frame-rate sampling (only consecutive full-rate frames, ignoring the first shader-compile frames).
    s.frames++;
    if (busy && s.prevBusy && s.frames > 20) {
      const d = now - s.last;
      if (d < 250) s.samples.push(d);
      // Judge after ~1s of full-rate frames (at least 8), so slow machines adapt quickly too.
      const total = s.samples.reduce((a, b) => a + b, 0);
      if (s.samples.length >= 60 || (s.samples.length >= 8 && total > 1000)) {
        const avg = total / s.samples.length;
        s.samples.length = 0;
        onStats(1000 / avg);
      }
    }
    s.prevBusy = busy;
    s.last = now;
    if (!s.ready && s.frames >= 2) { s.ready = true; onReady?.(); }
    if (!active) return;
    if (busy) invalidate();
    else { cancelAnimationFrame(s.pending); s.pending = requestAnimationFrame(() => invalidate()); } // skip one frame: half rate
  });
  return null;
}

/** Debug only (?debug3d): screen-space bounds of a sculpture, in CSS pixels, from its actual vertices. */
function DebugBounds({ shared }: { shared: Shared }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!DEBUG) return;
    const v = new THREE.Vector3();
    const im = new THREE.Matrix4();
    (window as unknown as { __praxis3d?: unknown }).__praxis3d = {
      bounds(i: number) {
        const g = shared.slots[i];
        if (!g) return null;
        g.updateWorldMatrix(true, true);
        const piece = { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity };
        const pedestal = { ...piece };
        let r = piece;
        const add = (m: THREE.Matrix4, pos: THREE.BufferAttribute) => {
          for (let k = 0; k < pos.count; k++) {
            v.fromBufferAttribute(pos, k).applyMatrix4(m).project(camera);
            const x = ((v.x + 1) / 2) * size.width, y = ((1 - v.y) / 2) * size.height;
            if (y < r.top) r.top = y; if (y > r.bottom) r.bottom = y;
            if (x < r.left) r.left = x; if (x > r.right) r.right = x;
          }
        };
        g.traverseVisible((o) => {
          const mesh = o as THREE.Mesh;
          const pos = mesh.geometry?.getAttribute?.("position") as THREE.BufferAttribute | undefined;
          if (!pos) return;
          r = o.userData.pedestal ? pedestal : piece;
          const inst = o as THREE.InstancedMesh;
          if (inst.isInstancedMesh) {
            for (let n = 0; n < inst.count; n++) { inst.getMatrixAt(n, im); add(im.premultiply(inst.matrixWorld), pos); }
          } else add(mesh.matrixWorld, pos);
        });
        return { piece, pedestal };
      },
      /** Projected screen points of every vertex, for exact overlap checks. */
      points(i: number) {
        const g = shared.slots[i];
        if (!g) return [];
        g.updateWorldMatrix(true, true);
        const out: number[] = [];
        const add = (m: THREE.Matrix4, pos: THREE.BufferAttribute) => {
          for (let k = 0; k < pos.count; k++) {
            v.fromBufferAttribute(pos, k).applyMatrix4(m).project(camera);
            out.push(((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height);
          }
        };
        g.traverseVisible((o) => {
          const pos = (o as THREE.Mesh).geometry?.getAttribute?.("position") as THREE.BufferAttribute | undefined;
          if (!pos) return;
          const inst = o as THREE.InstancedMesh;
          if (inst.isInstancedMesh) for (let n = 0; n < inst.count; n++) { inst.getMatrixAt(n, im); add(im.premultiply(inst.matrixWorld), pos); }
          else add(o.matrixWorld, pos);
        });
        return out;
      },
    };
  }, [camera, size, shared]);
  return null;
}

const LEVELS = { high: [0.75, 1, 1.25, 1.5], low: [0.6, 0.75, 1] } as const;

export default function HomeCanvas({ rig, onSelect, active, tier: initialTier, locked = false, onReady }: Props) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const low = tier === "low";
  const levels = LEVELS[tier];
  const deviceMax = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  // Start at 1 (0.75 on the low tier), never above the screen's own pixel ratio or 1.5.
  const cap = Math.max(1, Math.min(deviceMax, 1.5));
  const maxLevel = levels.reduce((best, l, i) => (l <= cap ? i : best), 0);
  const [level, setLevel] = useState(1); // index 1 = 1.0 (high) / 0.75 (low)
  const lvl = Math.min(level, maxLevel);
  const dpr = levels[lvl];
  const changes = useRef(0);
  const shared = useRef<Shared>({ weights: [1, 0, 0], slots: [null, null, null], hovered: false, busy: false, fit: { s: 1, drop: 0 } }).current;
  const fade = useRadialFade();
  // MSAA is worth it on 1x screens; on high-density screens the extra pixels already smooth edges.
  const [antialias] = useState(() => initialTier === "high" && deviceMax < 1.5);

  const onStats = (fps: number) => {
    if (locked || changes.current >= 5) return; // forced quality, or stop flip-flopping
    if (fps < 40) {
      changes.current++;
      if (lvl > 0) setLevel(lvl - 1);
      else if (!low) { setTier("low"); setLevel(1); }
    } else if (fps > 57 && lvl < maxLevel) {
      changes.current++;
      setLevel(lvl + 1);
    }
  };

  // Expose the current quality for debugging / profiling (?quality=… overrides the tier).
  useEffect(() => {
    (window as unknown as { __praxisQuality?: unknown }).__praxisQuality = { tier, dpr };
  }, [tier, dpr]);

  return (
    <Canvas
      frameloop={active ? "demand" : "never"}
      dpr={dpr}
      camera={{ position: [0, 0.75, 9.6], fov: 36, near: 0.1, far: 80 }}
      gl={{ antialias, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, precision: low ? "mediump" : "highp", stencil: false }}
      onPointerMissed={() => { document.body.style.cursor = ""; }}
      aria-hidden
    >
      <FrameDriver rig={rig} shared={shared} active={active} onStats={onStats} onReady={onReady} />
      {DEBUG && <DebugBounds shared={shared} />}
      <fog attach="fog" args={["#07070a", 11, 24]} />
      <ambientLight intensity={0.16} />
      <CameraRig rig={rig} shared={shared} low={low} />
      <PieceLights rig={rig} shared={shared} low={low} />
      <Suspense fallback={null}>
        {/* Local studio lighting for metal reflections, rendered once — no HDR download needed. */}
        <Environment resolution={low ? 128 : 256} frames={1}>
          <Lightformer intensity={2} position={[0, 5, -6]} scale={[12, 2, 1]} />
          <Lightformer intensity={1.2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={0.8} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={0.5} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        </Environment>
      </Suspense>
      <Slot index={0} rig={rig} shared={shared} low={low} fade={fade} onSelect={onSelect}>{(p) => <EngineeringPiece {...p} />}</Slot>
      <Slot index={1} rig={rig} shared={shared} low={low} fade={fade} onSelect={onSelect}>{(p) => <FinancePiece {...p} />}</Slot>
      <Slot index={2} rig={rig} shared={shared} low={low} fade={fade} onSelect={onSelect}>{(p) => <LawPiece {...p} />}</Slot>
    </Canvas>
  );
}
