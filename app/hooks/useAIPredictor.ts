import { useState } from 'react';
import type { SensorData } from '../utils/sensorData';

export type AnalysisResult = {
  kind: 'analysis';
  avg: { pm25: number; co2: number; temp: number };
  days: { pm25: number; co2: number; temp: number }[]; // oldest -> newest
  recommendation: string;
};

export type PredictionPoint = { hour: number; pm25: number; co2: number; temp: number };
export type PredictionResult = {
  kind: 'prediction';
  points: PredictionPoint[]; // 1..24
};

export type AIPredictorReply = AnalysisResult | PredictionResult | { kind: 'message'; text: string };

function randNoise(scale = 1) {
  return (Math.random() - 0.5) * scale;
}

export function useAIPredictor(filtered: SensorData[], roomName?: string | null) {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState<AIPredictorReply | null>(null);
  const [loading, setLoading] = useState(false);

  function formatNumber(n: number | string | null, digits = 1) {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '–';
    return (Math.round(Number(n) * Math.pow(10, digits)) / Math.pow(10, digits)).toString();
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input?.trim() ?? '';
    if (!text) {
      setReply({ kind: 'message', text: '질문을 입력해 주세요. 예: "이번 주 분석" 또는 "24시간 예측"' });
      return;
    }

  setLoading(true);
  setReply({ kind: 'message', text: '분석 중...' });

    // small artificial delay to simulate thinking
    await new Promise((r) => setTimeout(r, 500));

    const lower = text.toLowerCase();

    if ((lower.includes('분석') || lower.includes('분석해')) ) {
      // Try to fetch a small tail of the real data file and compute a 7-day summary for the selected room
      try {
        const basePath = process.env.NODE_ENV === 'production' ? '/k-move-capstone' : '';
        const res = await fetch(`${basePath}/data_HW4_new.txt`);
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean);
        // only examine the last N lines to keep performance reasonable
        const TAIL = 1500; // tuneable: number of lines to inspect
        const tail = lines.slice(-TAIL);
        // parse lines and filter by roomName if provided; fallback to filtered param if none
        const parseLine = (ln: string) => {
          const parts = ln.split(/\s+/);
          return {
            roomName: parts[0],
            pm10: Number(parts[1]),
            pm25: Number(parts[2]),
            co2: Number(parts[3]),
            voc: Number(parts[4]),
            temperature: Number(parts[5]),
            humidity: Number(parts[6]),
            date: parts.slice(7).join(' '),
          } as SensorData;
        };

        const parsed = tail.map(parseLine).filter(Boolean);
        const roomFiltered = roomName ? parsed.filter(p => p.roomName === roomName) : parsed.filter(p => filtered.some(f => f.roomName === p.roomName));

        const useData = roomFiltered.length > 0 ? roomFiltered : filtered;

        // group by date (yyyy-mm-dd) for last 7 days
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const last7Dates = Array.from({ length: 7 }).map((_, i) => new Date(now - (6 - i) * dayMs));
        const dayKeys = last7Dates.map(d => d.toISOString().slice(0,10));

        const dayBuckets: { [k: string]: { pm25: number; co2: number; temp: number; count: number } } = {};
        useData.forEach(d => {
          const ts = Date.parse(d.date) || 0;
          const dayKey = new Date(ts).toISOString().slice(0,10);
          if (!dayKeys.includes(dayKey)) return;
          if (!dayBuckets[dayKey]) dayBuckets[dayKey] = { pm25: 0, co2: 0, temp: 0, count: 0 };
          dayBuckets[dayKey].pm25 += Number(d.pm25);
          dayBuckets[dayKey].co2 += Number(d.co2);
          dayBuckets[dayKey].temp += Number(d.temperature);
          dayBuckets[dayKey].count += 1;
        });

        // Build per-day averages; where missing, synthesize plausible values
        const rawDays = dayKeys.map(k => {
          const b = dayBuckets[k];
          if (!b || b.count === 0) return null;
          return { pm25: b.pm25 / b.count, co2: b.co2 / b.count, temp: b.temp / b.count } as { pm25: number; co2: number; temp: number } | null;
        });

        // compute a robust trend (slope per day) using first/last available points
        const availableWithIdx = rawDays
          .map((d, i) => ({ d, i }))
          .filter(x => x.d !== null) as { d: { pm25: number; co2: number; temp: number }; i: number }[];

        let slope = { pm25: 0, co2: 0, temp: 0 };
        if (availableWithIdx.length >= 2) {
          const first = availableWithIdx[0];
          const last = availableWithIdx[availableWithIdx.length - 1];
          const span = Math.max(1, last.i - first.i);
          slope.pm25 = (last.d.pm25 - first.d.pm25) / span;
          slope.co2 = (last.d.co2 - first.d.co2) / span;
          slope.temp = (last.d.temp - first.d.temp) / span;
        }

        // compute averages from useData (needed for synthesizing missing days)
        const vals = useData.map(d => ({ pm25: Number(d.pm25), co2: Number(d.co2), temp: Number(d.temperature) }));
        const avg = vals.reduce((acc, v) => ({ pm25: acc.pm25 + v.pm25, co2: acc.co2 + v.co2, temp: acc.temp + v.temp }), { pm25: 0, co2: 0, temp: 0 });
        avg.pm25 /= Math.max(1, vals.length);
        avg.co2 /= Math.max(1, vals.length);
        avg.temp /= Math.max(1, vals.length);

        // Fill missing days by interpolation where possible, otherwise synthesize from avg + slope
        const days = rawDays.map((d, idx) => {
          if (d) return d;

          // find nearest available before and after
          const before = (() => {
            for (let i = idx - 1; i >= 0; i--) if (rawDays[i]) return { idx: i, val: rawDays[i] as any };
            return null;
          })();
          const after = (() => {
            for (let i = idx + 1; i < rawDays.length; i++) if (rawDays[i]) return { idx: i, val: rawDays[i] as any };
            return null;
          })();

          if (before && after) {
            // linear interpolation between before and after
            const t = (idx - before.idx) / (after.idx - before.idx);
            const pm25 = before.val.pm25 + (after.val.pm25 - before.val.pm25) * t + randNoise(2);
            const co2 = before.val.co2 + (after.val.co2 - before.val.co2) * t + randNoise(10);
            const temp = before.val.temp + (after.val.temp - before.val.temp) * t + randNoise(0.4);
            return { pm25: Math.max(0, pm25), co2: Math.max(0, co2), temp };
          }

          // otherwise synthesize using avg, slope*(offset from center), weekday pattern and noise
          const weekday = new Date(last7Dates[idx]).getDay(); // 0..6
          const weekdayFactor = (weekday === 0 || weekday === 6) ? -0.12 : 0.04;
          const center = (rawDays.length - 1) / 2;
          const offset = idx - center;
          const pm25 = Math.max(0, avg.pm25 * (1 + weekdayFactor) + slope.pm25 * offset + randNoise(4));
          const co2 = Math.max(0, avg.co2 * (1 + weekdayFactor * 0.8) + slope.co2 * offset + randNoise(25));
          const temp = avg.temp + slope.temp * offset + randNoise(0.6);
          return { pm25, co2, temp };
        });

        // (avg already computed above)

        const recommendation = '최근 수치 기반 권장: 환기 우선, PM2.5가 지속 높다면 공기정화기 가동을 권장합니다.';
        setReply({ kind: 'analysis', avg: { pm25: avg.pm25, co2: avg.co2, temp: avg.temp }, days, recommendation });
        setLoading(false);
        return;
      } catch (err) {
        console.error('AI analysis failed to read data:', err);
        // fallback to the earlier simple behavior
      }
    }

    if ((lower.includes('예측') || lower.includes('예상'))) {
      try {
        const basePath = process.env.NODE_ENV === 'production' ? '/k-move-capstone' : '';
        const res = await fetch(`${basePath}/data_HW4_new.txt`);
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean);
        const TAIL = 1200; // inspect last lines only
        const tail = lines.slice(-TAIL);
        const parseLine = (ln: string) => {
          const parts = ln.split(/\s+/);
          return {
            roomName: parts[0],
            pm10: Number(parts[1]),
            pm25: Number(parts[2]),
            co2: Number(parts[3]),
            voc: Number(parts[4]),
            temperature: Number(parts[5]),
            humidity: Number(parts[6]),
            date: parts.slice(7).join(' '),
          } as SensorData;
        };
        const parsed = tail.map(parseLine).filter(Boolean).filter(p => (roomName ? p.roomName === roomName : true));
        const useData = parsed.length > 4 ? parsed : filtered;

        const sorted = useData.slice().sort((a,b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
        const last = sorted[sorted.length - 1] ?? useData[useData.length - 1];
        const prev = sorted[sorted.length - 2] ?? last;
        const lastTs = Date.parse(last?.date) || Date.now();
        const prevTs = Date.parse(prev?.date) || (lastTs - 3600000);

        const hoursBetween = Math.max(1, (lastTs - prevTs) / 3600000);
        const dpm25PerHour = (Number(last.pm25) - Number(prev.pm25 || last.pm25)) / hoursBetween;
        const dco2PerHour = (Number(last.co2) - Number(prev.co2 || last.co2)) / hoursBetween;
        const dtempPerHour = (Number(last.temperature) - Number(prev.temperature || last.temperature)) / hoursBetween;

        const points = Array.from({ length: 24 }).map((_, h) => {
          const hour = h + 1;
          const pm25 = Math.max(0, Number(last.pm25) + dpm25PerHour * hour + randNoise(3));
          const co2 = Math.max(0, Math.round(Number(last.co2) + dco2PerHour * hour + randNoise(20)));
          const temp = Number(last.temperature) + dtempPerHour * hour + randNoise(0.5);
          return { hour, pm25, co2, temp };
        });

        setReply({ kind: 'prediction', points });
        setLoading(false);
        return;
      } catch (err) {
        console.error('AI prediction failed to read data:', err);
      }
    }

  // default fallback: echo a short plausible response
  setReply({ kind: 'message', text: '입력받았습니다. "분석" 또는 "예측" 이라는 단어을 포함하면 각각 지난 7일 분석 / 24시간 예측 결과를 보여드립니다.' });
    setLoading(false);
  }

  return { input, setInput, reply, loading, submit } as const;
}

export default useAIPredictor;
