import { useEffect, useRef, useState } from 'react';
import { updateDevice } from '../api/datalogger';

const FIELDS = ['name', 'location', 'lat', 'lon'];

function initialForm(device) {
  return Object.fromEntries(FIELDS.map((f) => [f, device?.details?.[f] ?? '']));
}

// Coordinates are sent as strings rounded to 6 places (~11 cm), which keeps
// pasted map-app values like 22.696179579404003 within the decimal field.
function coordinate(value, limit, label) {
  const trimmed = String(value).trim();
  if (!trimmed) return { value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || Math.abs(n) > limit) {
    return { error: `${label} must be a number between -${limit} and ${limit}.` };
  }
  return { value: n.toFixed(6) };
}

function validate(form) {
  const errors = {};
  const lat = coordinate(form.lat, 90, 'Latitude');
  const lon = coordinate(form.lon, 180, 'Longitude');
  if (lat.error) errors.lat = lat.error;
  if (lon.error) errors.lon = lon.error;
  if (!errors.lat && !errors.lon && (lat.value === null) !== (lon.value === null)) {
    errors[lat.value === null ? 'lat' : 'lon'] = 'Enter both latitude and longitude, or leave both empty.';
  }
  const payload = {
    name: String(form.name).trim() || null,
    location: String(form.location).trim() || null,
    lat: lat.value ?? null,
    lon: lon.value ?? null,
  };
  return { errors, payload };
}

const GEO_ERRORS = {
  1: 'Location permission was denied. Allow it in the browser settings, or type the coordinates.',
  2: 'Your location could not be determined. Try again, or type the coordinates.',
  3: 'Finding your location took too long. Try again, or type the coordinates.',
};

// DRF validation errors come back as { field: ["message", ...] }.
function responseErrors(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (status === 403) return { form: 'Only staff users can edit devices.' };
  if (status === 401) return { form: 'Your session has expired. Please sign in again.' };
  if (status === 400 && data && typeof data === 'object') {
    const errors = {};
    Object.entries(data).forEach(([key, value]) => {
      const message = Array.isArray(value) ? value.join(' ') : String(value);
      errors[FIELDS.includes(key) ? key : 'form'] = message;
    });
    return errors;
  }
  return { form: data?.detail || err?.message || 'Failed to save device.' };
}

export default function EditDeviceDialog({ device, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(() => initialForm(device));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
    if (field === 'lat' || field === 'lon') setAccuracy(null);
  }

  // Fills the fields only; nothing is saved until the user presses Save, so a
  // coarse fix (e.g. Wi-Fi based on a laptop) can be checked first.
  function fillCurrentLocation() {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, lat: 'This browser cannot share its location. Type the coordinates instead.' }));
      return;
    }
    setLocating(true);
    setErrors((prev) => ({ ...prev, lat: undefined, lon: undefined }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((prev) => ({ ...prev, lat: coords.latitude.toFixed(6), lon: coords.longitude.toFixed(6) }));
        setAccuracy(Math.round(coords.accuracy));
        setLocating(false);
      },
      (err) => {
        setErrors((prev) => ({ ...prev, lat: GEO_ERRORS[err.code] || GEO_ERRORS[2] }));
        setAccuracy(null);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { errors: found, payload } = validate(form);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      const saved = await updateDevice(device.uuid, payload);
      onSaved(device.uuid, { ...payload, ...saved });
      onClose();
    } catch (err) {
      setErrors(responseErrors(err));
    } finally {
      setSaving(false);
    }
  }

  function field(name, label, props = {}) {
    return (
      <label className="dialog-field">
        <span>{label}</span>
        <input
          value={form[name]}
          onChange={(e) => setField(name, e.target.value)}
          aria-invalid={errors[name] ? true : undefined}
          {...props}
        />
        {errors[name] && <span className="dialog-field-error">{errors[name]}</span>}
      </label>
    );
  }

  return (
    <dialog ref={dialogRef} className="edit-device-dialog" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <h2>Edit device</h2>
        <p className="dialog-sub">{device.id}</p>

        {errors.form && <div className="error-message">{errors.form}</div>}

        {field('name', 'Name', { placeholder: 'Farm A', autoFocus: true })}
        {field('location', 'Location', { placeholder: 'Indore' })}
        <div className="dialog-row">
          {field('lat', 'Latitude', { placeholder: '22.719568', inputMode: 'decimal' })}
          {field('lon', 'Longitude', { placeholder: '75.857727', inputMode: 'decimal' })}
        </div>
        <div className="dialog-locate">
          <button type="button" className="secondary-btn" onClick={fillCurrentLocation} disabled={locating || saving}>
            {locating ? 'Finding location…' : 'Use current location'}
          </button>
          {accuracy != null && <span className="dialog-hint">Accurate to about {accuracy} m. Check before saving.</span>}
        </div>
        <p className="dialog-hint">
          Latitude and longitude place the device on the map. Use current location while standing at the station.
        </p>

        <div className="dialog-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
