import * as I from './Icons.jsx';

export function SectionHead({ title, children, leading, className = '' }) {
  return (
    <div className={`sec${className ? ` ${className}` : ''}`}>
      <h2 className="label bright">{leading}<span>{title}</span></h2>
      {children && <div className="sec-side">{children}</div>}
    </div>
  );
}

export const Divider = () => <hr className="section-rule" aria-hidden="true" />;

export function SaveButton({ label, saved, onToggle }) {
  return (
    <button
      type="button"
      className="icon-btn save-btn"
      aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
      aria-pressed={saved}
      onClick={onToggle}
    >
      <I.Bookmark size={18} filled={saved} />
    </button>
  );
}

const TABS = [
  { id: 'home', label: 'Home', Icon: I.Home },
  { id: 'discover', label: 'Discover', Icon: I.Compass },
  { id: 'cue', label: 'Cue', Icon: I.SparkPlus },
  { id: 'profile', label: 'You', Icon: I.User },
];

export function BottomNav({ tab, onChange }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tab${tab === id ? ' active' : ''}`}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={22} sw={tab === id ? 1.9 : 1.6} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parts(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return { day: DAY[date.getDay()], date: date.getDate(), month: MON[date.getMonth()] };
}

export function addDays(iso, amount) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + amount);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function relativeDay(iso, today) {
  if (iso === today) return 'Today';
  if (iso === addDays(today, 1)) return 'Tomorrow';
  return parts(iso).day;
}

export function ScreenMasthead({ onProfile, label }) {
  return (
    <>
      <div className="home-top">
        <img className="logo" src="/logo-light.png" alt="willowPoint" />
        {onProfile ? (
          <button type="button" className="avatar-btn" aria-label="Open your profile" onClick={onProfile}><I.User size={19} /></button>
        ) : <span className="label">{label}</span>}
      </div>
      <hr className="top-rule" />
    </>
  );
}
