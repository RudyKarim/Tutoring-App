"use client";
import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { EngineeringPiece, FinancePiece, LawPiece, type PieceProps } from "./FacultyCenterpieces";

/** Distance between centerpieces along the gallery. Close enough that neighbours peek in at the edges. */
export const SPACING = 6.6;
const ACCENTS = ["#5aa9ff", "#d8b35a", "#b0384a"].map((c) => new THREE.Color(c));

/** Mutable state shared between the DOM controller and the 3D scene (no React re-renders). */
export interface Rig {
  progress: number; // 0..2, fractional while moving
  enter: number; // 0..1 fly-in animation toward the active piece
  pointer: { x: number; y: number }; // -1..1
  dragging: boolean;
  reduced: boolean; // prefers-reduced-motion
}

interface Props {
  rig: React.MutableRefObject<Rig>;
  onSelect: (index: number) => void;
  active: boolean; // false when the hero is off-screen: stop rendering
}

const damp = THREE.MathUtils.damp;

/** Narrow (portrait) viewports frame the scene further back and higher up. */
function useFraming() {
  const { size } = useThree();
  const aspect = size.width / size.height;
  return { narrow: aspect < 0.8, aspect };
}

function CameraRig({ rig }: { rig: Props["rig"] }) {
  const { camera, scene } = useThree();
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
    const tx = x + pointer.x * par;
    const ty = 0.75 + frameY + pointer.y * par * 0.5 - travel * 0.25 - enter * 0.35;
    const tz = baseZ + travel * 2.2 - enter * (baseZ - 2.4);
    const k = reduced ? 20 : 5;
    camera.position.x = damp(camera.position.x, tx, k, dt);
    camera.position.y = damp(camera.position.y, ty, k, dt);
    camera.position.z = damp(camera.position.z, tz, k, dt);
    look.current.x = damp(look.current.x, x, k + 1, dt);
    look.current.y = damp(look.current.y, 0.45 + frameY + enter * 0.1, k, dt);
    camera.lookAt(look.current);

    // Blend lighting and atmosphere toward the active faculty's accent.
    const i = Math.max(0, Math.min(2, Math.floor(progress)));
    const f = Math.max(0, Math.min(1, progress - i));
    const target = ACCENTS[i].clone().lerp(ACCENTS[Math.min(2, i + 1)], f);
    accent.current.lerp(target, 1 - Math.exp(-4 * dt));
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
      <spotLight ref={fill} intensity={34} angle={0.6} penumbra={1} distance={22} />
      <spotLight ref={rim} intensity={60} angle={0.5} penumbra={1} distance={20} />
    </>
  );
}

/** Radial alpha texture so floors fade into the transparent background with no seam. */
function useRadialFade() {
  return useMemo(() => {
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
}

function Slot({ index, rig, onSelect, children }: { index: number; rig: Props["rig"]; onSelect: Props["onSelect"]; children: (p: PieceProps) => React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const rimMat = useRef<THREE.MeshStandardMaterial>(null);
  const weight = useRef(index === 0 ? 1 : 0);
  const hovered = useRef(false);
  const fade = useRadialFade();
  const { narrow } = useFraming();
  const accent = ["#5aa9ff", "#d8b35a", "#b0384a"][index];

  useFrame((state, dt) => {
    const { progress, reduced } = rig.current;
    const offset = index - progress; // <0: already passed (left), >0: upcoming (right)
    const dist = Math.abs(offset);
    weight.current = damp(weight.current, Math.max(0, 1 - dist), 5, dt);
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const m = reduced ? 0.15 : 1;
    const c = Math.min(1, dist);
    g.visible = dist < 1.75; // skip drawing pieces that are fully off-screen
    // Outgoing pieces rotate away and recede; incoming ones swing in from depth.
    g.rotation.y = -offset * 0.85 + Math.sin(t * 0.22 * m + index) * 0.1 * m;
    g.position.z = -c * 3.6;
    g.position.x = -Math.sign(offset) * c * 0.6;
    g.position.y = Math.sin(t * 0.6 * m + index * 2) * 0.06 * m;
    g.scale.setScalar((narrow ? 0.86 : 1) * (1 - c * 0.28));
    if (rimMat.current) rimMat.current.emissiveIntensity = 0.3 + weight.current * 2.2;
  });

  const isActive = () => Math.abs(rig.current.progress - index) < 0.08;

  return (
    <group position={[index * SPACING, 0, 0]}>
      <group
        ref={group}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!isActive()) return;
          hovered.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (rig.current.dragging) return;
          onSelect(index);
        }}
      >
        {children({ weight, hovered, motion: rig.current.reduced ? 0.15 : 1 })}
        {/* Exhibition pedestal with an accent light seam */}
        <mesh position={[0, -1.42, 0]}>
          <cylinderGeometry args={[2.7, 2.85, 0.16, 96]} />
          <meshStandardMaterial color="#0e0e12" metalness={0.85} roughness={0.32} />
        </mesh>
        <mesh position={[0, -1.335, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.7, 0.012, 8, 160]} />
          <meshStandardMaterial ref={rimMat} color="#000" emissive={accent} emissiveIntensity={1} toneMapped={false} />
        </mesh>
      </group>
      {/* Floor pool of light that fades into the background */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#0b0b0f" metalness={0.9} roughness={0.4} transparent alphaMap={fade} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function HomeCanvas({ rig, onSelect, active }: Props) {
  // Adaptive resolution: start modest, raise on capable GPUs, drop when frames slow down.
  const [dpr, setDpr] = useState(1.25);
  const maxDpr = typeof window === "undefined" ? 1.5 : Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={Math.min(dpr, maxDpr)}
      camera={{ position: [0, 0.75, 9.6], fov: 36, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => { document.body.style.cursor = ""; }}
      aria-hidden
    >
      <PerformanceMonitor onIncline={() => setDpr(maxDpr)} onDecline={() => setDpr(1)} flipflops={3} onFallback={() => setDpr(1)} />
      <fog attach="fog" args={["#07070a", 11, 24]} />
      <ambientLight intensity={0.16} />
      <CameraRig rig={rig} />
      <Suspense fallback={null}>
        {/* Local studio lighting for metal reflections — no HDR download needed. */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2} position={[0, 5, -6]} scale={[12, 2, 1]} />
          <Lightformer intensity={1.2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={0.8} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={0.5} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        </Environment>
      </Suspense>
      <Slot index={0} rig={rig} onSelect={onSelect}>{(p) => <EngineeringPiece {...p} />}</Slot>
      <Slot index={1} rig={rig} onSelect={onSelect}>{(p) => <FinancePiece {...p} />}</Slot>
      <Slot index={2} rig={rig} onSelect={onSelect}>{(p) => <LawPiece {...p} />}</Slot>
    </Canvas>
  );
}
