import client, { BASE_URL } from './client';

const BASE = '/datalogger/SVHSPL-weather-station';

export async function fetchDevices() {
  const devices = [];
  let page = 1;
  // The list is paginated 10 per page; walk every page so the picker is complete.
  for (;;) {
    const { data } = await client.get(`${BASE}/devices/`, { params: { page } });
    devices.push(...(data?.results || []));
    if (!data?.next) return devices;
    page += 1;
  }
}

// Keyed by the device's UUID `id`, not its `device_id` string. Staff only.
export async function updateDevice(id, fields) {
  const { data } = await client.patch(`${BASE}/devices/${encodeURIComponent(id)}/`, fields);
  return data;
}

// Django-rendered Chart.js page (TelemetryGraphView). With ?token= it
// authenticates by the DRF token (staff only) and may be framed by the origins
// in the backend's CORS_ALLOWED_ORIGINS; without one it falls back to the
// admin-session login. The token lands in server access logs, so only put it in
// the embedded iframe, never in a link users can copy or share.
export function getDeviceGraphUrl(deviceId, { token, startDate, endDate, startTime, endTime } = {}) {
  const url = `${BASE_URL}${BASE}/${encodeURIComponent(deviceId)}/graph/`;
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (startTime) params.set('start_time', startTime);
  if (endTime) params.set('end_time', endTime);
  const query = params.toString();
  return query ? `${url}?${query}` : url;
}

export async function fetchDeviceData({ deviceId, startDate, startTime, endDate, endTime }, page = 1, pageSize = 50) {
  const { data } = await client.get(`${BASE}/readings/`, {
    params: {
      device_id: deviceId,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      page,
      page_size: pageSize,
    },
  });
  return data;
}

export async function downloadDeviceData({ deviceId, startDate, endDate }) {
  return client.get(`${BASE}/download-device-data/`, {
    params: { device_id: deviceId, start_date: startDate, end_date: endDate },
    responseType: 'blob',
  });
}

export async function fetchDeviceSummary(deviceId, { startDate, startTime, endDate, endTime }) {
  const { data } = await client.get(`${BASE}/device-data-summary/`, {
    params: {
      device_id: deviceId,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
    },
  });
  return data;
}
