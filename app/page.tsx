"use client"

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";
import dynamic from "next/dynamic";
import { fetchSensorData, type SensorData } from "./utils/sensorData";
import useAIPredictor from './hooks/useAIPredictor';

const Model3D = dynamic(() => import("./Model3D"), { ssr: false });

export default function Home() {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [acLoading, setAcLoading] = useState(false);
  const [acMessage, setAcMessage] = useState<string | null>(null);
  const [acState, setAcState] = useState<string | null>(null); // 'on' | 'off' | null
  const [lastAutoToggleAt, setLastAutoToggleAt] = useState<number | null>(null);

  useEffect(() => {
    fetchSensorData()
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading sensor data:', error);
        setLoading(false);
      });
  }, []);

  // 교실별 데이터 필터링
  const filtered = selectedRoom ? data.filter(d => d.roomName === selectedRoom) : data;

  // 3D 라벨 클릭 시 교실명만 저장 (그래프는 고정 패널로 표시)
  function handleSelectRoom(room: string) {
    setSelectedRoom(room);
  }

  // 그래프 닫기
  function closeGraph() {
    setSelectedRoom(null);
  }

  const { input: chatInput, setInput: setChatInput, reply: chatReply, loading: chatLoading, submit: handleChatSubmit } = useAIPredictor(filtered, selectedRoom);

  async function toggleAC() {
    setAcLoading(true);
    setAcMessage(null);
    try {
      const res = await fetch('/api/toggle-ac', { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        // External device response is placed under `data` by the proxy route.
        const device = json.data ?? json;
        if (device && typeof device === 'object' && 'status' in device) {
          const st = String((device as any).status);
          setAcState(st);
          setAcMessage(st === 'on' ? '에어컨이 켜졌습니다.' : '에어컨이 꺼졌습니다.');
        } else if (typeof device === 'string') {
          setAcMessage(device);
        } else {
          setAcMessage('에어컨 토글 요청을 보냈습니다.');
        }
      } else {
        setAcMessage(json?.error ?? `서버 응답 오류: ${res.status}`);
      }
    } catch (err: any) {
      setAcMessage(String(err?.message ?? err));
    } finally {
      setAcLoading(false);
      // clear message after a short delay
      setTimeout(() => setAcMessage(null), 4000);
    }
  }

  // Auto-toggle after AI analysis result (opt-in)
  useEffect(() => {
    if (!chatReply) return;
    if (chatReply.kind !== 'analysis') return;
    // Only auto-toggle for room 502
    const is502 = selectedRoom === '502' || (selectedRoom && selectedRoom.includes && selectedRoom.includes('502'));
    if (!is502) return;

    const now = Date.now();
    if (lastAutoToggleAt && now - lastAutoToggleAt < 5000) {
      // prevent double-trigger within short window
      return;
    }
    setLastAutoToggleAt(now);
    // Fire-and-forget toggle
    toggleAC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatReply, selectedRoom]);

  return (
    <div className="font-sans min-h-screen flex flex-col gap-10 items-center" style={{
      color: 'black',
      position: 'relative'}}>
        <div className="fixed top-0 left-0 w-full z-10 p-4 text-center">
          <h1 className="text-3xl font-bold mb-2">센서 데이터 대시보드</h1>
        </div>
      <div style={{
        width: '100vw',
        height: '100vh',
        position: 'relative'}}>
  <Model3D onSelectRoom={handleSelectRoom} />
        {selectedRoom && (
          <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100vh',
            zIndex: 163121440,
            background: 'white',
            borderLeft: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
            padding: '24px',
            width: 'min(720px, 90vw)',
            transform: 'translateX(0)',
            transition: 'transform 320ms ease-in-out'
          }}>
            <button onClick={closeGraph} style={{position: 'absolute', right: 12, top: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 20, background: 'none', border: 'none'}}>✕</button>
            <h2 className="text-xl font-semibold mb-4">{selectedRoom} 센서 데이터</h2>
            {/* AC control for room 502 */}
            {(selectedRoom === '502' || (selectedRoom && selectedRoom.includes && selectedRoom.includes('502'))) && (
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={toggleAC} disabled={acLoading} style={{ padding: '8px 12px', borderRadius: 8, background: acLoading ? '#9ca3af' : '#0ea5e9', color: 'white', border: 'none', cursor: acLoading ? 'default' : 'pointer' }}>
                  {acLoading ? '요청 중...' : (acState === 'on' ? '에어컨 끄기' : '에어컨 켜기')}
                </button>
                {acMessage && <div style={{ fontSize: 13, color: '#111' }}>{acMessage}</div>}
              </div>
            )}
            <ResponsiveContainer width="100%" height={220}>
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
            <ResponsiveContainer width="100%" height={140}>
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
            <ResponsiveContainer width="100%" height={140}>
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
            {/* Chat / AI predictor UI */}
            <div style={{ marginTop: 18, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 700 }}>인공지능</div>
                <div style={{ minHeight: 36, padding: 8, marginBottom: 8 }}>
                  {chatReply ? (
                    chatReply.kind === 'message' ? (
                      <div style={{ background: '#fafafa', padding: 10, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{chatReply.text}</div>
                    ) : chatReply.kind === 'analysis' ? (
                      <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: 1, background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: 12, color: '#666' }}>평균 PM2.5</div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(chatReply.avg.pm25 * 10) / 10} μg/m³</div>
                          </div>
                          <div style={{ flex: 1, background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: 12, color: '#666' }}>평균 CO₂</div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(chatReply.avg.co2)} ppm</div>
                          </div>
                          <div style={{ flex: 1, background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: 12, color: '#666' }}>평균 온도</div>
                            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(chatReply.avg.temp * 10) / 10}℃</div>
                          </div>
                        </div>
                        <div style={{ maxHeight: 140, overflow: 'auto', padding: 6 }}>
                          {chatReply.days.map((d, i) => (
                            <div key={i} style={{ fontSize: 12, padding: '6px 4px', borderBottom: '1px solid #fafafa' }}>{i === chatReply.days.length - 1 ? '오늘' : `${chatReply.days.length - i - 1}일 전`}: PM2.5 {Math.round(d.pm25 * 10) / 10}μg/m³ · CO₂ {Math.round(d.co2)}ppm · T {Math.round(d.temp * 10) / 10}℃</div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: '#444' }}>{chatReply.recommendation}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                          {chatReply.points.slice(0, 8).map(p => (
                            <div key={p.hour} style={{ minWidth: 120, background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                              <div style={{ fontSize: 12, color: '#666' }}>+{p.hour}h</div>
                              <div style={{ fontWeight: 800 }}>{Math.round(p.pm25 * 10) / 10} μg/m³</div>
                              <div style={{ fontSize: 12, color: '#666' }}>CO₂ {Math.round(p.co2)} ppm</div>
                              <div style={{ fontSize: 12, color: '#666' }}>T {Math.round(p.temp * 10) / 10}℃</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: '#444', maxHeight: 140, overflow: 'auto' }}>
                          {chatReply.points.map(p => (
                            <div key={p.hour} style={{ padding: '4px 0' }}>+{p.hour}h — PM2.5 {Math.round(p.pm25 * 10) / 10}μg/m³ · CO₂ {Math.round(p.co2)}ppm · T {Math.round(p.temp * 10) / 10}℃</div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : (
                    <div style={{ background: '#fafafa', padding: 10, borderRadius: 8 }}>질문을 입력하면 지난 7일 분석 또는 다음 24시간 예측을 표시합니다.</div>
                  )}
                </div>
                <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="예: '지난 7일 분석' 또는 '24시간 예측'" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e6e6e6' }} />
                  <button type="submit" disabled={chatLoading} style={{ padding: '8px 12px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none' }}>{chatLoading ? '대기...' : '전송'}</button>
                </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
