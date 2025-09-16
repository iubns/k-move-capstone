"use client"

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";
import dynamic from "next/dynamic";

type SensorData = {
  roomName: string;
  pm10: number;
  pm25: number;
  co2: number;
  voc: number;
  temperature: number;
  humidity: number;
  date: string;
};

const Model3D = dynamic(() => import("./Model3D"), { ssr: false });

export default function Home() {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [graphPos, setGraphPos] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    fetch("/api/sensor-data")
      .then((res) => res.json())
      .then((json) => {
        setData(json.data);
        setLoading(false);
      });
  }, []);

  // 교실별 데이터 필터링
  const filtered = selectedRoom ? data.filter(d => d.roomName === selectedRoom) : data;

  // 3D 라벨 클릭 시 위치와 교실명 저장
  function handleSelectRoom(room: string, pos: {x: number, y: number}) {
    setSelectedRoom(room);
    setGraphPos(pos);
  }

  // 그래프 닫기
  function closeGraph() {
    setSelectedRoom(null);
    setGraphPos(null);
  }

  return (
    <div className="font-sans min-h-screen p-8 pb-20 flex flex-col gap-10 items-center" style={{position: 'relative'}}>
      <h1 className="text-3xl font-bold mb-2">센서 데이터 대시보드</h1>
      <div style={{width: '100%', maxWidth: 900, position: 'relative'}}>
        <Model3D onSelectRoom={handleSelectRoom} />
        {selectedRoom && graphPos && (
          <div style={{
            position: 'absolute',
            left: graphPos.x,
            top: graphPos.y,
            zIndex: 10,
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 4px 24px #0002',
            padding: 24,
            minWidth: 350,
            maxWidth: 500
          }}>
            <button onClick={closeGraph} style={{position: 'absolute', right: 12, top: 8, fontWeight: 'bold'}}>X</button>
            <h2 className="text-xl font-semibold mb-4">{selectedRoom} 센서 데이터</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={filtered} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={30} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pm10" stroke="#8884d8" name="PM10" />
                <Line type="monotone" dataKey="pm25" stroke="#82ca9d" name="PM2.5" />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={filtered} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="co2" fill="#ff7300" name="CO₂" />
                <Bar dataKey="voc" fill="#387908" name="VOC" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={filtered} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ff7300" name="온도(℃)" />
                <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#0088FE" name="습도(%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
