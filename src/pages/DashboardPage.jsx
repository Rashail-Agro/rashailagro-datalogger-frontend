import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchDevices, fetchDeviceData, downloadDeviceData, fetchDeviceSummary, getDeviceGraphUrl } from '../api/datalogger';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import HeaderStats from '../components/HeaderStats';
import AverageTiles from '../components/AverageTiles';
import DataTable from '../components/DataTable';
import TelemetryChart from '../components/TelemetryChart';
import DateRangePicker from '../components/DateRangePicker';
import Pagination from '../components/Pagination';
import FarmMap from '../components/FarmMap';
import EditDeviceDialog from '../components/EditDeviceDialog';
import { FARM_BOUNDARIES, polygonAreaHectares } from '../data/farmBoundaries';

const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;
const ONLINE_THRESHOLD_MIN = 15;
const DEVICE_POLL_MS = 60000;

// 'backend' embeds the Django graph page (TelemetryGraphView) in the Graph tab,
// authenticated with ?token= so it needs no cross-site cookie; 'api' draws the
// chart here from the readings API. The iframe is blocked by the page's CSP
// unless this site's origin is in the backend's CORS_ALLOWED_ORIGINS.
const GRAPH_SOURCE = 'backend';

// Local calendar date, not toISOString(): that's UTC, which for IST users
// reads as "yesterday" between midnight and 05:30.
function localDateStr(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() {
  return localDateStr(new Date());
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateStr(d);
}

// The readings endpoints are IsAdminUser, so a valid login on a non-staff
// account gets 403 with DRF's generic "no permission" detail.
function apiError(err, fallback) {
  const status = err?.response?.status;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'This account is not a staff user, so it cannot view station data.';
  if (status === 400) return err.response.data?.detail || 'Invalid date or time in the selected range.';
  return err?.response?.data?.detail || err?.message || fallback;
}

// Download errors come back as a Blob (responseType: 'blob'), so the JSON
// `detail` has to be read out of it rather than off response.data directly.
async function downloadError(err) {
  const body = err?.response?.data;
  if (body instanceof Blob) {
    try {
      const detail = JSON.parse(await body.text())?.detail;
      if (detail) return detail;
    } catch {
      // non-JSON error body; fall through to the generic message
    }
  }
  return err?.message || 'Failed to download data';
}

const CHART_PAGE_SIZE = 50;
const CHART_MAX_POINTS = 1500;
const CHART_SAMPLE_PAGES = 30; // 30 * 50 = 1500 points spread across the full range

// The API only returns newest-first with no ordering control, so pulling
// "the first N" of a wide range just gets the most recent slice. Instead,
// sample pages evenly spaced across the whole page count so the chart
// covers the entire selected range rather than clustering at the end.
async function loadChartSeries(filters) {
  const first = await fetchDeviceData(filters, 1, 1);
  const count = first?.count ?? 0;
  if (count === 0) return { rows: [], truncated: false };

  if (count <= CHART_MAX_POINTS) {
    // page_size is capped at 500 server-side, so a single oversized request
    // would silently return only the newest 500 rows.
    const pageCount = Math.ceil(count / MAX_PAGE_SIZE);
    const pages = await Promise.all(
      Array.from({ length: pageCount }, (_, i) => fetchDeviceData(filters, i + 1, MAX_PAGE_SIZE)),
    );
    return { rows: pages.flatMap((data) => data?.results || []), truncated: false };
  }

  const totalPages = Math.ceil(count / CHART_PAGE_SIZE);
  const samplePages = Math.min(totalPages, CHART_SAMPLE_PAGES);
  const pageNumbers = [
    ...new Set(
      Array.from({ length: samplePages }, (_, i) =>
        1 + Math.round((i * (totalPages - 1)) / Math.max(1, samplePages - 1)),
      ),
    ),
  ];
  const pages = await Promise.all(pageNumbers.map((p) => fetchDeviceData(filters, p, CHART_PAGE_SIZE)));
  return { rows: pages.flatMap((data) => data?.results || []), truncated: true };
}

function filenameFromResponse(response, fallback) {
  const disposition = response.headers?.['content-disposition'];
  const match = disposition && /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : fallback;
}

// `id` stays the device_id string every readings call is keyed by; the UUID
// the PATCH endpoint needs is kept as `uuid`.
// `details` holds the editable fields exactly as the API returns them.
function toDevice(d) {
  return {
    id: d.device_id,
    uuid: d.id,
    name: d.name || d.device_id,
    status: deviceStatus(d),
    details: { name: d.name, location: d.location, lat: d.lat, lon: d.lon },
  };
}

function devicePoint(details) {
  if (details?.lat == null || details?.lon == null || details.lat === '' || details.lon === '') return null;
  const lat = Number(details.lat);
  const lng = Number(details.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function deviceStatus(device) {
  if (!device.last_data_received_at) return 'offline';
  const ageMin = (Date.now() - new Date(device.last_data_received_at).getTime()) / 60000;
  return ageMin <= ONLINE_THRESHOLD_MIN ? 'online' : 'offline';
}

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [devices, setDevices] = useState(null);
  const [devicesError, setDevicesError] = useState('');
  const [deviceId, setDeviceId] = useState(null);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const startTime = '00:00:00';
  const endTime = '23:59:59';

  const [summary, setSummary] = useState(null);
  const [recentRows, setRecentRows] = useState([]);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const [chartRows, setChartRows] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartTruncated, setChartTruncated] = useState(false);
  const [chartError, setChartError] = useState('');

  const [historyTab, setHistoryTab] = useState('data');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Requests can resolve out of order (e.g. rapid device switching) — each
  // loader only applies its result if it's still the most recent call.
  const dataRequestId = useRef(0);
  const summaryRequestId = useRef(0);
  const recentRequestId = useRef(0);

  const loadSummary = useCallback(async (id, range) => {
    const requestId = ++summaryRequestId.current;
    try {
      const data = await fetchDeviceSummary(id, range);
      if (requestId !== summaryRequestId.current) return;
      setSummary(data);
    } catch {
      if (requestId !== summaryRequestId.current) return;
      setSummary(null);
    }
  }, []);

  const loadRecent = useCallback(async (id) => {
    const requestId = ++recentRequestId.current;
    try {
      const data = await fetchDeviceData(
        { deviceId: id, startDate: isoDaysAgo(1), startTime: '00:00:00', endDate: todayStr(), endTime: '23:59:59' },
        1,
        100,
      );
      if (requestId !== recentRequestId.current) return;
      setRecentRows(data?.results || []);
    } catch {
      if (requestId !== recentRequestId.current) return;
      setRecentRows([]);
    }
  }, []);

  const loadData = useCallback(async (filters, pageNum) => {
    const requestId = ++dataRequestId.current;
    setLoading(true);
    setError('');
    try {
      const data = await fetchDeviceData(filters, pageNum, PAGE_SIZE);
      if (requestId !== dataRequestId.current) return;
      setRows(data?.results || []);
      setTotalCount(data?.count ?? 0);
    } catch (err) {
      if (requestId !== dataRequestId.current) return;
      setError(apiError(err, 'Failed to load data'));
      setRows([]);
      setTotalCount(0);
    } finally {
      if (requestId === dataRequestId.current) setLoading(false);
    }
  }, []);

  // Re-polled so online/offline dots track reality instead of freezing at page load.
  useEffect(() => {
    let cancelled = false;
    function loadDevices() {
      fetchDevices()
        .then((list) => {
          if (cancelled) return;
          setDevices(list.map(toDevice));
          setDevicesError('');
          setDeviceId((current) => current ?? list[0]?.device_id ?? null);
        })
        .catch((err) => {
          if (!cancelled) setDevicesError(apiError(err, 'Failed to load devices'));
        });
    }
    loadDevices();
    const timer = setInterval(loadDevices, DEVICE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    loadSummary(deviceId, { startDate, startTime, endDate, endTime });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, startDate, endDate, loadSummary]);

  useEffect(() => {
    if (!deviceId) return;
    loadRecent(deviceId);
  }, [deviceId, loadRecent]);

  useEffect(() => {
    if (!deviceId) return;
    loadData({ deviceId, startDate, startTime, endDate, endTime }, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, startDate, endDate, page]);

  useEffect(() => {
    if (GRAPH_SOURCE !== 'api' || !deviceId || historyTab !== 'graph') return undefined;
    let cancelled = false;
    setChartLoading(true);
    setChartError('');
    loadChartSeries({ deviceId, startDate, startTime, endDate, endTime })
      .then(({ rows: list, truncated }) => {
        if (cancelled) return;
        setChartRows(list);
        setChartTruncated(truncated);
      })
      .catch((err) => {
        if (!cancelled) {
          setChartRows([]);
          setChartTruncated(false);
          setChartError(apiError(err, 'Failed to load chart data'));
        }
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId, startDate, endDate, historyTab]);

  function handleSelectDevice(id) {
    setDeviceId(id);
    setPage(1);
  }

  function handleRangeChange(start, end) {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  }

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      const response = await downloadDeviceData({ deviceId, startDate, endDate });
      const filename = filenameFromResponse(response, `${deviceId}_${startDate}_${endDate}.csv`);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(await downloadError(err));
    } finally {
      setDownloading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const columns = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  // Applied locally so the heading and map update without waiting for the
  // next device poll; `saved` is the PATCH response merged over what was sent.
  function handleDeviceSaved(uuid, saved) {
    setDevices((list) =>
      list.map((d) => {
        if (d.uuid !== uuid) return d;
        const details = {
          name: saved.name ?? null,
          location: saved.location ?? null,
          lat: saved.lat ?? null,
          lon: saved.lon ?? null,
        };
        return { ...d, name: details.name || d.id, details };
      }),
    );
  }

  const deviceList = useMemo(() => devices || [], [devices]);
  const activeDevice = deviceList.find((d) => d.id === deviceId);
  const statusById = useMemo(() => Object.fromEntries(deviceList.map((d) => [d.id, d.status])), [deviceList]);
  const farm = FARM_BOUNDARIES[deviceId];
  // Coordinates saved on the device take priority; the hard-coded farm data
  // still supplies the boundary polygon (and a fallback point) where it exists.
  const savedPoint = useMemo(() => devicePoint(activeDevice?.details), [activeDevice?.details]);
  const mapPoint = savedPoint ?? farm?.point ?? null;
  const hasMap = Boolean(mapPoint || farm?.polygon);
  const mapLabel = activeDevice?.details?.location || farm?.location || activeDevice?.name;
  const areaHectares = useMemo(
    () => (farm?.polygon ? polygonAreaHectares(farm.polygon) : 0),
    [farm],
  );

  return (
    <div className="app-shell">
      <Topbar
        user={user}
        onLogout={handleLogout}
        recordCount={totalCount}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="dashboard-shell">
        <Sidebar
          devices={deviceList}
          activeId={deviceId}
          onSelect={handleSelectDevice}
          statusById={statusById}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="dashboard-page">
          {!deviceId && (
            <div className={devicesError ? 'error-message' : 'empty-state'}>
              {devicesError || (devices === null ? 'Loading devices…' : 'No devices found.')}
            </div>
          )}

          {deviceId && (
          <>
          <div className="breadcrumb">
            <span>Devices</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{activeDevice?.name}</span>
          </div>
          <div className="page-title-row">
            <div className="page-title">
              <h1>{activeDevice?.name}</h1>
              {activeDevice?.details?.location && activeDevice.details.location !== activeDevice.name && <span className="page-title-location">{activeDevice.details.location}</span>}
              {activeDevice && (
                <button type="button" className="secondary-btn edit-device-btn" onClick={() => setEditing(true)}>
                  Edit device
                </button>
              )}
            </div>
            <HeaderStats latestRow={recentRows[0]} />
          </div>

          <div className="section-label">Location</div>
          {hasMap ? (
            <FarmMap
              key={`${deviceId}:${mapPoint?.lat},${mapPoint?.lng}`}
              polygon={farm?.polygon}
              point={mapPoint}
              location={mapLabel}
              areaHectares={areaHectares}
              latestRow={recentRows[0]}
            />
          ) : (
            <div className="map-empty">
              No location set for this device.{' '}
              <button type="button" className="link-btn" onClick={() => setEditing(true)}>
                Add latitude and longitude
              </button>{' '}
              to show it on the map.
            </div>
          )}

          {editing && activeDevice && (
            <EditDeviceDialog
              device={activeDevice}
              onClose={() => setEditing(false)}
              onSaved={handleDeviceSaved}
            />
          )}

          <AverageTiles summary={summary} latestRow={recentRows[0]} />

          <div className="section-label">Historical Data</div>
          <div className="filters">
            <div className="field">
              <label>Date Range</label>
              <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleRangeChange} />
            </div>

            <button type="button" className="secondary-btn" disabled={downloading} onClick={handleDownload}>
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="history-tabs">
            <button
              type="button"
              className={`history-tab${historyTab === 'graph' ? ' active' : ''}`}
              onClick={() => setHistoryTab('graph')}
            >
              Graph
            </button>
            <button
              type="button"
              className={`history-tab${historyTab === 'data' ? ' active' : ''}`}
              onClick={() => setHistoryTab('data')}
            >
              Data
            </button>
          </div>

          {historyTab === 'graph' && GRAPH_SOURCE === 'backend' && (
            <div className="backend-graph">
              <iframe
                key={deviceId}
                className="backend-graph-frame"
                src={getDeviceGraphUrl(deviceId, { token, startDate, endDate })}
                referrerPolicy="no-referrer"
                title={`Telemetry graph for ${activeDevice?.name ?? deviceId}`}
              />
            </div>
          )}

          {historyTab === 'graph' && GRAPH_SOURCE === 'api' && (
            <>
              {chartError && <div className="error-message">{chartError}</div>}

              {chartLoading && <div className="empty-state">Loading chart…</div>}

              {!chartLoading && chartRows.length > 0 && (
                <>
                  <TelemetryChart rows={chartRows} />
                  {chartTruncated && (
                    <div className="chart-truncated-note">
                      Showing ~1,500 points evenly sampled across this range — narrow the date range to see every reading.
                    </div>
                  )}
                </>
              )}

              {!chartLoading && !chartError && chartRows.length === 0 && (
                <div className="empty-state">No data found for this device in the selected range.</div>
              )}
            </>
          )}

          {historyTab === 'data' && (
            <>
              {loading && rows.length === 0 && <div className="empty-state">Loading data…</div>}

              {rows.length > 0 && (
                <>
                  <Pagination
                    page={page}
                    totalPages={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                    totalCount={totalCount}
                    onChange={setPage}
                  />
                  <DataTable rows={rows} columns={columns} startIndex={(page - 1) * PAGE_SIZE} />
                </>
              )}

              {!loading && !error && rows.length === 0 && (
                <div className="empty-state">No data found for this device in the selected range.</div>
              )}
            </>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
