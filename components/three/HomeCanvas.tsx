"use client";
import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { EngineeringPiece, FinancePiece, LawPiece, type PieceProps } from "./FacultyCenterpieces";

export const SPACING = 11;
const ACCENTS = ["#5aa9ff", "#d8b35a", "#b0384a"].map((c) => new THREE.Color(c));

/** Mutable state shared between the DOM controller and the 3D scene (no React re-renders). */
export interface Rig {
  progress: number; // 0..2, fractional while moving
  enter: number; // 0..1 fly-in animation toward the active piece
  pointer: { x: number; y: number }; // -1..1
  dragging: boolean;
}

interface Props {
  rig: React.MutableRefObject<Rig>;
  onSelect: (index: number) => void;
}

const damp = THREE.MathUtils.damp;

function CameraRig({ rig }: { rig: Props["rig"] }) {
  const { camera, size, scene } = useThree();
  const look = useRef(new THREE.Vector3());
  const accent = useRef(new THREE.Color("#5aa9ff"));
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.SpotLight>(null);

  useFrame((_, dt) => {
    const { progress, enter, pointer } = rig.current;
    const narrow = size.width / size.height < 0.8;
    const baseZ = narrow ? 14 : 8.6;
    const x = progress * SPACING;
    // Frame the object right of the copy on desktop, above it on mobile.
    const frameX = narrow ? 0 : -1.9 * (1 - enter);
    const frameY = narrow ? -2.0 * (1 - enter) : 0;
    // Depth: pull back slightly mid-transition for a sense of travel.
    const travel = Math.sin((progress % 1) * Math.PI);
    const tx = x + frameX + pointer.x * 0.35 * (1 - enter);
    const ty = 0.55 + frameY + pointer.y * 0.25 * (1 - enter) - enter * 0.25;
    const tz = baseZ + travel * 1.6 - enter * (baseZ - 2.2);
    camera.position.x = damp(camera.position.x, tx, 6, dt);
    camera.position.y = damp(camera.position.y, ty, 6, dt);
    camera.position.z = damp(camera.position.z, tz, 6, dt);
    look.current.set(damp(look.current.x, x + frameX, 7, dt), damp(look.current.y, 0.25 + frameY, 7, dt), 0);
    camera.lookAt(look.current);

    // Blend lighting toward the active faculty's accent.
    const i = Math.min(2, Math.floor(progress));
    const f = progress - i;
    const target = ACCENTS[i].clone().lerp(ACCENTS[Math.min(2, i + 1)], f);
    accent.current.lerp(target, 1 - Math.exp(-4 * dt));
    if (scene.fog) {
      const fog = (scene.fog as THREE.Fog).color.copy(accent.current).multiplyScalar(0.035);
      // Keep the background identical to the fog so the floor never shows a horizon seam.
      if (scene.background instanceof THREE.Color) scene.background.copy(fog);
    }
    if (fill.current) {
      fill.current.color.copy(accent.current);
      fill.current.position.set(x - 4, 3, 3);
      fill.current.target.position.set(x, 0, 0);
      fill.current.target.updateMatrixWorld();
    }
    if (key.current) {
      key.current.position.set(x + 4, 6, 5);
      key.current.target.position.set(x, 0, 0);
      key.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <directionalLight ref={key} intensity={1.6} color="#fff4e6" />
      <spotLight ref={fill} intensity={38} angle={0.6} penumbra={1} distance={20} />
    </>
  );
}

function Slot({ index, rig, onSelect, children }: { index: number; rig: Props["rig"]; onSelect: Props["onSelect"]; children: (p: PieceProps) => React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const weight = useRef(index === 0 ? 1 : 0);
  const hovered = useRef(false);

  useFrame((state, dt) => {
    const dist = Math.abs(rig.current.progress - index);
    weight.current = damp(weight.current, Math.max(0, 1 - dist), 5, dt);
    const g = group.current;
    if (!g) return;
    const side = Math.sign(index - rig.current.progress);
    // Parallax: inactive pieces recede, turn toward the centre and dim.
    g.position.z = damp(g.position.z, -Math.min(1, dist) * 2.2, 4, dt);
    g.rotation.y = damp(g.rotation.y, -side * Math.min(1, dist) * 0.55 + Math.sin(state.clock.elapsedTime * 0.25 + index) * 0.12, 3, dt);
    g.position.y = Math.sin(state.clock.elapsedTime * 0.6 + index * 2) * 0.06;
    const s = 0.82 + weight.current * 0.18;
    g.scale.setScalar(s);
  });

  const isActive = () => Math.round(rig.current.progress) === index && Math.abs(rig.current.progress - index) < 0.08;

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
        {children({ weight, hovered })}
      </group>
      {/* Floor glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.32, 0]}>
        <circleGeometry args={[3.2, 64]} />
        <meshStandardMaterial color="#0d0d12" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  );
}

export default function HomeCanvas({ rig, onSelect }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.55, 8.6], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => { document.body.style.cursor = ""; }}
    >
      <color attach="background" args={["#07070a"]} />
      <fog attach="fog" args={["#07070a", 9, 26]} />
      <ambientLight intensity={0.18} />
      <CameraRig rig={rig} />
      <Suspense fallback={null}>
        {/* Local studio lighting for metal reflections — no HDR download needed. */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2} position={[0, 5, -6]} scale={[12, 2, 1]} />
          <Lightformer intensity={1.2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={0.8} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
          <Lightformer intensity={0.6} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        </Environment>
      </Suspense>
      <Slot index={0} rig={rig} onSelect={onSelect}>{(p) => <EngineeringPiece {...p} />}</Slot>
      <Slot index={1} rig={rig} onSelect={onSelect}>{(p) => <FinancePiece {...p} />}</Slot>
      <Slot index={2} rig={rig} onSelect={onSelect}>{(p) => <LawPiece {...p} />}</Slot>
      {/* Reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SPACING, -1.34, 0]}>
        <planeGeometry args={[SPACING * 6, 40]} />
        <meshStandardMaterial color="#060608" metalness={0.9} roughness={0.55} />
      </mesh>
    </Canvas>
  );
}
