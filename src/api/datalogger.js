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

// Django-rendered Chart.js page (TelemetryGraphView). It authenticates with a
// Django session, not the DRF token, and sends X-Frame-Options, so it can only
// be opened in its own tab, never embedded.
export function deviceGraphPageUrl(deviceId) {
  return `${BASE_URL}${BASE}/${encodeURIComponent(deviceId)}/graph/`;
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
