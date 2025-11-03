import axios from '@/config/axios'
import { SensorData } from '../utils/sensorData';

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
export default function useGetData(){
    async function getData(deviceName: string) {

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
    
    return { getData };
}