type Model3DProps = {
  onSelectRoom: (room: string, pos: { x: number, y: number }) => void;
};
"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useState, useEffect, Suspense, useRef } from "react";
import { OBJLoader, MTLLoader } from "three-stdlib";

// 실제 데이터에 존재하는 교실명만 사용
const CLASSROOMS: { name: string; position: [number, number, number] }[] = [
  { name: "M502", position: [0, 0, 0] },
  { name: "M507", position: [2, 0, 0] },
  { name: "M520", position: [-2, 0, 0] },
];

import * as THREE from "three";

function FountainModel() {
  // 텍스처(mtl) 파일이 있으면 함께 로드
  try {
    const materials = useLoader(MTLLoader, "/models/Fountain.mtl");
    const obj = useLoader(OBJLoader, "/models/Fountain.obj", loader => {
      materials.preload();
      loader.setMaterials(materials);
    });
  return <primitive object={obj} scale={0.0005} position={[0, 0, 0]} />;
  } catch {
    // mtl이 없으면 obj만 로드하고, 기본 색상 적용
    const obj = useLoader(OBJLoader, "/models/Fountain.obj");
    // 모든 mesh에 무작위 머티리얼 적용 (알록달록)
    const palette = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ffb74d", "#4dd0e1", "#a1887f", "#f06292", "#90a4ae"];
    let colorIdx = 0;
    obj.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: palette[colorIdx % palette.length] });
        colorIdx++;
      }
    });
    return <primitive object={obj} scale={0.1} position={[0, 0, 0]} />;
  }
}

export default function Model3D({ onSelectRoom }: Model3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
    <div ref={containerRef} style={{ width: "100%", height: 600, position: "relative" }}>
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }} style={{ background: '#fff' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={0.5} />
        <Suspense fallback={null}>
          <FountainModel />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        <RoomLabels />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
