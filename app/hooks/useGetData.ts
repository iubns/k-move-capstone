"use client";

import axios from '@/config/axios'
import { SensorData } from '../utils/sensorData';
import { useEffect, useRef, useState } from 'react';

interface DataResponse {
    checkDateTime: string;
    co2: number;
    deviceName: string;
    humidity: number;
    pm10: number;
    pm25: number;
    temperature: number;
    tvoc: number;
}

export const deviceNames = [ 
    {
        room: 'M501', deviceName: 'SCH_멀티미디어관_M501_강의실_안쪽'
    },{
        room: 'M501', deviceName: 'SCH_멀티미디어관_M501_강의실_입구'
    },{
        room: 'M502', deviceName: 'SCH_멀티미디어관_M502_강의실_입구'
    },{
        room: 'M502', deviceName: 'SCH_멀티미디어관_M502_강의실_칠판옆'
    },{
        room: 'M520', deviceName: 'SCH_멀티미디어관_M520_칠판앞'
    }
]

// simple helper to fetch for a single deviceName
export async function getData(deviceName: string) {
    const response = await axios.get<DataResponse[]>('/data/air_deep_ajax.do', { params: { deviceName } });
    const data : SensorData[] = response.data.map(item => {
        return {
            roomName: '',
            pm10: item.pm10,
            pm25: item.pm25,
            co2: item.co2,
            voc: item.tvoc,
            temperature: item.temperature,
            humidity: item.humidity,
            date: item.checkDateTime,
        };
    });
    return data;
}

export default function useGetData(){
    return { getData };
}

// Hook: poll the backend periodically and return latest readings grouped by room
export function useLiveSensorData(intervalMs = 5000) {
    const [latestByRoom, setLatestByRoom] = useState<Record<string, SensorData | null>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false };
    }, []);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | null = null;

        async function fetchAll() {
            try {
                const collected: SensorData[] = [];

                for (const d of deviceNames) {
                    try {
                        const resp = await axios.get<DataResponse[]>('/data/air_deep_ajax.do', { params: { deviceName: d.deviceName } });
                        if (resp.data && resp.data.length > 0) {
                            // map each entry and tag with room
                            resp.data.forEach(item => {
                                collected.push({
                                    roomName: d.room,
                                    pm10: item.pm10,
                                    pm25: item.pm25,
                                    co2: item.co2,
                                    voc: item.tvoc,
                                    temperature: item.temperature,
                                    humidity: item.humidity,
                                    date: item.checkDateTime,
                                });
                            });
                        }
                    } catch (innerErr) {
                        // ignore per-device errors but continue
                        console.error('device fetch error', d.deviceName, innerErr);
                    }
                }

                // reduce to latest per room
                const map: Record<string, SensorData | null> = {};
                for (const d of deviceNames) map[d.room] = map[d.room] ?? null;

                for (const entry of collected) {
                    const cur = map[entry.roomName];
                    if (!cur) {
                        map[entry.roomName] = entry;
                        continue;
                    }
                    const da = Date.parse(cur.date) || 0;
                    const db = Date.parse(entry.date) || 0;
                    if (db >= da) map[entry.roomName] = entry;
                }

                if (mountedRef.current) {
                    setLatestByRoom(map);
                    setLoading(false);
                    setError(null);
                }
            } catch (err: any) {
                console.error('Failed to fetch live sensor data', err);
                if (mountedRef.current) {
                    setError(err);
                    setLoading(false);
                }
            }
        }

        // initial fetch
        fetchAll();
        timer = setInterval(fetchAll, intervalMs);

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [intervalMs]);

    return { latestByRoom, loading, error };
}