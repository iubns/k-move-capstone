type Model3DProps = {
  onSelectRoom: (room: string) => void;
};
"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useState, useEffect, Suspense, useRef, useMemo } from "react";
import { STLLoader } from "three-stdlib";
import { fetchSensorData, type SensorData } from "./utils/sensorData";

const height = 1
// 실제 데이터에 존재하는 교실명만 사용
const CLASSROOMS: { name: string; position: [number, number, number] }[] = [
  { name: "M501", position: [-20, height, 10] },
  { name: "M502", position: [-20, height, 2] },
  { name: "M503", position: [-20, height, -6] },
  { name: "M504", position: [-20, height, -13] },
  //{ name: "M505", position: [-20, height, -17] },
  { name: "M506", position: [-7, height, -15] },
  //{ name: "M507", position: [-3, height, -15] },
  //{ name: "M508", position: [1, height, -15] },
  { name: "M509", position: [5, height, -15] },
  { name: "M510", position: [6, height, -10] },
  //{ name: "M511", position: [8, height, -10] },
  //{ name: "M512", position: [12, height, -10] },
  { name: "M513", position: [16, height, -10] },
  { name: "M514", position: [20, height, 1] },
  //{ name: "M515", position: [16, height, 1] },
  { name: "M516", position: [12, height, 1] },
  { name: "M518", position: [4, height, 5] },
  //{ name: "M519", position: [-4, height, 5] },
  { name: "M520", position: [-10, height, 5] },
];

import * as THREE from "three";

// 모델이 자동으로 맞춰질 때의 목표 크기(씬 단위)
// 값을 키우면 로드된 모델이 더 크게 보입니다.
const MODEL_TARGET_SIZE = 48;

function FirstModel({ color }: { color: string }) {
  // Respect basePath for public assets (GitHub Pages serves under /<repo>)
  // Prefer explicit public env, otherwise fall back to build-time NODE_ENV.
  // If neither was applied at build time (e.g. client-side on Pages), try to infer from the current pathname.
  const envBase = process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/k-move-capstone' : '');
  let inferredBase = envBase;
  if (!inferredBase && typeof window !== 'undefined') {
    // If the site is hosted at /k-move-capstone/* on GitHub Pages, pathname will include it.
    if (window.location.pathname.includes('/k-move-capstone')) inferredBase = '/k-move-capstone';
  }
  const modelUrl = `${inferredBase}/models/ml5.stl`;
  // Load STL unconditionally - returns BufferGeometry
  const geometry = useLoader(STLLoader, modelUrl);
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
  const [latestByRoom, setLatestByRoom] = useState<Record<string, SensorData | null>>({});
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
              <div
                onClick={() => onSelectRoom(room.name)}
                role="button"
                style={{
                  background: "#fff",
                  border: "1px solid #e6e6e6",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 220
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14 }}>{room.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  {(() => {
                    const info = latestByRoom[room.name];
                    const pm25 = info?.pm25 ?? null;
                    const co2 = info?.co2 ?? null;
                    const temp = info?.temperature ?? null;
                    const chip = (label: string, value: string | number | null, bg = '#f0f0f0') => (
                      <div style={{ background: bg, padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#111' }}>{label}: {value ?? '–'}</div>
                    );

                    // color coding for pm25
                    const pmBg = pm25 === null ? '#f0f0f0' : (pm25 > 35 ? '#ffe6e6' : pm25 > 15 ? '#fff4e0' : '#e8f7e8');
                    const coBg = co2 === null ? '#f0f0f0' : (co2 > 1000 ? '#ffe6e6' : '#e8f7e8');

                    return (
                      <>
                        {chip('PM2.5', pm25 !== null ? Math.round((pm25 + Number.EPSILON) * 10) / 10 : null, pmBg)}
                        {chip('CO₂', co2 !== null ? Math.round(co2) : null, coBg)}
                        {chip('T', temp !== null ? Math.round((temp + Number.EPSILON) * 10) / 10 : null, '#f0f7ff')}
                      </>
                    );
                  })()}
                </div>
              </div>
            </Html>
          );
        })}
      </>
    );
  }

  // Fetch latest sensor readings for displayed classrooms
  useEffect(() => {
    let mounted = true;
    fetchSensorData()
      .then((data) => {
        if (!mounted) return;
        const map: Record<string, SensorData | null> = {};
        CLASSROOMS.forEach((c) => {
          const entries = data.filter(d => d.roomName === c.name);
          if (entries.length === 0) {
            map[c.name] = null;
          } else {
            // pick latest by parsed date when possible
            const latest = entries.reduce((a, b) => {
              const da = Date.parse(a.date) || 0;
              const db = Date.parse(b.date) || 0;
              return da >= db ? a : b;
            });
            map[c.name] = latest;
          }
        });
        setLatestByRoom(map);
      })
      .catch((err) => {
        console.error('Failed to fetch latest sensor data for labels:', err);
      });
    return () => { mounted = false };
  }, []);
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
  <div style={{ position: 'absolute', left: 16, top: 16, background: 'white', padding: 8, borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 1000, pointerEvents: 'auto' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>Model color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
