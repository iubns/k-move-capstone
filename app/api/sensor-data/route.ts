import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'data_HW4.txt');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(Boolean);

  // 데이터 파싱: 각 줄을 구조체에 맞게 파싱
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

  return Response.json({ data });
}
