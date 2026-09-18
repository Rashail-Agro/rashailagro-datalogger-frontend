function ThermometerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17" r="1.6" fill="currentColor" />
    </svg>
  );
}

function DropletIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 3c3.5 4.2 6 7.7 6 10.5a6 6 0 1 1-12 0C6 10.7 8.5 7.2 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RaindropsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6.5 4.5A4.5 4.5 0 0 1 15 6a4 4 0 0 1-.6 7.9H6.6A4.1 4.1 0 0 1 5 6.1a4.5 4.5 0 0 1 1.5-1.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 17.5 8 20M13 17.5l-1 2.5M17 17.5l-1 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WindIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M3 8h11.5a2.5 2.5 0 1 0-2.4-3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12.5h15a2.5 2.5 0 1 1-2.4 3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 17h9a2 2 0 1 1-1.9 2.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const METRIC_ICONS = {
  temp: ThermometerIcon,
  humidity: DropletIcon,
  rainfall: RaindropsIcon,
  wind_speed: WindIcon,
};

export default function MetricIcon({ metric, ...props }) {
  const Icon = METRIC_ICONS[metric];
  if (!Icon) return null;
  return <Icon {...props} />;
}
