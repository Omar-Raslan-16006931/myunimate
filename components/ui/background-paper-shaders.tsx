"use client";

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
// @ts-ignore
import * as THREE from 'three';

const vertexShader = `
  uniform float time;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 8.0 + time * 1.2) * 0.08;
    pos.x += cos(pos.y * 6.5 + time) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float wave = sin(uv.x * 14.0 + time * 0.8) * cos(uv.y * 12.0 - time * 0.6);
    wave += sin(uv.x * 26.0 - time * 1.8) * 0.35;
    float glow = smoothstep(0.75, 0.0, length(uv - 0.5));
    vec3 base = mix(color1, color2, uv.y * 0.5 + 0.5 * wave);
    base = mix(base, color3, abs(wave) * 0.55);
    gl_FragColor = vec4(base, glow * 0.9);
  }
`;

function ShaderPlane({
  position,
  color1,
  color2,
  color3,
  scale = [1, 1, 1],
}: {
  position: [number, number, number];
  color1: string;
  color2: string;
  color3: string;
  scale?: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      color1: { value: new THREE.Color(color1) },
      color2: { value: new THREE.Color(color2) },
      color3: { value: new THREE.Color(color3) },
    }),
    [color1, color2, color3],
  );

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <planeGeometry args={[3, 3, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function EnergyRing({
  radius,
  position,
  color,
}: {
  radius: number;
  position: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.4;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[radius, 0.03, 8, 96]} />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </mesh>
  );
}

export function BackgroundPaperShaders({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        className="absolute inset-0"
      >
        <color attach="background" args={['#09060f']} />
        <fog attach="fog" args={['#09060f', 5, 10]} />
        <ambientLight intensity={1.2} />
        <ShaderPlane
          position={[0, 0, 0]}
          color1="#2e1065"
          color2="#fb7185"
          color3="#f97316"
          scale={[2.8, 2.2, 1]}
        />
        <ShaderPlane
          position={[0.9, -0.35, -0.6]}
          color1="#1e1b4b"
          color2="#f59e0b"
          color3="#22c7b4"
          scale={[1.8, 1.4, 1]}
        />
        <EnergyRing radius={1.3} position={[-1.2, -0.8, -0.3]} color="#fb7185" />
        <EnergyRing radius={1.7} position={[1.0, 0.7, -0.4]} color="#22c7b4" />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-[#09060f]/10 via-[#09060f]/25 to-[#0a0a0f]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34, 199, 180,0.18),transparent_40%),radial-gradient(circle_at_20%_75%,rgba(249,115,22,0.16),transparent_35%)]" />
    </div>
  );
}
