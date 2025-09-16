"use client"

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";

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

export default function Home() {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sensor-data")
      .then((res) => res.json())
      .then((json) => {
        setData(json.data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="font-sans min-h-screen p-8 pb-20 flex flex-col gap-16 items-center">
      <h1 className="text-3xl font-bold mb-2">센서 데이터 대시보드</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="w-full max-w-5xl flex flex-col gap-12">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">미세먼지 (PM10, PM2.5)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={30} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pm10" stroke="#8884d8" name="PM10" />
                <Line type="monotone" dataKey="pm25" stroke="#82ca9d" name="PM2.5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">CO₂, VOC</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={30} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="co2" fill="#ff7300" name="CO₂" />
                <Bar dataKey="voc" fill="#387908" name="VOC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">온도 & 습도</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={30} />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#ff7300" name="온도(℃)" />
                <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#0088FE" name="습도(%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {/* 안내/로고/푸터 영역 제거됨 */}
    </div>
  );
}
