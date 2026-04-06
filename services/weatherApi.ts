import { DayWeather } from '../data/types';

const API_KEY = import.meta.env.KMA_API_KEY as string;
const KMA_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

// 서울 기본 좌표
export const DEFAULT_CITY = { name: '서울', lat: 37.5665, lon: 126.978 };

// ── 위경도 → 기상청 격자 변환 (Lambert Conformal Conic) ─────────────────
interface Grid { nx: number; ny: number }

function latLonToGrid(lat: number, lon: number): Grid {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0 * (Math.PI / 180);
  const SLAT2 = 60.0 * (Math.PI / 180);
  const OLON  = 126.0 * (Math.PI / 180);
  const OLAT  = 38.0  * (Math.PI / 180);
  const XO = 43;
  const YO = 136;

  const SN = Math.log(Math.cos(SLAT1) / Math.cos(SLAT2))
    / Math.log(
        Math.tan(Math.PI * 0.25 + SLAT2 * 0.5) /
        Math.tan(Math.PI * 0.25 + SLAT1 * 0.5)
      );
  const SF = (Math.pow(Math.tan(Math.PI * 0.25 + SLAT1 * 0.5), SN) * Math.cos(SLAT1)) / SN;
  const RO = (RE / GRID) * SF / Math.pow(Math.tan(Math.PI * 0.25 + OLAT * 0.5), SN);

  const ra = (RE / GRID) * SF / Math.pow(Math.tan(Math.PI * 0.25 + (lat * Math.PI / 180) * 0.5), SN);
  let theta = lon * (Math.PI / 180) - OLON;
  if (theta > Math.PI)  theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= SN;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(RO - ra * Math.cos(theta) + YO + 0.5),
  };
}

// ── 기준 날짜/시각 계산 (KST) ──────────────────────────────────────────
function getBaseDateTime(): { base_date: string; base_time: string } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const hhmm = kst.getUTCHours() * 100 + kst.getUTCMinutes();

  const slots = [
    { threshold: 2310, time: '2300' },
    { threshold: 2010, time: '2000' },
    { threshold: 1710, time: '1700' },
    { threshold: 1410, time: '1400' },
    { threshold: 1110, time: '1100' },
    { threshold:  810, time: '0800' },
    { threshold:  510, time: '0500' },
    { threshold:  210, time: '0200' },
  ];

  const matched = slots.find(s => hhmm >= s.threshold);
  const baseTime = matched ? matched.time : '2300';
  if (!matched) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }

  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return { base_date: `${y}${m}${d}`, base_time: baseTime };
}

// ── 하늘상태/강수형태 → 아이콘·설명 ────────────────────────────────────
function skyPtyToIcon(sky: number, pty: number): string {
  if (pty === 1) return '10d';
  if (pty === 2 || pty === 3) return '13d';
  if (pty === 4) return '09d';
  if (sky === 1) return '01d';
  if (sky === 3) return '02d';
  return '04d';
}

function skyPtyToDesc(sky: number, pty: number): string {
  if (pty === 1) return '비';
  if (pty === 2) return '비/눈';
  if (pty === 3) return '눈';
  if (pty === 4) return '소나기';
  if (sky === 1) return '맑음';
  if (sky === 3) return '구름많음';
  return '흐림';
}

function kstDateStr(offsetDays = 0): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function weatherIcon(icon: string): string {
  if (icon.startsWith('01')) return '☀️';
  if (icon.startsWith('02')) return '⛅';
  if (icon.startsWith('03') || icon.startsWith('04')) return '☁️';
  if (icon.startsWith('09') || icon.startsWith('10')) return '🌧️';
  if (icon.startsWith('11')) return '⛈️';
  if (icon.startsWith('13')) return '🌨️';
  return '🌤️';
}

// ── 기상청 단기예보 조회 ───────────────────────────────────────────────
export async function getWeatherForecast(
  lat: number,
  lon: number,
): Promise<{ today: DayWeather; tomorrow: DayWeather }> {
  const { nx, ny } = latLonToGrid(lat, lon);
  const { base_date, base_time } = getBaseDateTime();

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: '1',
    numOfRows: '1000',
    dataType: 'JSON',
    base_date,
    base_time,
    nx: String(nx),
    ny: String(ny),
  });

  const res = await fetch(`${KMA_URL}?${params}`);
  if (!res.ok) throw new Error(`날씨 정보를 불러오지 못했어요 (HTTP ${res.status})`);
  const text = await res.text();

  let json: any;
  try { json = JSON.parse(text); } catch {
    throw new Error(`응답 파싱 실패: ${text.slice(0, 100)}`);
  }

  const resultCode = json?.response?.header?.resultCode;
  if (resultCode !== '00') {
    throw new Error(`기상청 API 오류: ${json?.response?.header?.resultMsg ?? resultCode}`);
  }

  const rawItems = json.response.body.items.item;
  const items: any[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const todayStr    = kstDateStr(0);
  const tomorrowStr = kstDateStr(1);

  type DayMap = {
    temps: number[];
    tmx?: number;
    tmn?: number;
    popMax: number;
    wsdMax: number;
    sky: number;
    pty: number;
  };

  const map: Record<string, DayMap> = {};
  const ensureDay = (date: string) => {
    if (!map[date]) map[date] = { temps: [], popMax: 0, wsdMax: 0, sky: 1, pty: 0 };
  };

  for (const item of items) {
    const date: string = item.fcstDate;
    const time: string = item.fcstTime;
    const val  = item.fcstValue;
    if (date !== todayStr && date !== tomorrowStr) continue;
    ensureDay(date);
    const d = map[date];

    switch (item.category) {
      case 'TMP': d.temps.push(Number(val)); break;
      case 'TMX': d.tmx = Number(val); break;
      case 'TMN': d.tmn = Number(val); break;
      case 'POP': d.popMax = Math.max(d.popMax, Number(val)); break;
      case 'WSD': d.wsdMax = Math.max(d.wsdMax, Number(val)); break;
      case 'SKY':
        if (time <= '1500' && time >= '0900') d.sky = Number(val);
        break;
      case 'PTY':
        if (time <= '1500' && time >= '0900') d.pty = Number(val);
        break;
    }
  }

  const buildDay = (dateStr: string): DayWeather => {
    const d = map[dateStr];
    if (!d) {
      return {
        date: dateStr, tempMin: 0, tempMax: 0, tempAvg: 0,
        rainChance: 0, windSpeed: 0, conditions: ['정보 없음'], icon: '01d',
      };
    }
    const tempMin = d.tmn ?? (d.temps.length ? Math.min(...d.temps) : 0);
    const tempMax = d.tmx ?? (d.temps.length ? Math.max(...d.temps) : 0);
    return {
      date: dateStr,
      tempMin,
      tempMax,
      tempAvg: (tempMin + tempMax) / 2,
      rainChance: d.popMax / 100,
      windSpeed: d.wsdMax,
      conditions: [skyPtyToDesc(d.sky, d.pty)],
      icon: skyPtyToIcon(d.sky, d.pty),
    };
  };

  return {
    today: buildDay(todayStr),
    tomorrow: buildDay(tomorrowStr),
  };
}
