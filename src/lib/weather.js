// Current weather for the greeting line, from Open-Meteo (free, no API key).
// City is fixed to Kathmandu for now; swap CITY to change it.
import { useEffect, useState } from 'react';

const CITY = { name: 'Kathmandu', lat: 27.7172, lon: 85.324, tz: 'Asia/Kathmandu' };
const REFRESH_MS = 15 * 60 * 1000;

// WMO weather codes → short phrase that reads after "with".
function describe(code, isDay) {
  if (code === 0) return isDay ? 'clear skies' : 'a clear night';
  if (code === 1 || code === 2) return 'a few clouds';
  if (code === 3) return 'overcast skies';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'light drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'passing showers';
  if (code === 85 || code === 86) return 'snow showers';
  if (code >= 95) return 'thunderstorms';
  return 'mixed weather';
}

export function useWeather() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lon}` +
      `&current=temperature_2m,weather_code,is_day&timezone=${encodeURIComponent(CITY.tz)}`;

    const load = () =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => {
          if (cancelled || !d.current) return;
          setWeather({
            city: CITY.name,
            temp: Math.round(d.current.temperature_2m),
            phrase: describe(d.current.weather_code, d.current.is_day === 1),
          });
        })
        .catch(() => {
          /* keep the last reading; the line simply doesn't show if we never get one */
        });

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return weather;
}

export function weatherSentence(w) {
  return w ? `It's ${w.temp}°C with ${w.phrase} in ${w.city}.` : '';
}
