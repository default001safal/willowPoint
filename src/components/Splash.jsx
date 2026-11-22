// Launch splash: logo, tagline and a thin loading bar, matching the canvas design.
// Stays until the first content arrives (at least 900ms so it doesn't flash, at most 2.5s).
import { useEffect, useState } from 'react';
import { useContent } from '../lib/content.jsx';

export default function Splash({ onDone }) {
  const { fixtures, stories } = useContent();
  const ready = fixtures.length > 0 || stories.length > 0;
  const [minDone, setMinDone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const min = setTimeout(() => setMinDone(true), 900);
    const max = setTimeout(() => setLeaving(true), 2500);
    return () => { clearTimeout(min); clearTimeout(max); };
  }, []);
  useEffect(() => { if (ready && minDone) setLeaving(true); }, [ready, minDone]);
  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(onDone, 280);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} role="status" aria-label="Loading willowPoint">
      <img src="/logo-light.png" alt="willowPoint" className="splash-logo" />
      <span className="splash-tag">Your cricket, closer.</span>
      <span className="splash-bar" aria-hidden="true"><span /></span>
    </div>
  );
}
