type Model3DProps = {
  onSelectRoom: (room: string, pos: { x: number, y: number }) => void;
};
"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { STLLoader } from "three-stdlib";

// 실제 데이터에 존재하는 교실명만 사용
const CLASSROOMS: { name: string; position: [number, number, number] }[] = [
  { name: "M502", position: [10, 1, -5] },
  { name: "M507", position: [11, 1, 5] },
  { name: "M520", position: [-10, 1, -3] },
];

import * as THREE from "three";

// 모델이 자동으로 맞춰질 때의 목표 크기(씬 단위)
// 값을 키우면 로드된 모델이 더 크게 보입니다.
const MODEL_TARGET_SIZE = 48;

function FirstModel({ color }: { color: string }) {
  // Load STL unconditionally - returns BufferGeometry
  const geometry = useLoader(STLLoader, "/k-move-capstone/models/k-move-3.stl");
  const meshRef = useRef<THREE.Mesh>(null);

  // compute center and scale once per loaded geometry
  const { center, scale } = useMemo(() => {
    if (!geometry) return { center: new THREE.Vector3(0, 0, 0), scale: 1 };

    // Compute vertex normals for smooth shading
    geometry.computeVertexNormals();
    
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    if (!bbox) return { center: new THREE.Vector3(0, 0, 0), scale: 1 };

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? MODEL_TARGET_SIZE / maxDim : 1;
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    return { center, scale };
  }, [geometry]);

  // Apply color to material when color changes
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(color);
      mat.needsUpdate = true;
    }
  }, [color]);

  // Render mesh from geometry with declarative transforms
  return (
    <group scale={[scale, scale, scale]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh 
        ref={meshRef}
        geometry={geometry} 
        position={[-center.x, -center.y, -center.z]}
      >
        <meshStandardMaterial 
          color={color}
          flatShading={false}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

export default function Model3D({ onSelectRoom }: Model3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState<string>('#81c784');
  // 3D 라벨 클릭 시 2D 스크린 좌표 계산
  function RoomLabels() {
    const { camera, size } = useThree();
    return (
      <>
        {CLASSROOMS.map((room) => {
          // 3D -> 2D 변환
          const vec = new THREE.Vector3(...room.position);
          vec.project(camera);
          const x = ((vec.x + 1) / 2) * size.width;
          const y = ((-vec.y + 1) / 2) * size.height;
          return (
            <Html
              key={room.name}
              position={room.position}
              center
              style={{ pointerEvents: "auto" }}
            >
              <button
                onClick={() => onSelectRoom(room.name, { x, y })}
                style={{
                  background: "#fff",
                  border: "1px solid #888",
                  borderRadius: 8,
                  padding: "4px 12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px #0002",
                }}
              >
                {room.name}
              </button>
            </Html>
          );
        })}
      </>
    );
  }
  return (
    <div ref={containerRef} style={{ width: "100%", height: '100%', position: "relative" }}>
      <Canvas camera={{ position: [0, 8, 20], fov: 50 }} style={{ background: '#fff' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={0.5} />
        <Suspense fallback={null}>
          <FirstModel color={color} />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        <RoomLabels />
        <OrbitControls />
      </Canvas>
      {/* Color picker overlay */}
      <div style={{ position: 'absolute', left: 16, top: 16, background: 'white', padding: 8, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>Model color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
