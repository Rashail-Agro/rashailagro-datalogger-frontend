export const FARM_BOUNDARIES = {
  RAWS001: {
    location: 'Pipariya',
    polygon: [
      { lat: 22.741102483476364, lng: 78.31307403354012 },
      { lat: 22.74027272299811, lng: 78.3132252159207 },
      { lat: 22.739718565500105, lng: 78.31312419945942 },
      { lat: 22.73949895123574, lng: 78.31319574582022 },
      { lat: 22.738763239983594, lng: 78.3132395258672 },
      { lat: 22.738725478574153, lng: 78.3141409376993 },
      { lat: 22.738857993104265, lng: 78.31478979100818 },
      { lat: 22.73914683593481, lng: 78.31555694279544 },
      { lat: 22.73964089566371, lng: 78.31514318372366 },
      { lat: 22.73976085778185, lng: 78.31497933044697 },
      { lat: 22.739598129816184, lng: 78.31387620503439 },
      { lat: 22.740242524217777, lng: 78.31371398806458 },
      { lat: 22.740664854347294, lng: 78.31360281229921 },
      { lat: 22.741202283863327, lng: 78.31337515096907 },
    ],
  },
  WS_Office_Demo1: {
    location: 'Rashail Tech Labs',
    point: { lat: 22.696179579404003, lng: 75.86341567625499 },
  },
};

export function polygonCentroid(points) {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i += 1) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const cross = p0.lng * p1.lat - p1.lng * p0.lat;
    area += cross;
    cx += (p0.lng + p1.lng) * cross;
    cy += (p0.lat + p1.lat) * cross;
  }

  area /= 2;
  if (Math.abs(area) < 1e-12) {
    const total = points.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 },
    );
    return { lat: total.lat / points.length, lng: total.lng / points.length };
  }

  return { lat: cy / (6 * area), lng: cx / (6 * area) };
}

const EARTH_RADIUS_M = 6371000;

export function polygonAreaHectares(points) {
  if (!points || points.length < 3) return 0;
  const originLat = (points[0].lat * Math.PI) / 180;
  const toXY = (p) => ({
    x: ((p.lng - points[0].lng) * Math.PI * EARTH_RADIUS_M * Math.cos(originLat)) / 180,
    y: ((p.lat - points[0].lat) * Math.PI * EARTH_RADIUS_M) / 180,
  });
  const xy = points.map(toXY);

  let area = 0;
  for (let i = 0; i < xy.length; i += 1) {
    const p0 = xy[i];
    const p1 = xy[(i + 1) % xy.length];
    area += p0.x * p1.y - p1.x * p0.y;
  }
  return Math.abs(area / 2) / 10000;
}
