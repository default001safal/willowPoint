// Native icon set — same strokes and weights as the web app.
import React from 'react';
import Svg, { Circle, G, Path, Polyline, Rect } from 'react-native-svg';

const wrap = (children) => function Icon({ size = 22, color = '#A3A3A3', sw = 1.7, filled = false, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {typeof children === 'function' ? children({ color, sw, filled }) : children}
    </Svg>
  );
};

export const User = wrap(<><Circle cx="12" cy="8" r="4" /><Path d="M4 21c1.5-3.6 4.5-5.5 8-5.5s6.5 1.9 8 5.5" /></>);
export const Search = wrap(<><Circle cx="11" cy="11" r="7" /><Path d="m21 21-4.5-4.5" /></>);
export const Sliders = wrap(<><Path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><Circle cx="15" cy="7" r="2" /><Circle cx="9" cy="17" r="2" /></>);
export const Calendar = wrap(<><Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><Path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const Trophy = wrap(<><Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><Path d="M7 6H4.5a1 1 0 0 0-1 1c0 2.2 1.5 3.6 3.5 3.8M17 6h2.5a1 1 0 0 1 1 1c0 2.2-1.5 3.6-3.5 3.8" /></>);
export const Bookmark = wrap(({ color, sw, filled }) => <Path d="M6.5 4.5h11V20l-5.5-3.6L6.5 20V4.5Z" fill={filled ? color : 'none'} stroke={color} strokeWidth={sw} />);
export const Swap = wrap(<><Path d="M7 4 3.5 7.5 7 11" /><Path d="M3.5 7.5H17" /><Path d="m17 13 3.5 3.5L17 20" /><Path d="M20.5 16.5H7" /></>);
export const Target = wrap(({ color }) => <><Circle cx="12" cy="12" r="8.5" /><Circle cx="12" cy="12" r="4.5" /><Circle cx="12" cy="12" r="1" fill={color} /></>);
export const Grid = wrap(<><Rect x="4" y="4" width="7" height="7" rx="1.5" /><Rect x="13" y="4" width="7" height="7" rx="1.5" /><Rect x="4" y="13" width="7" height="7" rx="1.5" /><Rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
export const Globe = wrap(<><Circle cx="12" cy="12" r="8.5" /><Path d="M3.5 12h17M12 3.5c2.6 2.3 3.8 5.2 3.8 8.5s-1.2 6.2-3.8 8.5c-2.6-2.3-3.8-5.2-3.8-8.5s1.2-6.2 3.8-8.5Z" /></>);
export const Chevron = wrap(<Path d="m9 5 7 7-7 7" />);
export const ArrowUp = wrap(<><Path d="M12 19V5" /><Path d="m5 12 7-7 7 7" /></>);
export const Home = wrap(<><Path d="m3.5 11 8.5-7.5L20.5 11" /><Path d="M6 9.5V20h12V9.5" /></>);
export const Compass = wrap(<><Circle cx="12" cy="12" r="8.5" /><Path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>);
export const CricketBat = wrap(<><Path d="m14.5 4.5 5 5L9 20l-5-5L14.5 4.5Z" /><Path d="m4 15-1.5 4.5L7 18" /></>);
export const CricketBall = wrap(<><Circle cx="12" cy="12" r="8.5" /><Path d="M8 5.5c3 2 3 11 0 13M16 5.5c-3 2-3 11 0 13" /></>);
export const Plus = wrap(<><Path d="M12 5v14M5 12h14" /></>);
export const Check = wrap(<Polyline points="4.5 12.5 9.5 17.5 19.5 6.5" />);
export const ViewList = wrap(({ color }) => <><Path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20" /><Circle cx="4.5" cy="6.5" r="1" fill={color} /><Circle cx="4.5" cy="12" r="1" fill={color} /><Circle cx="4.5" cy="17.5" r="1" fill={color} /></>);

function GoogleMark({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
      <Path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.2v2.6A10 10 0 0 0 12 22Z" />
      <Path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.2a10 10 0 0 0 0 9.1L6.5 14Z" />
      <Path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5L18.7 4.6A10 10 0 0 0 3.2 7.5L6.5 10A5.9 5.9 0 0 1 12 6Z" />
    </Svg>
  );
}
export { GoogleMark };
