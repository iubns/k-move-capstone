// 클라이언트 사이드에서 데이터 파싱하는 유틸리티 함수
export async function fetchSensorData() {
  try {
    // basePath를 고려하여 경로 설정
    const basePath = process.env.NODE_ENV === 'production' ? '/terab' : '';
    const response = await fetch(`${basePath}/data_HW4.txt`);
    const fileContent = await response.text();
    const lines = fileContent.split('\n').filter(Boolean);

    // 샘플링: 1000개 중 1개씩만 선택 (성능 최적화)
    const sampled = lines.filter((_, i) => i % 1000 === 0);
    
    const data = sampled.map(line => {
      const parts = line.split(/\s+/);
      return {
        roomName: parts[0],
        pm10: Number(parts[1]),
        pm25: Number(parts[2]),
        co2: Number(parts[3]),
        voc: Number(parts[4]),
        temperature: Number(parts[5]),
        humidity: Number(parts[6]),
        date: parts.slice(7).join(' '),
      };
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch sensor data:', error);
    return [];
  }
}

export type SensorData = {
  roomName: string;
  pm10: number;
  pm25: number;
  co2: number;
  voc: number;
  temperature: number;
  humidity: number;
  date: string;
};
