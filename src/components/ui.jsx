import { useEffect, useState } from 'react';
import * as I from './Icons.jsx';

export function SectionHead({ title, children, leading }) {
  return (
    <div className="section-head">
      <h2>
        {leading}
        <span>{title}</span>
      </h2>
      {children}
    </div>
  );
}

export const Divider = () => <hr className="divider" aria-hidden="true" />;

export function SaveButton({ label, saved, onToggle }) {
  return (
    <button
      type="button"
      className="icon-btn save-btn"
      aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
      aria-pressed={saved}
      onClick={onToggle}
    >
      <I.Bookmark filled={saved} />
    </button>
  );
}

const TABS = [
  { id: 'home', label: 'Home', Icon: I.Home },
  { id: 'discover', label: 'Discover', Icon: I.Compass },
  { id: 'cue', label: 'Cue', Icon: I.SparkPlus },
  { id: 'profile', label: 'Profile', Icon: I.User },
];

export function BottomNav({ tab, onChange }) {
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <Icon size={24} sw={tab === id ? 2 : 1.8} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Small persisted state for per-device preferences. Falls back to memory if storage is unavailable.
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — keep in memory */
    }
  }, [key, value]);
  return [value, setValue];
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parts(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return { day: DAY[d.getDay()], date: d.getDate(), month: MON[d.getMonth()] };
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function relativeDay(iso, today) {
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  return parts(iso).day;
}
