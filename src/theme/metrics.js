export const METRIC_META = {
  temp: { label: 'Temperature', unit: '°C', color: '#eb6834' },
  controller_temp: { label: 'Controller Temp', unit: '°C', color: '#e34948' },
  humidity: { label: 'Humidity', unit: '%', color: '#2a78d6' },
  rainfall: { label: 'Rainfall', unit: 'mm', color: '#1baf7a' },
  wind_speed: { label: 'Wind Speed', unit: 'm/s', color: '#4a3aa7' },
  wind_direction: { label: 'Wind Direction', unit: '', color: '#e87ba4' },
  battery_level: { label: 'Battery', unit: '%', color: '#008300' },
  signal: { label: 'Signal', unit: '', color: '#eda100' },
};

const FALLBACK = { label: null, unit: '', color: '#52514e' };

export function metricMeta(key) {
  const meta = METRIC_META[key];
  if (meta) return meta;
  return { ...FALLBACK, label: key };
}

// Fixed full-scale bounds each metric's range bar is drawn against, so the
// bar communicates "where on the sensor's whole range" rather than
// re-scaling to whatever the current min/max happen to be.
export const METRIC_SCALE = {
  temp: { min: 0, max: 50 },
  humidity: { min: 0, max: 100 },
  rainfall: { min: 0, max: 50 },
  wind_speed: { min: 0, max: 15 },
};

// total_rainfall is the device's raw running counter (resets to 0 on restart);
// the per-row `rainfall` is the reset-aware value, so only that one is shown.
export const HIDDEN_KEYS = new Set([
  'id',
  'device',
  'device_name',
  'total_rainfall',
  'wind_direction_degrees',
  'received_json',
  'controller_temp',
  'signal',
  'battery_level',
]);

export const TIME_KEYS = ['received_at', 'created_at', 'timestamp', 'datetime', 'date_time', 'date', 'time'];

export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export function batteryStatus(value) {
  if (value >= 50) return 'good';
  if (value >= 20) return 'warning';
  return 'critical';
}

// Readings send wind_direction as a lowercase word ("north-west") and the
// summary sends a compass point ("NW"); both normalize to one 8-point index.
// Raw degrees arrive in a separate field and should be preferred when present.
const OCTANTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const WORD_TO_INDEX = {
  n: 0, north: 0,
  ne: 1, northeast: 1,
  e: 2, east: 2,
  se: 3, southeast: 3,
  s: 4, south: 4,
  sw: 5, southwest: 5,
  w: 6, west: 6,
  nw: 7, northwest: 7,
};

function octantIndex(word) {
  if (typeof word !== 'string') return null;
  const key = word.trim().toLowerCase().replace(/[\s-]/g, '');
  return key in WORD_TO_INDEX ? WORD_TO_INDEX[key] : null;
}

export function windDirectionLabel(word) {
  const idx = octantIndex(word);
  return idx === null ? '—' : OCTANTS[idx];
}

export function windDirectionDegrees(word, rawDegrees) {
  const raw = rawDegrees == null ? NaN : Number(rawDegrees);
  if (Number.isFinite(raw)) return raw;
  const idx = octantIndex(word);
  return idx === null ? null : idx * 45;
}
