// Qualitative read of each summary value (an average, or rainfall's total),
// purely for a quick at-a-glance label under each tile. Tone drives the color.
function classifyTemp(avg) {
  if (avg < 10) return { label: 'Cold', tone: 'warn' };
  if (avg < 18) return { label: 'Cool', tone: 'neutral' };
  if (avg <= 28) return { label: 'Optimal', tone: 'good' };
  if (avg <= 35) return { label: 'Warm', tone: 'warn' };
  return { label: 'Hot', tone: 'bad' };
}

function classifyHumidity(avg) {
  if (avg < 30) return { label: 'Dry', tone: 'warn' };
  if (avg <= 60) return { label: 'Comfortable', tone: 'good' };
  if (avg <= 80) return { label: 'Humid', tone: 'neutral' };
  return { label: 'Very Humid', tone: 'bad' };
}

// Bands are for an accumulated total (roughly IMD daily-rainfall classes).
function classifyRainfall(total) {
  if (total <= 0) return { label: 'Dry', tone: 'good' };
  if (total < 15.6) return { label: 'Light', tone: 'neutral' };
  if (total < 64.5) return { label: 'Moderate', tone: 'warn' };
  return { label: 'Heavy', tone: 'bad' };
}

function classifyWindSpeed(avg) {
  if (avg <= 0.5) return { label: 'Calm', tone: 'good' };
  if (avg <= 3.3) return { label: 'Light Breeze', tone: 'good' };
  if (avg <= 7.9) return { label: 'Moderate', tone: 'neutral' };
  if (avg <= 13.8) return { label: 'Strong', tone: 'warn' };
  return { label: 'Gale', tone: 'bad' };
}

const CLASSIFIERS = {
  temp: classifyTemp,
  humidity: classifyHumidity,
  rainfall: classifyRainfall,
  wind_speed: classifyWindSpeed,
};

// A flat min===max reading (no variation at all across the window) usually
// means the sensor is stuck rather than the world holding perfectly still,
// so it's flagged for a manual look rather than reported at face value.
export function metricStatus(key, avg, min, max) {
  if (avg == null) return null;
  const classify = CLASSIFIERS[key];
  if (!classify) return null;
  const { label, tone } = classify(avg);
  const flagged = min != null && max != null && min === max;
  return { label, tone, flagged };
}
